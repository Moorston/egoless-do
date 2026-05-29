'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWebStore } from '../../../store/useWebStore';
import { FONT_BODY, FONT_BUTTON, FONT_ERROR, FONT_STAT_SECTION } from '@egoless-do/core';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useWebStore(s => s.login);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
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
        <h1 style={{ fontSize: FONT_STAT_SECTION, fontWeight: 800, marginBottom: 4, textAlign: 'center' }}>心流纪</h1>
        <p style={{ fontSize: FONT_BODY, color: '#818cf8', textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>Egoless Do</p>
        <p style={{ fontSize: FONT_BODY, color: '#888', textAlign: 'center', marginBottom: 32 }}>登录你的账号</p>

        <input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} required
          style={inputStyle} />
        <input type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} required
          style={inputStyle} />

        {error && <p style={{ color: '#ef4444', fontSize: FONT_ERROR, marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          ...btnStyle, opacity: loading ? 0.6 : 1,
        }}>
          {loading ? '登录中...' : '登录'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: FONT_BODY, color: '#888' }}>
          没有账号？{' '}
          <Link href="/register" style={{ color: '#818cf8', textDecoration: 'none' }}>注册</Link>
        </p>
      </form>
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
