// ─── Shared validation utilities ────────────────────────────────

export function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return '密码需至少8位';
  if (!/[a-zA-Z]/.test(pwd)) return '密码需包含字母';
  if (!/[0-9]/.test(pwd)) return '密码需包含数字';
  if (/^[a-zA-Z0-9]+$/.test(pwd)) return '密码需包含特殊符号';
  return null;
}
