// ─── Pure counting round logic (testable, no React) ──────────────
export interface CountingRoundState {
  totalBreaths: number;
  cycles: number;       // 完成的 10 息轮数（0-indexed: 0=第1轮进行中）
  countedBreaths: number; // 1..10 （当前轮的息数）
  currentCycle: number; // 当前在第几轮（1-indexed）
}

export const initialRoundState: CountingRoundState = {
  totalBreaths: 0,
  cycles: 0,
  countedBreaths: 0,
  currentCycle: 1,
};

/** 一次完整呼吸（呼气结束点） */
export function notifyBreath(state: CountingRoundState): CountingRoundState {
  const total = Math.max(0, state.totalBreaths) + 1;

  // 计算 (total-1) / 10 的商和余数以正确处理 10 的边界：
  // total=1..10  → cycle=0 (第1轮) counted=1..10
  // total=11..20 → cycle=1 (第2轮) counted=1..10
  const zeroBasedIdx = total - 1;
  const cycles = Math.floor(zeroBasedIdx / 10);
  const counted = (zeroBasedIdx % 10) + 1;
  const currentCycle = cycles + 1;

  return {
    totalBreaths: total,
    cycles,
    countedBreaths: counted,
    currentCycle,
  };
}

/** 10-batch rounds helper — 总呼吸数 → (cycles, counted) */
export function computeRounds(total: number): { cycles: number; counted: number; currentCycle: number } {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal === 0) return { cycles: 0, counted: 0, currentCycle: 1 };
  const zeroBasedIdx = safeTotal - 1;
  const cycles = Math.floor(zeroBasedIdx / 10);
  const counted = (zeroBasedIdx % 10) + 1;
  return { cycles, counted, currentCycle: cycles + 1 };
}

export function resetRound(): CountingRoundState {
  return { ...initialRoundState };
}
