import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiSendCode, apiCheckEmail, validatePassword } from '@egoless-do/core';
import { getPrimaryColor } from '../../utils/theme';

const P = getPrimaryColor();
const COOLDOWN = 60;

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { register, isLoading } = useAuthStore();

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

  const handleEmailBlur = async () => {
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
  };

  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError('');
    setSending(true);
    try {
      await apiSendCode(email);
      startCooldown();
    } catch (e: any) {
      setError(e.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !code) {
      setError('请填写所有字段');
      return;
    }
    if (password !== confirm) {
      setError('两次密码不一致');
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirm) {
      setError('两次密码不一致');
      return;
    }
    setError('');
    try {
      await register(email, password, name, code);
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (e: any) {
      setError(e.message || '注册失败');
    }
  };

  return (
    <View style={{ minHeight: '100vh', background: '#0F0A1E', padding: '64rpx 48rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: '64rpx', fontWeight: '800', marginBottom: '8rpx' }}>心流纪</Text>
      <Text style={{ color: '#818cf8', fontSize: '40rpx', marginBottom: '16rpx', letterSpacing: 2 }}>Egoless Do</Text>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', marginBottom: '60rpx' }}>创建新账号</Text>

      <View style={{ width: '100%', marginBottom: '20rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: '40rpx', marginBottom: '8rpx', display: 'block' }}>昵称</Text>
        <Input
          type="text"
          placeholder="请输入昵称"
          value={name}
          onInput={e => setName(e.detail.value)}
          style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx' }}
        />
      </View>

      <View style={{ width: '100%', marginBottom: '20rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: '40rpx', marginBottom: '8rpx', display: 'block' }}>邮箱</Text>
        <View style={{ position: 'relative' }}>
          <Input
            type="text"
            placeholder="请输入邮箱"
            value={email}
            onInput={e => { setEmail(e.detail.value); setEmailStatus('idle'); }}
            onBlur={handleEmailBlur}
            style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${emailStatus === 'taken' ? '#EF4444' : emailStatus === 'ok' ? '#10B981' : P}`, borderRadius: '20rpx', padding: '24rpx', paddingRight: '160rpx', color: '#fff', fontSize: '40rpx' }}
          />
          {emailStatus === 'checking' && <Text style={{ position: 'absolute', right: '24rpx', top: '24rpx', fontSize: '40rpx', color: 'rgba(255,255,255,.4)' }}>检查中...</Text>}
          {emailStatus === 'ok' && <Text style={{ position: 'absolute', right: '24rpx', top: '24rpx', fontSize: '40rpx', color: '#10B981' }}>✓ 可用</Text>}
          {emailStatus === 'taken' && <Text style={{ position: 'absolute', right: '24rpx', top: '24rpx', fontSize: '40rpx', color: '#EF4444' }}>✗ 已注册</Text>}
        </View>
      </View>

      <View style={{ width: '100%', marginBottom: '20rpx', display: 'flex', flexDirection: 'row', gap: '16rpx' }}>
        <View style={{ flex: 1 }}>
          <Input
            type="number"
            placeholder="验证码"
            value={code}
            onInput={e => setCode(e.detail.value)}
            maxlength={6}
            style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx' }}
          />
        </View>
        <View
          onClick={handleSendCode}
          style={{
            background: sending || cooldown > 0 ? 'rgba(124,58,237,.4)' : P,
            borderRadius: '20rpx', padding: '24rpx 32rpx', justifyContent: 'center', alignItems: 'center',
            opacity: sending || cooldown > 0 ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: '40rpx', fontWeight: '600', whiteSpace: 'nowrap' }}>
            {cooldown > 0 ? `${cooldown}s` : sending ? '发送中' : '获取验证码'}
          </Text>
        </View>
      </View>

      <View style={{ width: '100%', marginBottom: '20rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: '40rpx', marginBottom: '8rpx', display: 'block' }}>密码</Text>
        <Input
          type="text"
          password
          placeholder="密码（8位以上，含字母+数字+符号）"
          value={password}
          onInput={e => setPassword(e.detail.value)}
          style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx' }}
        />
      </View>

      <View style={{ width: '100%', marginBottom: '32rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: '40rpx', marginBottom: '8rpx', display: 'block' }}>确认密码</Text>
        <Input
          type="text"
          password
          placeholder="请再次输入密码"
          value={confirm}
          onInput={e => setConfirm(e.detail.value)}
          style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx' }}
        />
      </View>

      {error ? (
        <Text style={{ color: '#EF4444', fontSize: '40rpx', marginBottom: '24rpx', textAlign: 'center', display: 'block' }}>{error}</Text>
      ) : null}

      <View
        onClick={handleRegister}
        style={{ width: '100%', background: P, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '24rpx', opacity: isLoading ? 0.6 : 1 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>
          {isLoading ? '注册中...' : '注册'}
        </Text>
      </View>

      <View
        onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}
        style={{ padding: '16rpx' }}
      >
        <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>
          已有账号？<Text style={{ color: P }}>去登录</Text>
        </Text>
      </View>
    </View>
  );
}
