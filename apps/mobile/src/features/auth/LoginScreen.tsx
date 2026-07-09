import { FONT_TITLE, FONT_SUB, FONT_BUTTON, FONT_ERROR, FONT_STAT_SECTION, createLogger , apiCheckEmail } from '@egoless-do/core';
import { Image } from 'expo-image';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { useTheme, useT, PrimaryButton, ThemedInput, Card } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { registerExpoPushToken } from './pushTokenRegistration';


const log = createLogger('Auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const login = useAppStore(s => s.login);
  const isLoading = useAppStore(s => s.auth.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'registered' | 'not_registered'>('idle');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleEmailBlur = async () => {
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError(T('authInvalidEmail'));
      setEmailStatus('idle');
      return;
    }
    setEmailError('');
    if (!email) {
      setEmailStatus('idle');
      return;
    }
    setEmailStatus('checking');
    try {
      const res = await apiCheckEmail(email.trim());
      if (!mountedRef.current) return;
      if (res.available) {
        setEmailStatus('not_registered');
        setEmailError(T('authEmailNotRegistered'));
      } else {
        setEmailStatus('registered');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      log.warn('Email check failed:', e);
      setEmailStatus('idle');
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError(T('authFillEmailPassword'));
      return;
    }
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError(T('authInvalidEmail'));
      return;
    }
    try {
      await login(email.trim(), password);

      // Navigate immediately — don't wait for push token registration
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

      // Register push token in background (non-blocking)
      const token = useAppStore.getState().auth.token;
      if (token) {
        requestAnimationFrame(() => { registerExpoPushToken(token); });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T('authLoginFailed'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            contentFit="contain"
          />

          <Card style={{ marginBottom: 16 }}>
            <ThemedInput
              value={email}
              onChangeText={(text) => { setEmail(text); setEmailError(''); setEmailStatus('idle'); }}
              onBlur={handleEmailBlur}
              placeholder={T('authEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: emailError ? 4 : 12, ...(emailError ? { borderColor: '#ef4444' } : {}) }}
            />
            {emailError ? (
              <Text style={{ color: '#ef4444', fontSize: FONT_ERROR, marginBottom: 12 }}>{emailError}</Text>
            ) : null}
            <ThemedInput
              value={password}
              onChangeText={setPassword}
              placeholder={T('authPasswordPlaceholder')}
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
            label={isLoading ? T('authLoginLoading') : T('authLoginBtn')}
            onPress={handleLogin}
            style={{ marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
          />

          <TouchableOpacity onPress={() => nav.navigate('Register')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', marginBottom: 12 }}>
              {T('authNoAccount')}<Text style={{ color: TH.primary }}>{T('authGoRegister')}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => nav.navigate('ForgotPassword')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center' }}>
              <Text style={{ color: TH.primary }}>{T('authForgotPassword')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
