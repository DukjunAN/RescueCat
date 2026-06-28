// SPECIAL_EMOJI: specialTiles.js의 SPECIAL_TYPES를 보완하는 표시용 매핑
const SPECIAL_EMOJI = { 10:'⚙️', 11:'🌀', 12:'⚡', 13:'💣', 14:'🧲' };

// 특수타일 튜토리얼 발동 레벨 (지정 레벨에서만 튜토리얼 표시)
const TUTORIAL_LEVELS = {
  [10]: 5,   // DRILL    → 레벨 5
  [11]: 11,  // BLACKHOLE → 레벨 11
  [12]: 16,  // CHAIN    → 레벨 16
  [13]: 21,  // TILEBOMB → 레벨 21
  [14]: 26,  // MAGNET   → 레벨 26
};

let _drillSubtitleTimer = null;
let _lastMatchTime = 0;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function inBounds(r, c) { return r >= 0 && r < GRID && c >= 0 && c < GRID; }

function showDrillSubtitle(msg) {
  const el = document.getElementById('drill-subtitle');
  if (!el) return;
  if (_drillSubtitleTimer) clearTimeout(_drillSubtitleTimer);
  el.textContent = msg;
  el.classList.remove('hidden');
  void el.offsetWidth;
  _drillSubtitleTimer = setTimeout(() => el.classList.add('hidden'), 1600);
}

function setTileVisual(el, type) {
  const savedCrate = el.querySelector('.crate-overlay');
  if (typeof isSpecialTile === 'function' && isSpecialTile(type)) {
    el.className = 'tile ' + getSpecialTileClass(type);
    el.style.backgroundImage = '';
    el.textContent = SPECIAL_EMOJI[type] || '★';
    if (savedCrate) el.appendChild(savedCrate);
    return;
  }
  el.className = 'tile ' + (TYPE_CLS[type] ?? '');
  el.textContent = '';
  const scale = currentLevelScales[type] ?? 1.0;
  el.style.backgroundSize = `${scale * 100}%`;
  el.style.backgroundPosition = 'center';
  el.style.backgroundRepeat = 'no-repeat';
  const img = currentLevelAnimals[type];
  el.style.backgroundImage = img ? `url("${img}")` : '';
  if (savedCrate) el.appendChild(savedCrate);
}

// ── 크레이트(박스) 시스템 ──
// crateBoard[r][c]: 0=없음, 1=damaged, 2=normal
let crateBoard = [];

function initCrateBoard() {
  crateBoard = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
}

// 중심에서 가까운 순서로 배치 가능 셀 목록 반환 (가장자리 1칸 제외)
function _getCratePlacementOrder() {
  const cx = (GRID - 1) / 2, cy = (GRID - 1) / 2;
  const cells = [];
  for (let r = 1; r < GRID - 1; r++)
    for (let c = 1; c < GRID - 1; c++)
      cells.push({ r, c, d: Math.hypot(r - cx, c - cy) });
  cells.sort((a, b) => a.d - b.d);
  return cells;
}

// 레벨 101부터 4개씩 추가, 최대 20개
function placeCrates(lv) {
  const count = Math.min(Math.floor((lv - 101) / 10) * 4 + 4, 20);
  const order = _getCratePlacementOrder();
  for (let i = 0; i < Math.min(count, order.length); i++)
    crateBoard[order[i].r][order[i].c] = 2;
  gameLog('CRATE', `레벨 ${lv} 크레이트 ${count}개 배치`);
}

function _renderCrateOverlay(r, c) {
  const el = getTile(r, c);
  if (!el) return;
  let ov = el.querySelector('.crate-overlay');
  const hp = crateBoard[r]?.[c] ?? 0;
  if (hp === 0) { ov?.remove(); return; }
  if (!ov) { ov = document.createElement('div'); ov.className = 'crate-overlay'; el.appendChild(ov); }
  ov.dataset.hp = hp;
}

function renderAllCrateOverlays() {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      _renderCrateOverlay(r, c);
}

function damageCrate(r, c, instant = false) {
  if (!(crateBoard[r]?.[c] > 0)) return;
  const prev = crateBoard[r][c];
  crateBoard[r][c] = instant ? 0 : crateBoard[r][c] - 1;
  gameLog('CRATE', `(${r},${c}) HP ${prev}→${crateBoard[r][c]}${instant ? ' 즉시제거' : ''}`);
  _renderCrateOverlay(r, c);
  if (crateBoard[r][c] === 0) {
    const el = getTile(r, c);
    el?.classList.add('crate-break');
    setTimeout(() => el?.classList.remove('crate-break'), 400);
  }
}

