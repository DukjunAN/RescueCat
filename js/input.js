const DRAG_THRESH = 6, DIR_MIN = 18;
let drag = { active:false, r:-1, c:-1, startX:0, startY:0, el:null, ghost:null };
let dragMoved = false;

function onPointerDown(e) {
  if (animating || gameOver) return;
  if (window.tutorialManager?.isActive && window.tutorialManager?.phase === 'watch') return;
  e.preventDefault();
  const el = e.currentTarget;
  recordCatActivity();
  startDrag(+el.dataset.r, +el.dataset.c, e.clientX, e.clientY, el);
}

function onTouchStart(e) {
  if (animating || gameOver) return;
  if (window.tutorialManager?.isActive && window.tutorialManager?.phase === 'watch') return;
  e.preventDefault();
  const t = e.touches[0];
  const el = e.currentTarget;
  recordCatActivity();
  startDrag(+el.dataset.r, +el.dataset.c, t.clientX, t.clientY, el);
}

document.addEventListener('mousemove', e => { if (drag.active) moveDrag(e.clientX, e.clientY); });
document.addEventListener('mouseup', e => { if (drag.active) endDrag(e.clientX, e.clientY); });
document.addEventListener('touchmove', e => { if (drag.active) { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); } }, { passive:false });
document.addEventListener('touchend', e => { if (drag.active) endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY); });

function startDrag(r, c, x, y, el) {
  if (crateBoard[r]?.[c] > 0) return;
  drag = { active:true, r, c, startX:x, startY:y, el };
  dragMoved = false;
  const ghost = document.getElementById('drag-ghost');
  ghost.style.display = 'none';
  const rect = el.getBoundingClientRect();
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  setTileVisual(ghost, board[r][c]);
  drag.ghost = ghost;
}

function moveDrag(x, y) {
  const dx = x - drag.startX, dy = y - drag.startY;
  if (!dragMoved && Math.hypot(dx, dy) >= DRAG_THRESH) {
    dragMoved = true;
    drag.el.style.opacity = '0.3';
    drag.ghost.style.display = 'flex';
    highlightTarget(dx, dy);
  }
  if (dragMoved) {
    drag.ghost.style.left = x + 'px';
    drag.ghost.style.top = y + 'px';
    highlightTarget(dx, dy);
  }
}

function endDrag(x, y) {
  drag.active = false;
  clearSwapTargets();
  drag.ghost.style.display = 'none';
  if (drag.el) drag.el.style.opacity = '';
  const dx = x - drag.startX, dy = y - drag.startY;
  if (!dragMoved || Math.hypot(dx, dy) < DRAG_THRESH) { onTileClick(drag.r, drag.c); return; }

  // 특수 타일을 직접 스와이프하면 즉시 발동
  const srcVal = board[drag.r]?.[drag.c];
  if (!animating && !gameOver && typeof isSpecialTile === 'function' && isSpecialTile(srcVal)) {
    const swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'row' : 'col';
    const _swipeDir = getDir(dx, dy);
    const targetVal = _swipeDir && inBounds(_swipeDir.tr, _swipeDir.tc) ? board[_swipeDir.tr][_swipeDir.tc] : null;
    if (targetVal !== null && isSpecialTile(targetVal)) {
      gameLog('DRAG', `특수+특수 조합시도 (${drag.r},${drag.c})[${srcVal}]↔(${_swipeDir.tr},${_swipeDir.tc})[${targetVal}]`);
      clearSelection();
      trySwap(drag.r, drag.c, _swipeDir.tr, _swipeDir.tc);
      return;
    }
    // 드릴·체인·자석: 드래그 방향의 실제 타일과 스왑 (파트너 타일 타입이 효과에 영향)
    if (srcVal === SPECIAL_TYPES.DRILL || srcVal === SPECIAL_TYPES.CHAIN || srcVal === SPECIAL_TYPES.MAGNET) {
      if (!_swipeDir) return;
      gameLog('DRAG', `특수타일 방향스왑 (${drag.r},${drag.c}) type=${srcVal} dir=${swipeDir}`);
      clearSelection();
      trySwap(drag.r, drag.c, _swipeDir.tr, _swipeDir.tc);
      return;
    }
    // 블랙홀·타일밤: 방향 무관, 자기 자신과 스왑으로 발동
    gameLog('DRAG', `특수타일 직접발동 (${drag.r},${drag.c}) type=${srcVal} dir=${swipeDir}`);
    clearSelection();
    trySwap(drag.r, drag.c, drag.r, drag.c);
    return;
  }

  const dir = getDir(dx, dy);
  if (!dir) { gameLog('DRAG', `방향 미결정 dx=${dx.toFixed(0)} dy=${dy.toFixed(0)}`); return; }
  const { tr, tc } = dir;
  const dirName = tr < drag.r ? '↑' : tr > drag.r ? '↓' : tc < drag.c ? '←' : '→';
  if (inBounds(tr, tc) && !(crateBoard[tr]?.[tc] > 0)) {
    gameLog('DRAG', `드래그 스왑 (${drag.r},${drag.c})[${board[drag.r][drag.c]}]${dirName}(${tr},${tc})[${board[tr][tc]}]`);
    clearSelection();
    trySwap(drag.r, drag.c, tr, tc);
  }
}

