// ─── RBAC API 路由 ────────────────────────────────────────────────
// 提供角色管理、权限检查等功能。

import { Hono } from 'hono';
import { verifyAuth } from '../auth-middleware.js';
import { getUserRole, setUserRole, hasPermission, getUserPermissions, Role, Permission } from '../rbac.js';
import { logAuditEvent, AuditEvent, extractClientInfo } from '../audit-log.js';

const app = new Hono();

// 获取当前用户角色
app.get('/role', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const role = await getUserRole(auth.userId);
  const permissions = await getUserPermissions(auth.userId);

  return c.json({ role, permissions });
});

// 设置用户角色（仅管理员）
app.post('/role', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  // 检查是否有管理员权限
  const isAdmin = await hasPermission(auth.userId, Permission.MANAGE_SYSTEM);
  if (!isAdmin) {
    return c.json({ error: '权限不足' }, 403);
  }

  const { userId, role } = await c.req.json();

  if (!userId || !role) {
    return c.json({ error: '缺少参数' }, 400);
  }

  // 验证角色是否有效
  if (!Object.values(Role).includes(role)) {
    return c.json({ error: '无效的角色' }, 400);
  }

  const clientInfo = extractClientInfo(c);

  try {
    await setUserRole(userId, role);

    // 记录角色变更事件
    await logAuditEvent({
      event: AuditEvent.LOGIN_SUCCESS, // 可以添加 ROLE_CHANGED 事件
      user_id: auth.userId,
      ip: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      success: true,
      details: { targetUserId: userId, newRole: role },
    });

    return c.json({ message: '角色已更新' });
  } catch (err) {
    return c.json({ error: '设置角色失败' }, 500);
  }
});

// 检查权限
app.get('/check/:permission', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  const permission = c.req.param('permission') as Permission;

  // 验证权限是否有效
  if (!Object.values(Permission).includes(permission)) {
    return c.json({ error: '无效的权限' }, 400);
  }

  const has = await hasPermission(auth.userId, permission);
  return c.json({ has });
});

// 获取所有可用角色（需要登录）
app.get('/roles', async (c) => {
  const auth = await verifyAuth(c.req.header('authorization') ?? null);
  if (!auth) return c.json({ error: '未登录' }, 401);

  return c.json({
    roles: Object.values(Role),
    permissions: Object.values(Permission),
  });
});

export default app;
