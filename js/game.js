// ── 전역 게임 상태 ──
let score = 0, level = 1;
var animating = false;
let selected = null;
let timeLeft = 30;
var timerInterval = null;
let barriersLeft = 8;
let gameOver = false;
let _warned20 = false, _warned10 = false;
let urgency = 0;
let bestScore = 0;

let GRID = 8;
const TYPES = 5;
const TYPE_CLS = ['t1','t2','t3','t4','t5'];
const BARRIER_EMOJIS = ['🧱','🪵','⛓️','🔒','🪨','🛡️','⚔️','🔑'];

// config/levels.js 기반 상수
const _lc = window.LEVEL_CONFIG || {};
const _ld = _lc.defaults || {};
const BASE_TIME      = _ld.baseTime     || 30;
const TIME_PER_MATCH = _ld.timePerMatch || 2;
const MAX_LEVEL      = _lc.maxLevel     || 100;

function getLevelTier(lvl) {
  return (_lc.tiers || []).find(t => lvl >= t.from && lvl <= t.to)
      || { grid: 8, timePerLevel: 5 };
}

function getLevelMatchCount(lvl) {
  return 10 + Math.min(Math.floor(lvl / 5), 10);
}

function getLevelExtraBarriers(lvl) {
  return Math.min(Math.floor(lvl / 5), 10);
}

// config/assets.js 기반 동물 설정
const _ac = window.ASSETS_CONFIG || {};
const _animalRaw        = (_ac.models    || {}).list     || [];
const ANIMAL_LIST       = _animalRaw.map(a => typeof a === 'object' ? a.name          : a);
const ANIMAL_SCALES     = _animalRaw.map(a => typeof a === 'object' ? (a.scale    ?? 1.0) : 1.0);
const ANIMAL_MIN_LEVELS = _animalRaw.map(a => typeof a === 'object' ? (a.minLevel ?? 1)   : 1);
const PREVIEW_BASE   = (_ac.previews  || {}).basePath || 'animals/';
const PREVIEW_EXT    = (_ac.previews  || {}).ext      || '.png';

