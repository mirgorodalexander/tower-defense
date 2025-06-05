// Simple Tower Defense Demo
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const MAP_WIDTH = canvas.width / TILE_SIZE;
const MAP_HEIGHT = canvas.height / TILE_SIZE;

// path for enemies (straight path left to right)
const path = [];
for (let x = 0; x < MAP_WIDTH; x++) {
    path.push({x, y: Math.floor(MAP_HEIGHT / 2)});
}

// towers placed near the path
const towers = [
    {x: 5, y: Math.floor(MAP_HEIGHT / 2) - 1, cooldown: 0},
    {x: 10, y: Math.floor(MAP_HEIGHT / 2) - 1, cooldown: 0}
];

const enemies = [];
const bullets = [];
let tick = 0;

function spawnEnemy() {
    enemies.push({pathIndex: 0, hp: 3, x: path[0].x, y: path[0].y});
}

function update() {
    tick++;
    if (tick % 60 === 0) spawnEnemy();

    // move enemies along path
    for (const enemy of enemies) {
        if (enemy.pathIndex < path.length - 1) {
            enemy.pathIndex += 0.02;
            const p = path[Math.floor(enemy.pathIndex)];
            enemy.x = p.x;
            enemy.y = p.y;
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
        if (enemies[i].hp <= 0 || enemies[i].pathIndex >= path.length - 1) enemies.splice(i, 1);
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].dead) bullets.splice(i, 1);
    }
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

loop();
