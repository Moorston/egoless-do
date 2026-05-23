'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWebStore } from '../../../store/useWebStore';
import { apiSendCode, apiCheckEmail, validatePassword } from '@egoless-do/core';

const COOLDOWN = 60;

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const register = useWebStore(s => s.register);
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

  async function handleEmailBlur() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    try {
      const res = await apiCheckEmail(email);
      setEmailStatus(res.available ? 'ok' : 'taken');
      if (!res.available) setError(res.error ?? '该邮箱已注册');
      else if (error === '该邮箱已注册') setError('');
    } catch {
      setEmailStatus('idle');
    }
  }

  async function handleSendCode() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError('');
    setSending(true);
    try {
      await apiSendCode(email);
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('请输入验证码'); return; }
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirm) { setError('两次密码不一致'); return; }

    setLoading(true);
    try {
      await register(email, password, name, code);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F0A1E' }}>
      <form onSubmit={handleSubmit} style={{ width: 380, padding: 40, background: 'rgba(255,255,255,.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,.08)' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, textAlign: 'center' }}>心流纪</h1>
        <p style={{ fontSize: 16, color: '#818cf8', textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>Egoless Do</p>
        <p style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 }}>创建新账号</p>

        <input type="text" placeholder="昵称" value={name} onChange={e => setName(e.target.value)} required
          style={inputStyle} />
        <div style={{ position: 'relative' }}>
          <input type="email" placeholder="邮箱" value={email}
            onChange={e => { setEmail(e.target.value); setEmailStatus('idle'); }}
            onBlur={handleEmailBlur} required style={inputStyle} />
          {emailStatus === 'checking' && <span style={statusStyle}>检查中...</span>}
          {emailStatus === 'ok' && <span style={{ ...statusStyle, color: '#10b981' }}>✓ 可用</span>}
          {emailStatus === 'taken' && <span style={{ ...statusStyle, color: '#ef4444' }}>✗ 已注册</span>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input type="text" placeholder="邮箱验证码" value={code} onChange={e => setCode(e.target.value)} required
            maxLength={6} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          <button type="button" onClick={handleSendCode} disabled={sending || cooldown > 0}
            style={{
              ...sendBtnStyle,
              opacity: (sending || cooldown > 0) ? 0.5 : 1,
              cursor: (sending || cooldown > 0) ? 'not-allowed' : 'pointer',
            }}>
            {cooldown > 0 ? `${cooldown}s` : sending ? '发送中...' : '获取验证码'}
          </button>
        </div>

        <input type="password" placeholder="密码（8位以上，含字母+数字+符号）" value={password} onChange={e => setPassword(e.target.value)} required
          style={inputStyle} />
        <input type="password" placeholder="确认密码" value={confirm} onChange={e => setConfirm(e.target.value)} required
          style={inputStyle} />

        {error && <p style={{ color: '#ef4444', fontSize: 16, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading || emailStatus === 'taken'} style={{
          ...btnStyle, opacity: (loading || emailStatus === 'taken') ? 0.6 : 1,
        }}>
          {loading ? '注册中...' : '注册'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 16, color: '#888' }}>
          已有账号？{' '}
          <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>登录</Link>
        </p>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', marginBottom: 14, borderRadius: 10,
  border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)',
  color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%', padding: 14, borderRadius: 10, border: 'none',
  background: '#6366f1', color: '#fff', fontSize: 16, fontWeight: 600,
  cursor: 'pointer', marginTop: 8,
};

const sendBtnStyle: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 10, border: 'none',
  background: '#818cf8', color: '#fff', fontSize: 16, fontWeight: 600,
  whiteSpace: 'nowrap', flexShrink: 0,
};

const statusStyle: React.CSSProperties = {
  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
  fontSize: 16, pointerEvents: 'none',
};
