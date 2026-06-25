/**
 * js/tutorial.js
 * 특수타일 인터랙티브 튜토리얼 시스템
 *
 * 의존: index.html 전역 변수
 *   - window.animating   (let, script-scope global — window 프로퍼티가 아닐 수 있음)
 *   - window.timerInterval (동일)
 *   - window.tick        (function 선언 → window.tick 가능)
 *   - window.SPECIAL_TYPES (js/specialTiles.js)
 *   - window.GRID        (index.html 전역)
 *   - window.getDrillDirection (js/specialTiles.js)
 *
 * index.html / specialTiles.js 수정 없음 — 파일 추가만.
 */

class TutorialManager {
  constructor() {
    this.shownTutorials = new Set(
      JSON.parse(localStorage.getItem('rescuecat_tutorial_shown') || '[]')
    );
    this.isActive        = false;
    this.currentTileType = null;
    this.phase           = null;   // 'create' | 'activate'
    this.allowedCells    = [];     // [{r, c}]
    this._timerBackup    = null;
    this._buildOverlay();
  }

  // ─────────────────────────────────────────────────
  // 오버레이 HTML + CSS 생성
  // ─────────────────────────────────────────────────
  _buildOverlay() {
    // CSS
    const style = document.createElement('style');
    style.textContent = `
#tut-overlay {
  position: fixed; inset: 0; z-index: 9000;
}
#tut-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.82);
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
  z-index: 9200;
}
@keyframes tut-drag-h {
  0%,100% { transform: translate(0,0);   opacity: 1; }
  50%      { transform: translate(56px,0); opacity: 0.7; }
}
@keyframes tut-drag-v {
  0%,100% { transform: translate(0,0);   opacity: 1; }
  50%      { transform: translate(0,56px); opacity: 0.7; }
}
#tut-caption {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: white; border-radius: 20px 20px 0 0;
  padding: 20px 24px; text-align: center;
  z-index: 9300;
  animation: tut-slide 0.35s ease-out;
}
@keyframes tut-slide {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
#tut-icon  { font-size: 40px; margin-bottom: 6px; }
#tut-title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
#tut-desc  { font-size: 15px; color: #444; margin-bottom: 6px; line-height: 1.5; }
#tut-range {
  font-family: monospace; font-size: 18px;
  letter-spacing: 4px; margin: 8px 0;
  color: #e44; white-space: pre;
}
#tut-hint  { font-size: 13px; color: #888; margin-bottom: 12px; }
#tut-skip  {
  padding: 8px 28px;
  background: #eee; border: none;
  border-radius: 20px; font-size: 14px; cursor: pointer;
}
.tut-active-tile {
  position: relative !important;
  z-index: 9100 !important;
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

    // HTML
    const overlay = document.createElement('div');
    overlay.id = 'tut-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div id="tut-backdrop"></div>
      <div id="tut-spotlight"></div>
      <div id="tut-finger">👆</div>
      <div id="tut-caption">
        <div id="tut-icon"></div>
        <div id="tut-title"></div>
        <div id="tut-desc"></div>
        <div id="tut-range"></div>
        <div id="tut-hint"></div>
        <button id="tut-skip">건너뛰기</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('tut-skip').addEventListener('click', () => this._endTutorial());
  }

  // ─────────────────────────────────────────────────
  // 게임 일시정지 / 재개
  // ─────────────────────────────────────────────────
  _pauseGame() {
    window.animating = true;
    if (window.timerInterval) {
      clearInterval(window.timerInterval);
      this._timerBackup = window.timerInterval;
    }
  }

  _resumeGame() {
    window.animating = false;
    // tick: index.html 1179행 function 선언 → window.tick 접근 가능
    window.timerInterval = setInterval(window.tick, 1000);
  }

  // ─────────────────────────────────────────────────
  // 셀 하이라이트
  // ─────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────
  // 자막 / 손가락 설정
  // ─────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────
  // 외부 진입점
  // ─────────────────────────────────────────────────
  checkAndShow(tileType, matchedCells) {
    if (this.shownTutorials.has(tileType)) return;
    this._pauseGame();
    this.isActive        = true;
    this.currentTileType = tileType;
    document.getElementById('tut-overlay').style.display = '';
    this.showPhase1(tileType, matchedCells);
  }

  // ─────────────────────────────────────────────────
  // Phase 1 — 특수타일 생성 유도
  // ─────────────────────────────────────────────────
  showPhase1(tileType, cells) {
    this.phase        = 'create';
    this.allowedCells = cells;
    const ST = window.SPECIAL_TYPES;

    if (tileType === ST.DRILL) {
      const isRow = cells.every(cell => cell.r === cells[0].r);
      this._setCaption(
        '⚙️',
        '드릴 타일 만들기',
        '같은 동물 4마리를 가로 또는 세로 한 줄로 맞춰보세요!',
        '',
        '👆 드래그해서 4개를 한 줄로 완성하면 드릴이 생겨요'
      );
      this._highlightCells(cells);
      const mid = cells[Math.floor(cells.length / 2)];
      this._setFingerAt(mid.r, mid.c, isRow ? 'horizontal' : 'vertical');

    } else if (tileType === ST.BLACKHOLE) {
      this._setCaption(
        '🌀',
        '블랙홀 만들기',
        '같은 동물 6마리 이상, 또는 5마리를 십자(+) 모양으로 맞춰보세요!',
        '',
        '가장 강력한 기본 특수타일이에요'
      );
      this._highlightCells(cells);
      const mid = cells[Math.floor(cells.length / 2)];
      this._setFingerAt(mid.r, mid.c, 'horizontal');

    } else if (tileType === ST.CHAIN) {
      this._setCaption(
        '⚡',
        '체인 만들기',
        '같은 동물 5마리를 일렬로 맞춰보세요!',
        '',
        '번개처럼 연쇄 공격하는 타일이에요'
      );
      this._highlightCells(cells);
      const mid = cells[Math.floor(cells.length / 2)];
      this._setFingerAt(mid.r, mid.c, 'horizontal');
    }
  }

  // ─────────────────────────────────────────────────
  // Phase 2 — 발동 방법 안내
  // ─────────────────────────────────────────────────
  showPhase2(tileType, tileCell) {
    this.phase = 'activate';
    const ST   = window.SPECIAL_TYPES;
    const GRID = window.GRID || 8;
    const { r, c } = tileCell;

    // 방향에 맞는 인접 스왑 가능 셀 결정
    let swapNeighbor = null;
    if (tileType === ST.DRILL) {
      const dir = (typeof getDrillDirection === 'function')
        ? getDrillDirection(r, c)
        : 'row';
      if (dir === 'row') {
        swapNeighbor = (c + 1 < GRID) ? { r, c: c + 1 } : { r, c: c - 1 };
      } else {
        swapNeighbor = (r + 1 < GRID) ? { r: r + 1, c } : { r: r - 1, c };
      }
    } else {
      swapNeighbor = (c + 1 < GRID) ? { r, c: c + 1 } : { r, c: c - 1 };
    }

    this.allowedCells = swapNeighbor ? [tileCell, swapNeighbor] : [tileCell];

    if (tileType === ST.DRILL) {
      const dir     = (typeof getDrillDirection === 'function')
        ? getDrillDirection(r, c)
        : 'row';
      const dirIcon = dir === 'row' ? '⚙️➡' : '⚙️⬇';
      this._setCaption(
        dirIcon,
        '드릴 발동!',
        '드릴을 생성된 방향으로 스왑하면 줄 전체가 날아가요!',
        '',
        '⚠️ 가로 드릴은 가로로만, 세로 드릴은 세로로만 스왑 가능해요'
      );
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, dir === 'row' ? 'horizontal' : 'vertical');

    } else if (tileType === ST.BLACKHOLE) {
      this._setCaption(
        '🌀',
        '블랙홀 발동!',
        '블랙홀을 어떤 방향으로든 스왑하면 주변을 빨아들여요!',
        '.🌀.\n🌀💥🌀\n.🌀.',
        '상하좌우 1칸씩, 총 5칸 제거'
      );
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, 'horizontal');

    } else if (tileType === ST.CHAIN) {
      this._setCaption(
        '⚡',
        '체인 발동!',
        '체인을 스왑하면 상대 타일과 같은 동물을 최대 8마리 연쇄 제거!',
        '',
        '번개선이 연결되는 걸 확인해보세요 ⚡'
      );
      this._highlightCells(this.allowedCells);
      this._setFingerAt(r, c, 'horizontal');
    }
  }

  // ─────────────────────────────────────────────────
  // 스왑 완료 콜백 (index.html의 trySwap 완료 후 호출 예정)
  // ─────────────────────────────────────────────────
  onSwapComplete(r1, c1, r2, c2) {
    if (!this.isActive) return;

    if (this.phase === 'create') {
      // create phase: allowedCells 체크 생략
      // 스왑한 셀이 매치셀 밖일 수 있으므로 체크하지 않고 바로 보드 스캔
      setTimeout(() => {
        const tileCell = this._findSpecialTileOnBoard(this.currentTileType);
        if (tileCell) {
          this.showPhase2(this.currentTileType, tileCell);
        } else {
          // 특수타일이 이미 발동됐거나 위치 불명 → 튜토리얼 종료
          this._endTutorial();
        }
      }, 500);

    } else if (this.phase === 'activate') {
      // activate phase: 허용된 셀로의 스왑인지 확인
      const swappedCells = [{ r: r1, c: c1 }, { r: r2, c: c2 }];
      const isAllowed = swappedCells.every(pos =>
        this.allowedCells.some(a => a.r === pos.r && a.c === pos.c)
      );
      if (!isAllowed) return;

      this._clearHighlight();
      document.getElementById('tut-finger').style.animation = 'none';

      const ST = window.SPECIAL_TYPES;
      const msgs = {
        [ST.DRILL]:     ['⚙️', '줄 전체가 날아갔어요!'],
        [ST.BLACKHOLE]: ['🌀', '주변 5칸이 빨려들어갔어요!'],
        [ST.CHAIN]:     ['⚡', '연쇄 번개로 최대 9칸 제거!'],
        [ST.TILEBOMB]:  ['💥', '반경 2칸, 13칸이 폭발했어요!'],
        [ST.MAGNET]:    ['🧲', '같은 동물이 전부 사라졌어요!'],
      };
      const [icon, desc] = msgs[this.currentTileType] || ['🎉', '특수타일 발동 완료!'];

      // 효과 애니메이션 완료 대기 후 확인 버튼 표시
      setTimeout(() => {
        this._setCaption(icon, '완료!', desc, '', '');
        const okBtn = document.createElement('button');
        okBtn.textContent = '확인!';
        okBtn.style.cssText = 'margin-top:12px;padding:10px 32px;background:#4CAF50;color:white;border:none;border-radius:24px;font-size:16px;font-weight:bold;cursor:pointer;';
        okBtn.onclick = () => this._endTutorial();
        document.getElementById('tut-caption').appendChild(okBtn);
      }, 1500);
    }
  }

  // ─────────────────────────────────────────────────
  // 보드에서 특수타일 위치 탐색
  // ─────────────────────────────────────────────────
  _findSpecialTileOnBoard(tileType) {
    // board는 index.html에서 let으로 선언된 전역 변수 — window.board 접근 불가, 직접 참조
    if (typeof board === 'undefined' || !board) return null;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] === tileType) return { r, c };
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────
  // 튜토리얼 종료
  // ─────────────────────────────────────────────────
  _endTutorial() {
    this.shownTutorials.add(this.currentTileType);
    localStorage.setItem(
      'rescuecat_tutorial_shown',
      JSON.stringify([...this.shownTutorials])
    );
    document.querySelectorAll('#tut-caption button:not(#tut-skip)').forEach(b => b.remove());
    document.getElementById('tut-overlay').style.display = 'none';
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
