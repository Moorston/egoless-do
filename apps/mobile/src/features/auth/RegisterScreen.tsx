import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, PrimaryButton, ThemedInput, Card } from '../../components/UI';
import { apiSendCode, apiCheckEmail, validatePassword, FONT_TITLE, FONT_SUB, FONT_BUTTON, FONT_ERROR, FONT_STAT_SECTION } from '@egoless-do/core';
import { Check, X } from 'lucide-react-native';

const COOLDOWN = 60;

export default function RegisterScreen() {
  const TH = useTheme();
  const nav = useNavigation<any>();
  const register = useAppStore(s => s.register);
  const isLoading = useAppStore(s => s.auth.isLoading);

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
    const em = email.trim();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    try {
      const res = await apiCheckEmail(em);
      setEmailStatus(res.available ? 'ok' : 'taken');
      if (!res.available) setError(res.error ?? '该邮箱已注册');
      else if (error === '该邮箱已注册') setError('');
    } catch {
      setEmailStatus('idle');
    }
  };

  const handleSendCode = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError('');
    setSending(true);
    try {
      await apiSendCode(email.trim());
      startCooldown();
    } catch (e: any) {
      setError(e.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim() || !code.trim()) {
      setError('请填写所有字段');
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
    try {
      await register(email.trim(), password, name.trim(), code.trim());
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: any) {
      setError(e.message || '注册失败');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: TH.bg }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24 }}>
          <Image
            source={require('../../../assets/sign-logo.png')}
            style={{
              width: 320,
              height: 128,
              alignSelf: 'center',
              marginBottom: 40,
            }}
            resizeMode="contain"
          />

          <Card style={{ marginBottom: 16 }}>
            <ThemedInput
              value={name}
              onChangeText={setName}
              placeholder="昵称"
              style={{ marginBottom: 12 }}
            />
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <ThemedInput
                value={email}
                onChangeText={v => { setEmail(v); setEmailStatus('idle'); }}
                onBlur={handleEmailBlur}
                placeholder="邮箱"
                keyboardType="default"
                style={{ marginBottom: 0, paddingRight: 80 }}
              />
              {emailStatus === 'checking' && <Text style={{ position: 'absolute', right: 14, top: 14, fontSize: FONT_SUB, color: TH.sub }}>检查中...</Text>}
              {emailStatus === 'ok' && <View style={{ position: 'absolute', right: 14, top: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Check size={14} color="#10b981" /><Text style={{ fontSize: FONT_SUB, color: '#10b981' }}>可用</Text></View>}
              {emailStatus === 'taken' && <View style={{ position: 'absolute', right: 14, top: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}><X size={14} color="#ef4444" /><Text style={{ fontSize: FONT_SUB, color: '#ef4444' }}>已注册</Text></View>}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <ThemedInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="邮箱验证码"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ marginBottom: 0 }}
                />
              </View>
              <TouchableOpacity
                onPress={handleSendCode}
                disabled={sending || cooldown > 0}
                style={{
                  paddingHorizontal: 16, borderRadius: 10,
                  backgroundColor: sending || cooldown > 0 ? 'rgba(129,140,248,.3)' : TH.primary,
                  justifyContent: 'center', alignItems: 'center', opacity: sending || cooldown > 0 ? 0.6 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>
                  {cooldown > 0 ? `${cooldown}s` : sending ? '发送中' : '获取验证码'}
                </Text>
              </TouchableOpacity>
            </View>
            <ThemedInput
              value={password}
              onChangeText={setPassword}
              placeholder="密码"
              secureTextEntry
              style={{ marginBottom: 12 }}
            />
            <ThemedInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="确认密码"
              secureTextEntry
              style={{ marginBottom: 4 }}
            />
          </Card>

          {error !== '' && (
            <Text style={{ color: '#ff6b6b', fontSize: FONT_ERROR, textAlign: 'center', marginBottom: 12 }}>
              {error}
            </Text>
          )}

          <PrimaryButton
            label={isLoading ? '注册中...' : '注册'}
            onPress={handleRegister}
            style={{ marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
          />

          <TouchableOpacity onPress={() => nav.navigate('Login')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center' }}>
              已有账号？<Text style={{ color: TH.primary }}>去登录</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
