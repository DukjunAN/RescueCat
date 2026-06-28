let soundEnabled = localStorage.getItem('rc_sound') !== 'false';

function applySound(enabled) {
  soundEnabled = enabled;
  AudioManager.setMuted(!enabled);
  localStorage.setItem('rc_sound', enabled ? 'true' : 'false');
}

// 페이지 로드 시 저장된 설정 적용
applySound(soundEnabled);

document.getElementById('settings-open-btn').addEventListener('click', () => {
  document.getElementById('toggle-sound').checked = soundEnabled;
  document.getElementById('settings-overlay').classList.remove('hidden');
});

document.getElementById('settings-close-btn').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.add('hidden');
});

document.getElementById('settings-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('settings-overlay'))
    document.getElementById('settings-overlay').classList.add('hidden');
});

document.getElementById('toggle-sound').addEventListener('change', e => {
  applySound(e.target.checked);
});

document.getElementById('reset-tutorial-btn').addEventListener('click', () => {
  localStorage.removeItem('rescuecat_tutorial_shown');
  if (window.tutorialManager) window.tutorialManager.shownTutorials.clear();
  const btn = document.getElementById('reset-tutorial-btn');
  btn.textContent = '완료 ✓';
  btn.classList.add('done');
  setTimeout(() => { btn.textContent = '초기화'; btn.classList.remove('done'); }, 2000);
});

// 레벨 이동 드롭다운 — 열릴 때 현재 레벨에 가장 가까운 옵션 선택
function _updateLvJumpSelect() {
  const sel = document.getElementById('level-jump-select');
  if (!sel) return;
  const opts = [...sel.options].map(o => parseInt(o.value));
  const closest = opts.reduce((a, b) => Math.abs(b - level) < Math.abs(a - level) ? b : a);
  sel.value = String(closest);
}

document.getElementById('level-jump-go-btn').addEventListener('click', () => {
  const target = parseInt(document.getElementById('level-jump-select').value);
  document.getElementById('settings-overlay').classList.add('hidden');
  document.getElementById('title-overlay').classList.add('hidden');
  AudioManager.stopBGM();
  level = target;
  init();
});

document.getElementById('settings-open-btn').addEventListener('click', _updateLvJumpSelect, true);
