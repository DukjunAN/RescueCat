/**
 * js/specialTileEffects.js
 *
 * 특수 타일 발동 시 제거 대상 셀을 계산하는 함수 모음.
 * 실제 제거는 호출부(processMatches)가 담당한다.
 *
 * 공통 규칙:
 *   - 반환 배열에 빈칸(-1), 특수 타일(>=10) 포함 가능 (호출부가 스킵)
 *   - 0 <= r,c < GRID 범위만 반환
 */

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

/** 보드 범위 내 여부 */
function _inBounds(r, c, GRID) {
  return r >= 0 && r < GRID && c >= 0 && c < GRID;
}

/**
 * 원형 범위 내 모든 셀 반환
 * @param {number} or   중심 행
 * @param {number} oc   중심 열
 * @param {number} radius
 * @param {number} GRID
 * @returns {{r:number, c:number}[]}
 */
function _circleArea(or, oc, radius, GRID) {
  const cells = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (Math.sqrt(dr * dr + dc * dc) <= radius) {
        const nr = or + dr, nc = oc + dc;
        if (_inBounds(nr, nc, GRID)) cells.push({ r: nr, c: nc });
      }
    }
  }
  return cells;
}

/**
 * Fisher-Yates 셔플로 배열 일부를 무작위 선택
 * @param {any[]} arr
 * @param {number} n
 * @returns {any[]}  최대 n개
 */
function _randomPick(arr, n) {
  const pool = arr.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// ─────────────────────────────────────────────────────────────
// 1. getDrillCells
// ─────────────────────────────────────────────────────────────

/**
 * 드릴 타일 효과: 생성 방향(행 또는 열) 전체를 제거 대상으로 반환.
 *
 * @param {number[][]} board
 * @param {number} r
 * @param {number} c
 * @param {number} GRID
 * @param {'row'|'col'} direction  'row' → r행 전체, 'col' → c열 전체
 * @returns {{r:number, c:number}[]}
 */
function getDrillCells(board, r, c, GRID, direction) {
  const cells = [];
  if (direction === 'row') {
    for (let col = 0; col < GRID; col++) cells.push({ r, c: col });
  } else {
    for (let row = 0; row < GRID; row++) cells.push({ r: row, c });
  }
  return cells;
}

// ─────────────────────────────────────────────────────────────
// 2. getBlackholeCells
// ─────────────────────────────────────────────────────────────

/**
 * 블랙홀 타일 효과: 중심 기준 반경 2칸 원형 범위의 모든 셀 반환.
 * 중심(r,c) 포함.
 *
 * @param {number[][]} board
 * @param {number} r
 * @param {number} c
 * @param {number} GRID
 * @returns {{r:number, c:number}[]}
 */
function getBlackholeCells(board, r, c, GRID) {
  return _circleArea(r, c, 2, GRID);
}

// ─────────────────────────────────────────────────────────────
// 3. getChainCells
// ─────────────────────────────────────────────────────────────

/**
 * 체인 타일 효과: origin과 같은 동물 타입(0~4) 타일 중 최대 8개를 무작위 선택.
 * origin(r,c)은 8개 카운트에서 제외하고 무조건 포함.
 * 특수 타일(>=10)·빈칸(-1)은 후보에서 제외.
 *
 * board[r][c]가 특수 타일(>=10)인 경우, 보드에서 가장 많이 등장하는
 * 일반 타입을 대상 타입으로 자동 선택한다.
 *
 * @param {number[][]} board
 * @param {number} r
 * @param {number} c
 * @param {number} GRID
 * @returns {{r:number, c:number}[]}
 */
function getChainCells(board, r, c, GRID) {
  // 대상 타입 결정
  let targetType = board[r][c];
  if (targetType < 0 || targetType >= 10) {
    // 특수 타일이면 보드에서 최빈 일반 타입을 선택
    const freq = new Array(10).fill(0);
    for (let row = 0; row < GRID; row++)
      for (let col = 0; col < GRID; col++)
        if (board[row][col] >= 0 && board[row][col] < 10) freq[board[row][col]]++;
    targetType = freq.indexOf(Math.max(...freq));
  }

  const candidates = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (row === r && col === c) continue;          // origin은 별도 포함
      if (board[row][col] === targetType) candidates.push({ r: row, c: col });
    }
  }

  const picked = _randomPick(candidates, 8);
  picked.push({ r, c });   // origin은 무조건 포함 (8개 카운트 외)
  return picked;
}

// ─────────────────────────────────────────────────────────────
// 4. getTimebombCells
// ─────────────────────────────────────────────────────────────

/**
 * 타임밤 타일 효과: 중심 기준 반경 3칸 원형 범위의 모든 셀 반환.
 * 중심(r,c) 포함.
 *
 * @param {number[][]} board
 * @param {number} r
 * @param {number} c
 * @param {number} GRID
 * @returns {{r:number, c:number}[]}
 */
function getTimebombCells(board, r, c, GRID) {
  return _circleArea(r, c, 3, GRID);
}

// ─────────────────────────────────────────────────────────────
// 5. getMagnetCells
// ─────────────────────────────────────────────────────────────

/**
 * 자석 타일 효과: origin과 같은 동물 타입(0~4) 타일 전체 반환.
 * origin(r,c) 포함. 특수 타일(>=10)·빈칸(-1) 제외. 개수 제한 없음.
 *
 * board[r][c]가 특수 타일인 경우 getChainCells와 동일한 최빈 타입 fallback 적용.
 *
 * @param {number[][]} board
 * @param {number} r
 * @param {number} c
 * @param {number} GRID
 * @returns {{r:number, c:number}[]}
 */
function getMagnetCells(board, r, c, GRID) {
  let targetType = board[r][c];
  if (targetType < 0 || targetType >= 10) {
    const freq = new Array(10).fill(0);
    for (let row = 0; row < GRID; row++)
      for (let col = 0; col < GRID; col++)
        if (board[row][col] >= 0 && board[row][col] < 10) freq[board[row][col]]++;
    targetType = freq.indexOf(Math.max(...freq));
  }

  const cells = [];
  for (let row = 0; row < GRID; row++)
    for (let col = 0; col < GRID; col++)
      if (board[row][col] === targetType) cells.push({ r: row, c: col });

  // origin이 targetType과 다른 경우(특수 타일 fallback 시) 명시적으로 추가
  if (!cells.some(cell => cell.r === r && cell.c === c)) cells.push({ r, c });

  return cells;
}
