// js/auth.js
// 의존: supabase-client.js (window.supabaseClient)

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
    callback(session?.user ?? null);
  });
};
