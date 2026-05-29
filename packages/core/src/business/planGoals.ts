// ─── Plan Goal business logic (pure functions) ──────────────────
import type {
  Goal, GoalStatus, GoalLevel, DailyTask, TaskLog, TaskSchedule, TaskLink,
  Habit, FastingSession, MedHistoryEntry, ExerciseEntry, CheckinEntry,
} from '../types';
import { uid, dateStr } from '../utils';

// ── Goal CRUD ───────────────────────────────────────────────────

export function addGoal(goals: Goal[], form: {
  parentId?: string | null; level: GoalLevel; name: string;
  description?: string; icon?: string; startDate: string; endDate: string;
  tags?: string[]; order?: number;
}): Goal[] {
  const g: Goal = {
    id: uid(), parentId: form.parentId ?? null, level: form.level,
    name: form.name, description: form.description ?? '',
    icon: form.icon ?? '🎯', startDate: form.startDate, endDate: form.endDate,
    status: 'active', progress: 0, tags: form.tags ?? [],
    order: form.order ?? 0, updatedAt: Date.now(),
  };
  return [...goals, g];
}

export function updateGoal(goals: Goal[], id: string, patch: Partial<Goal>): Goal[] {
  return goals.map(g => g.id === id ? { ...g, ...patch, updatedAt: Date.now() } : g);
}

export function deleteGoal(goals: Goal[], id: string): Goal[] {
  const toDelete = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of goals) {
      if (!toDelete.has(g.id) && g.parentId && toDelete.has(g.parentId)) {
        toDelete.add(g.id);
        changed = true;
      }
    }
  }
  const now = Date.now();
  return goals.map(g => toDelete.has(g.id) ? { ...g, deleted: true, updatedAt: now } : g);
}

export function changeGoalStatus(goals: Goal[], id: string, status: GoalStatus): Goal[] {
  return goals.map(g => g.id === id ? { ...g, status, updatedAt: Date.now() } : g);
}

// ── DailyTask CRUD ──────────────────────────────────────────────

export function addTask(tasks: DailyTask[], form: {
  goalId?: string | null; name: string; icon?: string;
  schedule: TaskSchedule; required?: boolean; link?: TaskLink; order?: number;
}): DailyTask[] {
  const t: DailyTask = {
    id: uid(), goalId: form.goalId ?? null, name: form.name,
    icon: form.icon ?? '📋', schedule: form.schedule,
    required: form.required ?? false, link: form.link ?? { kind: 'none' },
    order: form.order ?? 0, updatedAt: Date.now(),
  };
  return [...tasks, t];
}

export function updateTask(tasks: DailyTask[], id: string, patch: Partial<DailyTask>): DailyTask[] {
  return tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t);
}

export function deleteTask(tasks: DailyTask[], id: string): DailyTask[] {
  return tasks.map(t => t.id === id ? { ...t, deleted: true, updatedAt: Date.now() } : t);
}

/** Remove all task logs for a deleted task */
export function cleanupTaskLogs(logs: TaskLog[], taskId: string): TaskLog[] {
  const now = Date.now();
  return logs.map(l => l.taskId === taskId ? { ...l, deleted: true, updatedAt: now } : l);
}

// ── TaskLog ─────────────────────────────────────────────────────

export function toggleTaskLog(logs: TaskLog[], taskId: string, date: string): TaskLog[] {
  const existing = logs.find(l => l.taskId === taskId && l.date === date);
  if (existing) {
    return logs.map(l =>
      l.taskId === taskId && l.date === date
        ? { ...l, done: !l.done, updatedAt: Date.now() }
        : l
    );
  }
  return [...logs, { id: uid(), taskId, date, done: true, updatedAt: Date.now() }];
}

// ── Schedule helpers ────────────────────────────────────────────

/** Calculate days between two YYYY-MM-DD dates */
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** Get day-of-week (0=Sun, 1=Mon ... 6=Sat) for a YYYY-MM-DD date */
function dayOfWeek(date: string): number {
  return new Date(date).getDay();
}

/** Return the next day as YYYY-MM-DD */
function nextDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Check if a task should be shown on a given date based on its schedule.
 *  @param planEndDate - optional end date; tasks are not shown after their plan ends. */
export function shouldShowToday(task: DailyTask, planStartDate: string, today: string, planEndDate?: string): boolean {
  if (today < planStartDate) return false;
  if (planEndDate && today > planEndDate) return false;

  if (task.schedule.type === 'daily') return true;

  if (task.schedule.type === 'weekdays') {
    return task.schedule.days.includes(dayOfWeek(today));
  }

  if (task.schedule.type === 'interval') {
    const dayIndex = daysBetween(planStartDate, today);
    return dayIndex >= 0 && dayIndex % task.schedule.every === 0;
  }

  if (task.schedule.type === 'specific') {
    const dayIndex = daysBetween(planStartDate, today);
    return dayIndex >= 0 && task.schedule.days.includes(dayIndex + 1); // 1-indexed
  }

  if (task.schedule.type === 'once') {
    return task.schedule.date === today;
  }

  return false;
}

// ── Completion signal ───────────────────────────────────────────

