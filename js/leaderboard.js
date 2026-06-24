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

// ── 오프라인 큐 (로컬 캐시 → 나중에 Supabase 동기화) ─────────────

const _QUEUE_KEY = 'rc_pending_saves';

function _getQueue() {
  try { return JSON.parse(localStorage.getItem(_QUEUE_KEY) || '{"scores":[],"progress":null}'); }
  catch { return { scores: [], progress: null }; }
}
function _setQueue(q) {
  try { localStorage.setItem(_QUEUE_KEY, JSON.stringify(q)); } catch {}
}

// 큐에 쌓인 데이터를 Supabase로 전송
window.flushPendingSaves = async function () {
  const user = window._cachedUser;
  if (!user) return;

  const q = _getQueue();
  if (!q.scores.length && !q.progress) return;

  console.log('[flushPendingSaves] 미전송 데이터 동기화 시작', q);

  // level_scores 전송
  const failedScores = [];
  for (const item of q.scores) {
    const { error } = await window.supabaseClient.from('level_scores').insert(item);
    if (error) { console.error('[flushPendingSaves] score 실패', error.message); failedScores.push(item); }
  }

  // user_progress 전송
  let progressFailed = false;
  if (q.progress) {
    const { error } = await window.supabaseClient
      .from('user_progress')
      .upsert(q.progress, { onConflict: 'user_id' });
    if (error) { console.error('[flushPendingSaves] progress 실패', error.message); progressFailed = true; }
  }

  _setQueue({ scores: failedScores, progress: progressFailed ? q.progress : null });
  if (!failedScores.length && !progressFailed) console.log('[flushPendingSaves] 동기화 완료');
};

// 네트워크 복구 시 자동 동기화
window.addEventListener('online', () => window.flushPendingSaves());

// ── user_progress 테이블 연동 ──────────────────────────────────

window.saveUserProgress = async function (userId, data) {
  const user = window._cachedUser;
  const payload = {
    user_id:           userId,
    display_name:      user?.user_metadata?.full_name ?? user?.email ?? null,
    avatar_url:        user?.user_metadata?.avatar_url ?? null,
    max_cleared_level: data.max_cleared_level,
    current_level:     data.current_level,
    total_score:       data.total_score,
    last_played_at:    new Date().toISOString()
  };

  // 로컬에 즉시 저장
  const q = _getQueue();
  q.progress = payload;
  _setQueue(q);

  // Supabase 전송 시도
  try {
    const { error } = await window.supabaseClient
      .from('user_progress')
      .upsert(payload, { onConflict: 'user_id' });

    if (!error) {
      // 전송 성공 → 큐에서 제거
      const q2 = _getQueue();
      q2.progress = null;
      _setQueue(q2);
      console.log('[saveUserProgress] 저장 완료');
    } else {
      console.warn('[saveUserProgress] Supabase 오류, 로컬 보관:', error.message);
    }
  } catch (e) {
    console.warn('[saveUserProgress] 네트워크 오류, 로컬 보관:', e.message);
  }
};

window.loadUserProgress = async function (userId) {
  // Supabase 조회 시도
  try {
    const { data, error } = await window.supabaseClient
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error) return data ?? null;
    if (error.code !== 'PGRST116') console.error('[loadUserProgress]', error.message);
  } catch (e) {
    console.warn('[loadUserProgress] 네트워크 오류, 로컬 캐시 사용:', e.message);
  }

  // 네트워크 실패 시 로컬 큐에서 최신 progress 반환
  const q = _getQueue();
  return q.progress ?? null;
};

window.saveLevelScore = async function (userId, levelNumber, score) {
  const item = { user_id: userId, level_number: levelNumber, score: score };

  // 로컬에 즉시 저장
  const q = _getQueue();
  q.scores.push(item);
  _setQueue(q);

  // Supabase 전송 시도
  try {
    const { error } = await window.supabaseClient
      .from('level_scores')
      .insert(item);

    if (!error) {
      // 전송 성공 → 큐에서 해당 항목 제거
      const q2 = _getQueue();
      q2.scores = q2.scores.filter(
        s => !(s.user_id === item.user_id && s.level_number === item.level_number && s.score === item.score)
      );
      _setQueue(q2);
    } else {
      console.warn('[saveLevelScore] Supabase 오류, 로컬 보관:', error.message);
    }
  } catch (e) {
    console.warn('[saveLevelScore] 네트워크 오류, 로컬 보관:', e.message);
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
