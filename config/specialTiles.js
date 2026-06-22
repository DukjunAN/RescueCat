/**
 * 특수 타일 타입 정의 파일
 *
 * 생성 조건 우선순위 (getSpecialTileType 참고):
 *   6개+   → CHAIN
 *   5개 십자 → BLACKHOLE
 *   5개 T/L자 → TIMEBOMB
 *   4개 일렬  → DRILL
 *   4개 ㄱ/ㄴ자 → MAGNET
 *   3개 이하  → null (일반 매치)
 */

window.SPECIAL_TILE_TYPES = {

  DRILL: {
    type: 'drill',
    triggerCondition: '4개 일렬 (가로 또는 세로)',
    effectRadius: 'line',           // 생성된 행 또는 열 전체 제거
    animationHint: 'spin-and-pierce' // 회전하며 직선 관통
  },

  BLACKHOLE: {
    type: 'blackhole',
    triggerCondition: '5개 십자(+) 형태',
    effectRadius: 3,                // 중심 기준 반경 3칸 흡입 후 폭발
    animationHint: 'vortex-suck'    // 주변 타일을 중심으로 빨아들이는 연출
  },

  CHAIN: {
    type: 'chain',
    triggerCondition: '6개 이상 동시 매치',
    effectRadius: 'all',            // 보드 전체 같은 색 제거
    animationHint: 'lightning-arc'  // 번개가 같은 색 타일로 연쇄 이동
  },

  TIMEBOMB: {
    type: 'timebomb',
    triggerCondition: '5개 T자 또는 L자 형태',
    effectRadius: 2,                // 폭발 시 반경 2칸 제거
    animationHint: 'countdown-tick' // 생성 후 3턴 카운트다운, 0이 되면 자동 폭발
  },

  MAGNET: {
    type: 'magnet',
    triggerCondition: '4개 ㄱ자 또는 ㄴ자 형태 (꺾인 4칸)',
    effectRadius: 1,                // 인접한 같은 색 타일을 끌어당겨 한 번에 제거
    animationHint: 'pull-snap'      // 주변 같은 색 타일이 자석 쪽으로 당겨지는 연출
  }

};

// ─────────────────────────────────────────────
// 형태 판별 헬퍼 (내부 전용)
// ─────────────────────────────────────────────

/** 모든 셀이 같은 행 또는 같은 열에 있는지 */
function _isLine(cells) {
  return cells.every(c => c.r === cells[0].r) ||
         cells.every(c => c.c === cells[0].c);
}

/**
 * 5개 셀이 십자(+) 형태인지
 * 기준: 어떤 한 셀의 상하좌우 4방향에 나머지 셀이 각각 인접
 */
function _isCross(cells) {
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
  for (let skip = 0; skip < cells.length; skip++) {
    const trio = cells.filter((_, i) => i !== skip);
    const lone  = cells[skip];

    if (!_isLine(trio)) continue;

    const sameRow = trio.every(c => c.r === trio[0].r);
    if (sameRow) {
      const row  = trio[0].r;
      const cols = trio.map(c => c.c).sort((a, b) => a - b);
      const atEnd = lone.c === cols[0] || lone.c === cols[cols.length - 1];
      if (atEnd && lone.r !== row) return true;
    } else {
      const col  = trio[0].c;
      const rows = trio.map(c => c.r).sort((a, b) => a - b);
      const atEnd = lone.r === rows[0] || lone.r === rows[rows.length - 1];
      if (atEnd && lone.c !== col) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * 매치된 셀 배열을 받아 생성할 특수 타일 타입을 반환한다.
 *
 * @param {Array<{r:number, c:number}>} matchedCells - findMatches() 결과
 * @returns {object|null} SPECIAL_TILE_TYPES 중 하나, 또는 null (일반 3매치)
 *
 * @example
 *   const special = getSpecialTileType(matches);
 *   if (special) spawnSpecialTile(centerCell, special);
 */
window.getSpecialTileType = function getSpecialTileType(matchedCells) {
  const n = matchedCells.length;
  const T = window.SPECIAL_TILE_TYPES;

  if (n >= 6)  return T.CHAIN;

  if (n === 5) {
    if (_isCross(matchedCells)) return T.BLACKHOLE;
    return T.TIMEBOMB;  // T자, L자 포함 나머지 5개 형태
  }

  if (n === 4) {
    if (_isLine(matchedCells))   return T.DRILL;
    if (_isCorner(matchedCells)) return T.MAGNET;
  }

  return null; // 3개 이하 — 일반 매치
};
