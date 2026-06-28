const TUTORIAL_SLIDES = [
  { type:'intro',     name:'특수 타일 안내', desc:'4개 이상 매치 시 특수 타일이 생성됩니다!' },
  { type:'drill',     name:'회전톱',          desc:'4개 일렬 매치! 스왑 방향으로 가로줄 또는 세로줄 전체를 제거합니다.' },
  { type:'emoji',     icon:'🌀', cls:'tile-blackhole', name:'블랙홀',  desc:'6개 이상 또는 십자(+) 매치! 활성화 시 보드 전체 같은 색 타일을 제거합니다.' },
  { type:'emoji',     icon:'⚡', cls:'tile-chain',     name:'체인',    desc:'5개 일렬 매치! 주변 타일을 연쇄 폭발시킵니다.' },
  { type:'emoji',     icon:'💣', cls:'tile-tilebomb',  name:'타일밤',  desc:'특수 타일 조합으로 생성! 즉시 폭발하여 주변 타일을 제거합니다.' },
  { type:'emoji',     icon:'🧲', cls:'tile-magnet',    name:'자석',    desc:'ㄱ·ㄴ자 매치! 활성화 시 주변 타일을 끌어당겨 제거합니다.' },
];
let _tutSlide = 0;

function _tutIconHTML(slide) {
  if (slide.type === 'intro') return `<div class="tutorial-intro-icon">✨</div>`;
  if (slide.type === 'drill') return `
    <div class="tutorial-drill-row">
      <img src="assets/image/drill-col.svg" class="tutorial-drill-img" title="회전톱">
    </div>`;
  return `<div class="tutorial-tile-mock ${slide.cls}">${slide.icon}</div>`;
}

function _renderTutSlide() {
  const slide = TUTORIAL_SLIDES[_tutSlide];
  const total = TUTORIAL_SLIDES.length;
  document.getElementById('tutorial-progress').textContent = `${_tutSlide + 1} / ${total}`;
  document.getElementById('tutorial-content').innerHTML =
    `${_tutIconHTML(slide)}
     <div class="tutorial-slide-name">${slide.name}</div>
     <div class="tutorial-slide-desc">${slide.desc}</div>`;
  const isLast = _tutSlide === total - 1;
  document.getElementById('tutorial-next-btn').textContent = isLast ? '게임 시작' : '다음';
  document.getElementById('tutorial-prev-btn').style.visibility = _tutSlide === 0 ? 'hidden' : 'visible';
}

function showTutorial() {
  _tutSlide = 0;
  _renderTutSlide();
  document.getElementById('tutorial-overlay').classList.remove('hidden');
}

function closeTutorial() {
  document.getElementById('tutorial-overlay').classList.add('hidden');
  localStorage.setItem('rescuecat_tutorial_seen', '1');
}

document.getElementById('tutorial-next-btn').addEventListener('click', () => {
  if (_tutSlide < TUTORIAL_SLIDES.length - 1) { _tutSlide++; _renderTutSlide(); }
  else closeTutorial();
});
document.getElementById('tutorial-prev-btn').addEventListener('click', () => {
  if (_tutSlide > 0) { _tutSlide--; _renderTutSlide(); }
});
document.getElementById('tutorial-close-btn').addEventListener('click', closeTutorial);
document.getElementById('tutorial-help-btn').addEventListener('click', showTutorial);

if (!localStorage.getItem('rescuecat_tutorial_seen')) showTutorial();
