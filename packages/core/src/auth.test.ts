import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — React Native global not available in test env
globalThis.__DEV__ = false;

import {
  validatePassword,
  apiLogin,
  apiRegister,
  apiLogout,
  apiRefreshToken,
  apiSyncPush,
  apiSyncPull,
  apiSyncPullPost,
  apiSyncCheck,
  apiSyncPullEntity,
  apiSendCode,
  apiCheckEmail,
  apiResetPassword,
  apiGetMe,
  apiWechatLogin,
  setApiBase,
  setSyncApiBase,
  getSyncUrl,
} from './auth';

// Mock the fetch module
vi.mock('./fetch', () => {
  const fetchWithTimeout = vi.fn();
  const buildHeaders = vi.fn((token?: string) => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  });
  const handleJsonResponse = vi.fn(async (res: Response) => {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return JSON.parse(text);
  });
  const SYNC_REQUEST_TIMEOUT = 60_000;
  return { fetchWithTimeout, buildHeaders, handleJsonResponse, SYNC_REQUEST_TIMEOUT };
});

import { fetchWithTimeout, handleJsonResponse } from './fetch';

const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockHandleJsonResponse = vi.mocked(handleJsonResponse);

function makeOkResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body: unknown = { message: 'error' }): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('validatePassword', () => {
  it('returns error for password shorter than 10 chars', () => {
    expect(validatePassword('Ab1!')).toBe('密码长度至少10位');
    expect(validatePassword('Ab1!56789')).toBe('密码长度至少10位');
    expect(validatePassword('')).toBe('密码长度至少10位');
  });

  it('returns error for password longer than 128 chars', () => {
    const longPw = 'A1!' + 'a'.repeat(126);
    expect(validatePassword(longPw)).toBe('密码长度不能超过128位');
  });

  it('returns error when password has no letters', () => {
    expect(validatePassword('1234567890!')).toBe('密码需包含字母');
  });

  it('returns error when password has no digits', () => {
    expect(validatePassword('abcdefghij!')).toBe('密码需包含数字');
  });

  it('returns error when password is only alphanumeric', () => {
    expect(validatePassword('abcdefgh123')).toBe('密码需包含特殊符号');
  });

  it('returns error when password contains common password', () => {
    expect(validatePassword('password1!')).toBe('密码不能包含常见词汇');
    expect(validatePassword('12345678!A')).toBe('密码不能包含常见词汇');
    expect(validatePassword('qwerty123!')).toBe('密码不能包含常见词汇');
    expect(validatePassword('MyPassw0rd!')).toBe('密码不能包含常见词汇');
  });

  it('returns null for a valid password', () => {
    expect(validatePassword('MyS3cur3P@ss!')).toBeNull();
    expect(validatePassword('H0me#Work99')).toBeNull();
    expect(validatePassword('Xyz@2026test')).toBeNull();
  });

  it('accepts password at minimum length (10 chars)', () => {
    expect(validatePassword('Abcdef1!xy')).toBeNull();
  });

  it('accepts password at maximum length (128 chars)', () => {
    const pw = 'A1!' + 'b'.repeat(125);
    expect(validatePassword(pw)).toBeNull();
  });

  it('common password check is case-insensitive', () => {
    expect(validatePassword('PASSWORD1!x')).toBe('密码不能包含常见词汇');
    expect(validatePassword('QWERTY123!x')).toBe('密码不能包含常见词汇');
  });
});

describe('apiLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/login and returns auth response', async () => {
    const authData = {
      user: { id: 'u1', email: 'a@b.com', name: 'Test' },
      token: 'tok123',
      refreshToken: 'ref123',
      expiresAt: 9999,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(authData) as Response);
    mockHandleJsonResponse.mockResolvedValue(authData);

    const result = await apiLogin('a@b.com', 'pass123!@#');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual(authData);
  });

  it('throws on non-ok response', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(401) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 401'));

    await expect(apiLogin('a@b.com', 'wrong')).rejects.toThrow('HTTP 401');
  });

  it('throws on network error', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('NetworkError'));

    await expect(apiLogin('a@b.com', 'pass')).rejects.toThrow('NetworkError');
  });
});

