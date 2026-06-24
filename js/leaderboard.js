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

// ── user_progress 테이블 연동 ──────────────────────────────────

window.saveUserProgress = async function (userId, data) {
  try {
    const user = await window.getCurrentUser();
    const display_name = user?.user_metadata?.full_name ?? user?.email ?? null;
    const avatar_url   = user?.user_metadata?.avatar_url ?? null;

    const { error } = await window.supabaseClient
      .from('user_progress')
      .upsert({
        user_id:           userId,
        display_name:      display_name,
        avatar_url:        avatar_url,
        max_cleared_level: data.max_cleared_level,
        current_level:     data.current_level,
        total_score:       data.total_score,
        last_played_at:    new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) console.error('[saveUserProgress]', error.message);
  } catch (e) {
    console.error('[saveUserProgress]', e);
  }
};

window.loadUserProgress = async function (userId) {
  try {
    const { data, error } = await window.supabaseClient
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[loadUserProgress]', error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.error('[loadUserProgress]', e);
    return null;
  }
};

window.saveLevelScore = async function (userId, levelNumber, score) {
  try {
    const { error } = await window.supabaseClient
      .from('level_scores')
      .insert({ user_id: userId, level_number: levelNumber, score: score });

    if (error) console.error('[saveLevelScore]', error.message);
  } catch (e) {
    console.error('[saveLevelScore]', e);
  }
};

window.getProgressLeaderboard = async function () {
  try {
    const { data, error } = await window.supabaseClient
      .from('user_progress')
      .select('display_name, avatar_url, max_cleared_level, total_score')
      .order('max_cleared_level', { ascending: false })
      .order('total_score',       { ascending: false })
      .limit(20);

    if (error) { console.error('[getProgressLeaderboard]', error.message); return []; }
    return data ?? [];
  } catch (e) {
    console.error('[getProgressLeaderboard]', e);
    return [];
  }
};

window.getMyRank = async function (userId) {
  try {
    const { data: me } = await window.supabaseClient
      .from('user_progress')
      .select('max_cleared_level, total_score')
      .eq('user_id', userId)
      .single();

    if (!me) return null;

    const { count, error } = await window.supabaseClient
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .or(
        `max_cleared_level.gt.${me.max_cleared_level},` +
        `and(max_cleared_level.eq.${me.max_cleared_level},total_score.gt.${me.total_score})`
      );

    if (error) { console.error('[getMyRank]', error.message); return null; }
    return (count ?? 0) + 1;
  } catch (e) {
    console.error('[getMyRank]', e);
    return null;
  }
};
