#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

// All remaining no-unused-vars: file, line, name
const warnings = [
  ['apps/mobile/src/components/EmptyState.tsx', 23, 'T'],
  ['apps/mobile/src/components/MeditationMusicBar.tsx', 58, 'TH'],
  ['apps/mobile/src/features/auth/LoginScreen.tsx', 13, 'log'],
  ['apps/mobile/src/features/breathing/pages/BreathPreparePage.tsx', 14, 'log'],
  ['apps/mobile/src/features/breathing/pages/BreathReportPage.tsx', 14, 'log'],
  ['apps/mobile/src/features/home/components/Banner.tsx', 29, 'TH'],
  ['apps/mobile/src/features/reflections/core/BatchActionBar.tsx', 32, 'T'],
  ['apps/mobile/src/features/reflections/core/FilterDrawer.tsx', 76, 'T'],
  ['apps/mobile/src/features/reflections/core/ReflectionCard.tsx', 43, 'P'],
  ['apps/mobile/src/features/reflections/core/SearchFilterBar.tsx', 34, 'T'],
  ['apps/mobile/src/features/reflections/core/ShareCard.tsx', 27, 'TH'],
  ['apps/mobile/src/features/reflections/trails/MindTrailEntryCard.tsx', 17, 'P'],
  ['apps/mobile/src/features/reflections/trails/SmartQueryPanel.tsx', 30, 'T'],
  ['apps/mobile/src/features/settings/RecycleBinScreen.tsx', 57, 'P'],
  // Other single-use variables
  ['apps/mobile/src/__tests__/performance.test.ts', 18, 'items'],
  ['apps/mobile/src/__tests__/performance.test.ts', 19, 'hasMore'],
  ['apps/mobile/src/components/PlanCountdown.tsx', 22, 'startDate'],
  ['apps/mobile/src/db/queries.ts', 82, 'safeParse'],
  ['apps/mobile/src/db/sqlHelper.ts', 87, 'T'],
  ['apps/mobile/src/db/syncQueue.ts', 11, 'QUEUE_WARN_SIZE'],
  ['apps/mobile/src/features/breathing/BreathHistoryPage.tsx', 35, 'sortedDates'],
  ['apps/mobile/src/features/exercise/TrainingCalendar.tsx', 73, 'today'],
  ['apps/mobile/src/features/global-pulse/components/LeaderboardItem.tsx', 51, 'ongoingDays'],
  ['apps/mobile/src/features/home/screens/HomeScreen.tsx', 86, 'habits'],
  ['apps/mobile/src/features/plan/components/PlanItemForm.tsx', 64, 'setStartDate'],
  ['apps/mobile/src/features/plan/components/PlanItemForm.tsx', 65, 'setEndDate'],
  ['apps/mobile/src/features/practice/PreceptScreen.tsx', 33, 'violateHabitId'],
  ['apps/mobile/src/features/practice/body/WeightTrendChart.tsx', 40, 'year'],
  ['apps/mobile/src/features/practice/body/modals/PlanEditModal.tsx', 61, 'keyToLabel'],
  ['apps/mobile/src/features/practice/body/screens/CelebrationOverlay.tsx', 6, 'SCREEN_WIDTH'],
  ['apps/mobile/src/features/reflections/core/ReflectionCard.tsx', 40, 'index'],
  ['apps/mobile/src/features/reflections/insights/NodeDetailPanel.tsx', 18, 'NODE_COLORS'],
  ['apps/mobile/src/features/sleep/HomePage.tsx', 42, 'onStartBarrierFromModal'],
  ['apps/mobile/src/features/sleep/pages/SleepBarrierPage.tsx', 65, 'barrierDuration'],
  ['apps/mobile/src/features/sync/SyncApplyService.test.ts', 78, '_c'],
  ['apps/mobile/src/features/vow/useVowProgress.ts', 80, 'p'],
  ['apps/mobile/src/media/services/AudioEngineProvider.tsx', 22, 'loop'],
  ['apps/mobile/src/navigation/index.tsx', 97, 'TAB_ROUTES'],
  ['apps/mobile/src/performance/monitor.ts', 20, 'sampleCount'],
  ['apps/mobile/src/store/fileStorage.ts', 11, 'DATA_FILE'],
  ['apps/mobile/src/store/useAppStore.ts', 133, 'persistAIConfig'],
];

let total = 0;
for (const [file, lineNum, name] of warnings) {
  const filePath = `D:/MyProject/2026/egoless-do/${file}`;
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { continue; }

  const fileLines = content.split('\n');
  const line = fileLines[lineNum - 1];
  if (!line) { console.log(`  SKIP ${file}:${lineNum} — line not found`); continue; }

  // Check if it's a standalone variable declaration: const name = ...;
  // Remove the entire line if it's a standalone const/let
  const standaloneMatch = line.match(/^(\s*)(const|let)\s+(\w+)\s*=\s*.+;?\s*$/);
  if (standaloneMatch && standaloneMatch[3] === name) {
    fileLines.splice(lineNum - 1, 1);
    writeFileSync(filePath, fileLines.join('\n'), 'utf8');
    total++;
    console.log(`  ${file}:${lineNum}  removed: const ${name} = ...`);
    continue;
  }

  // Check if it's part of destructuring: const { ..., name, ... } = ...;
  const destructureMatch = line.match(/^(\s*const\s*\{)([^}]+)(\}\s*=.*)$/);
  if (destructureMatch && destructureMatch[2].includes(name)) {
    const prefix = destructureMatch[1];
    const props = destructureMatch[2].split(',').map(s => s.trim()).filter(Boolean);
    const filtered = props.filter(p => p !== name && p.replace(/^type\s+/, '').trim() !== name);
    if (filtered.length === 0) {
      // All props removed - remove entire line
      fileLines.splice(lineNum - 1, 1);
    } else {
      fileLines[lineNum - 1] = `${prefix}${filtered.join(', ')}${destructureMatch[3]}`;
    }
    writeFileSync(filePath, fileLines.join('\n'), 'utf8');
    total++;
    console.log(`  ${file}:${lineNum}  removed: ${name} from destructuring`);
    continue;
  }

  // Check if it's a standalone destructuring: const [name, ...] = ...;
  const arrayDestructMatch = line.match(/^(\s*const\s*\[)([^]+)(\]\s*=.*)$/);
  if (arrayDestructMatch && arrayDestructMatch[2].includes(name)) {
    const prefix = arrayDestructMatch[1];
    const items = arrayDestructMatch[2].split(',').map(s => s.trim()).filter(Boolean);
    const filtered = items.filter(i => i !== name);
    if (filtered.length === 0) {
      fileLines.splice(lineNum - 1, 1);
    } else {
      fileLines[lineNum - 1] = `${prefix}${filtered.join(', ')}${arrayDestructMatch[3]}`;
    }
    writeFileSync(filePath, fileLines.join('\n'), 'utf8');
    total++;
    console.log(`  ${file}:${lineNum}  removed: ${name} from array destructuring`);
    continue;
  }

  console.log(`  SKIP ${file}:${lineNum}  ${name} — pattern not matched: ${line.trim().substring(0, 60)}`);
}

console.log(`\nTotal: ${total} removed`);
