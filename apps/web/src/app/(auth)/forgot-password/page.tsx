'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiCheckEmail, apiSendCode, apiResetPassword, validatePassword, FONT_BODY, FONT_BUTTON, FONT_ERROR, FONT_STAT_SECTION } from '@egoless-do/core';

const COOLDOWN = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [step, setStep] = useState<1 | 2>(1); // 1: email+code, 2: new password
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  async function handleSendCode() {
    if (!email || !EMAIL_REGEX.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError('');
    setSending(true);
    try {
      const checkRes = await apiCheckEmail(email);
      if (checkRes.available) {
        setError('该邮箱未注册');
        return;
      }
      await apiSendCode(email);
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('请输入验证码'); return; }
    setStep(2);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirm) { setError('两次密码不一致'); return; }

    setLoading(true);
    try {
      await apiResetPassword(email, code, password);
      setSuccess('密码重置成功，正在跳转登录...');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0A1E' }}>
      <div style={{ width: 380, padding: 40, background: 'rgba(255,255,255,.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,.08)' }}>
        <h1 style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, marginBottom: 4, textAlign: 'center' }}>心流纪</h1>
        <p style={{ fontSize: FONT_BODY, color: '#818cf8', textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>Egoless Do</p>
        <p style={{ fontSize: FONT_BODY, color: '#888', textAlign: 'center', marginBottom: 32 }}>
          {step === 1 ? '验证你的邮箱' : '设置新密码'}
        </p>

        {step === 1 ? (
          <form onSubmit={handleVerifyCode}>
            <input type="email" placeholder="邮箱" value={email}
              onChange={e => setEmail(e.target.value)} required
              style={inputStyle} />

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input type="text" placeholder="邮箱验证码" value={code}
                onChange={e => setCode(e.target.value)} required maxLength={6}
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
              <button type="button" onClick={handleSendCode} disabled={sending || cooldown > 0}
                style={{ ...sendBtnStyle, opacity: (sending || cooldown > 0) ? 0.5 : 1, cursor: (sending || cooldown > 0) ? 'not-allowed' : 'pointer' }}>
                {cooldown > 0 ? `${cooldown}s` : sending ? '发送中...' : '获取验证码'}
              </button>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: FONT_ERROR, marginBottom: 12 }}>{error}</p>}

            <button type="submit" style={btnStyle}>下一步</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <input type="password" placeholder="新密码（8位以上，含字母+数字+符号）" value={password}
              onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="确认新密码" value={confirm}
              onChange={e => setConfirm(e.target.value)} required style={inputStyle} />

            {error && <p style={{ color: '#ef4444', fontSize: FONT_ERROR, marginBottom: 12 }}>{error}</p>}
            {success && <p style={{ color: '#10b981', fontSize: FONT_BODY, marginBottom: 12, textAlign: 'center' }}>{success}</p>}

            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
              {loading ? '重置中...' : '重置密码'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: FONT_BODY, color: '#888' }}>
          <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>返回登录</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', marginBottom: 14, borderRadius: 10,
  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)',
  color: '#fff', fontSize: FONT_BODY, outline: 'none', boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%', padding: 14, borderRadius: 10, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600,
  cursor: 'pointer', marginTop: 8,
};

const sendBtnStyle: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 10, border: 'none',
  background: '#818cf8', color: '#fff', fontSize: FONT_BUTTON, fontWeight: 600,
  whiteSpace: 'nowrap', flexShrink: 0,
};
