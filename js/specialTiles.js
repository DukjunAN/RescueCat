/**
 * js/specialTiles.js
 *
 * 특수 타일 타입 정의, 판별, 타임밤 카운터 관리
 *
 * board[r][c] 값 규칙:
 *   -1      : 빈칸
 *    0 ~ 4  : 일반 타일 (동물 타입 인덱스)
 *   10 ~ 14 : 특수 타일 (SPECIAL_TYPES 상수)
 */

// ─────────────────────────────────────────────────────────────
// 1. SPECIAL_TYPES  (board 값으로 사용할 정수)
// ─────────────────────────────────────────────────────────────
const SPECIAL_TYPES = Object.freeze({
  DRILL:     10,   // 4개 일렬     → 행·열 전체 관통 제거
  BLACKHOLE: 11,   // 6개+ or 십자 → 반경 흡입 폭발
  CHAIN:     12,   // 5개 일렬     → 같은 색 전체 연쇄 제거
  TILEBOMB:  13,   // 특수+특수 조합 → 즉시 폭발
  MAGNET:    14    // 4개 ㄱ·ㄴ자  → 인접 같은 색 끌어당김
});

// ─────────────────────────────────────────────────────────────
// 2. isSpecialTile
// ─────────────────────────────────────────────────────────────
/**
 * board 값이 특수 타일인지 확인한다.
 * @param {number} value  board[r][c]
 * @returns {boolean}
 */
function isSpecialTile(value) {
  return value >= 10;
}

// ─────────────────────────────────────────────────────────────
// 3. getSpecialTileClass
// ─────────────────────────────────────────────────────────────
const _CLASS_MAP = {
  [SPECIAL_TYPES.DRILL]:     'tile-drill',
  [SPECIAL_TYPES.BLACKHOLE]: 'tile-blackhole',
  [SPECIAL_TYPES.CHAIN]:     'tile-chain',
  [SPECIAL_TYPES.TILEBOMB]:  'tile-tilebomb',
  [SPECIAL_TYPES.MAGNET]:    'tile-magnet'
};

/**
 * board 값 → CSS 클래스명 반환
 * @param {number} value  board[r][c] (10~14)
 * @returns {string}  예: "tile-drill"
 */
function getSpecialTileClass(value) {
  return _CLASS_MAP[value] || 'tile-special';
}

// ─────────────────────────────────────────────────────────────
// 4. getSpecialTileType  (형태 판별)
// ─────────────────────────────────────────────────────────────

/** 모든 셀이 같은 행 또는 같은 열에 있는지 */
function _isLine(cells) {
  return cells.every(c => c.r === cells[0].r) ||
         cells.every(c => c.c === cells[0].c);
}

/**
 * 5개 셀이 십자(+) 형태인지
 * 기준: 어떤 한 pivot 셀의 상·하·좌·우 4방향에 나머지 4셀이 정확히 위치
 */
function _isCross(cells) {
  if (cells.length !== 5) return false;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const pivot of cells) {
    const rest = cells.filter(c => c !== pivot);
    const allNeighbor = rest.every(n =>
      dirs.some(([dr, dc]) => n.r === pivot.r + dr && n.c === pivot.c + dc)
    );
    if (allNeighbor) return true;
  }
  return false;
}

/**
 * 4개 셀이 ㄱ/ㄴ 꺾인 형태인지
 * 기준: 3개가 일렬이고, 나머지 1개가 그 양 끝 중 하나에 직각으로 붙어 있음
 */
function _isCorner(cells) {
  if (cells.length !== 4) return false;
  for (let skip = 0; skip < 4; skip++) {
    const trio = cells.filter((_, i) => i !== skip);
    const lone  = cells[skip];
    if (!_isLine(trio)) continue;

    const sameRow = trio.every(c => c.r === trio[0].r);
    if (sameRow) {
      const row  = trio[0].r;
      const cols = trio.map(c => c.c).sort((a, b) => a - b);
      // lone이 trio의 맨 앞 또는 맨 뒤 열 위치에서 직각 방향
      if ((lone.c === cols[0] || lone.c === cols[cols.length - 1]) && lone.r !== row)
        return true;
    } else {
      const col  = trio[0].c;
      const rows = trio.map(c => c.r).sort((a, b) => a - b);
      if ((lone.r === rows[0] || lone.r === rows[rows.length - 1]) && lone.c !== col)
        return true;
    }
  }
  return false;
}

/**
 * 매치된 셀 배열을 받아 생성할 특수 타일의 board 값을 반환한다.
 *
 * 판별 우선순위:
 *   6개 이상 or 5개 십자  → BLACKHOLE (11)
 *   5개 일렬              → CHAIN     (12)
 *   5개 T자 / L자         → TILEBOMB  (13)
 *   4개 일렬              → DRILL     (10)
 *   4개 ㄱ/ㄴ자           → MAGNET    (14)
 *   그 외                 → null
 *
 * @param {Array<{r:number, c:number}>} matchedCells
 * @returns {number|null}  SPECIAL_TYPES 값 또는 null
 */
function getSpecialTileType(matchedCells) {
  const n = matchedCells.length;

  // 6개 이상, 또는 5개 십자 → BLACKHOLE
  if (n >= 6 || (n === 5 && _isCross(matchedCells))) return SPECIAL_TYPES.BLACKHOLE;

  if (n === 5) {
    if (_isLine(matchedCells)) return SPECIAL_TYPES.CHAIN;    // 5개 일렬
    return SPECIAL_TYPES.TILEBOMB;                             // T·L자 등 나머지 5개
  }

  if (n === 4) {
    if (_isLine(matchedCells))   return SPECIAL_TYPES.DRILL;  // 4개 일렬
    if (_isCorner(matchedCells)) return SPECIAL_TYPES.MAGNET; // 4개 ㄱ/ㄴ자
  }

  return null; // 3개 이하 — 일반 매치
}


// ─────────────────────────────────────────────────────────────
// 6. drillDirections  (드릴 방향 관리)
// ─────────────────────────────────────────────────────────────
const drillDirections = {};

function setDrillDirection(r, c, dir) {
  drillDirections[`${r},${c}`] = dir;
}

function getDrillDirection(r, c) {
  return drillDirections[`${r},${c}`] || 'row';
}

function moveDrillDirection(fromR, fromC, toR, toC) {
  const key = `${fromR},${fromC}`;
  if (drillDirections[key] !== undefined) {
    drillDirections[`${toR},${toC}`] = drillDirections[key];
    delete drillDirections[key];
  }
}

function clearDrillDirection(r, c) {
  delete drillDirections[`${r},${c}`];
}
