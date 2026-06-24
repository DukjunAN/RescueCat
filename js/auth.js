// js/auth.js
// 의존: supabase-client.js (window.supabaseClient)

// 로그인 유저 캐시 — 네트워크 없이 즉시 참조
window._cachedUser = null;

// 페이지 로드 시 로컬 세션에서 즉시 복원 + 접속 기록
window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
  window._cachedUser = session?.user ?? null;
  if (session?.user && typeof window.recordLogin === 'function') {
    window.recordLogin(session.user);
  }
});

window.loginWithGoogle = function () {
  return window.supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href
    }
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
      // 로그인 시 로컬에 쌓인 미전송 데이터 동기화
      if (typeof window.flushPendingSaves === 'function') window.flushPendingSaves();
      // 접속 기록 (SIGNED_IN 이벤트만 — 실제 로그인 시점)
      if (_event === 'SIGNED_IN' && typeof window.recordLogin === 'function') {
        window.recordLogin(session.user);
      }
    }
  });
};
