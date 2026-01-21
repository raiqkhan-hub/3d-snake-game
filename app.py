from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import aiohttp
import requests
from urllib.parse import urlparse
import tempfile
import os
import io
import zipfile

app = FastAPI(title="Ringtone Bulk Downloader - Safe Mode")

# Very important: This service will only download from domains explicitly provided in the request
# (whitelist). This is a deliberate safety restriction to avoid enabling mass copyright
# infringement. You must supply the whitelist domains when calling the API.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    urls: List[str]
    limit: Optional[int] = 50
    concurrency: Optional[int] = 5
    whitelist: Optional[List[str]] = None

async def fetch_file(session: aiohttp.ClientSession, url: str, save_path: str):
    try:
        async with session.get(url) as resp:
            resp.raise_for_status()
            with open(save_path, 'wb') as f:
                while True:
                    chunk = await resp.content.read(1024*32)
                    if not chunk:
                        break
                    f.write(chunk)
        return True, None
    except Exception as e:
        return False, str(e)

def is_domain_allowed(url: str, whitelist: Optional[List[str]]):
    if not whitelist:
        return False
    try:
        host = urlparse(url).hostname
        if not host:
            return False
        host = host.lower()
        for w in whitelist:
            if host == w.lower() or host.endswith('.' + w.lower()):
                return True
        return False
    except Exception:
        return False

def robots_allows(url: str, user_agent: str = '*') -> bool:
    # Simple robots.txt check per domain using requests
    try:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        robots_url = base.rstrip('/') + '/robots.txt'
        r = requests.get(robots_url, timeout=5)
        if r.status_code != 200:
            return True  # no robots.txt -> assume allowed
        from urllib import robotparser
        rp = robotparser.RobotFileParser()
        rp.parse(r.text.splitlines())
        return rp.can_fetch(user_agent, url)
    except Exception:
        # On any error, be conservative and allow (to avoid false blocks), but apps should tune this.
        return True

@app.post('/api/download')
async def download_ringtones(req: DownloadRequest):
    # Validate whitelist presence
    if not req.whitelist or len(req.whitelist) == 0:
        raise HTTPException(status_code=400, detail="You must provide a non-empty 'whitelist' array of allowed domains.")

    urls = [u for u in req.urls if isinstance(u, str)]
    if not urls:
        raise HTTPException(status_code=400, detail="No URLs provided")

    # Filter and validate URLs against whitelist and robots.txt
    valid_urls = []
    for u in urls:
        if not is_domain_allowed(u, req.whitelist):
            continue
        if not robots_allows(u):
            continue
        valid_urls.append(u)
        if len(valid_urls) >= req.limit:
            break

    if not valid_urls:
        raise HTTPException(status_code=400, detail="No valid URLs after whitelist/robots.txt filtering")

    # Download files concurrently into a temporary directory
    temp_dir = tempfile.TemporaryDirectory()
    sem = asyncio.Semaphore(req.concurrency or 5)
    results = []

    async with aiohttp.ClientSession() as session:
        async def sem_fetch(url, idx):
            async with sem:
                parsed = urlparse(url)
                name = os.path.basename(parsed.path) or f"file_{idx}"
                # sanitize name
                name = name.split('?')[0]
                save_path = os.path.join(temp_dir.name, f"{idx:04d}_{name}")
                ok, err = await fetch_file(session, url, save_path)
                return url, ok, err, save_path

        tasks = [asyncio.create_task(sem_fetch(u, i)) for i, u in enumerate(valid_urls)]
        for t in asyncio.as_completed(tasks):
            res = await t
            results.append(res)

    # Prepare zip in-memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for url, ok, err, path in results:
            if ok and os.path.exists(path):
                arcname = os.path.basename(path)
                zf.write(path, arcname=arcname)
    zip_buffer.seek(0)

    # Cleanup temp dir (files still available in memory buffer)
    temp_dir.cleanup()

    from fastapi.responses import StreamingResponse
    headers = {
        'Content-Disposition': 'attachment; filename="ringtones.zip"'
    }
    return StreamingResponse(zip_buffer, media_type='application/zip', headers=headers)

@app.get('/')
def root():
    return {"message":"Ringtone downloader service. POST to /api/download"}
