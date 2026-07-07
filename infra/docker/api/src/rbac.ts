// ─── 细粒度权限控制服务 (RBAC) ────────────────────────────────────
// 实现基于角色的访问控制。

import { getAdminPb, escapeFilter } from './pb.js';
import { errMessage, errStatus } from './errors.js';

const COLLECTION_NAME = 'user_roles';

// 预定义角色
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// 预定义权限
export enum Permission {
  // 用户权限
  READ_OWN_PROFILE = 'read:own_profile',
  UPDATE_OWN_PROFILE = 'update:own_profile',
  CREATE_OWN_DATA = 'create:own_data',
  DELETE_OWN_DATA = 'delete:own_data',

  // 管理员权限
  READ_ALL_USERS = 'read:all_users',
  UPDATE_ALL_USERS = 'update:all_users',
  DELETE_ALL_USERS = 'delete:all_users',
  MANAGE_SYSTEM = 'manage:system',

  // 版主权限
  MODERATE_CONTENT = 'moderate:content',
  VIEW_REPORTS = 'view:reports',
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.CREATE_OWN_DATA,
    Permission.DELETE_OWN_DATA,
  ],
  [Role.ADMIN]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.CREATE_OWN_DATA,
    Permission.DELETE_OWN_DATA,
    Permission.READ_ALL_USERS,
    Permission.UPDATE_ALL_USERS,
    Permission.DELETE_ALL_USERS,
    Permission.MANAGE_SYSTEM,
  ],
  [Role.MODERATOR]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.CREATE_OWN_DATA,
    Permission.DELETE_OWN_DATA,
    Permission.MODERATE_CONTENT,
    Permission.VIEW_REPORTS,
  ],
};

export interface UserRole {
  id?: string;
  user_id: string;
  role: Role;
  created_at: number;
  updated_at: number;
}

/**
 * 获取用户角色
 */
export async function getUserRole(userId: string): Promise<Role> {
  try {
    const pb = await getAdminPb();
    const record = await pb.collection(COLLECTION_NAME).getFirstListItem(
      `user_id = "${escapeFilter(userId)}"`
    );
    return record.role as Role;
  } catch (err: unknown) {
    if (errStatus(err) === 404) return Role.USER; // 默认角色
    console.warn('Failed to get user role:', errMessage(err));
    return Role.USER;
  }
}

/**
 * 设置用户角色
 */
export async function setUserRole(userId: string, role: Role): Promise<void> {
  try {
    const pb = await getAdminPb();

    // 检查是否已有角色
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PB record type
    let existing: any;
    try {
      existing = await pb.collection(COLLECTION_NAME).getFirstListItem(
        `user_id = "${escapeFilter(userId)}"`
      );
    } catch (err: unknown) {
      if (errStatus(err) !== 404) throw err;
    }

    if (existing) {
      // 更新现有角色
      await pb.collection(COLLECTION_NAME).update(existing.id, {
        role,
        updated_at: Date.now(),
      });
    } else {
      // 创建新角色
      await pb.collection(COLLECTION_NAME).create({
        user_id: userId,
        role,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  } catch (err: unknown) {
    console.error('Failed to set user role:', errMessage(err));
    throw err;
  }
}

/**
 * 检查用户是否有特定权限
 */
export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  const role = await getUserRole(userId);
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * 检查用户是否有任一权限
 */
export async function hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
  const role = await getUserRole(userId);
  const userPermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => userPermissions.includes(p));
}

/**
 * 获取用户所有权限
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const role = await getUserRole(userId);
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * 初始化 RBAC 集合
 */
export async function initRBACCollection(): Promise<void> {
  try {
    const pb = await getAdminPb();
    await pb.collections.getOne(COLLECTION_NAME);
    console.log(`[RBAC] Collection '${COLLECTION_NAME}' exists`);
  } catch (err: unknown) {
    if (errStatus(err) === 404) {
      console.log(`[RBAC] Collection '${COLLECTION_NAME}' not found, creating...`);
      try {
        const pb = await getAdminPb();
        await pb.collections.create({
          name: COLLECTION_NAME,
          type: 'base',
          fields: [
            { name: 'user_id', type: 'text', required: true },
            { name: 'role', type: 'text', required: true },
            { name: 'created_at', type: 'number', required: true },
            { name: 'updated_at', type: 'number', required: true },
          ],
          listRule: '@request.auth.id != ""',  // 认证用户可读
          viewRule: '@request.auth.id != ""',
          createRule: null,  // 仅系统可创建（通过API内部操作）
          updateRule: null,  // 仅系统可更新
          deleteRule: null,
        });
        console.log(`[RBAC] Collection '${COLLECTION_NAME}' created`);
      } catch (createErr: unknown) {
        console.error(`[RBAC] Failed to create collection: ${errMessage(createErr)}`);
      }
    } else {
      console.error(`[RBAC] Failed to check collection: ${errMessage(err)}`);
    }
  }
}
