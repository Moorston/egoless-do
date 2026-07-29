// ─── Shared base types ────────────────────────────────────────────

/** Known canonical mood values. Use these for type-safe mood handling. */
export type KnownMood =
  | '开心' | '兴奋' | '感恩' | '平静'
  | '焦虑' | '难过' | '生气' | '疲惫'
  | '满足' | '释然' | '淡定';

/** Mood string — prefer KnownMood values for new code */
export type Mood = KnownMood | (string & {});
export type HabitStatus = 'notStarted' | 'inProgress' | 'paused' | 'abandoned' | 'completed';
export type ThemeName = 'dark' | 'light' | 'ocean' | 'rose' | 'cosmos';

/** Base interface for all syncable entities */
export interface Syncable {
  updatedAt: number;
  deleted: boolean;
}

export interface Theme {
  name: string;
  nameEn?: string;
  bg: string;
  card: string;
  cardSolid: string;
  text: string;
  sub: string;
  border: string;
  primary: string;
  accent: string;
  navBg: string;
  starfield: boolean;
  warning?: string;
}
