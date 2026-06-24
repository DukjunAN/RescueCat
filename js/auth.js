// js/auth.js
window._cachedUser = null;

function _authLog(msg) {
  if (typeof gameLog === 'function') gameLog('AUTH', msg);
  console.log('[AUTH]', msg);
}

// 페이지 로드 시 로컬 세션에서 즉시 복원
window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
  window._cachedUser = session?.user ?? null;
  if (session?.user) {
    _authLog(`✅ 세션 복원: ${session.user.email}`);
    if (typeof window.recordLogin === 'function') window.recordLogin(session.user);
    // 미전송 데이터 동기화
    setTimeout(async () => {
      if (typeof window.checkSupabaseConnection === 'function') {
        const ok = await window.checkSupabaseConnection();
        if (ok && typeof window.flushPendingSaves === 'function') window.flushPendingSaves();
      }
    }, 2000);
  } else {
    _authLog('🔓 비로그인 상태 (세션 없음)');
  }
});

window.loginWithGoogle = function () {
  return window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
};

window.logout = function () {
  return window.supabaseClient.auth.signOut();
};

window.getCurrentUser = async function () {
  const { data } = await window.supabaseClient.auth.getUser();
  return data?.user ?? null;
};

window.onAuthReady = function (callback) {
  window.supabaseClient.auth.onAuthStateChange((_event, session) => {
    window._cachedUser = session?.user ?? null;
    callback(session?.user ?? null);
    if (session?.user) {
      _authLog(`🔑 인증 이벤트: ${_event} | ${session.user.email}`);
      if (typeof window.flushPendingSaves === 'function') window.flushPendingSaves();
      if (_event === 'SIGNED_IN' && typeof window.recordLogin === 'function') {
        window.recordLogin(session.user);
      }
    } else {
      _authLog(`🔑 인증 이벤트: ${_event} | 로그아웃`);
    }
  });
};
