function updateHUD() {
  document.getElementById('score-value').textContent = score;
  document.getElementById('level-value').textContent = level;
}

function updateTimerUI() {
  const tv = document.getElementById('timer-value');
  tv.textContent = Math.ceil(timeLeft);
  const max = BASE_TIME;
  const pct = timeLeft / max;
  const circle = document.getElementById('timer-ring-circle');
  circle.style.strokeDashoffset = 157 * (1 - pct);
  circle.style.stroke = pct > 0.4 ? '#5ddbff' : pct > 0.2 ? '#f5c842' : '#ff4400';
  tv.style.color = pct > 0.4 ? '#5ddbff' : pct > 0.2 ? '#f5c842' : '#ff4400';
  tv.className = timeLeft <= 10 ? 'hud-value warning' : 'hud-value';
}
