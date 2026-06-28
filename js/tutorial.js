/**
 * js/tutorial.js
 * 특수타일 인터랙티브 튜토리얼 시스템
 */

class TutorialManager {
  constructor() {
    this.shownTutorials   = new Set(
      JSON.parse(localStorage.getItem('rescuecat_tutorial_shown') || '[]')
    );
    this.isActive         = false;
    this.currentTileType  = null;
    this.phase            = null;
    this.allowedCells     = [];
    this._timerBackup     = null;
    this._buildOverlay();
  }

  _buildOverlay() {
    const style = document.createElement('style');
    style.textContent = `
/* 퍼즐 그리드 딤 오버레이 — 스팟라이트만 포함, 자막 없음 */
#tut-overlay {
  position: fixed; inset: 0; z-index: 9000;
  pointer-events: none;
}
#tut-spotlight {
  position: absolute;
  border: 3px solid gold;
  border-radius: 8px;
  pointer-events: none;
  animation: tut-pulse 1s ease-in-out infinite;
}
@keyframes tut-pulse {
  0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.82), 0 0 12px 4px gold; }
  50%      { box-shadow: 0 0 0 9999px rgba(0,0,0,0.82), 0 0 28px 10px gold; }
}
#tut-finger {
  position: absolute;
  font-size: 32px;
  pointer-events: none;
  z-index: 9001;
}
#tut-finger2 {
  position: absolute;
  font-size: 32px;
  pointer-events: none;
  z-index: 9001;
  display: none;
}
@keyframes tut-drag-h {
  0%,100% { transform: translate(0,0);   opacity: 1; }
  50%      { transform: translate(56px,0); opacity: 0.7; }
}
@keyframes tut-drag-v {
  0%,100% { transform: translate(0,0);    opacity: 1; }
  50%      { transform: translate(0,56px); opacity: 0.7; }
}
@keyframes tut-drag-up {
  0%,100% { transform: translate(0,0);     opacity: 1; }
  50%      { transform: translate(0,-56px); opacity: 0.7; }
}
@keyframes tut-drag-left {
  0%,100% { transform: translate(0,0);     opacity: 1; }
  50%      { transform: translate(-56px,0); opacity: 0.7; }
}

/* 자막 — 해당 타일 위에 말풍선으로 띄움 */
#tut-caption {
  position: fixed;
  background: rgba(10,3,22,0.95);
  display: none;
  flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 10px 14px;
  z-index: 9500;
  border-radius: 12px;
  border: 2px solid gold;
  max-width: 220px;
  min-width: 150px;
  animation: tut-fade 0.25s ease-out;
  transform: translate(-50%, -100%);
}
/* 말풍선 꼬리 — 아래쪽 기본 */
#tut-caption::before {
  content: '';
  position: absolute;
  bottom: -13px; left: 50%;
  transform: translateX(-50%);
  border: 11px solid transparent;
  border-top-color: gold;
  border-bottom: none;
}
#tut-caption::after {
  content: '';
  position: absolute;
  bottom: -10px; left: 50%;
  transform: translateX(-50%);
  border: 9px solid transparent;
  border-top-color: rgba(10,3,22,0.95);
  border-bottom: none;
}
/* 꼬리가 위쪽일 때 */
#tut-caption.tail-top {
  transform: translate(-50%, 0);
}
#tut-caption.tail-top::before {
  bottom: auto; top: -13px;
  border-top-color: transparent;
  border-bottom-color: gold;
  border-top: none; border-bottom: 11px solid gold;
}
#tut-caption.tail-top::after {
  bottom: auto; top: -10px;
  border-top-color: transparent;
  border-bottom-color: rgba(10,3,22,0.95);
  border-top: none; border-bottom: 9px solid rgba(10,3,22,0.95);
}
@keyframes tut-fade { from { opacity: 0; } to { opacity: 1; } }
#tut-icon  { font-size: 26px; margin-bottom: 3px; }
#tut-title { font-size: 14px; font-weight: bold; color: #fff; margin-bottom: 3px; }
#tut-desc  { font-size: 11px; color: #c8a0e0; margin-bottom: 3px; line-height: 1.4; }
#tut-range {
  font-family: monospace; font-size: 12px;
  letter-spacing: 3px; margin: 3px 0;
  color: #f88; white-space: pre;
}
#tut-hint  { font-size: 10px; color: #8b6aaa; }

.tut-active-tile {
  filter: brightness(1.4) drop-shadow(0 0 8px gold) !important;
  transform: scale(1.1) !important;
  pointer-events: auto !important;
  transition: transform 0.2s;
}
.tut-inactive-tile {
  pointer-events: none !important;
  filter: brightness(0.25) !important;
}
.tut-context-tile {
  pointer-events: none !important;
  filter: brightness(1.0) !important;
  box-shadow: 0 0 0 3px gold, 0 0 10px rgba(245,200,66,.45) !important;
  animation: tut-ctx-pulse 1.4s ease-in-out infinite !important;
}
@keyframes tut-ctx-pulse {
  0%,100% { box-shadow: 0 0 0 3px gold, 0 0 8px rgba(245,200,66,.4); }
  50%      { box-shadow: 0 0 0 3px gold, 0 0 18px rgba(245,200,66,.75); }
}
`;
    document.head.appendChild(style);

    // 오버레이 (스팟라이트 + 손가락만, 자막 없음)
    const overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div id="tut-spotlight"></div>
      <div id="tut-finger">👆</div>
      <div id="tut-finger2">👆</div>
    `;
    document.body.appendChild(overlay);

    // 자막 (body에 fixed — 해당 타일 위 말풍선)
    const caption = document.createElement('div');
    caption.id = 'tut-caption';
    caption.innerHTML = `
      <div id="tut-icon"></div>
      <div id="tut-title"></div>
      <div id="tut-desc"></div>
      <div id="tut-range"></div>
      <div id="tut-hint"></div>
    `;
    document.body.appendChild(caption);
  }

  _pauseGame() {
    // animating은 건드리지 않음 — true로 하면 touch/pointer 이벤트가 모두 차단됨
    if (window.timerInterval) {
      clearInterval(window.timerInterval);
      this._timerBackup = window.timerInterval;
    }
    if (window._hintTimer) clearTimeout(window._hintTimer);
  }

  _resumeGame() {
    window.timerInterval = setInterval(window.tick, 1000);
  }

  // 지정 타일 위(또는 아래)에 말풍선 배치
  _positionCaptionAboveTile(r, c) {
    // 기준 타일의 화면 위치를 가져옴 (말풍선 가로 중앙 정렬에 사용)
    const el  = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    const cap = document.getElementById('tut-caption');
    if (!el || !cap) return;
    const tileRect = el.getBoundingClientRect();

    // 말풍선을 기준 타일의 가로 중앙에 맞춤
    const centerX = tileRect.left + tileRect.width / 2;
    const GAP = 14; // 말풍선과 골드 테두리 사이 여백(px)

    // 골드 테두리가 있는 모든 타일(터치 가능 + 터치 불가 모두)의 화면 위치를 수집
    // 가장 위에 있는 타일 기준으로 말풍선을 띄워야 타일을 가리지 않음
    const allGoldTiles = document.querySelectorAll('.tut-active-tile, .tut-context-tile');
    let topY = tileRect.top;
    let bottomY = tileRect.bottom;
    allGoldTiles.forEach(t => {
      const r = t.getBoundingClientRect();
      if (r.top < topY) topY = r.top;
      if (r.bottom > bottomY) bottomY = r.bottom;
    });

    if (topY > 160) {
      // 위쪽에 공간이 충분하면 → 말풍선을 골드 테두리 전체 위에 배치, 꼬리는 아래(▼)
      cap.classList.remove('tail-top');
      cap.style.left = centerX + 'px';
      cap.style.top  = (topY - GAP) + 'px';
    } else {
      // 화면 상단에 너무 가까우면 → 말풍선을 골드 테두리 전체 아래에 배치, 꼬리는 위(▲)
      cap.classList.add('tail-top');
      cap.style.left = centerX + 'px';
      cap.style.top  = (bottomY + GAP) + 'px';
    }
  }

  _highlightCells(cells, contextCells = []) {
    document.querySelectorAll('.tile').forEach(el => {
      el.classList.remove('tut-active-tile', 'tut-context-tile');
      el.classList.add('tut-inactive-tile');
    });

    const rects = [];
    // context 타일: 어둡지 않게 보여주되 터치 불가
    contextCells.forEach(({ r, c }) => {
      const el = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
      if (!el) return;
      el.classList.remove('tut-inactive-tile');
      el.classList.add('tut-context-tile');
    });
    // active 타일: 인터랙티브 + 골드 글로우
    cells.forEach(({ r, c }) => {
      const el = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
      if (!el) return;
      el.classList.remove('tut-inactive-tile', 'tut-context-tile');
      el.classList.add('tut-active-tile');
      rects.push(el.getBoundingClientRect());
    });

    if (rects.length === 0) return;

    const pad = 4;
    const minX = Math.min(...rects.map(r => r.left));
    const minY = Math.min(...rects.map(r => r.top));
    const maxX = Math.max(...rects.map(r => r.right));
    const maxY = Math.max(...rects.map(r => r.bottom));

    const spotlight = document.getElementById('tut-spotlight');
    document.getElementById('tut-overlay').style.background = '';
    spotlight.style.display = '';
    spotlight.style.left   = (minX - pad) + 'px';
    spotlight.style.top    = (minY - pad) + 'px';
    spotlight.style.width  = (maxX - minX + pad * 2) + 'px';
    spotlight.style.height = (maxY - minY + pad * 2) + 'px';
  }

  _clearHighlight() {
    document.querySelectorAll('.tile').forEach(el => {
      el.classList.remove('tut-active-tile', 'tut-inactive-tile', 'tut-context-tile');
    });
  }

  _setCaption(icon, title, desc, range, hint) {
    document.getElementById('tut-icon').textContent  = icon  ?? '';
    document.getElementById('tut-title').textContent = title ?? '';
    document.getElementById('tut-desc').textContent  = desc  ?? '';
    document.getElementById('tut-range').textContent = range ?? '';
    document.getElementById('tut-hint').textContent  = hint  ?? '';
  }

  _setFingerAt(r, c, direction) {
    const el = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const finger = document.getElementById('tut-finger');
    finger.style.display   = 'block';
    finger.style.left      = (rect.left + rect.width  / 2 - 16) + 'px';
    finger.style.top       = (rect.top  + rect.height / 2 - 16) + 'px';
    finger.style.animation =
      direction === 'horizontal' ? 'tut-drag-h 1.2s ease-in-out infinite' :
      direction === 'left'       ? 'tut-drag-left 1.2s ease-in-out infinite' :
      direction === 'up'         ? 'tut-drag-up 1.2s ease-in-out infinite' :
                                   'tut-drag-v 1.2s ease-in-out infinite';
  }

  _setSecondFingerAt(r, c, direction) {
    const el = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    const finger2 = document.getElementById('tut-finger2');
    if (!el || !finger2) return;
    const rect = el.getBoundingClientRect();
    finger2.style.display   = 'block';
    finger2.style.left      = (rect.left + rect.width  / 2 - 16) + 'px';
    finger2.style.top       = (rect.top  + rect.height / 2 - 16) + 'px';
    finger2.style.animation =
      direction === 'horizontal' ? 'tut-drag-h 1.2s ease-in-out 0.6s infinite' :
      direction === 'up'         ? 'tut-drag-up 1.2s ease-in-out 0.6s infinite' :
                                   'tut-drag-v 1.2s ease-in-out 0.6s infinite';
  }

  _hideSecondFinger() {
    const f2 = document.getElementById('tut-finger2');
    if (f2) { f2.style.animation = 'none'; f2.style.display = 'none'; }
  }

  checkAndShow(tileType, matchedCells) {
    if (this.shownTutorials.has(tileType)) return;
    if (this.isActive) return;
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = tileType;
    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';
    this.showPhase1(tileType, matchedCells);
  }

  showPhase1(tileType, cells) {
    this.phase        = 'watch';
    this.allowedCells = cells;
    const ST = SPECIAL_TYPES;

    if (tileType === ST.DRILL) {
      this._setCaption('⚙️', '회전톱 타일 생성!',
        '같은 동물 4마리를 한 줄로 맞추면 회전톱이 생겨요', '',
        '방금 이 패턴으로 회전톱이 만들어졌어요');
    } else if (tileType === ST.BLACKHOLE) {
      this._setCaption('🌀', '블랙홀 생성!',
        '5마리 십자(+) 또는 6마리 이상 매치하면 블랙홀이 생겨요', '',
        '가장 강력한 기본 특수타일이에요');
    } else if (tileType === ST.CHAIN) {
      this._setCaption('⚡', '체인 생성!',
        '같은 동물 5마리를 일렬로 맞추면 체인이 생겨요', '',
        '번개처럼 연쇄 공격하는 타일이에요');
    } else if (tileType === ST.TILEBOMB) {
      this._setCaption('💥', '타일밤 생성!',
        '블랙홀 🌀 + 회전톱 ⚙️ 을 스왑하면 타일밤이 생겨요', '',
        '특수타일끼리 조합하면 더 강한 타일이 탄생해요');
    } else if (tileType === ST.MAGNET) {
      this._setCaption('🧲', '자석 생성!',
        '체인 ⚡ + 블랙홀 🌀 또는 체인 ⚡ + 회전톱 ⚙️ 스왑으로 생성', '',
        '특수타일끼리 조합하면 더 강한 타일이 탄생해요');
    } else {
      return;
    }

    // 방금 생성된 특수타일 하이라이트 + 말풍선 위치
    const tileCell = this._findSpecialTileOnBoard(tileType);
    if (tileCell) {
      this._highlightCells([tileCell]);
      this._positionCaptionAboveTile(tileCell.r, tileCell.c);
    }
  }

  showPhase2(tileType, tileCell) {
    this.phase = 'activate';
    const ST   = SPECIAL_TYPES;
    const gridSize = typeof GRID !== 'undefined' ? GRID : 8;
    const { r, c } = tileCell;

    this._hideSecondFinger();

    const swapNeighbor = (c + 1 < gridSize) ? { r, c: c + 1 } : { r, c: c - 1 };

    if (tileType === ST.DRILL) {
      const rightNeighbor = (c + 1 < gridSize) ? { r, c: c + 1 } : (c - 1 >= 0 ? { r, c: c - 1 } : null);
      const downNeighbor  = (r + 1 < gridSize) ? { r: r + 1, c } : (r - 1 >= 0 ? { r: r - 1, c } : null);
      this.allowedCells = [tileCell, rightNeighbor, downNeighbor].filter(Boolean);

      this._setCaption('⚙️', '회전톱 발동!',
        '스왑 방향으로 줄 전체가 사라져요!',
        '가로 스왑: ←🟥⚙️🟥→\n세로 스왑: ↑🟥⚙️🟥↓',
        '아래 회전톱을 드래그해서 스왑해보세요');
      document.getElementById('tut-caption').style.display = 'flex';
      this._highlightCells(this.allowedCells);
      this._positionCaptionAboveTile(r, c);
      this._setFingerAt(r, c, 'horizontal');
      if (downNeighbor) this._setSecondFingerAt(r, c, 'vertical');

    } else {
      this.allowedCells = [tileCell, swapNeighbor];
    }

    if (tileType === ST.BLACKHOLE) {
      this._setCaption('🌀', '블랙홀 발동!',
        '블랙홀을 어떤 방향으로든 스왑하면 주변을 빨아들여요!',
        '.🌀.\n🌀💥🌀\n.🌀.', '상하좌우 1칸씩, 총 5칸 제거');
      document.getElementById('tut-caption').style.display = 'flex';
      this._highlightCells(this.allowedCells);
      this._positionCaptionAboveTile(r, c);
      this._setFingerAt(r, c, 'horizontal');

    } else if (tileType === ST.CHAIN) {
      this._setCaption('⚡', '체인 발동!',
        '체인을 스왑하면 상대 타일과 같은 동물을 최대 8마리 연쇄 제거!', '',
        '번개선이 연결되는 걸 확인해보세요 ⚡');
      this._highlightCells(this.allowedCells);
      this._positionCaptionAboveTile(r, c);
      this._setFingerAt(r, c, 'horizontal');

    } else if (tileType === ST.TILEBOMB) {
      // 왼쪽 타일과 스왑 유도 (오른쪽은 보드 가장자리와 가까워 폭발 범위가 잘림)
      const leftNeighbor = (c - 1 >= 0) ? { r, c: c - 1 } : { r, c: c + 1 };
      this.allowedCells = [tileCell, leftNeighbor];
      this._setCaption('💥', '타일밤 발동!',
        '스왑하는 순간 즉시 폭발! 주변을 넓게 제거해요',
        '.🟥🟥🟥.\n🟥🟥🟥🟥🟥\n🟥🟥💥🟥🟥\n🟥🟥🟥🟥🟥\n.🟥🟥🟥.',
        '최대 13칸 동시 제거!');
      document.getElementById('tut-caption').style.display = 'flex';
      this._highlightCells(this.allowedCells);
      this._positionCaptionAboveTile(r, c);
      this._setFingerAt(r, c, 'left');

    } else if (tileType === ST.MAGNET) {
      this._setCaption('🧲', '자석 발동!',
        '스왑한 상대 타일과 같은 동물을 보드 전체에서 모두 제거해요!', '',
        '개수 제한 없음! 같은 동물 전부 사라짐 🧲');
      document.getElementById('tut-caption').style.display = 'flex';
      this._highlightCells(this.allowedCells);
      this._positionCaptionAboveTile(r, c);
      this._setFingerAt(r, c, 'horizontal');
    }
  }

  onSwapComplete(r1, c1, r2, c2) {
    if (!this.isActive) return;

    if (this.phase === 'watch' || this.phase === 'create') {
      setTimeout(() => {
        const tileCell = this._findSpecialTileOnBoard(this.currentTileType);
        if (tileCell) {
          this.showPhase2(this.currentTileType, tileCell);
        } else {
          this._endTutorial();
        }
      }, 500);

    } else if (this.phase === 'activate') {
      this.phase = 'done';
      this._clearHighlight();
      document.getElementById('tut-overlay').style.display = 'none';
      document.getElementById('tut-finger').style.animation = 'none';
      document.getElementById('tut-finger').style.display = 'none';
      this._hideSecondFinger();
      document.getElementById('tut-caption').style.display = 'none';
      setTimeout(() => this._endTutorial(), 1000);
    }
  }

  // 레벨 10 전용: 블랙홀 생성 단계부터 시작
  startBlackholeTutorial(bPos, aPos, contextCells = []) {
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = SPECIAL_TYPES.BLACKHOLE;
    this.phase           = 'create';
    this.allowedCells    = [bPos, aPos];

    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';

    this._hideSecondFinger();

    this._setCaption(
      '🌀',
      '블랙홀 타일 만들기!',
      '같은 동물 6마리 이상 연결되면 블랙홀이 생겨요!\n옆 동물을 오른쪽으로 드래그하세요',
      '',
      '👆 드래그해서 스왑하세요'
    );
    this._highlightCells([bPos, aPos], contextCells);
    this._positionCaptionAboveTile(bPos.r, bPos.c);
    this._setFingerAt(aPos.r, aPos.c, 'horizontal');
  }

  // 레벨 25 전용: 자석 생성 단계부터 시작 (체인 + 블랙홀 콤보)
  startMagnetTutorial(bPos, aPos, contextCells = []) {
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = SPECIAL_TYPES.MAGNET;
    this.phase           = 'create';
    this.allowedCells    = [bPos, aPos];

    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';

    this._hideSecondFinger();

    this._setCaption(
      '🧲',
      '자석 타일 만들기!',
      '체인 ⚡과 블랙홀 🌀을 스왑하면\n자석이 생겨요!\n체인을 오른쪽으로 드래그하세요',
      '',
      '👆 드래그해서 스왑하세요'
    );
    this._highlightCells([bPos, aPos], contextCells);
    this._positionCaptionAboveTile(aPos.r, aPos.c);
    this._setFingerAt(aPos.r, aPos.c, 'horizontal');
  }

  // 레벨 20 전용: 타일밤 생성 단계부터 시작 (블랙홀 + 회전톱 콤보)
  startTilebombTutorial(bPos, aPos, contextCells = []) {
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = SPECIAL_TYPES.TILEBOMB;
    this.phase           = 'create';
    this.allowedCells    = [bPos, aPos];

    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';

    this._hideSecondFinger();

    this._setCaption(
      '💥',
      '타일밤 타일 만들기!',
      '블랙홀 🌀과 회전톱 ⚙️을 스왑하면\n타일밤이 생겨요!\n블랙홀을 오른쪽으로 드래그하세요',
      '',
      '👆 드래그해서 스왑하세요'
    );
    this._highlightCells([bPos, aPos], contextCells);
    this._positionCaptionAboveTile(aPos.r, aPos.c);
    this._setFingerAt(aPos.r, aPos.c, 'horizontal');
  }

  // 레벨 15 전용: 체인 생성 단계부터 시작
  startChainTutorial(bPos, aPos, contextCells = []) {
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = SPECIAL_TYPES.CHAIN;
    this.phase           = 'create';
    this.allowedCells    = [bPos, aPos];

    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';

    this._hideSecondFinger();

    this._setCaption(
      '⚡',
      '체인 타일 만들기!',
      '같은 동물 5마리를 한 줄로 맞추면 체인이 생겨요!\n위 동물을 아래로 드래그해서 스왑해보세요',
      '',
      '👆 드래그해서 스왑하세요'
    );
    this._highlightCells([bPos, aPos], contextCells);
    this._positionCaptionAboveTile(bPos.r, bPos.c);
    this._setFingerAt(aPos.r, aPos.c, 'vertical');
  }

  // 레벨 5 전용: 보드가 미리 배치된 상태에서 회전톱 생성 단계부터 시작
  startCircularSawTutorial(bPos, aPos, contextCells = []) {
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = SPECIAL_TYPES.DRILL;
    this.phase           = 'create';
    this.allowedCells    = [bPos, aPos];

    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';

    const finger = document.getElementById('tut-finger');
    if (finger) { finger.style.animation = 'none'; finger.style.display = 'none'; }
    this._hideSecondFinger();

    this._setCaption(
      '⚙️',
      '회전톱 타일 만들기!',
      '같은 동물 4마리를 한 줄로 맞추면 회전톱이 생겨요!\n아래 동물을 위로 드래그해서 스왑해보세요',
      '',
      '👆 드래그해서 스왑하세요'
    );
    this._highlightCells([bPos, aPos], contextCells);
    this._positionCaptionAboveTile(bPos.r, bPos.c);
  }

  _findSpecialTileOnBoard(tileType) {
    if (typeof board === 'undefined' || !board) return null;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] === tileType) return { r, c };
      }
    }
    return null;
  }

  _endTutorial() {
    this.shownTutorials.add(this.currentTileType);
    localStorage.setItem('rescuecat_tutorial_shown', JSON.stringify([...this.shownTutorials]));
    document.getElementById('tut-overlay').style.display = 'none';
    document.getElementById('tut-caption').style.display = 'none';
    this._clearHighlight();
    this._resumeGame();
    this.isActive        = false;
    this.phase           = null;
    this.currentTileType = null;
    this.allowedCells    = [];
  }
}

window.TutorialManager = TutorialManager;
window.tutorialManager  = new TutorialManager();
