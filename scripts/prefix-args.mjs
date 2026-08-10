#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const args = [
  ['apps/mobile/src/components/charts/CalendarGrid.tsx', 26, 'borderColor'],
  ['apps/mobile/src/features/global-pulse/components/BottomPanel.tsx', 39, 'onRefresh'],
  ['apps/mobile/src/features/global-pulse/components/BottomPanel.tsx', 40, 'isRefreshing'],
  ['apps/mobile/src/features/global-pulse/components/Leaderboard.tsx', 64, 'type'],
  ['apps/mobile/src/features/home/components/HomeFoodSection.tsx', 48, 'isReadOnly'],
  ['apps/mobile/src/features/practice/body/modals/AdjustExerciseModal.tsx', 62, 'idx'],
  ['apps/mobile/src/features/reflections/core/BatchActionBar.tsx', 22, 'totalCount'],
  ['apps/mobile/src/features/reflections/core/PlanTaskCard.tsx', 23, 'checkins'],
  ['apps/mobile/src/features/reflections/hooks/useQuickTrailSearch.ts', 30, 'aiConfig'],
  ['apps/mobile/src/features/reflections/review/ReviewScreen.tsx', 99, 'count'],
  ['apps/mobile/src/features/reflections/timeline/TimelineNoteItem.tsx', 23, 'onCreatePlan'],
  ['apps/mobile/src/features/reflections/timeline/TimelineReflectionItem.tsx', 34, 'onCreatePlan'],
  ['apps/mobile/src/features/sleep/SleepSummaryCard.tsx', 405, 'i'],
  ['apps/mobile/src/features/sleep/components/BedtimeReminderModal.tsx', 184, 'delay'],
  ['apps/mobile/src/features/vow/components/ProgressOverview.tsx', 16, 'TH'],
  ['apps/mobile/src/features/vow/modals/VisionEditModal.tsx', 21, 'T'],
  ['apps/mobile/src/features/zhiguan/SessionComplete.tsx', 80, 'idx'],
  ['apps/mobile/src/features/zhiguan/ZhiguanSettingsSheet.tsx', 134, 'idx'],
  ['apps/mobile/src/media/components/MusicMiniBar.tsx', 27, 'loop'],
  ['apps/mobile/src/media/components/PlayerBar.tsx', 21, 'category'],
  ['apps/mobile/src/store/uiStore.ts', 40, 'get'],
];

let total = 0;
for (const [file, lineNum, name] of args) {
  const filePath = `D:/MyProject/2026/egoless-do/${file}`;
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { continue; }
  const fileLines = content.split('\n');
  const line = fileLines[lineNum - 1];
  if (!line) continue;

  // Only rename the arg in the parameter position on that specific line
  // Pattern: word boundary + name + word boundary, but only on the target line
  const renamed = line.replace(new RegExp(`\\b${name}\\b`), `_${name}`);
  if (renamed !== line) {
    fileLines[lineNum - 1] = renamed;
    writeFileSync(filePath, fileLines.join('\n'), 'utf8');
    total++;
    console.log(`  ${file}:${lineNum}  ${name} → _${name}`);
  }
}
console.log(`\nRenamed ${total} args`);
