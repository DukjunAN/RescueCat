// ── 고양이 스프라이트 ──
const CAT_CELL = 32;
const CAT_SPRITE = new Image();
const CAT_ANIMS = {
  idle:      { row: 0, frames: 4, fps: 6 },
  groom:     { row: 2, frames: 4, fps: 5 },
  run:       { row: 4, frames: 8, fps: 12 },
  scare:     { row: 9, frames: 8, fps: 10 },
  celebrate: { row: 8, frames: 7, fps: 4 },
};
let catFrame = 0;
let catFrameTimer = 0;
let catState = 'run';
let catAnimRAF = null;
let lastActionTime = performance.now();
let dragonAnimT = 0;
let lastFrameTime = 0;

function recordCatActivity() {
  lastActionTime = performance.now();
  if (!gameOver && catState !== 'run') setCatState('run');
}

function drawCat(canvas, state, dt) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!CAT_SPRITE.complete) return;

  const anim = CAT_ANIMS[state] || CAT_ANIMS.idle;
  catFrameTimer += dt;
  const frameLength = 1 / anim.fps;
  if (catFrameTimer >= frameLength) {
    catFrameTimer -= frameLength;
    catFrame = (catFrame + 1) % anim.frames;
  }

  const sx = catFrame * CAT_CELL;
  const sy = anim.row * CAT_CELL;
  const scale = 3;
  const drawW = CAT_CELL * scale;
  const drawH = CAT_CELL * scale;
  const dx = (W - drawW) / 2;
  const dy = H - drawH - 2;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(CAT_SPRITE, sx, sy, CAT_CELL, CAT_CELL, dx, dy, drawW, drawH);
}

function setCatState(s) {
  if (catState !== s) {
    catState = s;
    catFrame = 0;
    catFrameTimer = 0;
  }
}

function animateWinCat() {
  const canvas = document.getElementById('win-cat-canvas');
  function frame() {
    drawCat(canvas, 'celebrate', 0.016);
    if (!document.getElementById('win-overlay').classList.contains('hidden'))
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── 드래곤 캔버스 ──
function drawDragon(canvas, t, urgency) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = 36, cy = H - 4;
  const angry = urgency > 0.6;

  ctx.save();
  const bob = Math.sin(t * 6) * 2;
  ctx.translate(0, bob);

  ctx.save();
  const dTailWag = Math.sin(t * 8) * 0.4;
  ctx.translate(cx - 20, cy - 18);
  ctx.rotate(0.3 + dTailWag);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-20, -10, -30, -20, -18, -36);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2d5a00';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, -36);
  ctx.lineTo(-26, -46);
  ctx.lineTo(-10, -40);
  ctx.closePath();
  ctx.fillStyle = '#1a3a00';
  ctx.fill();
  ctx.restore();

  const wingFlap = Math.sin(t * 8) * 0.3;
  ctx.save();
  ctx.translate(cx - 4, cy - 32);
  ctx.rotate(-0.2 + wingFlap);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-10, -20, -30, -30, -20, -50);
  ctx.bezierCurveTo(-5, -40, 5, -20, 0, 0);
  ctx.fillStyle = '#1a3a00';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx + 10, cy - 30);
  ctx.rotate(0.2 - wingFlap);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(10, -20, 30, -30, 20, -50);
  ctx.bezierCurveTo(5, -40, -5, -20, 0, 0);
  ctx.fillStyle = '#1a3a00';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(cx, cy - 22, 22, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2d6b00';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx + 2, cy - 18, 12, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4a9900';
  ctx.fill();

  const legPhases = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
  const legXs = [cx - 12, cx + 12, cx - 8, cx + 8];
  legPhases.forEach((phase, i) => {
    const swing = Math.sin(t * 8 + phase) * 8;
    ctx.beginPath();
    ctx.moveTo(legXs[i], cy - 8);
    ctx.lineTo(legXs[i] + (i < 2 ? swing * 0.3 : 0), cy + 2 + Math.abs(swing));
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1a4a00';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(legXs[i] + (i < 2 ? swing * 0.3 : 0), cy + 2 + Math.abs(swing), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0d2a00';
    ctx.fill();
  });

  const headX = cx + 20, headY = cy - 44;
  ctx.beginPath();
  ctx.ellipse(headX, headY, 18, 14, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#2d6b00';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(headX + 12, headY + 4, 8, 6, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#3d8500';
  ctx.fill();

  [headX + 8, headX + 15].forEach(nx => {
    ctx.beginPath();
    ctx.arc(nx, headY + 5, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0d2a00';
    ctx.fill();
  });

  [[-8, -12], [2, -14]].forEach(([hx, hy]) => {
    ctx.beginPath();
    ctx.moveTo(headX + hx, headY + hy + 6);
    ctx.lineTo(headX + hx - 3, headY + hy - 6);
    ctx.lineTo(headX + hx + 3, headY + hy - 2);
    ctx.closePath();
    ctx.fillStyle = '#8b0000';
    ctx.fill();
  });

  const eyeColor = angry ? '#ff0000' : '#ffcc00';
  const eyeGlow = angry ? 6 : 0;
  [headX - 4, headX + 7].forEach(ex => {
    if (eyeGlow > 0) {
      ctx.shadowBlur = eyeGlow;
      ctx.shadowColor = '#ff0000';
    }
    ctx.beginPath();
    ctx.ellipse(ex, headY - 2, 4, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(ex, headY - 2, 1.5, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
  });

  if (angry) {
    const fireT = (t * 4) % 1;
    const fireX = headX + 18;
    const fireY = headY + 4;
    ['#ff4400','#ff8800','#ffcc00'].forEach((col, i) => {
      ctx.beginPath();
      ctx.ellipse(fireX + i * 6 + fireT * 8, fireY, 5 - i, 3 - i * 0.5, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = 1 - fireT * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  for (let i = 0; i < 4; i++) {
    const sx = cx - 14 + i * 8, sy = cy - 38;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy + 6);
    ctx.lineTo(sx, sy - 4 - i * 2);
    ctx.lineTo(sx + 3, sy + 6);
    ctx.closePath();
    ctx.fillStyle = '#1a4a00';
    ctx.fill();
  }

  ctx.restore();
}

// ── 애니메이션 루프 ──
function animLoop(ts) {
  const dt = Math.min((ts - lastFrameTime) / 1000, 0.05);
  lastFrameTime = ts;
  dragonAnimT += dt;

  const now = performance.now();
  if (!gameOver) {
    if (timeLeft <= 20 && timeLeft > 0) {
      setCatState('scare');
    } else if (now - lastActionTime > 6000) {
      setCatState('groom');
    } else if (now - lastActionTime > 3000) {
      setCatState('idle');
    } else {
      setCatState('run');
    }
  }

  drawCat(document.getElementById('cat-canvas'), catState, dt);
  drawDragon(document.getElementById('dragon-canvas'), dragonAnimT, urgency);

  catAnimRAF = requestAnimationFrame(animLoop);
}

function startAnimLoop() {
  if (catAnimRAF) cancelAnimationFrame(catAnimRAF);
  lastFrameTime = performance.now();
  catAnimRAF = requestAnimationFrame(animLoop);
}