// 100레벨 × 5종류 결정론적 배치 (시드 기반, minLevel 필터 적용)
const LEVEL_CONFIGS = (() => {
  let s = 98765;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  return Array.from({ length: MAX_LEVEL }, (_, lvlIdx) => {
    const lvl = lvlIdx + 1;
    const pool = ANIMAL_LIST
      .map((_, i) => i)
      .filter(i => (ANIMAL_MIN_LEVELS[i] ?? 1) <= lvl);
    if (pool.length < 5) {
      const extra = ANIMAL_LIST.map((_, i) => i).filter(i => !pool.includes(i));
      pool.push(...extra.slice(0, 5 - pool.length));
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  });
})();

let currentLevelAnimals = ['', '', '', '', ''];
let currentLevelScales  = [1.0, 1.0, 1.0, 1.0, 1.0];
let board = [];
let totalMatchesForLevel = 10;

function waitForThree() { return Promise.resolve(); }

const _GAME_BGMS = ['gameBgm3', 'gameBgm4', 'gameBgm5'];
function playRandomGameBGM() {
  const id = _GAME_BGMS[Math.floor(Math.random() * _GAME_BGMS.length)];
  AudioManager.playBGM(id);
}

async function loadLevelAnimals() {
  const config = LEVEL_CONFIGS[(level - 1) % MAX_LEVEL];
  document.getElementById('load-text').textContent = `레벨 ${level} — 동물 친구들 등장!`;
  currentLevelAnimals = config.map(idx => `${PREVIEW_BASE}${ANIMAL_LIST[idx]}${PREVIEW_EXT}`);
  currentLevelScales  = config.map(idx => ANIMAL_SCALES[idx] ?? 1.0);
  for (let i = 0; i < 5; i++) {
    const slot = document.getElementById(`ls${i}`);
    slot.innerHTML = '';
    const img = new Image();
    img.src = currentLevelAnimals[i];
    slot.appendChild(img);
    slot.classList.add('ready');
  }
  await delay(600);
}

async function init() {
  if (level > MAX_LEVEL) {
    document.getElementById('complete-sub').textContent = `최고 점수: ${score}점 | 100레벨 완전 정복! 🏆`;
    document.getElementById('complete-overlay').classList.remove('hidden');
    return;
  }

  document.getElementById('load-overlay').classList.remove('hidden');
  await waitForThree();
  await loadLevelAnimals();
  document.getElementById('load-overlay').classList.add('hidden');

  const tier = getLevelTier(level);
  GRID = tier.grid;
  document.documentElement.style.setProperty('--cols', GRID);

  score = 0; animating = false; selected = null; gameOver = false;
  timeLeft = BASE_TIME;
  _warned20 = false; _warned10 = false;
  totalMatchesForLevel = getLevelMatchCount(level);
  barriersLeft = totalMatchesForLevel;
  gameLog('LEVEL', `레벨 ${level} 시작 | grid=${GRID}x${GRID} | 시간=${timeLeft}s | 필요매치=${totalMatchesForLevel} (기본10+장벽${getLevelExtraBarriers(level)})`);
  drag.active = false; urgency = 0;

  document.getElementById('win-overlay').classList.add('hidden');
  document.getElementById('lose-overlay').classList.add('hidden');

  generateBoard();
  if (level === 5)  _setupLevel5TutorialBoard();
  if (level === 10) _setupLevel10TutorialBoard();
  if (level === 15) _setupLevel15TutorialBoard();
  if (level === 20) _setupLevel20TutorialBoard();
  if (level === 25) _setupLevel25TutorialBoard();
  if (level >= 101) placeCrates(level);
  renderBoard(); renderBarriers(); updateHUD(); updateTimerUI();

  const catC = document.getElementById('cat-canvas');
  catC.style.left = '54%';
  const dragonC = document.getElementById('dragon-canvas');
  dragonC.style.left = '2%';

  setCatState('run');
  startAnimLoop();

  clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
  playRandomGameBGM();

  if (level === 5 && window.tutorialManager) {
    window.tutorialManager.startCircularSawTutorial(
      { r: 3, c: 4 }, { r: 4, c: 4 },
      [{ r: 3, c: 2 }, { r: 3, c: 3 }, { r: 3, c: 5 }]
    );
  } else if (level === 10 && window.tutorialManager) {
    window.tutorialManager.startBlackholeTutorial(
      { r: 3, c: 4 }, { r: 3, c: 3 },
      [{ r: 1, c: 4 }, { r: 2, c: 4 }, { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 4, c: 4 }]
    );
  } else if (level === 15 && window.tutorialManager) {
    window.tutorialManager.startChainTutorial(
      { r: 3, c: 4 }, { r: 2, c: 4 },
      [{ r: 3, c: 2 }, { r: 3, c: 3 }, { r: 3, c: 5 }, { r: 3, c: 6 }]
    );
  } else if (level === 20 && window.tutorialManager) {
    window.tutorialManager.startTilebombTutorial(
      { r: 3, c: 5 }, { r: 3, c: 4 }
    );
  } else if (level === 25 && window.tutorialManager) {
    window.tutorialManager.startMagnetTutorial(
      { r: 3, c: 5 }, { r: 3, c: 4 }
    );
  } else {
    scheduleHint();
  }
}

function tick() {
  if (gameOver) return;
  timeLeft = Math.max(0, timeLeft - 1);
  updateTimerUI();

  const totalTime = BASE_TIME;
  urgency = 1 - timeLeft / totalTime;

  const catLeft = parseFloat(document.getElementById('cat-canvas').style.left) || 54;
  const dragonLeft = 2 + urgency * (catLeft - 2);
  document.getElementById('dragon-canvas').style.left = dragonLeft + '%';
  document.getElementById('danger-bar').style.width = (urgency * 100) + '%';

  if (timeLeft <= 20 && !_warned20) {
    _warned20 = true;
    setCatState('scare');
    AudioManager.play('hurryUp');
    gameLog('TIMER', `⚠️ 20초 경고 - 고양이 놀람!`);
  }
  if (timeLeft <= 10 && !_warned10) {
    _warned10 = true;
    AudioManager.play('hurryUp');
    gameLog('TIMER', `⚠️ 10초 2차 경고음!`);
  }
  if (timeLeft <= 0) { gameLog('TIMER', `⏰ 시간 초과 → 게임오버`); endGame(false, 'time'); }
}

function addTime(_sec) { /* 시간 추가 없음 */ }

function renderBarriers() {
  const maxExtra      = getLevelExtraBarriers(level);
  const extraRemaining = Math.max(0, barriersLeft - 10);
  const wrap = document.getElementById('barriers');
  wrap.innerHTML = '';
  if (extraRemaining === 0) return;

  const brokenCount = maxExtra - extraRemaining;
  const startPct = 62;
  const step = maxExtra > 1 ? 18 / (maxExtra - 1) : 0;

  for (let i = 0; i < extraRemaining; i++) {
    const b = document.createElement('div');
    b.className = 'barrier';
    b.textContent = BARRIER_EMOJIS[(brokenCount + i) % BARRIER_EMOJIS.length];
    b.id = `barrier-${i}`;
    b.style.left = (startPct + (brokenCount + i) * step) + '%';
    wrap.appendChild(b);
  }
}

async function breakNextBarrier() {
  if (barriersLeft <= 0) return;
  const breakingExtra = barriersLeft > 10;
  barriersLeft--;
  const extraRemaining = Math.max(0, barriersLeft - 10);
  gameLog('BARRIER', `진행 1보 | 남은: ${barriersLeft}/${totalMatchesForLevel} | 장벽 남은: ${extraRemaining}`);

  const catC = document.getElementById('cat-canvas');

  if (breakingExtra) {
    const first = document.getElementById('barriers').querySelector('.barrier');
    if (first) {
      catC.classList.add('cat-jumping');
      first.classList.add('breaking');
      await delay(300);
      catC.classList.remove('cat-jumping');
      first.remove();
    }
  }

  const baseStepsDone = Math.min(totalMatchesForLevel - barriersLeft, 10);
  const newLeft = 54 + (baseStepsDone / 10) * (83 - 54);
  catC.style.left = Math.min(newLeft, 83) + '%';
  setCatState('run');
  renderBarriers();
  if (barriersLeft <= 0) { await delay(300); endGame(true); }
}

function endGame(won, reason) {
  if (gameOver) return;
  gameLog('LEVEL', `게임종료 | 결과=${won?'승리':'패배'} 이유=${reason||'-'} | score=${score} level=${level} 남은시간=${timeLeft.toFixed(0)}s`);
  clearAutoHint();
  gameOver = true; clearInterval(timerInterval); animating = false;
  AudioManager.stopBGM();

  if (won) {
    if (typeof saveScore === 'function') saveScore(score);
    (async () => {
      try {
        const user = window._cachedUser ?? null;
        if (!user) { gameLog('LEVEL', '진행상황 저장 건너뜀 (비로그인)'); return; }
        const prev = typeof window.loadUserProgress === 'function' ? await window.loadUserProgress(user.id) : null;
        const maxCleared = Math.max(level, prev?.max_cleared_level ?? 0);
        const totalScore = (prev?.total_score ?? 0) + score;
        if (typeof window.saveLevelScore   === 'function') await window.saveLevelScore(user.id, level, score);
        if (typeof window.saveUserProgress === 'function') await window.saveUserProgress(user.id, {
          max_cleared_level: maxCleared,
          current_level:     level + 1,
          total_score:       totalScore
        });
        gameLog('LEVEL', `진행상황 저장 완료 | user=${user.email} maxCleared=${maxCleared} totalScore=${totalScore}`);
      } catch (e) {
        console.error('[endGame] 진행상황 저장 실패', e);
        gameLog('LEVEL', `진행상황 저장 실패: ${e.message}`);
      }
    })();
    AudioManager.play('escapeSound');
    setCatState('celebrate');
    const catC = document.getElementById('cat-canvas');
    catC.style.left = '92%';
    setTimeout(() => {
      document.getElementById('win-sub').textContent = `점수: ${score}점 | 레벨 ${level} 클리어! 🎉`;
      document.getElementById('win-overlay').classList.remove('hidden');
      animateWinCat();
    }, 700);
  } else {
    setCatState('scare');
    const dragonC = document.getElementById('dragon-canvas');
    const _catPos = parseFloat(document.getElementById('cat-canvas').style.left) || 54;
    dragonC.style.left = _catPos + '%';
    setTimeout(() => {
      document.getElementById('lose-title').textContent = reason === 'time' ? '시간 초과!' : '잡혔다!';
      document.getElementById('lose-sub').textContent = reason === 'time' ? '시간이 다 됐어요! 용이 야옹이를 잡았어요!' : '용이 야옹이를 잡았어요!';
      document.getElementById('lose-overlay').classList.remove('hidden');
    }, 600);
  }
}

// ── 이벤트 바인딩 ──
document.getElementById('title-start-btn').addEventListener('click', async () => {
  document.getElementById('title-overlay').classList.add('hidden');
  AudioManager.stopBGM();
  level = 1;
  try {
    const user = typeof window.getCurrentUser === 'function' ? await window.getCurrentUser() : null;
    if (user && typeof window.loadUserProgress === 'function') {
      const progress = await window.loadUserProgress(user.id);
      if (progress?.current_level > 1) level = progress.current_level;
    }
  } catch (e) {
    console.error('[게임시작] 진행상황 로드 실패, 1레벨로 시작', e);
  }
  init();
});

document.getElementById('restart-btn').addEventListener('click', () => {
  if (bestScore < score) bestScore = score;
  init();
});

document.getElementById('home-btn').addEventListener('click', () => {
  if (bestScore < score) bestScore = score;
  clearAutoHint();
  level = 1;
  showTitleScreen();
});

document.getElementById('next-btn').addEventListener('click', () => { level++; init(); });

document.getElementById('complete-btn').addEventListener('click', () => {
  document.getElementById('complete-overlay').classList.add('hidden');
  level = 1; showTitleScreen();
});

document.getElementById('retry-btn').addEventListener('click', () => {
  if (bestScore < score) bestScore = score;
  init();
});

// ── Google 로그인 UI ──
window.addEventListener('load', function () {
  const loginBtn   = document.getElementById('title-login-btn');
  const userDiv    = document.getElementById('title-user');
  const avatarImg  = document.getElementById('title-avatar');
  const nicknameEl = document.getElementById('title-nickname');
  const logoutBtn  = document.getElementById('title-logout-btn');

  function setAuthUI(user) {
    if (user) {
      loginBtn.style.display  = 'none';
      userDiv.style.display   = 'flex';
      avatarImg.src           = user.user_metadata?.avatar_url || '';
      nicknameEl.textContent  = user.user_metadata?.full_name || user.email || '유저';
    } else {
      loginBtn.style.display  = '';
      userDiv.style.display   = 'none';
    }
  }

  loginBtn.addEventListener('click', () => window.loginWithGoogle());
  logoutBtn.addEventListener('click', () => window.logout());

  if (typeof window.onAuthReady === 'function') {
    window.onAuthReady(setAuthUI);
  }
});

// ── 진입점: 스프라이트 로드 완료 시 타이틀 표시 ──
CAT_SPRITE.onload = async () => {
  await waitForThree();
  showTitleScreen();
};
CAT_SPRITE.src = (window.ASSETS_CONFIG?.sprites?.cat) || 'assets/image/Cat_Sprite_Sheet.png';
