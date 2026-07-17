#!/usr/bin/env python3
"""Phase 1 orchestration: prepare batch input JSONs and run extract-structure per batch.

This is purely I/O + deterministic script invocation. The semantic analysis
(summaries, tags, complexity) is done separately after extraction.
"""
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path("D:/MyProject/2026/egoless-do")
BATCHES_FILE = PROJECT_ROOT / ".ua" / "intermediate" / "batches.json"
SKILL_DIR = Path("C:/Users/freebytes/.claude/plugins/cache/understand-anything/understand-anything/2.9.3/skills/understand")
EXTRACT_SCRIPT = SKILL_DIR / "extract-structure.mjs"
TMP_DIR = PROJECT_ROOT / ".ua" / "tmp"

TARGET_BATCHES = [11, 12, 13, 14, 15]

def main():
    with open(BATCHES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    by_index = {b["batchIndex"]: b for b in data["batches"]}

    for bi in TARGET_BATCHES:
        batch = by_index[bi]
        inp = {
            "projectRoot": str(PROJECT_ROOT),
            "batchFiles": batch["files"],
            "batchImportData": batch["batchImportData"],
        }
        out_path = TMP_DIR / f"ua-file-analyzer-input-{bi}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(inp, f, ensure_ascii=False)
        print(f"[batch {bi}] input written: {out_path}  ({len(batch['files'])} files)")

        res_path = TMP_DIR / f"ua-file-extract-results-{bi}.json"
        cmd = ["node", str(EXTRACT_SCRIPT), str(out_path), str(res_path)]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print(f"[batch {bi}] EXTRACT FAILED")
            print(proc.stdout)
            print(proc.stderr)
            sys.exit(1)
        with open(res_path, "r", encoding="utf-8") as f:
            res = json.load(f)
        print(f"[batch {bi}] extracted: analyzed={res.get('filesAnalyzed')} skipped={res.get('filesSkipped')}")
    print("Phase 1 complete.")


if __name__ == "__main__":
    main()
