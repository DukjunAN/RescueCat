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

// ── 디버그 로그 헬퍼 (index.html gameLog 연동) ──────────────────
function _dbLog(msg) {
  if (typeof gameLog === 'function') gameLog('DB', msg);
  console.log('[DB]', msg);
}

// ── Supabase 연결 상태 확인 ────────────────────────────────────
window.checkSupabaseConnection = async function () {
  _dbLog('Supabase 연결 확인 중...');
  try {
    const { error } = await window.supabaseClient
      .from('user_progress')
      .select('count', { count: 'exact', head: true });
    if (error) {
      _dbLog(`❌ DB 연결 실패: ${error.message}`);
      return false;
    }
    const q = _getQueue();
    const pending = q.scores.length + (q.progress ? 1 : 0);
    _dbLog(`✅ DB 연결 정상${pending > 0 ? ` | 미전송 대기 ${pending}건` : ''}`);
    return true;
  } catch (e) {
    _dbLog(`❌ DB 연결 오류: ${e.message}`);
    return false;
  }
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
  if (!user) { _dbLog('flushPendingSaves: 로그인 필요'); return; }

  const q = _getQueue();
  if (!q.scores.length && !q.progress) { _dbLog('flushPendingSaves: 전송할 데이터 없음'); return; }

  _dbLog(`동기화 시작 — 점수 ${q.scores.length}건, 진행상황 ${q.progress ? '1건' : '없음'}`);

  // level_scores 전송
  const failedScores = [];
  for (const item of q.scores) {
    const { error } = await window.supabaseClient.from('level_scores').insert(item);
    if (error) {
      _dbLog(`❌ level_scores 전송 실패 lv${item.level_number}: ${error.message}`);
      failedScores.push(item);
    } else {
      _dbLog(`✅ level_scores 전송 완료 lv${item.level_number}`);
    }
  }

  // user_progress 전송
  let progressFailed = false;
  if (q.progress) {
    const { error } = await window.supabaseClient
      .from('user_progress')
      .upsert(q.progress, { onConflict: 'user_id' });
    if (error) {
      _dbLog(`❌ user_progress 전송 실패: ${error.message}`);
      progressFailed = true;
    } else {
      _dbLog(`✅ user_progress 전송 완료 (최고 ${q.progress.max_cleared_level}레벨)`);
    }
  }

  _setQueue({ scores: failedScores, progress: progressFailed ? q.progress : null });
  if (!failedScores.length && !progressFailed) _dbLog('🎉 모든 데이터 동기화 완료');
};

// 네트워크 복구 시 자동 동기화
window.addEventListener('online', () => {
  _dbLog('네트워크 복구 감지 → 동기화 시도');
  window.flushPendingSaves();
});

// ── 로그인 기록 ────────────────────────────────────────────────

function _detectDevice() {
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  return 'PC';
}

window.recordLogin = async function (user) {
  if (!user) return;

  const LAST_KEY = 'rc_last_login_recorded';
  const lastTs = parseInt(localStorage.getItem(LAST_KEY) || '0', 10);
  const elapsed = Date.now() - lastTs;
  if (elapsed < 60 * 60 * 1000) {
    _dbLog(`⏭ 접속기록 생략 (${Math.round(elapsed/60000)}분 전 기록됨, 1시간 내 중복 방지)`);
    return;
  }

  const payload = {
    user_id:      user.id,
    display_name: user.user_metadata?.full_name ?? user.email ?? null,
    avatar_url:   user.user_metadata?.avatar_url ?? null,
    device:       _detectDevice()
  };

  _dbLog(`📋 접속기록 저장 시도 | ${payload.display_name} | ${payload.device}`);

  try {
    const { error } = await window.supabaseClient
      .from('login_history')
      .insert(payload);

    if (!error) {
      localStorage.setItem(LAST_KEY, Date.now().toString());
      _dbLog(`✅ 접속기록 완료 | ${payload.device}`);
    } else {
      _dbLog(`❌ 접속기록 실패: ${error.message}`);
    }
  } catch (e) {
    _dbLog(`❌ 접속기록 네트워크 오류: ${e.message}`);
  }
};

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
