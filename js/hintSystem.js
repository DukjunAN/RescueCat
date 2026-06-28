let _hintTimer = null, _activeHint = null;

function findBestHint() {
  _logSuppressed = true;
  let best = null, bestCount = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (board[r][c] < 0 || isSpecialTile(board[r][c]) || crateBoard[r]?.[c] > 0) continue;
      for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
        if (!inBounds(nr, nc) || board[nr][nc] < 0 || crateBoard[nr]?.[nc] > 0) continue;
        [board[r][c], board[nr][nc]] = [board[nr][nc], board[r][c]];
        const m = findMatches();
        [board[r][c], board[nr][nc]] = [board[nr][nc], board[r][c]];
        if (m.length > bestCount) { bestCount = m.length; best = { r, c, nr, nc, matches: [...m] }; }
      }
    }
  }
  _logSuppressed = false;
  return best;
}

function clearAutoHint() {
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
  if (_activeHint) {
    const { srcEl, matchEls } = _activeHint;
    srcEl?.classList.remove('hint-source','hint-dir-right','hint-dir-left','hint-dir-up','hint-dir-down');
    matchEls.forEach(el => el?.classList.remove('hint-match'));
    _activeHint = null;
  }
}

function scheduleHint() {
  clearAutoHint();
  if (gameOver) return;
  _hintTimer = setTimeout(() => {
    _hintTimer = null;
    if (animating || gameOver) return;
    const best = findBestHint();
    if (!best) { doShuffle(); return; }
    const { r, c, nr, nc, matches } = best;
    const srcInMatch = matches.some(m => m.r === r && m.c === c);
    const [sr, sc, dr, dc] = srcInMatch ? [nr, nc, r, c] : [r, c, nr, nc];
    const srcEl = getTile(sr, sc);
    if (!srcEl) return;
    const dir = dr < sr ? 'up' : dr > sr ? 'down' : dc < sc ? 'left' : 'right';
    srcEl.classList.add('hint-source', `hint-dir-${dir}`);
    const matchEls = matches
      .filter(m => !(m.r === dr && m.c === dc))
      .map(m => getTile(m.r, m.c))
      .filter(Boolean);
    matchEls.forEach(el => el.classList.add('hint-match'));
    _activeHint = { srcEl, matchEls };
    gameLog('HINT', `자동힌트 (${sr},${sc})→${dir} | 최대매치 ${matches.length}개`);
  }, 3000);
}
