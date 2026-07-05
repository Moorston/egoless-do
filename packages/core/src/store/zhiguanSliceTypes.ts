// ─── Zhiguan slice interface ──────────────────────────────────
// Extracted from store/types.ts to avoid bloating it
import type { ZhiguanSession, ZhiguanDraft, ZhiguanStats } from '../types';
import type { BreathingRecord } from '../types/breath';

export interface ZhiguanSlice {
  // Zhiguan sessions
  sessions: ZhiguanSession[];
  currentDraft?: ZhiguanDraft;
  currentSession?: ZhiguanSession;
  stats?: ZhiguanStats;
  isLoading: boolean;
  error?: string;

  initDraft: () => void;
  updateDraft: (updates: Partial<ZhiguanDraft>) => void;
  resetDraft: () => void;

  startSession: () => ZhiguanSession | undefined;
  updateSessionDraft: (updates: Partial<ZhiguanSession>) => void;
  recordBreathCount: (count: number) => void;

  pauseSession: () => void;
  resumeSession: () => void;

  completeSession: (closingData: {
    closingNotes?: string;
    eightTactile: ZhiguanSession['eightTactile'];
    selfReportedStage?: ZhiguanSession['selfReportedStage'];
    selfReportedStageText?: string;
    dedicationId?: string;
    samathaRatioAvg?: number;
    vipassanaRatioAvg?: number;
  }) => ZhiguanSession | undefined;

  interruptSession: (reason?: string, elapsedMs?: number) => void;
  deleteSession: (id: string) => void;

  setSessions: (sessions: ZhiguanSession[]) => void;
  upsertSession: (session: ZhiguanSession) => void;

  computeStats: () => ZhiguanStats;

  setError: (err: string | undefined) => void;

  // Breathing (from BreathSlice)
  breathHistory: BreathingRecord[];
  addBreathRecord: (data: Omit<BreathingRecord, 'id' | 'updatedAt' | 'deleted'>) => void;
  removeBreathRecord: (id: string) => void;
}
