import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { getPrimaryColor } from '../../utils/theme';

export default function LoginPage() {
  const P = getPrimaryColor();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, wechatLogin, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    setError('');
    try {
      await login(email, password);
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (e: any) {
      setError(e.message || '登录失败');
    }
  };

  const handleWechatLogin = async () => {
    setError('');
    try {
      const res = await Taro.login();
      await wechatLogin(res.code);
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (e: any) {
      setError(e.message || '微信登录失败');
    }
  };

  return (
    <View style={{ minHeight: '100vh', background: '#0F0A1E', padding: '64rpx 48rpx', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: '64rpx', fontWeight: '800', marginBottom: '16rpx' }}>心流纪</Text>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', marginBottom: '80rpx' }}>Egoless Do</Text>

      <View style={{ width: '100%', marginBottom: '24rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: '40rpx', marginBottom: '8rpx', display: 'block' }}>邮箱</Text>
        <Input
          type="text"
          placeholder="请输入邮箱"
          value={email}
          onInput={e => setEmail(e.detail.value)}
          style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx' }}
        />
      </View>

      <View style={{ width: '100%', marginBottom: '40rpx' }}>
        <Text style={{ color: 'rgba(255,255,255,.6)', fontSize: '40rpx', marginBottom: '8rpx', display: 'block' }}>密码</Text>
        <Input
          type="text"
          password
          placeholder="请输入密码"
          value={password}
          onInput={e => setPassword(e.detail.value)}
          style={{ background: 'rgba(255,255,255,.07)', border: `2rpx solid ${P}`, borderRadius: '20rpx', padding: '24rpx', color: '#fff', fontSize: '40rpx' }}
        />
      </View>

      {error ? (
        <Text style={{ color: '#EF4444', fontSize: '40rpx', marginBottom: '24rpx', textAlign: 'center', display: 'block' }}>{error}</Text>
      ) : null}

      <View
        onClick={handleLogin}
        style={{ width: '100%', background: P, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '24rpx', opacity: isLoading ? 0.6 : 1 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>
          {isLoading ? '登录中...' : '登录'}
        </Text>
      </View>

      <View style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '24rpx' }}>
        <View style={{ flex: 1, height: '1rpx', background: 'rgba(255,255,255,.15)' }} />
        <Text style={{ color: 'rgba(255,255,255,.3)', fontSize: '40rpx', margin: '0 24rpx' }}>或</Text>
        <View style={{ flex: 1, height: '1rpx', background: 'rgba(255,255,255,.15)' }} />
      </View>

      <View
        onClick={handleWechatLogin}
        style={{ width: '100%', background: '#07C160', borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '32rpx', opacity: isLoading ? 0.6 : 1 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>
          微信一键登录
        </Text>
      </View>

      <View
        onClick={() => Taro.navigateTo({ url: '/pages/register/index' })}
        style={{ padding: '16rpx' }}
      >
        <Text style={{ color: 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>
          没有账号？<Text style={{ color: P }}>去注册</Text>
        </Text>
      </View>
    </View>
  );
}
