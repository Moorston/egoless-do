// ─── Shared base types ────────────────────────────────────────────

export type Mood = string;
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
  navBg: string;
  starfield: boolean;
}
