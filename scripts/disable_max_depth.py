#!/usr/bin/env python3
"""Insert eslint-disable-next-line max-depth comments above high-risk sync/store/migration sites.

These functions are data-critical (conflict resolution, ghost-data defense, cold-start
rehydration, write batching, migration). A behavior-preserving depth refactor here risks
subtle data-corruption bugs with no compensating test coverage for every branch, so per
the implement.md 3.4 design ("高风险函数跳过加注释") we suppress with an honest reason
rather than extract. Zero behavior change.

Processes per-file in DESCENDING line order so earlier insertions don't shift later line
numbers. Skips if a matching disable comment is already present.
"""
import re
import sys

BASE = "apps/mobile/src/"

# (relative_path, line) — line numbers from the authoritative eslint compact run.
WARNINGS = [
    ("features/sync/SyncApplyService.ts", 325),
    ("features/sync/SyncApplyService.ts", 327),
    ("features/sync/SyncRehydrationManager.ts", 143),
    ("features/sync/mergeSyncPatch.ts", 75),
    ("features/sync/orphanRecovery.ts", 58),
    ("features/sync/orphanRecovery.ts", 60),
    ("store/WriteBatcher.ts", 138),
    ("store/WriteBatcher.ts", 145),
    ("store/WriteBatcher.ts", 189),
    ("store/WriteBatcher.ts", 288),
    ("store/migrateAsyncStorage.ts", 182),
]

RULE = "max-depth"
REASON = "warning-reduction: high-risk sync/store/migration data fn; depth refactor deferred to avoid data-corruption risk"

DISABLE_RE = re.compile(r"eslint-disable-next-line\s+max-depth")


def main() -> int:
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
