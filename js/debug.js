// PWA 배포 시 false 로 바꾸면 로그 패널 전체 비활성화
const DEBUG_LOG_ENABLED = true;

let _dbCount = 0, _logSuppressed = false;
const _DB_MAX = 400;

function gameLog(type, msg) {
  if (!DEBUG_LOG_ENABLED || _logSuppressed) return;
  const panel = document.getElementById('debug-log');
  if (!panel) return;
  _dbCount++;
  const line = document.createElement('div');
  line.className = `dl dl-${type}`;
  const t = (performance.now() / 1000).toFixed(2);
  line.innerHTML = `<span class="dl-t">[${t}s]</span><b>${type}</b> ${msg}`;
  panel.appendChild(line);
  while (panel.children.length > _DB_MAX) panel.removeChild(panel.firstChild);
  panel.scrollTop = panel.scrollHeight;
  const cnt = document.getElementById('debug-count');
  if (cnt) cnt.textContent = `${_dbCount}건`;
}
