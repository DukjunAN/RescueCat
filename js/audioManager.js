const AudioManager = (() => {
  const _pool = {};
  const _cfg  = (window.SOUNDS_CONFIG || {});
  const _base = (window.ASSETS_CONFIG?.sounds?.basePath) || _cfg.basePath || 'assets/sounds/';
  let _currentBGM = null;
  let _muted = false;
  const _origVol = {};

  (_cfg.sounds || []).forEach(s => {
    const audio = new Audio(_base + s.file);
    audio.volume  = s.volume ?? 1;
    audio.loop    = s.loop   ?? false;
    audio.preload = 'auto';
    audio.disableRemotePlayback = true;
    _pool[s.id]   = audio;
    _origVol[s.id] = audio.volume;
  });

  const api = {
    play(id) {
      const a = _pool[id];
      if (!a) return;
      a.currentTime = 0;
      a.play().catch(() => {});
    },
    stop(id) {
      const a = _pool[id];
      if (!a) return;
      a.pause();
      a.currentTime = 0;
    },
    playBGM(id) {
      if (_currentBGM && _currentBGM !== id) api.stopBGM();
      const a = _pool[id];
      if (!a) return;
      _currentBGM = id;
      a.currentTime = 0;
      a.play().catch(() => {});
    },
    stopBGM() {
      if (!_currentBGM) return;
      const a = _pool[_currentBGM];
      if (a) { a.pause(); a.currentTime = 0; }
      _currentBGM = null;
    },
    pauseAll() {
      Object.values(_pool).forEach(a => a.pause());
    },
    resumeBGM() {
      if (_currentBGM) _pool[_currentBGM]?.play().catch(() => {});
    },
    setVolume(id, vol) {
      const a = _pool[id];
      if (a) a.volume = Math.max(0, Math.min(1, vol));
    },
    setMuted(muted) {
      _muted = muted;
      Object.keys(_pool).forEach(id => {
        _pool[id].volume = muted ? 0 : _origVol[id];
      });
      if (muted && _currentBGM) _pool[_currentBGM]?.pause();
      else if (!muted && _currentBGM) _pool[_currentBGM]?.play().catch(() => {});
    },
    isMuted() { return _muted; }
  };

  // 모바일 홈 버튼·탭 전환 시 사운드 정지/복구 + 미디어 세션 해제
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      api.pauseAll();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
    } else {
      api.resumeBGM();
    }
  });

  return api;
})();
