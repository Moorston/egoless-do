// ─── PostHog 事件常量 ──────────────────────────────────────────
// 所有埋点事件名集中管理，避免散落的字符串。

export const Events = {
  // ── 用户生命周期 ──
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // ── 应用生命周期 ──
  APP_FOREGROUND: 'app_foreground',
  APP_BACKGROUND: 'app_background',
  SCREEN_VIEW: 'screen_view',

  // ── 习惯 ──
  HABIT_CREATED: 'habit_created',
  HABIT_COMPLETED: 'habit_completed',
  HABIT_INTERRUPTED: 'habit_interrupted',
  STREAK_MILESTONE: 'streak_milestone',

  // ── 修行活动 ──
  MEDITATION_STARTED: 'meditation_started',
  MEDITATION_COMPLETED: 'meditation_completed',
  MEDITATION_ABANDONED: 'meditation_abandoned',
  BREATH_COMPLETED: 'breath_session_completed',
  MANTRA_COMPLETED: 'mantra_session_completed',
  ZHIGUAN_COMPLETED: 'zhiguan_session_completed',

  // ── 感念/记录 ──
  REFLECTION_CREATED: 'reflection_created',

  // ── AI ──
  AI_FEATURE_USED: 'ai_feature_used',
} as const;

export type AnalyticsEvent = typeof Events[keyof typeof Events];
