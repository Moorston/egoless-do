#!/usr/bin/env node
// ─── P0-4 Migration: backfill body_plans.type ───────────────────
// 独立 Node.js 脚本（PB hook 环境不支持 fs/path/require）。
//
// 使用方法：
//   node scripts/migrate-body-plan-type.js
//
// 功能：
//   - 遍历 body_plans 集合
//   - 推断 type（weekly/training）并写回
//   - 幂等：跳过已有 type 字段的记录

const http = require('http');

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@egoless.do';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'change-me';

function pbRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${PB_URL}${path}`;
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function main() {
  console.log('[Migration] Starting P0-4 bodyPlan type backfill...');

  // 1. Admin auth
  console.log('[Migration] Authenticating...');
  const auth = await pbRequest('/api/admins/auth-with-password', {
    method: 'POST',
    body: { identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD },
  });
  const token = auth.token;
  console.log('[Migration] Authenticated.');

  // 2. Paginate + migrate
  let page = 1;
  const perPage = 500;
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  while (true) {
    const result = await pbRequest(`/api/collections/body_plans/records?page=${page}&perPage=${perPage}&sort=-created`, {
      headers: { Authorization: token },
    });

    const items = result.items || [];
    if (items.length === 0) break;

    for (const rec of items) {
      try {
        const raw = rec.data;
        let data = {};
        if (typeof raw === 'string') {
          try { data = JSON.parse(raw); } catch { data = {}; }
        } else if (raw && typeof raw === 'object') {
          data = { ...raw };
        }

        // Skip if type already set
        if (data.type === 'weekly' || data.type === 'training') {
          skipped++;
          continue;
        }

        // Infer type from data shape
        const inferredType = (data.weekday !== undefined || data.part !== undefined) ? 'weekly' : 'training';
        data.type = inferredType;

        await pbRequest(`/api/collections/body_plans/records/${rec.id}`, {
          method: 'PATCH',
          headers: { Authorization: token },
          body: { data },
        });
        migrated++;
      } catch (err) {
        errors++;
        console.warn(`[Migration] Error for ${rec.id}: ${err.message}`);
      }
    }

    if (items.length < perPage) break;
    page++;
    if (page > 100) { console.warn('[Migration] Hit 100 page cap, stopping.'); break; }
  }

  console.log(`[Migration] Complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors.`);
}

main().catch(err => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
