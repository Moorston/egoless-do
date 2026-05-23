import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, PrimaryButton, ThemedInput, Card } from '../../components/UI';

export default function LoginScreen() {
  const TH = useTheme();
  const nav = useNavigation<any>();
  const login = useAppStore(s => s.login);
  const isLoading = useAppStore(s => s.auth.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码');
      return;
    }
    try {
      await login(email.trim(), password);
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      setError(e.message || '登录失败');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: TH.bg }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{
          color: TH.primary, fontSize: 36, fontWeight: '800',
          textAlign: 'center', marginBottom: 4,
        }}>
          心流纪
        </Text>
        <Text style={{
          color: TH.primary, fontSize: 13,
          textAlign: 'center', marginBottom: 4, letterSpacing: 1, opacity: 0.7,
        }}>
          Egoless Do
        </Text>
        <Text style={{
          color: TH.sub, fontSize: 14,
          textAlign: 'center', marginBottom: 40,
        }}>
          记录每一份觉知
        </Text>

        <Card style={{ marginBottom: 16 }}>
          <ThemedInput
            value={email}
            onChangeText={setEmail}
            placeholder="邮箱"
            keyboardType="default"
            style={{ marginBottom: 12 }}
          />
          <ThemedInput
            value={password}
            onChangeText={setPassword}
            placeholder="密码"
            style={{ marginBottom: 4 }}
          />
        </Card>

        {error !== '' && (
          <Text style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            {error}
          </Text>
        )}

        <PrimaryButton
          label={isLoading ? '登录中...' : '登录'}
          onPress={handleLogin}
          style={{ marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
        />

        <TouchableOpacity onPress={() => nav.navigate('Register')} activeOpacity={0.7}>
          <Text style={{ color: TH.sub, fontSize: 13, textAlign: 'center' }}>
            没有账号？<Text style={{ color: TH.primary }}>去注册</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
