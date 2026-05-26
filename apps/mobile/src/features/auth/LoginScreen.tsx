import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, PrimaryButton, ThemedInput, Card } from '../../components/UI';
import { registerPushToken } from '@egoless-do/core';
import * as Notifications from 'expo-notifications';

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

      // Register push token after login
      const token = useAppStore.getState().auth.token;
      if (token) {
        const getExpoPushToken = async () => {
          try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }

            if (finalStatus !== 'granted') {
              console.log('[Push] Permission denied');
              return null;
            }

            const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
            if (!projectId) {
              console.log('[Push] No project ID configured');
              return null;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            return tokenData.data;
          } catch (err) {
            console.error('[Push] Failed to get push token:', err);
            return null;
          }
        };

        registerPushToken(token, 'ios', getExpoPushToken);
      }

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
            secureTextEntry
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
