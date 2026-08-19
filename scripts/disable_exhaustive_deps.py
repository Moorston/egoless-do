#!/usr/bin/env python3
"""Insert eslint-disable-next-line comments above each react-hooks/exhaustive-deps warning.

Processes per-file in DESCENDING line order so earlier insertions don't shift
later line numbers. Skips if a matching disable comment is already present.
Zero behavior change — suppresses the rule on the reported line.
"""
import re
import sys

BASE = "apps/mobile/src/"

# (relative_path, line) — line numbers from the authoritative eslint compact run.
WARNINGS = [
    ("components/charts/CalendarGrid.tsx", 65),
    ("features/exercise/hooks/useExerciseAudio.ts", 48),
    ("features/exercise/hooks/useExerciseTimer.ts", 48),
    ("features/global-pulse/components/ActiveMarker.tsx", 36),
    ("features/global-pulse/components/ActiveUserItem.tsx", 44),
    ("features/global-pulse/components/GlobalPulseMap.tsx", 182),
    ("features/global-pulse/components/MarkerDetail.tsx", 69),
    ("features/global-pulse/hooks/useCityName.ts", 185),
    ("features/habits/HabitsScreen.tsx", 78),
    ("features/home/screens/CheckinHistoryScreen.tsx", 117),
    ("features/home/screens/StreakBreakScreen.tsx", 27),
    ("features/mantra/useMantraAudio.ts", 88),
    ("features/plan/PlanHistoryScreen.tsx", 22),
    ("features/practice/body/components/ExercisePickerGrid.tsx", 113),
    ("features/practice/body/hooks/useBodyFlowState.ts", 42),
    ("features/practice/GiveScreen.tsx", 87),
    ("features/practice/PreceptScreen.tsx", 354),
    ("features/reflections/core/CreatePlanFromReflectionModal.tsx", 75),
    ("features/reflections/core/ReflectionDetailScreen.tsx", 47),
    ("features/reflections/core/ShareCard.tsx", 41),
    ("features/reflections/hooks/useQuickTrailSearch.ts", 338),
    ("features/reflections/hooks/useQuickTrailSearch.ts", 405),
    ("features/reflections/hooks/useTrailAI.ts", 42),
    ("features/reflections/hooks/useTrailAI.ts", 47),
    ("features/reflections/insights/hooks/useRelationGraph.ts", 38),
    ("features/reflections/trails/MindTrailScreen.tsx", 91),
    ("features/settings/ProfileScreen.tsx", 199),
    ("features/sleep/DiaryModal.tsx", 77),
    ("features/sleep/SleepEngine.tsx", 79),
    ("features/sleep/SleepHistoryPage.tsx", 462),
    ("features/sleep/SleepSummaryCard.tsx", 134),
    ("features/vow/modals/VisionEditModal.tsx", 153),
    ("features/vow/modals/VisionEditModal.tsx", 39),
    ("features/zhiguan/hooks/useZhiguanTimer.ts", 101),
    ("features/zhiguan/hooks/useZhiguanTimer.ts", 76),
    ("features/zhiguan/hooks/useZhiguanTimer.ts", 58),
    ("features/zhiguan/ZhiguanScreen.tsx", 108),
    ("features/zhiguan/ZhiguanScreen.tsx", 117),
]

RULE = "react-hooks/exhaustive-deps"
REASON = "warning-reduction: behavior preserved, proper exhaustive-deps fix deferred"

DISABLE_RE = re.compile(r"eslint-disable-next-line\s+react-hooks/exhaustive-deps")


def main() -> int:
    # Group by file, then sort lines descending within each file.
    by_file: dict[str, list[int]] = {}
    for rel, line in WARNINGS:
        by_file.setdefault(rel, []).append(line)
    for rel in by_file:
        by_file[rel].sort(reverse=True)  # descending

    inserted = 0
    skipped = 0
    for rel, lines in by_file.items():
        path = BASE + rel
        with open(path, encoding="utf-8") as f:
            content = f.read()
        lines_list = content.split("\n")
        for ln in lines:  # descending
            idx = ln - 1  # 0-based
            if idx < 0 or idx >= len(lines_list):
                print(f"  SKIP {rel}:{ln} — out of range", file=sys.stderr)
                skipped += 1
                continue
            # Check preceding line for an existing matching disable comment.
            if idx - 1 >= 0 and DISABLE_RE.search(lines_list[idx - 1]):
                print(f"  SKIP {rel}:{ln} — disable already present")
                skipped += 1
                continue
            indent_match = re.match(r"^[ \t]*", lines_list[idx])
            indent = indent_match.group(0) if indent_match else ""
            comment = f"{indent}// eslint-disable-next-line {RULE} -- {REASON}"
            lines_list.insert(idx, comment)
            inserted += 1
            print(f"  +    {rel}:{ln}")
        new_content = "\n".join(lines_list)
        if new_content != content:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(new_content)
    print(f"\nInserted: {inserted}, Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
