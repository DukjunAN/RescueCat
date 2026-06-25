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
@keyframes tut-drag-h {
  0%,100% { transform: translate(0,0);   opacity: 1; }
  50%      { transform: translate(56px,0); opacity: 0.7; }
}
@keyframes tut-drag-v {
  0%,100% { transform: translate(0,0);   opacity: 1; }
  50%      { transform: translate(0,56px); opacity: 0.7; }
}

/* 자막 — chase-scene 위에 fixed로 띄움 */
#tut-caption {
  position: fixed; left: 0; right: 0;
  background: rgba(10,3,22,0.95);
  display: none;
  flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 10px 20px;
  z-index: 9500;
  border-radius: 12px;
  animation: tut-fade 0.25s ease-out;
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
#tut-hint  { font-size: 10px; color: #8b6aaa; margin-bottom: 6px; }
#tut-skip  {
  padding: 4px 18px;
  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
  color: #c8a0e0; border-radius: 20px; font-size: 11px; cursor: pointer;
}

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
`;
    document.head.appendChild(style);

    // 오버레이 (스팟라이트 + 손가락만, 자막 없음)
    const overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div id="tut-spotlight"></div>
      <div id="tut-finger">👆</div>
    `;
    document.body.appendChild(overlay);

    // 자막 (body에 fixed — chase-scene 위치에 동적 배치)
    const caption = document.createElement('div');
    caption.id = 'tut-caption';
    caption.innerHTML = `
      <div id="tut-icon"></div>
      <div id="tut-title"></div>
      <div id="tut-desc"></div>
      <div id="tut-range"></div>
      <div id="tut-hint"></div>
      <button id="tut-skip">건너뛰기</button>
    `;
    document.body.appendChild(caption);

    document.getElementById('tut-skip').addEventListener('click', () => this._endTutorial());
  }

  _pauseGame() {
    // animating은 건드리지 않음 — true로 하면 touch/pointer 이벤트가 모두 차단됨
    if (window.timerInterval) {
      clearInterval(window.timerInterval);
      this._timerBackup = window.timerInterval;
    }
  }

  _resumeGame() {
    window.timerInterval = setInterval(window.tick, 1000);
  }

  // chase-scene 위치에 자막 배치
  _positionCaption() {
    const chase = document.getElementById('chase-scene');
    const cap   = document.getElementById('tut-caption');
    if (!chase || !cap) return;
    const rect = chase.getBoundingClientRect();
    cap.style.top    = rect.top + 'px';
    cap.style.height = rect.height + 'px';
  }

  _highlightCells(cells) {
    document.querySelectorAll('.tile').forEach(el => {
      el.classList.remove('tut-active-tile');
      el.classList.add('tut-inactive-tile');
    });

    const rects = [];
    cells.forEach(({ r, c }) => {
      const el = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
      if (!el) return;
      el.classList.remove('tut-inactive-tile');
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
    spotlight.style.left   = (minX - pad) + 'px';
    spotlight.style.top    = (minY - pad) + 'px';
    spotlight.style.width  = (maxX - minX + pad * 2) + 'px';
    spotlight.style.height = (maxY - minY + pad * 2) + 'px';
  }

  _clearHighlight() {
    document.querySelectorAll('.tile').forEach(el => {
      el.classList.remove('tut-active-tile', 'tut-inactive-tile');
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
    finger.style.left      = (rect.left + rect.width  / 2 - 16) + 'px';
    finger.style.top       = (rect.top  + rect.height / 2 - 16) + 'px';
    finger.style.animation = direction === 'horizontal'
      ? 'tut-drag-h 1.2s ease-in-out infinite'
      : 'tut-drag-v 1.2s ease-in-out infinite';
  }

  checkAndShow(tileType, matchedCells) {
    if (this.shownTutorials.has(tileType)) return;
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = tileType;
    this._positionCaption();
    document.getElementById('tut-overlay').style.display = '';
    document.getElementById('tut-caption').style.display = 'flex';
    this.showPhase1(tileType, matchedCells);
  }

  showPhase1(tileType, cells) {
    this.phase        = 'create';
    this.allowedCells = cells;
    const ST = SPECIAL_TYPES;

    if (tileType === ST.DRILL) {
      this._setCaption('⚙️', '드릴 타일 생성!',
        '같은 동물 4마리를 한 줄로 맞추면 드릴이 생겨요', '',
        '방금 이 패턴으로 드릴이 만들어졌어요');
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
        '블랙홀 🌀 + 드릴 ⚙️ 을 스왑하면 타일밤이 생겨요', '',
        '특수타일끼리 조합하면 더 강한 타일이 탄생해요');
    } else if (tileType === ST.MAGNET) {
      this._setCaption('🧲', '자석 생성!',
        '체인 ⚡ + 블랙홀 🌀 또는 체인 ⚡ + 드릴 ⚙️ 스왑으로 생성', '',
        '특수타일끼리 조합하면 더 강한 타일이 탄생해요');
    } else {
      return;
    }

    // 방금 생성된 특수타일 하이라이트
    const tileCell = this._findSpecialTileOnBoard(tileType);
    if (tileCell) this._highlightCells([tileCell]);
  }

  showPhase2(tileType, tileCell) {
    this.phase = 'activate';
    const ST   = SPECIAL_TYPES;
    const gridSize = typeof GRID !== 'undefined' ? GRID : 8;
    const { r, c } = tileCell;

    let swapNeighbor = null;
    if (tileType === ST.DRILL) {
      const dir = (typeof getDrillDirection === 'function') ? getDrillDirection(r, c) : 'row';
      if (dir === 'row') {
        swapNeighbor = (c + 1 < gridSize) ? { r, c: c + 1 } : { r, c: c - 1 };
      } else {
        swapNeighbor = (r + 1 < gridSize) ? { r: r + 1, c } : { r: r - 1, c };
      }
    } else {
      swapNeighbor = (c + 1 < gridSize) ? { r, c: c + 1 } : { r, c: c - 1 };
    }
    this.allowedCells = swapNeighbor ? [tileCell, swapNeighbor] : [tileCell];

    if (tileType === ST.DRILL) {
      const dir     = (typeof getDrillDirection === 'function') ? getDrillDirection(r, c) : 'row';
      const dirIcon = dir === 'row' ? '⚙️➡' : '⚙️⬇';
      this._setCaption(dirIcon, '드릴 발동!',
        '드릴을 생성된 방향으로 스왑하면 줄 전체가 날아가요!', '',
        '⚠️ 가로 드릴은 가로로만, 세로 드릴은 세로로만 스왑 가능해요');
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, dir === 'row' ? 'horizontal' : 'vertical');

    } else if (tileType === ST.BLACKHOLE) {
      this._setCaption('🌀', '블랙홀 발동!',
        '블랙홀을 어떤 방향으로든 스왑하면 주변을 빨아들여요!',
        '.🌀.\n🌀💥🌀\n.🌀.', '상하좌우 1칸씩, 총 5칸 제거');
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, 'horizontal');

    } else if (tileType === ST.CHAIN) {
      this._setCaption('⚡', '체인 발동!',
        '체인을 스왑하면 상대 타일과 같은 동물을 최대 8마리 연쇄 제거!', '',
        '번개선이 연결되는 걸 확인해보세요 ⚡');
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, 'horizontal');

    } else if (tileType === ST.TILEBOMB) {
      this._setCaption('💥', '타일밤 발동!',
        '스왑하는 순간 즉시 폭발! 주변을 넓게 제거해요',
        '.🟥🟥🟥.\n🟥🟥🟥🟥🟥\n🟥🟥💥🟥🟥\n🟥🟥🟥🟥🟥\n.🟥🟥🟥.',
        '최대 13칸 동시 제거!');
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, 'horizontal');

    } else if (tileType === ST.MAGNET) {
      this._setCaption('🧲', '자석 발동!',
        '스왑한 상대 타일과 같은 동물을 보드 전체에서 모두 제거해요!', '',
        '개수 제한 없음! 같은 동물 전부 사라짐 🧲');
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, 'horizontal');
    }
  }

  onSwapComplete(r1, c1, r2, c2) {
    if (!this.isActive) return;

    if (this.phase === 'create') {
      setTimeout(() => {
        const tileCell = this._findSpecialTileOnBoard(this.currentTileType);
        if (tileCell) {
          this.showPhase2(this.currentTileType, tileCell);
        } else {
          this._endTutorial();
        }
      }, 500);

    } else if (this.phase === 'activate') {
      const swappedCells = [{ r: r1, c: c1 }, { r: r2, c: c2 }];
      const isAllowed = swappedCells.every(pos =>
        this.allowedCells.some(a => a.r === pos.r && a.c === pos.c)
      );
      if (!isAllowed) return;

      this._clearHighlight();
      document.getElementById('tut-finger').style.animation = 'none';

      const ST = SPECIAL_TYPES;
      const msgs = {
        [ST.DRILL]:     ['⚙️', '줄 전체가 날아갔어요!'],
        [ST.BLACKHOLE]: ['🌀', '주변 5칸이 빨려들어갔어요!'],
        [ST.CHAIN]:     ['⚡', '연쇄 번개로 최대 9칸 제거!'],
        [ST.TILEBOMB]:  ['💥', '반경 2칸, 13칸이 폭발했어요!'],
        [ST.MAGNET]:    ['🧲', '같은 동물이 전부 사라졌어요!'],
      };
      const [icon, desc] = msgs[this.currentTileType] || ['🎉', '특수타일 발동 완료!'];

      setTimeout(() => {
        this._setCaption(icon, '완료!', desc, '', '');
        const okBtn = document.createElement('button');
        okBtn.textContent = '확인!';
        okBtn.style.cssText = 'margin-top:10px;padding:8px 28px;background:#4CAF50;color:white;border:none;border-radius:24px;font-size:14px;font-weight:bold;cursor:pointer;';
        okBtn.onclick = () => this._endTutorial();
        document.getElementById('tut-caption').appendChild(okBtn);
      }, 1500);
    }
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
    document.querySelectorAll('#tut-caption button:not(#tut-skip)').forEach(b => b.remove());
    document.getElementById('tut-overlay').style.display = 'none';
    document.getElementById('tut-caption').style.display = 'none';
    this._clearHighlight();
    this._resumeGame();
    this.isActive        = false;
    this.phase           = null;
    this.currentTileType = null;
    this.allowedCells    = [];
    document.getElementById('tut-skip').textContent = '건너뛰기';
  }
}

window.TutorialManager = TutorialManager;
window.tutorialManager  = new TutorialManager();
