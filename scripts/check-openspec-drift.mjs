#!/usr/bin/env node
/**
 * check-openspec-drift.mjs
 *
 * Detects OpenSpec lifecycle drift: in-progress changes whose tasks.md
 * shows 0% completion — a signal that the change's code may have landed
 * (Trellis archived, git committed) without the OpenSpec change being
 * closed via `openspec archive`.
 *
 * Drift signature: change in `openspec/changes/` (not archive/) + tasks.md
 * all `[ ]`. The proper close is `openspec archive <name> -y` after marking
 * tasks `[x]` and verifying spec↔code consistency.
 *
 * Exit code: 0 = no drift, 1 = potential drift found.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const changesDir = join(root, 'openspec', 'changes');

// Resolve openspec binary: prefer local node_modules/.bin, fall back to PATH
function resolveOpenspecBin() {
  const local = join(root, 'node_modules', '.bin', 'openspec');
  if (existsSync(local)) return local;
  // Windows: node_modules/.bin/openspec may be a shell shim without extension
  const localCmd = join(root, 'node_modules', '.bin', 'openspec.cmd');
  if (existsSync(localCmd)) return localCmd;
  return 'openspec'; // fall back to PATH
}

// 1. Get in-progress changes via openspec list
let listJson;
try {
  const bin = resolveOpenspecBin();
  const out = execFileSync(bin, ['list', '--json'], { encoding: 'utf-8', shell: process.platform === 'win32' });
  listJson = JSON.parse(out);
} catch (err) {
  console.error('✖ Failed to run `openspec list --json`. Is openspec CLI installed?');
  console.error(err.message);
  process.exit(2);
}

const inProgress = listJson.changes || [];
if (inProgress.length === 0) {
  console.log('✓ No in-progress OpenSpec changes.');
  process.exit(0);
}

// 2. For each, count tasks.md checkboxes
const drift = [];
const healthy = [];
for (const change of inProgress) {
  const tasksPath = join(changesDir, change.name, 'tasks.md');
  let total = 0;
  let checked = 0;
  if (existsSync(tasksPath)) {
    const content = readFileSync(tasksPath, 'utf-8');
    const lines = content.split('\n').filter(l => /^\s*-\s*\[[ xX]\]/.test(l));
    total = lines.length;
    checked = lines.filter(l => /^\s*-\s*\[[xX]\]/.test(l)).length;
  }
  const ratio = total === 0 ? 0 : checked / total;
  const entry = { name: change.name, checked, total, ratio };
  if (total > 0 && checked === 0) {
    drift.push(entry);
  } else {
    healthy.push(entry);
  }
}

// 3. Report
console.log(`OpenSpec in-progress changes: ${inProgress.length}\n`);
if (healthy.length > 0) {
  console.log('Healthy (tasks being checked):');
  for (const e of healthy) {
    console.log(`  ✓ ${e.name}  ${e.checked}/${e.total}`);
  }
}
if (drift.length > 0) {
  console.log('\n⚠ Potential drift (tasks.md 0% — code may have landed without `openspec archive`):');
  for (const e of drift) {
    console.log(`  ✖ ${e.name}  ${e.checked}/${e.total}`);
  }
  console.log('\nFix: verify spec↔code, mark tasks [x], run `openspec archive <name> -y`.');
  process.exit(1);
} else {
  console.log('\n✓ No drift detected.');
  process.exit(0);
}