// 제거된 셀 주변(상하좌우)의 크레이트에 1 데미지
function damageCratesAdjacent(cells) {
  const seen = new Set();
  for (const { r, c } of cells) {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;
      if (!inBounds(nr, nc) || seen.has(key) || !(crateBoard[nr]?.[nc] > 0)) continue;
      seen.add(key);
      damageCrate(nr, nc, false);
    }
  }
}

function generateBoard() {
  initCrateBoard();
  board = [];
  for (let r = 0; r < GRID; r++) {
    board[r] = [];
    for (let c = 0; c < GRID; c++) board[r][c] = rnd();
  }
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    let t = 0;
    while (causesMatch(r, c) && t++ < 30) board[r][c] = rnd();
  }
}

function rnd() { return Math.floor(Math.random() * TYPES); }

// 레벨 5 튜토리얼 전용 보드 배치
// Row 3: X X A A B A X X  (A=type0, B=type1, X=type2/3 체커보드)
// Row 4: X X X X A X X X  (스왑 대상 A)
function _setupLevel5TutorialBoard() {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      board[r][c] = (r + c) % 2 === 0 ? 2 : 3;
  board[3][2] = 0; board[3][3] = 0; board[3][4] = 1; board[3][5] = 0;
  board[4][4] = 0;
}

// 레벨 10 튜토리얼 전용 보드 배치 (블랙홀 생성 체험)
// 유저가 (3,3)=A 를 오른쪽으로 스왑해 (3,4)=B 자리에 넣으면
// 가로 3칸 (3,4)(3,5)(3,6) + 세로 4칸 (1,4)(2,4)(3,4)(4,4) = 총 6칸 매치 → 블랙홀 생성
function _setupLevel10TutorialBoard() {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      board[r][c] = (r + c) % 2 === 0 ? 2 : 3;
  board[1][4] = 0; // 세로 위쪽 (6번째 타일, 블랙홀 조건 충족용)
  board[2][4] = 0; // 세로 위
  board[3][3] = 0; // 스왑 소스 (aPos)
  board[3][4] = 1; // 스왑 대상 (bPos) → 블랙홀 생성 위치
  board[3][5] = 0; // 가로 오른쪽
  board[3][6] = 0; // 가로 오른쪽 끝
  board[4][4] = 0; // 세로 아래
}

// 레벨 25 튜토리얼 전용 보드 배치 (자석 생성 체험)
// 유저가 체인(3,4)을 오른쪽으로 스왑해 블랙홀(3,5)과 교환
// → 콤보 조합으로 자석이 (3,5)에 생성
function _setupLevel25TutorialBoard() {
  board[3][4] = SPECIAL_TYPES.CHAIN;      // aPos (손가락 위치, 오른쪽으로 드래그)
  board[3][5] = SPECIAL_TYPES.BLACKHOLE;  // 스왑 대상 (자석 생성 위치)
}

// 레벨 20 튜토리얼 전용 보드 배치 (타일밤 생성 체험)
// 유저가 블랙홀(3,4)을 오른쪽으로 스왑해 회전톱(3,5)과 교환
// → 콤보 조합으로 타일밤이 (3,5)에 생성
function _setupLevel20TutorialBoard() {
  board[3][4] = SPECIAL_TYPES.BLACKHOLE; // aPos (손가락 위치, 오른쪽으로 드래그)
  board[3][5] = SPECIAL_TYPES.DRILL;     // 스왑 대상 (타일밤 생성 위치)
}

// 레벨 15 튜토리얼 전용 보드 배치 (체인 생성 체험)
// 유저가 (2,4)=A 를 아래로 스왑해 (3,4)=B 자리에 넣으면
// 가로 5칸 (3,2)(3,3)(3,4)(3,5)(3,6) 매치 → 체인 생성
function _setupLevel15TutorialBoard() {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      board[r][c] = (r + c) % 2 === 0 ? 2 : 3;
  board[2][4] = 0; // 스왑 소스 (aPos) — 위에서 아래로 드래그
  board[3][2] = 0; // 가로 왼쪽
  board[3][3] = 0; // 가로 왼쪽
  board[3][4] = 1; // 스왑 대상 (bPos) → 체인 생성 위치
  board[3][5] = 0; // 가로 오른쪽
  board[3][6] = 0; // 가로 오른쪽
}

