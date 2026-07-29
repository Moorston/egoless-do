import { apiSendCode, validatePassword, FONT_SUB, FONT_BUTTON, FONT_ERROR } from '@egoless-do/core';
import { Image } from 'expo-image';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useTheme, useT, PrimaryButton, ThemedInput, Card } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, type MobileStore } from '../../store/useAppStore';


const COOLDOWN = 60;

export default function RegisterScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const register = useAppStore(useShallow((s: MobileStore) => s.register));
  const isLoading = useAppStore(useShallow((s: MobileStore) => s.auth.isLoading));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailError, setEmailError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const startCooldown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleEmailBlur = () => {
    const em = email.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setEmailError(T('authInvalidEmail'));
    } else {
      setEmailError('');
    }
  };

  const handleSendCode = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(T('authInvalidEmailAddr'));
      return;
    }
    setError('');
    setSending(true);
    try {
      await apiSendCode(email.trim());
      startCooldown();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T('authSendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim() || !code.trim()) {
      setError(T('authFillAllFields'));
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirm) {
      setError(T('authPasswordMismatch'));
      return;
    }
    try {
      await register(email.trim(), password, name.trim(), code.trim());
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e: unknown) {
      // Show generic error — don't reveal whether email exists
      setError(e instanceof Error ? e.message : T('authRegisterFailed'));
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
              value={name}
              onChangeText={setName}
              placeholder={T('authNicknamePlaceholder')}
              style={{ marginBottom: 12 }}
            />
            <ThemedInput
              value={email}
              onChangeText={v => { setEmail(v); setEmailError(''); }}
              onBlur={handleEmailBlur}
              placeholder={T('authEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: emailError ? 4 : 12, ...(emailError ? { borderColor: '#ef4444' } : {}) }}
            />
            {emailError ? <Text style={{ color: '#ef4444', fontSize: FONT_ERROR(), marginBottom: 12 }}>{emailError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <ThemedInput
                  value={code}
                  onChangeText={setCode}
                  placeholder={T('authVerifyCodePlaceholder')}
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
                <Text style={{ color: '#fff', fontSize: FONT_SUB(), fontWeight: '600' }}>
                  {cooldown > 0 ? `${cooldown}s` : sending ? T('authSending') : T('authSendCode')}
                </Text>
              </TouchableOpacity>
            </View>
            <ThemedInput
              value={password}
              onChangeText={setPassword}
              placeholder={T('authPasswordPlaceholder')}
              secureTextEntry
              style={{ marginBottom: 12 }}
            />
            <ThemedInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder={T('authConfirmPasswordPlaceholder')}
              secureTextEntry
              style={{ marginBottom: 4 }}
            />
          </Card>

          {error !== '' && (
            <Text style={{ color: '#ff6b6b', fontSize: FONT_ERROR(), textAlign: 'center', marginBottom: 12 }}>
              {error}
            </Text>
          )}

          <PrimaryButton
            label={isLoading ? T('authRegisterLoading') : T('authRegisterBtn')}
            onPress={handleRegister}
            style={{ marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
          />

          <TouchableOpacity onPress={() => nav.navigate('Login')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB(), textAlign: 'center' }}>
              {T('authHasAccount')}<Text style={{ color: TH.primary }}>{T('authGoLogin')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
