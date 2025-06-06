// Emoji Tower Defense
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
let nextSpawn = 0;
let tick = 0;
let paused = false;
let nextWaveTick = null;

const towers = [];
const enemies = [];
const bullets = [];
const coins = [];

let hoverCell = null;
let selectedTower = null;

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

const TOWER_TYPES = {
  crossbow: {emoji:'🏹', damage:1, rate:30, range:3, cost:25},
  tank: {emoji:'🚓', damage:2, rate:45, range:2.5, cost:40},
  mortar: {emoji:'💣', damage:3, rate:60, range:4, cost:60}
};

const ENEMY_TYPES = [
  {emoji:'😀', hp:3, speed:0.03},
  {emoji:'😈', hp:5, speed:0.025},
  {emoji:'👻', hp:8, speed:0.02}
];
const BOSS_EMOJI = '👹';

const goldEl = document.getElementById('gold');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const countdownEl = document.getElementById('countdown');
const towerSelect = document.getElementById('towerType');
const pauseBtn = document.getElementById('pauseBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const upgradeMenu = document.getElementById('upgradeMenu');
const closeUpgrade = document.getElementById('closeUpgrade');

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

saveBtn.addEventListener('click', () => {
  localStorage.setItem('tdSave', JSON.stringify({gold,lives,wave,towers}));
});

loadBtn.addEventListener('click', () => {
  const data = localStorage.getItem('tdSave');
  if (data) {
    const s = JSON.parse(data);
    gold = s.gold;
    lives = s.lives;
    wave = s.wave;
    towers.length = 0;
    for (const t of s.towers) towers.push(t);
  }
});

closeUpgrade.addEventListener('click', () => {
  upgradeMenu.style.display = 'none';
  selectedTower = null;
});

upgradeMenu.addEventListener('click', e => {
  const type = e.target.dataset.up;
  if (!type || !selectedTower) return;
  const cost = 20 * selectedTower.level;
  if (gold < cost) return;
  gold -= cost;
  if (type === 'damage') selectedTower.damage++;
  if (type === 'speed') selectedTower.rate = Math.max(5, selectedTower.rate - 5);
  if (type === 'range') selectedTower.range += 0.5;
  selectedTower.level++;
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const gy = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  hoverCell = {x: gx, y: gy};
});

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const gy = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  const tower = towers.find(t => t.x === gx && t.y === gy);
  if (tower) {
    selectedTower = tower;
    upgradeMenu.style.display = 'block';
    return;
  }
  if (!isBuildable(gx, gy)) return;
  const type = TOWER_TYPES[towerSelect.value];
  if (gold >= type.cost) {
    gold -= type.cost;
    towers.push({
      type: towerSelect.value,
      x: gx,
      y: gy,
      cooldown: 0,
      damage: type.damage,
      rate: type.rate,
      range: type.range,
      level: 1
    });
  }
});

canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((e.clientX - rect.left) / TILE_SIZE);
  const gy = Math.floor((e.clientY - rect.top) / TILE_SIZE);
  const tower = towers.find(t => t.x === gx && t.y === gy);
  if (tower) {
    selectedTower = tower;
    upgradeMenu.style.display = 'block';
  }
});

function isBuildable(x, y) {
  if (path.find(p => p.x === x && p.y === y)) return false;
  if (towers.find(t => t.x === x && t.y === y)) return false;
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
  return true;
}

function scheduleWave() {
  nextWaveTick = tick + 600; // ~10 seconds
  countdownEl.textContent = 'Next wave in 10';
}

function startWave() {
  wave++;
  waveRemaining = 5 + wave * 2;
  if (wave % 10 === 0) waveRemaining++; // boss
  spawning = true;
  nextSpawn = tick;
  nextWaveTick = null;
}

function spawnEnemy() {
  let type;
  if (wave % 10 === 0 && waveRemaining === 1) {
    type = {emoji:BOSS_EMOJI, hp: 20 + wave * 2, speed:0.015};
  } else {
    type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
  }
  enemies.push({
    pathIndex: 0,
    hp: type.hp,
    maxHp: type.hp,
    x: path[0].x,
    y: path[0].y,
    emoji: type.emoji,
    speed: type.speed
  });
}

function spawnCoin(x, y, amount) {
  coins.push({x:x*TILE_SIZE, y:y*TILE_SIZE, amount, life:30});
}