function getDir(dx, dy) {
  if (Math.abs(dx) < DIR_MIN && Math.abs(dy) < DIR_MIN) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? { tr: drag.r, tc: drag.c + 1 } : { tr: drag.r, tc: drag.c - 1 };
  return dy > 0 ? { tr: drag.r + 1, tc: drag.c } : { tr: drag.r - 1, tc: drag.c };
}

function highlightTarget(dx, dy) {
  clearSwapTargets();
  const dir = getDir(dx, dy);
  if (!dir) return;
  const { tr, tc } = dir;
  if (inBounds(tr, tc)) getTile(tr, tc)?.classList.add('swap-target');
}

function clearSwapTargets() {
  document.querySelectorAll('.swap-target').forEach(el => el.classList.remove('swap-target'));
}

function onTileClick(r, c) {
  clearAutoHint();
  const _tv = board[r]?.[c];
  gameLog('CLICK', `(${r},${c}) type=${_tv} | animating=${animating} sel=${selected ? `(${selected.r},${selected.c})` : '없음'}`);
  if (animating || gameOver || board[r][c] < 0) {
    const _why = animating ? '애니중' : gameOver ? '게임오버' : '빈칸';
    gameLog('CLICK', `→ 차단 [${_why}]`);
    return;
  }
  recordCatActivity();
  if (!selected) {
    selected = { r, c };
    getTile(r, c)?.classList.add('selected');
    gameLog('SELECT', `✔ 선택 (${r},${c}) type=${_tv}`);
  } else if (selected.r === r && selected.c === c) {
    gameLog('SELECT', `✖ 해제 (${r},${c})`);
    clearSelection();
  } else if (adj(selected.r, selected.c, r, c)) {
    if (crateBoard[r]?.[c] > 0) { clearSelection(); return; }
    const { r: sr, c: sc } = selected;
    gameLog('SWAP', `↔ 클릭스왑 (${sr},${sc})[${board[sr][sc]}]↔(${r},${c})[${_tv}]`);
    clearSelection();
    trySwap(sr, sc, r, c);
  } else {
    gameLog('SELECT', `→ 변경 (${selected.r},${selected.c})→(${r},${c}) type=${_tv}`);
    clearSelection();
    selected = { r, c };
    getTile(r, c)?.classList.add('selected');
  }
}

function clearSelection() {
  if (selected) {
    gameLog('SELECT', `클리어 (${selected.r},${selected.c})`);
    getTile(selected.r, selected.c)?.classList.remove('selected');
    selected = null;
  }
}

function adj(r1, c1, r2, c2) {
  return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
}
