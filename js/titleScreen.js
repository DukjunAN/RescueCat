function showTitleScreen() {
  document.getElementById('title-overlay').classList.remove('hidden');
  AudioManager.playBGM('titleSong');
  document.getElementById('title-best-score').textContent = bestScore > 0 ? bestScore + '점' : '-';
  if (typeof getMyBestScore === 'function') getMyBestScore().then(s => {
    if (s > bestScore) {
      bestScore = s;
      document.getElementById('title-best-score').textContent = bestScore + '점';
    }
  });

  document.getElementById('title-continue-row').style.display = 'none';
  if (typeof window.getCurrentUser === 'function') {
    window.getCurrentUser().then(user => {
      if (!user || typeof window.loadUserProgress !== 'function') return;
      window.loadUserProgress(user.id).then(progress => {
        const savedLevel = progress?.current_level ?? 1;
        if (savedLevel > 1) {
          document.getElementById('title-continue-level').textContent = savedLevel;
          document.getElementById('title-continue-row').style.display = '';
          document.getElementById('title-start-btn').textContent = `🐾 ${savedLevel}레벨 이어하기`;
        } else {
          document.getElementById('title-start-btn').textContent = '🐾 게임 시작';
        }
      });
    });
  }

  // 별 생성
  const starsEl = document.getElementById('title-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('div');
    s.className = 'title-star';
    const size = Math.random() * 2.5 + 1;
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${size}px;height:${size}px;--dur:${(Math.random()*2+1.2).toFixed(1)}s;animation-delay:${(Math.random()*2).toFixed(1)}s`;
    starsEl.appendChild(s);
  }

  // 타이틀 고양이 애니메이션
  const titleCanvas = document.getElementById('title-cat-canvas');
  setCatState('celebrate');
  let titleRAF;
  const TITLE_FPS = 60;
  const TITLE_DT = 1 / TITLE_FPS;
  let titleLastT = performance.now();
  function titleCatFrame(now) {
    if (document.getElementById('title-overlay').classList.contains('hidden')) return;
    const elapsed = Math.min((now - titleLastT) / 1000, TITLE_DT * 3);
    titleLastT = now;
    drawCat(titleCanvas, 'celebrate', Math.min(elapsed, TITLE_DT));
    titleRAF = requestAnimationFrame(titleCatFrame);
  }
  if (titleRAF) cancelAnimationFrame(titleRAF);
  titleRAF = requestAnimationFrame(titleCatFrame);
}
