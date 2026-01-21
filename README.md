Ringtone Bulk Downloader (Safe Mode)

This project provides a safe, whitelist-based bulk ringtone downloader implemented in Python (FastAPI).

Important: The server will only download from domains you explicitly provide in the `whitelist` field. This is to avoid enabling copyright-infringing mass downloads.

Files:
- `app.py` — FastAPI app with `/api/download` endpoint.
- `templates/index.html` — Simple frontend that posts lists of URLs and whitelist domains and receives a ZIP of downloaded files.
- `requirements.txt` — Python dependencies.

Quick start (Windows PowerShell):

1. Install Python 3.10+ and ensure `python` and `pip` are on PATH.

2. Create a virtual environment and install deps:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Run the app with uvicorn:

```powershell
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

4. Open the frontend at `http://localhost:8000/templates/index.html` or call the API at `POST /api/download`.

Usage notes:
- Provide a `whitelist` array of allowed domains when calling `/api/download`.
- The `limit` parameter caps the number of files downloaded.
- The `concurrency` parameter controls parallel downloads.

Legal & ethical:
- Only download content you have permission to use. Respect robots.txt and site terms.
