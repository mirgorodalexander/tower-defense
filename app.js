// Simple Tower Defense Demo
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const MAP_WIDTH = canvas.width / TILE_SIZE;
const MAP_HEIGHT = canvas.height / TILE_SIZE;

let gold = 100;
let lives = 20;
let wave = 0;
let spawning = false;
let waveRemaining = 0;

// predefined zigzag path
const path = [];
function addLine(x0, y0, x1, y1) {
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);
    let x = x0, y = y0;
    path.push({x, y});
    while (x !== x1 || y !== y1) {
        if (x !== x1) x += dx;
        if (y !== y1) y += dy;
        path.push({x, y});
    }
}

addLine(0, Math.floor(MAP_HEIGHT / 2), 5, Math.floor(MAP_HEIGHT / 2));
addLine(5, Math.floor(MAP_HEIGHT / 2), 5, MAP_HEIGHT - 3);
addLine(5, MAP_HEIGHT - 3, 15, MAP_HEIGHT - 3);
addLine(15, MAP_HEIGHT - 3, 15, 4);
addLine(15, 4, MAP_WIDTH - 1, 4);

// placed towers
const towers = [];

const enemies = [];
const bullets = [];
let tick = 0;

const goldEl = document.getElementById('gold');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const startBtn = document.getElementById('startWave');

startBtn.addEventListener('click', () => {
    if (!spawning && enemies.length === 0) startWave();
});

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const gy = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    if (!isBuildable(gx, gy)) return;
    const cost = 25;
    if (gold >= cost) {
        gold -= cost;
        towers.push({x: gx, y: gy, cooldown: 0});
    }
});

function isBuildable(x, y) {
    if (path.find(p => p.x === x && p.y === y)) return false;
    if (towers.find(t => t.x === x && t.y === y)) return false;
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    return true;
}

function startWave() {
    wave++;
    waveRemaining = 5 + wave * 2;
    spawning = true;
    startBtn.disabled = true;
}

function spawnEnemy() {
    enemies.push({pathIndex: 0, hp: 3, x: path[0].x, y: path[0].y});
}

function update() {
    tick++;
    if (spawning && waveRemaining > 0 && tick % 60 === 0) {
        spawnEnemy();
        waveRemaining--;
        if (waveRemaining === 0) spawning = false;
    }

    // move enemies along path
    for (const enemy of enemies) {
        if (enemy.pathIndex < path.length - 1) {
            enemy.pathIndex += 0.02;
            const p = path[Math.floor(enemy.pathIndex)];
            enemy.x = p.x;
            enemy.y = p.y;
        } else {
            enemy.reached = true;
        }
    }

    // towers shoot
    for (const tower of towers) {
        if (tower.cooldown > 0) tower.cooldown--;
        else {
            const target = enemies.find(e => Math.hypot(e.x - tower.x, e.y - tower.y) <= 3);
            if (target) {
                bullets.push({x: tower.x, y: tower.y, target});
                tower.cooldown = 30;
            }
        }
    }

    // move bullets
    for (const bullet of bullets) {
        const dx = bullet.target.x - bullet.x;
        const dy = bullet.target.y - bullet.y;
        const dist = Math.hypot(dx, dy);
        bullet.x += dx / dist * 0.2;
        bullet.y += dy / dist * 0.2;
        if (dist < 0.2) {
            bullet.target.hp--;
            bullet.dead = true;
        }
    }

    // remove dead bullets and enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hp <= 0) {
            enemies.splice(i, 1);
            gold += 5;
        } else if (e.reached) {
            lives--;
            enemies.splice(i, 1);
        }
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].dead) bullets.splice(i, 1);
    }

    if (!spawning && waveRemaining === 0 && enemies.length === 0) {
        startBtn.disabled = false;
    }

    goldEl.textContent = gold;
    livesEl.textContent = lives;
    waveEl.textContent = wave;
}

function drawGrid() {
    ctx.strokeStyle = '#333';
    for (let x = 0; x <= MAP_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(canvas.width, y * TILE_SIZE);
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // draw path
    ctx.fillStyle = '#444';
    for (const cell of path) {
        ctx.fillRect(cell.x * TILE_SIZE, cell.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // draw towers
    ctx.fillStyle = '#0f0';
    for (const tower of towers) {
        ctx.fillRect(tower.x * TILE_SIZE, tower.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // draw enemies
    ctx.fillStyle = '#f00';
    for (const enemy of enemies) {
        ctx.fillRect(enemy.x * TILE_SIZE, enemy.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // draw bullets
    ctx.fillStyle = '#ff0';
    for (const bullet of bullets) {
        ctx.beginPath();
        ctx.arc(bullet.x * TILE_SIZE + TILE_SIZE / 2, bullet.y * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

goldEl.textContent = gold;
livesEl.textContent = lives;
waveEl.textContent = wave;

loop();