function causesMatch(r, c) {
  const t = board[r][c];
  if (c >= 2 && board[r][c - 1] === t && board[r][c - 2] === t) return true;
  if (r >= 2 && board[r - 1][c] === t && board[r - 2][c] === t) return true;
  return false;
}

function renderBoard() {
  const grid = document.getElementById('grid');
  let existingTiles = Array.from(grid.querySelectorAll('.tile'));
  let tileIndex = 0;

  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    let el = existingTiles[tileIndex];
    if (!el) {
      el = document.createElement('div');
      el.classList.add('tile');
      el.addEventListener('mousedown', onPointerDown);
      el.addEventListener('touchstart', onTouchStart, { passive:false });
      grid.appendChild(el);
    }
    el.dataset.r = r;
    el.dataset.c = c;
    if (board[r][c] < 0) {
      el.className = 'tile empty';
      el.style.backgroundImage = '';
    } else {
      setTileVisual(el, board[r][c]);
    }
    tileIndex++;
  }

  while (tileIndex < existingTiles.length) {
    existingTiles[tileIndex].remove();
    tileIndex++;
  }
  renderAllCrateOverlays();
}

function getTile(r, c) {
  return document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
}

function swap(r1, c1, r2, c2) {
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
  renderBoard();
}

function findMatches() {
  const _hasCrate = (r, c) => crateBoard[r]?.[c] > 0;
  const s = new Set();
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID - 2; c++) {
    const t = board[r][c];
    if (t < 0 || isSpecialTile(t) || _hasCrate(r, c)) continue;
    if (board[r][c+1] === t && !_hasCrate(r,c+1) && board[r][c+2] === t && !_hasCrate(r,c+2)) {
      let l = 3;
      while (c + l < GRID && board[r][c+l] === t && !_hasCrate(r,c+l)) l++;
      for (let i = 0; i < l; i++) s.add(`${r},${c+i}`);
    }
  }
  for (let c = 0; c < GRID; c++) for (let r = 0; r < GRID - 2; r++) {
    const t = board[r][c];
    if (t < 0 || isSpecialTile(t) || _hasCrate(r, c)) continue;
    if (board[r+1][c] === t && !_hasCrate(r+1,c) && board[r+2][c] === t && !_hasCrate(r+2,c)) {
      let l = 3;
      while (r + l < GRID && board[r+l][c] === t && !_hasCrate(r+l,c)) l++;
      for (let i = 0; i < l; i++) s.add(`${r+i},${c}`);
    }
  }
  const _result = [...s].map(k => { const [r, c] = k.split(',').map(Number); return { r, c }; });
  if (_result.length > 0) gameLog('MATCH', `매치 ${_result.length}개: ${_result.map(m=>`(${m.r},${m.c})`).join('')}`);
  return _result;
}

function _drawChainSVG(chainCells, or, oc) {
  const grid = document.getElementById('grid');
  const old = document.getElementById('chain-svg-overlay');
  if (old) old.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'chain-svg-overlay';
  const originEl = getTile(or, oc);
  if (!originEl) return;
  const gRect = grid.getBoundingClientRect();
  const oRect = originEl.getBoundingClientRect();
  const ox = oRect.left - gRect.left + oRect.width  / 2;
  const oy = oRect.top  - gRect.top  + oRect.height / 2;
  chainCells.forEach(cell => {
    const el = getTile(cell.r, cell.c);
    if (!el || (cell.r === or && cell.c === oc)) return;
    const cr = el.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', ox);
    line.setAttribute('y1', oy);
    line.setAttribute('x2', cr.left - gRect.left + cr.width  / 2);
    line.setAttribute('y2', cr.top  - gRect.top  + cr.height / 2);
    svg.appendChild(line);
  });
  grid.appendChild(svg);
  setTimeout(() => svg.remove(), 400);
}