describe('apiRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/register with all fields', async () => {
    const authData = {
      user: { id: 'u2', email: 'new@b.com', name: 'New' },
      token: 'tok',
      refreshToken: 'ref',
      expiresAt: 8888,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(authData) as Response);
    mockHandleJsonResponse.mockResolvedValue(authData);

    const result = await apiRegister('new@b.com', 'pass123!@#', 'New', '123456');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual(authData);
  });

  it('throws on error response', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(400, { message: 'Email exists' }) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('Email exists'));

    await expect(apiRegister('dup@b.com', 'pass', 'Name', '123456')).rejects.toThrow('Email exists');
  });

  it('throws on network error', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('NetworkError'));

    await expect(apiRegister('a@b.com', 'p', 'N', '123456')).rejects.toThrow('NetworkError');
  });
});

describe('apiLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/logout', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse({}) as Response);
    mockHandleJsonResponse.mockResolvedValue({});

    await apiLogout('tok', 'ref');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('does not throw on non-ok response (logs error instead)', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(500) as Response);
    mockHandleJsonResponse.mockResolvedValue({});

    // apiLogout catches errors internally via res.text() + log.error, does not rethrow
    // but handleJsonResponse is called, so it depends on the mock
    // The actual code checks res.ok directly before calling handleJsonResponse
    // So we test with the actual flow — res.ok is false, but no throw
    await expect(apiLogout('tok', 'ref')).resolves.toBeUndefined();
  });

  it('handles network error from fetch', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('NetworkError'));

    await expect(apiLogout('tok', 'ref')).rejects.toThrow('NetworkError');
  });
});

describe('apiRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/refresh and returns tokens', async () => {
    const refreshData = { token: 'newTok', refreshToken: 'newRef', expiresAt: 7777 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(refreshData) as Response);
    mockHandleJsonResponse.mockResolvedValue(refreshData);

    const result = await apiRefreshToken('oldRef', 'oldTok');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual(refreshData);
  });

  it('throws on expired refresh token (401)', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(401) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 401'));

    await expect(apiRefreshToken('expired')).rejects.toThrow('HTTP 401');
  });

  it('throws on network error', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('NetworkError'));

    await expect(apiRefreshToken('ref')).rejects.toThrow('NetworkError');
  });
});

describe('apiSyncPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
    setSyncApiBase('');
  });

  it('sends POST to /api/sync with changes and returns push result', async () => {
    const serverResponse = {
      changes: [{ entity: 'habit', entityId: 'h1', operation: 'upsert' }],
      rejected: [],
      serverTime: 12345,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(serverResponse) as Response);
    mockHandleJsonResponse.mockResolvedValue(serverResponse);

    const changes = [{ entity: 'habit' as const, entityId: 'h1', op: 'upsert' as const, payload: { name: 'test' } }];
    const result = await apiSyncPush('tok', 0, changes, 'u1');

    expect(result.applied).toEqual(serverResponse.changes);
    expect(result.rejected).toEqual(serverResponse.rejected);
    expect(result.serverTime).toBe(12345);
  });

  it('throws on server error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(500) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 500'));

    await expect(apiSyncPush('tok', 0, [], 'u1')).rejects.toThrow('HTTP 500');
  });
});

describe('apiSyncPull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
    setSyncApiBase('');
  });

  it('sends GET to /api/sync and returns pull result', async () => {
    const pullData = { data: { habit: [{ id: 'h1' }] }, serverTime: 99999 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(pullData) as Response);
    mockHandleJsonResponse.mockResolvedValue(pullData);

    const result = await apiSyncPull('tok', 'u1');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/sync',
      expect.objectContaining({ method: 'GET' }),
      60_000,
    );
    expect(result).toEqual(pullData);
  });

  it('includes since param when provided', async () => {
    const pullData = { data: {}, serverTime: 99999 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(pullData) as Response);
    mockHandleJsonResponse.mockResolvedValue(pullData);

    await apiSyncPull('tok', 'u1', 1000);

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/sync?since=1000',
      expect.objectContaining({ method: 'GET' }),
      60_000,
    );
  });

  it('throws on server error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(502) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 502'));

    await expect(apiSyncPull('tok', 'u1')).rejects.toThrow('HTTP 502');
  });
});

