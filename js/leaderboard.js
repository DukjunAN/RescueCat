// js/leaderboard.js
// 의존: supabase-client.js, auth.js

window.saveScore = async function (score) {
  const user = await window.getCurrentUser();
  if (!user) return;

  await window.supabaseClient
    .from('scores')
    .insert({
      user_id:  user.id,
      nickname: user.user_metadata?.full_name ?? user.email ?? 'unknown',
      avatar_url: user.user_metadata?.avatar_url ?? null,
      score:    score
    });
};

window.getMyBestScore = async function () {
  const user = await window.getCurrentUser();
  if (!user) return 0;

  const { data } = await window.supabaseClient
    .from('scores')
    .select('score')
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  return data?.score ?? 0;
};

window.getLeaderboard = async function () {
  const { data } = await window.supabaseClient
    .from('leaderboard')
    .select('nickname, avatar_url, best_score')
    .order('best_score', { ascending: false })
    .limit(20);

  return data ?? [];
};