// 매치 배열을 받아 특수타일 생성 조건이면 보드에 배치하고 pivot을 배열에서 제거.
// 특수타일을 생성했으면 true 반환.
function applySpecialTile(matches) {
  const specialType = getSpecialTileType(matches);
  if (specialType === null || matches.length === 0) return false;
  const pivot = matches[Math.floor(matches.length / 2)];
  gameLog('SPECIAL', `✨ 특수타일 생성: type=${specialType} at (${pivot.r},${pivot.c}) (${matches.length+1}매치)`);
  board[pivot.r][pivot.c] = specialType;
  if (window.tutorialManager && !window.tutorialManager.isActive
      && TUTORIAL_LEVELS[specialType] === level) {
    window.tutorialManager.checkAndShow(specialType, matches);
  }
  const pivotEl = getTile(pivot.r, pivot.c);
  if (pivotEl) {
    pivotEl.classList.add(getSpecialTileClass(specialType), 'special-spawn');
    setTimeout(() => pivotEl.classList.remove('special-spawn'), 350);
    if (specialType === SPECIAL_TYPES.DRILL) {
      setTileVisual(pivotEl, specialType);
      gameLog('SPECIAL', `회전톱 생성`);
    }
  }
  matches.splice(matches.findIndex(cell => cell.r === pivot.r && cell.c === pivot.c), 1);
  return true;
}