interface CompletionState {
  habits: Habit[];
  fastingHistory: FastingSession[];
  activeFasting: FastingSession | null;
  medHistory: MedHistoryEntry[];
  exerciseLog: ExerciseEntry[];
  checkinHistory: CheckinEntry[];
  waterMl: number;
  taskLogs: TaskLog[];
}

/** Determine if a task is done today. Linked tasks read from source features. */
export function isTaskDoneToday(
  task: DailyTask,
  state: CompletionState,
  today: string,
): boolean {
  const link = task.link;
  switch (link.kind) {
    case 'none':
      return state.taskLogs.some(l => l.taskId === task.id && l.date === today && l.done);

    case 'habit':
      return state.habits
        .find(h => h.id === link.habitId && !h.deleted)
        ?.checkedDates.includes(today) ?? false;

    case 'fasting': {
      const completedToday = state.fastingHistory.some(f => {
        if (!f.endedAt) return false;
        const endDate = dateStr(new Date(f.endedAt));
        if (endDate !== today) return false;
        return (f.endedAt - f.startedAt) / 3600000 >= link.targetHours;
      });
      const activeToday = state.activeFasting != null &&
        dateStr(new Date(state.activeFasting.startedAt)) === today;
      return completedToday || activeToday;
    }

    case 'meditation':
      return state.medHistory.some(m => m.date === today && !m.deleted);

    case 'exercise':
      return state.exerciseLog.some(e => {
        if (e.deleted) return false;
        const eDate = dateStr(new Date(e.timestamp));
        return eDate === today && e.durationSec >= link.minMinutes * 60;
      });

    case 'checkin':
      return state.checkinHistory.some(c => c.date === today && c.done && !c.deleted);

    case 'water':
      return state.waterMl >= link.targetMl;

    case 'goalProgress':
      return false; // goal progress is checked separately

    default:
      return false;
  }
}

// ── Today's tasks ───────────────────────────────────────────────

export function getTodayTasks(
  tasks: DailyTask[],
  state: CompletionState,
  today: string,
  goals?: Goal[],
): Array<{ task: DailyTask; done: boolean; source: 'auto' | 'manual' }> {
  return tasks
    .filter(t => {
      if (t.deleted) return false;
      const goal = goals?.find(g => g.id === t.goalId && !g.deleted);
      const planStart = goal?.startDate ?? today;
      const planEnd = goal?.endDate;
      return shouldShowToday(t, planStart, today, planEnd);
    })
    .sort((a, b) => a.order - b.order)
    .map(task => ({
      task,
      done: isTaskDoneToday(task, state, today),
      source: task.link.kind === 'none' ? 'manual' as const : 'auto' as const,
    }));
}

// ── Goal progress ───────────────────────────────────────────────

/** Compute goal progress from child goals and associated tasks */
export function computeGoalProgress(
  goal: Goal,
  allGoals: Goal[],
  tasks: DailyTask[],
  taskLogs: TaskLog[],
  today: string,
): number {
  // If has child goals, average their progress
  const children = allGoals.filter(g => g.parentId === goal.id && !g.deleted);
  if (children.length > 0) {
    const total = children.reduce((s, c) => s + c.progress, 0);
    return Math.round(total / children.length);
  }

  // If has associated tasks, compute from task completion rate
  const goalTasks = tasks.filter(t => t.goalId === goal.id && !t.deleted);
  if (goalTasks.length > 0) {
    const clampedToday = today > goal.endDate ? goal.endDate : today;
    let totalExpected = 0;
    let totalDone = 0;
    for (const task of goalTasks) {
      for (let d = goal.startDate; d <= clampedToday; d = nextDay(d)) {
        if (shouldShowToday(task, goal.startDate, d, goal.endDate)) {
          totalExpected++;
          const doneByLog = taskLogs.some(l => l.taskId === task.id && l.date === d && l.done);
          if (doneByLog || isTaskDoneToday(task, { habits: [], fastingHistory: [], activeFasting: null, medHistory: [], exerciseLog: [], checkinHistory: [], waterMl: 0, taskLogs }, d)) {
            totalDone++;
          }
        }
      }
    }
    return totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0;
  }

  // If neither, use time-based progress
  const totalDays = daysBetween(goal.startDate, goal.endDate) + 1;
  if (totalDays <= 0) return 0;
  const elapsed = daysBetween(goal.startDate, today) + 1;
  return Math.max(0, Math.min(Math.round((elapsed / totalDays) * 100), 100));
}

// ── Goal tree helpers ───────────────────────────────────────────

/** Get root goals (no parent) */
export function getRootGoals(goals: Goal[]): Goal[] {
  return goals.filter(g => !g.parentId && !g.deleted).sort((a, b) => a.order - b.order);
}

/** Get direct children of a goal */
export function getChildGoals(goals: Goal[], parentId: string): Goal[] {
  return goals.filter(g => g.parentId === parentId && !g.deleted).sort((a, b) => a.order - b.order);
}

/** Get tasks associated with a goal */
export function getGoalTasks(tasks: DailyTask[], goalId: string): DailyTask[] {
  return tasks.filter(t => t.goalId === goalId && !t.deleted).sort((a, b) => a.order - b.order);
}
