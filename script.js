const GRID_SIZE = 20;
const SEGMENT_SIZE = 1;
const GAME_SPEED = 200; // ms

let scene, camera, renderer;
let snake = [];
let direction = { x: 0, z: 1 };
let food;
let score = 0;
let gameRunning = true;
let lastUpdate = 0;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 15, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Initial snake
    createSnake();

    // Initial food
    createFood();

    // Event listeners
    document.addEventListener('keydown', handleInput);
    document.getElementById('restart').addEventListener('click', restart);

    // Start game loop
    animate();
}

function createSnake() {
    snake = [{ x: 0, z: 0 }];
    const geometry = new THREE.BoxGeometry(SEGMENT_SIZE, SEGMENT_SIZE, SEGMENT_SIZE);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const segment = new THREE.Mesh(geometry, material);
    segment.position.set(0, SEGMENT_SIZE / 2, 0);
    scene.add(segment);
    snake[0].mesh = segment;
}

function createFood() {
    const x = Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2;
    const z = Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2;
    food = { x, z };
    const geometry = new THREE.SphereGeometry(SEGMENT_SIZE / 2);
    const material = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const foodMesh = new THREE.Mesh(geometry, material);
    foodMesh.position.set(x, SEGMENT_SIZE / 2, z);
    scene.add(foodMesh);
    food.mesh = foodMesh;
}

function handleInput(event) {
    if (!gameRunning) return;
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.z !== 1) direction = { x: 0, z: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.z !== -1) direction = { x: 0, z: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction.x !== 1) direction = { x: -1, z: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x !== -1) direction = { x: 1, z: 0 };
            break;
    }
}

function update() {
    if (!gameRunning) return;

    // Move snake
    const head = { ...snake[0] };
    head.x += direction.x;
    head.z += direction.z;

    // Check boundaries
    if (head.x < -GRID_SIZE / 2 || head.x >= GRID_SIZE / 2 || head.z < -GRID_SIZE / 2 || head.z >= GRID_SIZE / 2) {
        gameOver();
        return;
    }

    // Check self collision
    for (let segment of snake) {
        if (segment.x === head.x && segment.z === head.z) {
            gameOver();
            return;
        }
    }

    // Add new head
    snake.unshift(head);
    const geometry = new THREE.BoxGeometry(SEGMENT_SIZE, SEGMENT_SIZE, SEGMENT_SIZE);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const newSegment = new THREE.Mesh(geometry, material);
    newSegment.position.set(head.x, SEGMENT_SIZE / 2, head.z);
    scene.add(newSegment);
    head.mesh = newSegment;

    // Check food
    if (head.x === food.x && head.z === food.z) {
        score++;
        document.getElementById('score').textContent = `Score: ${score}`;
        scene.remove(food.mesh);
        createFood();
    } else {
        // Remove tail
        const tail = snake.pop();
        scene.remove(tail.mesh);
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('game-over').style.display = 'block';
}

function restart() {
    // Reset
    snake.forEach(segment => scene.remove(segment.mesh));
    scene.remove(food.mesh);
    snake = [];
    direction = { x: 0, z: 1 };
    score = 0;
    document.getElementById('score').textContent = 'Score: 0';
    document.getElementById('game-over').style.display = 'none';
    gameRunning = true;
    createSnake();
    createFood();
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    if (currentTime - lastUpdate > GAME_SPEED) {
        update();
        lastUpdate = currentTime;
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();