async function trySwap(r1, c1, r2, c2) {
  clearAutoHint();
  if (window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.phase === 'create') {
    window.tutorialManager._clearHighlight();
    document.getElementById('tut-caption').style.display = 'none';
    document.getElementById('tut-spotlight').style.display = 'none';
    document.getElementById('tut-overlay').style.background = 'rgba(0,0,0,0.82)';
  }
  const _SN = {10:'회전톱',11:'블랙홀',12:'체인',13:'타일밤',14:'자석'};
  animating = true;
  gameLog('ANIM', `animating=true`);
  gameLog('SWAP', `실행 (${r1},${c1})[${board[r1][c1]}]↔(${r2},${c2})[${board[r2][c2]}]`);
  const _preV1 = board[r1][c1], _preV2 = board[r2][c2];
  if (r1 !== r2 || c1 !== c2) {
    swap(r1, c1, r2, c2);
  }
  AudioManager.play('puzzleMove');

  // ── 특수 + 특수 조합 체크 ──
  if (r1 !== r2 || c1 !== c2) {
    const valA = board[r1][c1], valB = board[r2][c2];
    if (isSpecialTile(valA) && isSpecialTile(valB)) {
      const _rank = v => v === SPECIAL_TYPES.DRILL ? 1 : v === SPECIAL_TYPES.BLACKHOLE ? 2 : v === SPECIAL_TYPES.CHAIN ? 3 : 0;
      const _combo = (a, b) => {
        if (a >= 13 || b >= 13) return null;
        if (a === b) return null;
        if (a === SPECIAL_TYPES.CHAIN || b === SPECIAL_TYPES.CHAIN) return SPECIAL_TYPES.MAGNET;
        return SPECIAL_TYPES.TILEBOMB;
      };
      const comboResult = _combo(valA, valB);
      if (comboResult !== null) {
        const [hr, hc, lr, lc] = _rank(valA) >= _rank(valB) ? [r1,c1,r2,c2] : [r2,c2,r1,c1];
        board[hr][hc] = comboResult;
        board[lr][lc] = -1;
        renderBoard();
        const comboEl = getTile(hr, hc);
        comboEl?.classList.add('special-spawn');
        setTimeout(() => comboEl?.classList.remove('special-spawn'), 350);
        gameLog('SPECIAL', `✨ 조합: ${_SN[valA]}+${_SN[valB]} → ${_SN[comboResult]} at (${hr},${hc})`);
        await dropAndFill();
        animating = false;
        if (window.tutorialManager && window.tutorialManager.isActive) {
          window.tutorialManager.onSwapComplete(r1, c1, r2, c2);
        } else {
          scheduleHint();
        }
      } else {
        gameLog('SPECIAL', `특수+특수 조합 불가: ${_SN[valA]}+${_SN[valB]} → 스왑만`);
        animating = false;
        scheduleHint();
      }
      return;
    }
  }

  // ── 특수 타일 즉시 발동 ──
  // 튜토리얼 Phase 2(activate)에서 특수타일 발동 직전에 하이라이트 제거
  // → 애니메이션이 어두운 튜토리얼 오버레이에 가려지지 않도록
  if (window.tutorialManager && window.tutorialManager.isActive && window.tutorialManager.phase === 'activate') {
    window.tutorialManager._clearHighlight();
    document.getElementById('tut-overlay').style.display = 'none';
    document.getElementById('tut-caption').style.display = 'none';
    document.getElementById('tut-finger').style.display = 'none';
    window.tutorialManager._hideSecondFinger();
  }
  const _swapPairs = (r1 === r2 && c1 === c2) ? [[r1,c1]] : [[r1,c1],[r2,c2]];
  for (const [r, c] of _swapPairs) {
    const val = board[r][c];
    if (!isSpecialTile(val)) continue;

    let fx = [];
    const cls = val === SPECIAL_TYPES.DRILL    ? 'drill-firing'
              : val === SPECIAL_TYPES.BLACKHOLE ? 'blackhole-pull'
              : val === SPECIAL_TYPES.CHAIN     ? 'chain-zap'
              : val === SPECIAL_TYPES.TILEBOMB  ? 'tilebomb-explode'
              : 'magnet-pull';

    if (val === SPECIAL_TYPES.DRILL) {
      const drillDir = r1 === r2 ? 'row' : 'col';
      fx = getDrillCells(board, r, c, GRID, drillDir);
      AudioManager.play('sfxDrill');
      gameLog('SPECIAL', `⚙️ 회전톱 발동 at (${r},${c}) dir=${drillDir} → ${fx.length}칸`);
    } else if (val === SPECIAL_TYPES.BLACKHOLE) {
      fx = getBlackholeCells(board, r, c, GRID);
      AudioManager.play('sfxBlackhole');
      gameLog('SPECIAL', `🌀 블랙홀 발동 at (${r},${c}) → ${fx.length}칸`);
    } else if (val === SPECIAL_TYPES.CHAIN) {
      const _isSelf = (r1 === r2 && c1 === c2);
      const _partner = _isSelf ? -1 : (r === r2 && c === c2 ? _preV2 : _preV1);
      fx = getChainCells(board, r, c, GRID, _partner);
      _drawChainSVG(fx, r, c);
      AudioManager.play('sfxChain');
      gameLog('SPECIAL', `⚡ 체인 발동 at (${r},${c}) targetType=${_partner} → ${fx.length}칸`);
    } else if (val === SPECIAL_TYPES.TILEBOMB) {
      fx = getTilebombCells(board, r, c, GRID);
      AudioManager.play('sfxBomb');
      gameLog('BOMB', `💥 타일밤 발동 at (${r},${c}) → ${fx.length}칸`);
    } else if (val === SPECIAL_TYPES.MAGNET) {
      const _isSelf = (r1 === r2 && c1 === c2);
      const _partner = _isSelf ? -1 : (r === r2 && c === c2 ? _preV2 : _preV1);
      fx = getMagnetCells(board, r, c, GRID, _partner);
      AudioManager.play('sfxMagnet');
      setTimeout(() => AudioManager.stop('sfxMagnet'), 1000);
      gameLog('SPECIAL', `🧲 자석 발동 at (${r},${c}) targetType=${_partner} → ${fx.length}칸`);
    }

    fx.forEach(cell => getTile(cell.r, cell.c)?.classList.add(cls));
    fx.push({ r, c });

    // processMatches 내부에서 특수타일이 재발동되지 않도록 미리 -1로 초기화
    board[r][c] = -1;

    await delay(350);
    await processMatches(fx);
    if (window.tutorialManager && window.tutorialManager.isActive) {
      window.tutorialManager.onSwapComplete(r1, c1, r2, c2);
    }
    return;
  }

  // ── 일반 매치 탐색 ──
  const m = findMatches();
  applySpecialTile(m);
  if (m.length > 0) {
    await processMatches(m);
  } else {
    gameLog('SWAP', `매치없음 → 취소`);
    swap(r1, c1, r2, c2);
    gameLog('ANIM', `animating=false`);
    animating = false;
    scheduleHint();
  }
  if (window.tutorialManager && window.tutorialManager.isActive) {
    window.tutorialManager.onSwapComplete(r1, c1, r2, c2);
  }
}