function update() {
  if (paused) return;
  tick++;
  if (nextWaveTick) {
    const remain = Math.ceil((nextWaveTick - tick)/60);
    countdownEl.textContent = 'Next wave in ' + remain;
    if (remain <= 0) {
      countdownEl.textContent = '';
      startWave();
    }
  }
  if (spawning && waveRemaining > 0 && tick >= nextSpawn) {
    spawnEnemy();
    waveRemaining--;
    nextSpawn = tick + 40;
    if (waveRemaining === 0) spawning = false;
  }

  for (let i=0;i<enemies.length;i++){
    const enemy=enemies[i];
    if (enemy.pathIndex < path.length - 1) {
      enemy.pathIndex += enemy.speed;
      const idx = Math.floor(enemy.pathIndex);
      const t = enemy.pathIndex - idx;
      const p0 = path[idx];
      const p1 = path[idx+1]||p0;
      enemy.x = p0.x + (p1.x-p0.x)*t;
      enemy.y = p0.y + (p1.y-p0.y)*t;
    } else enemy.reached=true;
  }

  for (const tower of towers){
    if (tower.cooldown>0) tower.cooldown--; else {
      const target = enemies.find(e=>Math.hypot(e.x-tower.x,e.y-tower.y)<=tower.range);
      if (target){
        bullets.push({x:tower.x,y:tower.y,target,emoji:'🔸'});
        tower.cooldown=tower.rate;
      }
    }
  }

  for (const bullet of bullets){
    const dx=bullet.target.x - bullet.x;
    const dy=bullet.target.y - bullet.y;
    const dist=Math.hypot(dx,dy);
    bullet.x += dx/dist*0.2;
    bullet.y += dy/dist*0.2;
    if (dist<0.2){
      bullet.target.hp -= bullet.target.hp>0?1:0;
      spawnCoin(bullet.target.x, bullet.target.y, 1);
      bullet.dead=true;
    }
  }

  for (let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if (e.hp<=0){
      spawnCoin(e.x,e.y,5);
      enemies.splice(i,1);
    } else if (e.reached){
      lives--;
      enemies.splice(i,1);
    }
  }
  for (let i=bullets.length-1;i>=0;i--) if (bullets[i].dead) bullets.splice(i,1);

  for (const c of coins){
    const goldRect=goldEl.getBoundingClientRect();
    const canvasRect=canvas.getBoundingClientRect();
    const tx=goldRect.left-canvasRect.left;
    const ty=goldRect.top-canvasRect.top;
    c.x += (tx - c.x)/10;
    c.y += (ty - c.y)/10;
    c.life--;
    if (c.life<=0){
      gold += c.amount;
      coins.splice(coins.indexOf(c),1);
    }
  }

  if (!spawning && waveRemaining === 0 && enemies.length === 0 && !nextWaveTick && wave < 50) {
    scheduleWave();
  }

  goldEl.textContent = gold;
  livesEl.textContent = lives;
  waveEl.textContent = wave;
}

function drawGrid(){
  ctx.strokeStyle = '#333';
  for (let x=0;x<=MAP_WIDTH;x++){
    ctx.beginPath();
    ctx.moveTo(x*TILE_SIZE,0);
    ctx.lineTo(x*TILE_SIZE,canvas.height);
    ctx.stroke();
  }
  for (let y=0;y<=MAP_HEIGHT;y++){
    ctx.beginPath();
    ctx.moveTo(0,y*TILE_SIZE);
    ctx.lineTo(canvas.width,y*TILE_SIZE);
    ctx.stroke();
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrid();

  ctx.fillStyle='#444';
  for (const cell of path){
    ctx.fillRect(cell.x*TILE_SIZE, cell.y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  for (const tower of towers){
    ctx.font='24px serif';
    ctx.fillText(TOWER_TYPES[tower.type].emoji, tower.x*TILE_SIZE+8, tower.y*TILE_SIZE+24);
  }

  if (hoverCell && isBuildable(hoverCell.x, hoverCell.y)){
    ctx.strokeStyle='rgba(0,255,0,0.5)';
    const r=TOWER_TYPES[towerSelect.value].range*TILE_SIZE;
    ctx.beginPath();
    ctx.arc(hoverCell.x*TILE_SIZE+TILE_SIZE/2, hoverCell.y*TILE_SIZE+TILE_SIZE/2, r, 0, Math.PI*2);
    ctx.stroke();
  }

  for (const enemy of enemies){
    let emoji=enemy.emoji;
    if (enemy.hp/enemy.maxHp<0.5) emoji='😞';
    if (enemy.hp/enemy.maxHp<0.2) emoji='😵';
    ctx.font='24px serif';
    ctx.fillText(emoji, enemy.x*TILE_SIZE+8, enemy.y*TILE_SIZE+24);
  }

  for (const b of bullets){
    ctx.fillText(b.emoji, b.x*TILE_SIZE+8, b.y*TILE_SIZE+24);
  }

  for (const c of coins){
    ctx.fillText('🪙', c.x, c.y);
  }
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

scheduleWave();
loop();
