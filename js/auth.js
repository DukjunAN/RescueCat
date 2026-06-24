// js/auth.js
// 의존: supabase-client.js (window.supabaseClient)

// 로그인 유저 캐시 — 네트워크 없이 즉시 참조
window._cachedUser = null;

// 페이지 로드 시 로컬 세션에서 즉시 복원
window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
  window._cachedUser = session?.user ?? null;
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
    // 로그인 시 로컬에 쌓인 미전송 데이터 동기화
    if (session?.user && typeof window.flushPendingSaves === 'function') {
      window.flushPendingSaves();
    }
  });
};