describe('apiSyncPullPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
    setSyncApiBase('');
  });

  it('sends POST to /api/sync with entity filter', async () => {
    const pullData = { data: { habit: [{ id: 'h1' }] }, serverTime: 88888 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(pullData) as Response);
    mockHandleJsonResponse.mockResolvedValue(pullData);

    const result = await apiSyncPullPost('tok', { entities: ['habit'], since: 500 }, 'u1');

    expect(result.data).toEqual({ habit: [{ id: 'h1' }] });
    expect(result.serverTime).toBe(88888);
  });

  it('defaults missing data to empty object', async () => {
    const pullData = { serverTime: 77777 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(pullData) as Response);
    mockHandleJsonResponse.mockResolvedValue(pullData);

    const result = await apiSyncPullPost('tok', {}, 'u1');

    expect(result.data).toEqual({});
  });

  it('throws on error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(403) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 403'));

    await expect(apiSyncPullPost('tok', {}, 'u1')).rejects.toThrow('HTTP 403');
  });
});

describe('apiSyncCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
    setSyncApiBase('');
  });

  it('sends GET to /api/sync/check and returns check result', async () => {
    const checkResult = { hasChanges: true, changed: { habit: 3, checkin: 1 }, serverTime: 55555 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(checkResult) as Response);
    mockHandleJsonResponse.mockResolvedValue(checkResult);

    const result = await apiSyncCheck('tok', 1000, 'u1');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/sync/check?since=1000',
      expect.objectContaining({ method: 'GET' }),
      60_000,
    );
    expect(result).toEqual(checkResult);
  });

  it('throws on error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(500) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 500'));

    await expect(apiSyncCheck('tok', 0, 'u1')).rejects.toThrow('HTTP 500');
  });
});

describe('apiSyncPullEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
    setSyncApiBase('');
  });

  it('sends POST to /api/sync/pull with entity and pagination', async () => {
    const serverResponse = {
      data: {
        habit: [{ id: 'h1' }, { id: 'h2' }],
        _meta: { habit: { total: 10 } },
      },
      serverTime: 44444,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(serverResponse) as Response);
    mockHandleJsonResponse.mockResolvedValue(serverResponse);

    const result = await apiSyncPullEntity('tok', 'habit', 1, 5, 'u1');

    expect(result.data).toEqual([{ id: 'h1' }, { id: 'h2' }]);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(5);
    expect(result.hasMore).toBe(true);
    expect(result.serverTime).toBe(44444);
  });

  it('reports hasMore=false when all data returned', async () => {
    const serverResponse = {
      data: {
        habit: [{ id: 'h1' }],
        _meta: { habit: { total: 1 } },
      },
      serverTime: 33333,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(serverResponse) as Response);
    mockHandleJsonResponse.mockResolvedValue(serverResponse);

    const result = await apiSyncPullEntity('tok', 'habit', 1, 10, 'u1');

    expect(result.hasMore).toBe(false);
  });

  it('falls back to entityData.length when _meta is missing', async () => {
    const serverResponse = {
      data: { habit: [{ id: 'h1' }, { id: 'h2' }, { id: 'h3' }] },
      serverTime: 22222,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(serverResponse) as Response);
    mockHandleJsonResponse.mockResolvedValue(serverResponse);

    const result = await apiSyncPullEntity('tok', 'habit', 1, 10, 'u1');

    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it('returns empty data when entity not in response', async () => {
    const serverResponse = { data: {}, serverTime: 11111 };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(serverResponse) as Response);
    mockHandleJsonResponse.mockResolvedValue(serverResponse);

    const result = await apiSyncPullEntity('tok', 'habit', 1, 10, 'u1');

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('throws on error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(500) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 500'));

    await expect(apiSyncPullEntity('tok', 'habit', 1, 10)).rejects.toThrow('HTTP 500');
  });
});