async function processMatches(matches, isChain = false) {
  const now = performance.now();
  const isCombo = isChain || (now - _lastMatchTime < 1000 && _lastMatchTime > 0);
  AudioManager.play(isCombo ? 'comboMatching' : 'matching');
  _lastMatchTime = now;

  const pts = matches.length * 10 * (matches.length >= 5 ? 2 : 1);
  score += pts;
  gameLog('MATCH', `처리 ${matches.length}개 | chain=${isChain} combo=${isCombo} | +${pts}pt → 합계=${score}`);
  if (matches.length >= 5) showCombo(`COMBO! +${pts}`);
  gameLog('SCORE', `시간 추가 없음 (고정)`);

  recordCatActivity();
  setCatState('run');
  const extraCells = [];
  for (const { r, c } of [...matches]) {
    const val = board[r][c];
    if (!isSpecialTile(val)) continue;
    const cls = val === SPECIAL_TYPES.DRILL    ? 'drill-firing'
              : val === SPECIAL_TYPES.BLACKHOLE ? 'blackhole-pull'
              : val === SPECIAL_TYPES.CHAIN     ? 'chain-zap'
              : val === SPECIAL_TYPES.TILEBOMB  ? 'tilebomb-explode'
              :                                   'magnet-pull';
    let fx = [];
    // r1/r2는 processMatches 스코프에 없으므로 DRILL은 기본 'col' 방향 사용
    if      (val === SPECIAL_TYPES.DRILL)     { fx = getDrillCells(board, r, c, GRID, 'col'); gameLog('SPECIAL', `⚙️ 회전톱(매치) at (${r},${c}) → ${fx.length}칸`); }
    else if (val === SPECIAL_TYPES.BLACKHOLE) { fx = getBlackholeCells(board, r, c, GRID); gameLog('SPECIAL', `🌀 블랙홀(매치) at (${r},${c}) → ${fx.length}칸`); }
    else if (val === SPECIAL_TYPES.CHAIN)     { fx = getChainCells(board, r, c, GRID); _drawChainSVG(fx, r, c); gameLog('SPECIAL', `⚡ 체인(매치) at (${r},${c}) → ${fx.length}칸`); }
    else if (val === SPECIAL_TYPES.TILEBOMB)  { fx = getTilebombCells(board, r, c, GRID); gameLog('BOMB', `💥 타일밤(매치) at (${r},${c}) → ${fx.length}칸`); }
    else if (val === SPECIAL_TYPES.MAGNET)    { fx = getMagnetCells(board, r, c, GRID); gameLog('SPECIAL', `🧲 자석(매치) at (${r},${c}) → ${fx.length}칸`); }
    fx.forEach(cell => { getTile(cell.r, cell.c)?.classList.add(cls); extraCells.push(cell); });
  }
  const seen = new Set(matches.map(cell => `${cell.r},${cell.c}`));
  for (const cell of extraCells)
    if (!seen.has(`${cell.r},${cell.c}`)) { matches.push(cell); seen.add(`${cell.r},${cell.c}`); }
  matches.forEach(({ r, c }) => getTile(r, c)?.classList.add('removing'));
  spawnSparkles(matches);
  await delay(300);
  // 특수타일 범위에 크레이트가 포함된 경우 즉시 제거
  for (const { r, c } of matches) {
    if (crateBoard[r]?.[c] > 0) damageCrate(r, c, true);
  }
  for (const { r, c } of matches) {
    board[r][c] = -1;
    const tile = getTile(r, c);
    if (tile) {
      tile.classList.remove('removing');
      tile.className = 'tile empty';
      tile.style.backgroundImage = '';
    }
  }
  // 일반 매치 주변 크레이트에 1 데미지
  damageCratesAdjacent(matches);
  await breakNextBarrier();
  if (gameOver) return;
  await dropAndFill();
  await delay(100);
  const chain = findMatches();
  if (chain.length > 0) {
    gameLog('CHAIN', `연쇄! ${chain.length}개 추가`);
    applySpecialTile(chain);
    await delay(80);
    await processMatches(chain, true);
  } else {
    document.getElementById('score-value').textContent = score;
    gameLog('ANIM', `animating=false | 턴완료 score=${score}`);
    animating = false;
    scheduleHint();
  }
}

