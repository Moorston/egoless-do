import { vi, beforeEach, describe, it, expect } from 'vitest';

// ── sync-apply-failure-semantics characterization（首个测试文件，零测试热区解冻）──
// vi.mock 四件套：@egoless-do/core（api/KickedOutError）、NetInfo、syncQueue、RealtimeAgent。
// 依赖注入式回调（setter），私有方法经 ControllerInternals 类型化 cast 访问。

const h = vi.hoisted(() => {
  class KickedOutError extends Error {}
  return {
    KickedOutError,
    apiSyncPullPost: vi.fn(),
    apiSyncCheck: vi.fn(),
    getQueueCount: vi.fn(),
    resetAllPendingForRetry: vi.fn(),
    netInfoAdd: vi.fn(() => () => {}),
  };
});

vi.mock('@egoless-do/core', () => ({
  apiSyncPullPost: h.apiSyncPullPost,
  apiSyncCheck: h.apiSyncCheck,
  KickedOutError: h.KickedOutError,
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: { addEventListener: h.netInfoAdd },
}));

vi.mock('../../db/syncQueue', () => ({
  getQueueCount: h.getQueueCount,
  resetAllPendingForRetry: h.resetAllPendingForRetry,
}));

vi.mock('./RealtimeAgent', () => ({
  RealtimeAgent: vi.fn().mockImplementation(() => ({
    setChangeHandler: vi.fn(),
    setStatusHandler: vi.fn(),
    setKickedOutHandler: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

import { SyncRealtimeController } from './SyncRealtimeController';

// 私有方法类型化访问（测试专用，绕过 private 编译边界但不引入 any）
type ControllerInternals = {
  pollForChanges: (
    token: string,
    onChange: (patch: Record<string, unknown>) => void,
    lastSyncAt: number,
    deletedIdsProvider: () => Set<string>,
  ) => Promise<void>;
  processRealtimeEntity: (
    entity: string,
    payload: unknown,
    onChange: (patch: Record<string, unknown>) => void,
    getLastSyncAt: () => number,
    deletedIdsProvider: () => Set<string>,
    getToken: () => string | null,
  ) => Promise<void>;
};

function makeController() {
  const controller = new SyncRealtimeController();
  const onChange = vi.fn();
  const onServerTime = vi.fn<(serverTime: number, failedEntities?: string[]) => void>();
  const applyServerChanges = vi.fn<(data: Record<string, unknown[]>, deletedIds: Set<string>) => Promise<{ patch: Record<string, unknown>; failedEntities: string[] }>>();
  const runSync = vi.fn();
  const logoutHandler = vi.fn();
  controller.setApplyServerChanges(applyServerChanges);
  controller.setOnServerTime(onServerTime);
  controller.setRunSync(runSync);
  controller.setLogoutHandler(logoutHandler);
  controller.setUserIdProvider(() => 'user-1');
  const internals = controller as unknown as ControllerInternals;
  return { controller, internals, onChange, onServerTime, applyServerChanges, runSync, logoutHandler };
}

const TOKEN = () => 'test-token';

describe('SyncRealtimeController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processRealtimeEntity', () => {
    it('direct payload path: applies payload immediately without pull', async () => {
      const { internals, onChange, applyServerChanges, onServerTime } = makeController();
      applyServerChanges.mockResolvedValue({ patch: { habits: [{ id: 'h1', title: 'Habit' }] }, failedEntities: [] });

      await internals.processRealtimeEntity('habit', { id: 'h1', title: 'Habit' }, onChange, () => 0, () => new Set<string>(), TOKEN);

      expect(applyServerChanges).toHaveBeenCalledWith({ habit: [{ id: 'h1', title: 'Habit' }] }, new Set<string>());
      expect(onChange).toHaveBeenCalledWith({ habits: [{ id: 'h1', title: 'Habit' }] });
      // payload 路径不拉取、不推 serverTime
      expect(h.apiSyncPullPost).not.toHaveBeenCalled();
      expect(onServerTime).not.toHaveBeenCalled();
    });

    it('no-payload path: incremental pull → apply → onChange + onServerTime', async () => {
      const { internals, onChange, applyServerChanges, onServerTime } = makeController();
      h.apiSyncPullPost.mockResolvedValue({ data: { habit: [{ id: 'h1', title: 'Habit' }] }, serverTime: 500 });
      applyServerChanges.mockResolvedValue({ patch: { habits: [{ id: 'h1', title: 'Habit' }] }, failedEntities: [] });

      await internals.processRealtimeEntity('habit', null, onChange, () => 200, () => new Set<string>(), TOKEN);

      expect(h.apiSyncPullPost).toHaveBeenCalledWith('test-token', { entities: ['habit'], since: 200 });
      expect(applyServerChanges).toHaveBeenCalledWith({ habit: [{ id: 'h1', title: 'Habit' }] }, new Set<string>());
      expect(onChange).toHaveBeenCalledWith({ habits: [{ id: 'h1', title: 'Habit' }] });
      expect(onServerTime).toHaveBeenCalledWith(500, []);
    });

    it('R1/R3 fixed semantics: apply failure yields clean patch + failedEntities passed to onServerTime', async () => {
      // 修复后锁定（sync-apply-failure-semantics D1/D2）：apply 返回 { patch, failedEntities }
      // 独立通道——patch 干净（无 _failedEntities 泄漏给 change handler，R3 修复），
      // failedEntities 随 onServerTime 透传给 SyncEngine 包装做 D1 全有或全无守卫
      // （任一实体失败 → 不推进 lastSyncAt → 失败实体下次增量重拉，R1 修复）。
      const { internals, onChange, applyServerChanges, onServerTime } = makeController();
      h.apiSyncPullPost.mockResolvedValue({ data: { habit: [{ id: 'h1', title: 'Habit' }] }, serverTime: 500 });
      applyServerChanges.mockResolvedValue({ patch: { habits: [{ id: 'h1', title: 'Habit' }] }, failedEntities: ['habit'] });

      await internals.processRealtimeEntity('habit', null, onChange, () => 200, () => new Set<string>(), TOKEN);

      // patch 干净——失败信息不泄漏给 change handler
      expect(onChange).toHaveBeenCalledWith({ habits: [{ id: 'h1', title: 'Habit' }] });
      // failedEntities 透传给 SyncEngine 的水位线守卫
      expect(onServerTime).toHaveBeenCalledWith(500, ['habit']);
    });

    it('KickedOutError from pull triggers logout handler', async () => {
      const { internals, onChange, onServerTime, logoutHandler } = makeController();
      h.apiSyncPullPost.mockRejectedValue(new h.KickedOutError('kicked'));

      await internals.processRealtimeEntity('habit', null, onChange, () => 0, () => new Set<string>(), TOKEN);

      expect(logoutHandler).toHaveBeenCalledTimes(1);
      expect(onServerTime).not.toHaveBeenCalled();
    });

    it('no token: no-op', async () => {
      const { internals, onChange } = makeController();
      await internals.processRealtimeEntity('habit', { id: 'h1' }, onChange, () => 0, () => new Set<string>(), () => null);
      expect(onChange).not.toHaveBeenCalled();
      expect(h.apiSyncPullPost).not.toHaveBeenCalled();
    });
  });

  describe('pollForChanges', () => {
    it('queue > 0: routes to runSync without server check', async () => {
      const { internals, onChange, runSync } = makeController();
      h.getQueueCount.mockResolvedValue(4);

      await internals.pollForChanges('test-token', onChange, 0, () => new Set<string>());

      expect(runSync).toHaveBeenCalledTimes(1);
      expect(h.apiSyncCheck).not.toHaveBeenCalled();
      expect(h.apiSyncPullPost).not.toHaveBeenCalled();
    });

    it('hasChanges: pull → apply → onChange + onServerTime', async () => {
      const { internals, onChange, applyServerChanges, onServerTime } = makeController();
      h.getQueueCount.mockResolvedValue(0);
      h.apiSyncCheck.mockResolvedValue({ hasChanges: true, changed: { habit: 1 } });
      h.apiSyncPullPost.mockResolvedValue({ data: { habit: [{ id: 'h1', title: 'Habit' }] }, serverTime: 900 });
      applyServerChanges.mockResolvedValue({ patch: { habits: [{ id: 'h1', title: 'Habit' }] }, failedEntities: [] });

      await internals.pollForChanges('test-token', onChange, 300, () => new Set<string>());

      expect(h.apiSyncCheck).toHaveBeenCalledWith('test-token', 300, 'user-1');
      expect(h.apiSyncPullPost).toHaveBeenCalledWith('test-token', { entities: ['habit'], since: 300 });
      expect(onChange).toHaveBeenCalledWith({ habits: [{ id: 'h1', title: 'Habit' }] });
      expect(onServerTime).toHaveBeenCalledWith(900, []);
    });

    it('KickedOutError from check triggers logout handler', async () => {
      const { internals, onChange, logoutHandler } = makeController();
      h.getQueueCount.mockResolvedValue(0);
      h.apiSyncCheck.mockRejectedValue(new h.KickedOutError('kicked'));

      await internals.pollForChanges('test-token', onChange, 0, () => new Set<string>());

      expect(logoutHandler).toHaveBeenCalledTimes(1);
      expect(h.apiSyncPullPost).not.toHaveBeenCalled();
    });

    it('no changes: returns early without pull or runSync', async () => {
      const { internals, onChange, runSync } = makeController();
      h.getQueueCount.mockResolvedValue(0);
      h.apiSyncCheck.mockResolvedValue({ hasChanges: false, changed: {} });

      await internals.pollForChanges('test-token', onChange, 0, () => new Set<string>());

      expect(h.apiSyncPullPost).not.toHaveBeenCalled();
      expect(runSync).not.toHaveBeenCalled();
    });

    it('hasChanges with empty changed map: falls through to runSync', async () => {
      const { internals, onChange, runSync } = makeController();
      h.getQueueCount.mockResolvedValue(0);
      h.apiSyncCheck.mockResolvedValue({ hasChanges: true, changed: {} });

      await internals.pollForChanges('test-token', onChange, 0, () => new Set<string>());

      expect(h.apiSyncPullPost).not.toHaveBeenCalled();
      expect(runSync).toHaveBeenCalledTimes(1);
    });
  });
});