describe('setApiBase / setSyncApiBase / getSyncUrl', () => {
  afterEach(() => {
    // Reset to avoid cross-test pollution
    setApiBase('');
    setSyncApiBase('');
  });

  it('setApiBase strips trailing slashes', () => {
    setApiBase('https://example.com///');
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse({}) as Response);
    mockHandleJsonResponse.mockResolvedValue({});
    apiLogin('a@b.com', 'p');
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://example.com/api/auth/login',
      expect.anything(),
    );
  });

  it('getSyncUrl returns syncBase when set', () => {
    setSyncApiBase('https://sync.example.com');
    expect(getSyncUrl()).toBe('https://sync.example.com');
  });

  it('getSyncUrl returns apiBase when syncBase is empty', () => {
    setApiBase('https://api.example.com');
    setSyncApiBase('');
    expect(getSyncUrl()).toBe('https://api.example.com');
  });
});

describe('apiSendCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/send-code', async () => {
    const result = { ok: true, message: 'sent' };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(result) as Response);
    mockHandleJsonResponse.mockResolvedValue(result);

    const res = await apiSendCode('a@b.com', 'register');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/send-code',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res).toEqual(result);
  });

  it('throws on error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(429) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 429'));

    await expect(apiSendCode('a@b.com')).rejects.toThrow('HTTP 429');
  });
});

describe('apiCheckEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/check-email', async () => {
    const result = { available: true };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(result) as Response);
    mockHandleJsonResponse.mockResolvedValue(result);

    const res = await apiCheckEmail('a@b.com');

    expect(res).toEqual(result);
  });
});

describe('apiGetMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends GET to /api/auth/me with token', async () => {
    const result = { user: { id: 'u1', name: 'Test' } };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(result) as Response);
    mockHandleJsonResponse.mockResolvedValue(result);

    const res = await apiGetMe('tok');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    );
    expect(res).toEqual(result);
  });
});

describe('apiWechatLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/wechat', async () => {
    const authData = {
      user: { id: 'u3', name: 'WeChat' },
      token: 'wxtok',
      refreshToken: 'wxref',
      expiresAt: 6666,
    };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(authData) as Response);
    mockHandleJsonResponse.mockResolvedValue(authData);

    const result = await apiWechatLogin('wxcode');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/wechat',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual(authData);
  });
});

describe('apiResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setApiBase('https://api.example.com');
  });

  it('sends POST to /api/auth/reset-password', async () => {
    const result = { ok: true, message: 'reset' };
    mockFetchWithTimeout.mockResolvedValue(makeOkResponse(result) as Response);
    mockHandleJsonResponse.mockResolvedValue(result);

    const res = await apiResetPassword('a@b.com', 'code123', 'NewP@ss1!');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/reset-password',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(res).toEqual(result);
  });

  it('throws on error', async () => {
    mockFetchWithTimeout.mockResolvedValue(makeErrorResponse(400) as Response);
    mockHandleJsonResponse.mockRejectedValue(new Error('HTTP 400'));

    await expect(apiResetPassword('a@b.com', 'bad', 'pw')).rejects.toThrow('HTTP 400');
  });
});

describe('sync apiBase / syncBase routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setApiBase('');
    setSyncApiBase('');
  });

  it('sync endpoints use syncBase when set', async () => {
    setApiBase('https://api.example.com');
    setSyncApiBase('https://sync.example.com');

    mockFetchWithTimeout.mockResolvedValue(makeOkResponse({ data: {}, serverTime: 1 }) as Response);
    mockHandleJsonResponse.mockResolvedValue({ data: {}, serverTime: 1 });

    await apiSyncPull('tok', 'u1');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://sync.example.com/api/sync',
      expect.anything(),
      60_000,
    );
  });

  it('sync endpoints fall back to apiBase when syncBase is empty', async () => {
    setApiBase('https://api.example.com');
    setSyncApiBase('');

    mockFetchWithTimeout.mockResolvedValue(makeOkResponse({ hasChanges: false, changed: {}, serverTime: 1 }) as Response);
    mockHandleJsonResponse.mockResolvedValue({ hasChanges: false, changed: {}, serverTime: 1 });

    await apiSyncCheck('tok', 0, 'u1');

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/api/sync/check?since=0',
      expect.anything(),
      60_000,
    );
  });
});