async function dropAndFill() {
  const sampleTile = document.querySelector('#grid .tile');
  const sz = sampleTile ? sampleTile.getBoundingClientRect().width : 52;
  const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 1;
  const step = sz + gap;

  const dropDist = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  const newCount = new Array(GRID).fill(0);
  for (let c = 0; c < GRID; c++) {
    let empty = 0;
    for (let r = GRID - 1; r >= 0; r--) {
      if (board[r][c] < 0) { empty++; }
      else { dropDist[r][c] = empty; }
    }
    newCount[c] = empty;
  }

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (board[r][c] >= 0 && dropDist[r][c] > 0) {
        const el = getTile(r, c);
        if (!el) continue;
        el.style.transition = 'none';
        el.style.transform = '';
        el.offsetHeight;
        el.style.transition = 'transform 0.09s cubic-bezier(0.34,1.2,0.64,1)';
        el.style.transform = `translateY(${dropDist[r][c] * step}px)`;
      }
    }
  }

  await delay(60);

  for (let c = 0; c < GRID; c++) {
    let w = GRID - 1;
    for (let r = GRID - 1; r >= 0; r--) {
      if (board[r][c] >= 0) {
        if (w !== r) { board[w][c] = board[r][c]; board[r][c] = -1; }
        w--;
      }
    }
    while (w >= 0) { board[w][c] = rnd(); w--; }
  }

  const _dropped = dropDist.flat().filter(d=>d>0).length;
  const _filled = newCount.reduce((a,b)=>a+b,0);
  gameLog('DROP', `낙하 ${_dropped}칸 | 신규 ${_filled}칸`);

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const el = getTile(r, c);
      if (!el) continue;
      el.style.transition = 'none';
      el.style.transform = '';
      setTileVisual(el, board[r][c]);
    }
  }

  for (let c = 0; c < GRID; c++) {
    for (let r = 0; r < newCount[c]; r++) {
      const el = getTile(r, c);
      if (!el) continue;
      setTileVisual(el, board[r][c]);
      el.style.transition = 'none';
      el.style.transform = `translateY(${-(newCount[c] - r) * step}px)`;
      el.offsetHeight;
      el.style.transition = `transform 0.09s cubic-bezier(0.34,1.2,0.64,1) ${r * 9}ms`;
      el.style.transform = 'translateY(0)';
      el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transform = ''; }, { once: true });
    }
  }

  await delay(80);
}

function spawnSparkles(matches) {
  const emojis = ['✨','⭐','💫','🌟'];
  matches.slice(0, 6).forEach(({ r, c }) => {
    const el = getTile(r, c);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sp = document.createElement('div');
    sp.className = 'sparkle';
    sp.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    sp.style.left = (rect.left + rect.width / 2) + 'px';
    sp.style.top = (rect.top + rect.height / 2) + 'px';
    sp.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    sp.style.setProperty('--dy', (Math.random() * -70 - 10) + 'px');
    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 700);
  });
}

function showCombo(text) {
  const el = document.createElement('div');
  el.className = 'combo-flash';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

function showHint() {
  if (animating || gameOver) { gameLog('HINT', `차단 [animating=${animating} gameOver=${gameOver}]`); return; }
  recordCatActivity();
  gameLog('HINT', `힌트 탐색...`);
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
    if (board[r][c] < 0) continue;
    for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
      if (!inBounds(nr, nc) || board[nr][nc] < 0) continue;
      [board[r][c], board[nr][nc]] = [board[nr][nc], board[r][c]];
      const m = findMatches();
      [board[r][c], board[nr][nc]] = [board[nr][nc], board[r][c]];
      if (m.length > 0) {
        gameLog('HINT', `발견: (${r},${c})↔(${nr},${nc}) → 매치 ${m.length}개 가능`);
        [[r,c],[nr,nc]].forEach(([hr, hc]) => {
          const el = getTile(hr, hc);
          if (!el) return;
          el.classList.add('hint-flash');
          el.addEventListener('animationend', () => el.classList.remove('hint-flash'), { once:true });
        });
        return;
      }
    }
  }
  gameLog('HINT', `가능한 이동 없음 → 셔플`);
  doShuffle();
}

function doShuffle() {
  if (animating || gameOver) return;
  gameLog('HINT', `셔플 실행!`);
  recordCatActivity();
  const flat = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++)
    if (board[r][c] >= 0 && !(crateBoard[r]?.[c] > 0)) flat.push(board[r][c]);
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }
  let idx = 0;
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++)
    if (board[r][c] >= 0 && !(crateBoard[r]?.[c] > 0)) board[r][c] = flat[idx++];
  renderBoard();
}
