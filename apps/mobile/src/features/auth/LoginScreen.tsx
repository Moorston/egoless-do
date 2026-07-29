import { FONT_TITLE, FONT_SUB, FONT_BUTTON, FONT_ERROR, FONT_STAT_SECTION, createLogger, MFARequiredError } from '@egoless-do/core';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useTheme, useT, PrimaryButton, ThemedInput, Card } from '../../components/UI';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore, type MobileStore } from '../../store/useAppStore';

import { registerExpoPushToken } from './pushTokenRegistration';

const log = createLogger('Auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();
  const login = useAppStore(useShallow((s: MobileStore) => s.login));
  const isLoading = useAppStore(useShallow((s: MobileStore) => s.auth.isLoading));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  // MFA step-up state
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  const navigateAfterLogin = () => {
    nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    const token = useAppStore.getState().auth.token;
    if (token) {
      setTimeout(() => { void registerExpoPushToken(token); }, 0);
    }
  };

  const handleEmailBlur = () => {
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError(T('authInvalidEmail'));
    } else {
      setEmailError('');
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Real-time format validation on change
    if (emailError) {
      setEmailError(text && !EMAIL_REGEX.test(text) ? T('authInvalidEmail') : '');
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
      navigateAfterLogin();
    } catch (e: unknown) {
      // MFA step-up: server requires a second factor. Switch to MFA input view.
      if (e instanceof MFARequiredError) {
        setMfaToken(e.mfaToken);
        setMfaCode('');
        setMfaError('');
        return;
      }
      // Don't reveal whether email exists — show generic error
      setError(T('authLoginFailed'));
    }
  };

  const handleVerifyMfa = async () => {
    setMfaError('');
    if (!mfaToken || !mfaCode.trim()) {
      setMfaError(T('authMfaCodePlaceholder'));
      return;
    }
    try {
      await useAppStore.getState().verifyMfaLogin(mfaToken, mfaCode.trim());
      navigateAfterLogin();
    } catch {
      setMfaError(T('authMfaInvalid'));
    }
  };

  // ── MFA challenge view ──
  if (mfaToken) {
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
            <Text style={{ color: TH.primary, fontSize: FONT_TITLE(), textAlign: 'center', marginBottom: 24 }}>
              {T('authMfaRequired')}
            </Text>
            <Card style={{ marginBottom: 16 }}>
              <ThemedInput
                value={mfaCode}
                onChangeText={setMfaCode}
                placeholder={T('authMfaCodePlaceholder')}
                keyboardType="number-pad"
                maxLength={6}
                style={{ marginBottom: mfaError ? 4 : 0, ...(mfaError ? { borderColor: '#ef4444' } : {}) }}
              />
            </Card>
            {mfaError !== '' && (
              <Text style={{ color: '#ff6b6b', fontSize: FONT_ERROR(), textAlign: 'center', marginBottom: 12 }}>
                {mfaError}
              </Text>
            )}
            <PrimaryButton
              label={isLoading ? T('authMfaVerifying') : T('authMfaVerifyBtn')}
              onPress={handleVerifyMfa}
              style={{ marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
            />
            <TouchableOpacity
              onPress={() => { setMfaToken(null); setMfaCode(''); setMfaError(''); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: TH.sub, fontSize: FONT_SUB(), textAlign: 'center' }}>
                {T('authForgotPassword')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder={T('authEmailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: emailError ? 4 : 12, ...(emailError ? { borderColor: '#ef4444' } : {}) }}
            />
            {emailError ? (
              <Text style={{ color: '#ef4444', fontSize: FONT_ERROR(), marginBottom: 12 }}>{emailError}</Text>
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
            <Text style={{ color: '#ff6b6b', fontSize: FONT_ERROR(), textAlign: 'center', marginBottom: 12 }}>
              {error}
            </Text>
          )}

          <PrimaryButton
            label={isLoading ? T('authLoginLoading') : T('authLoginBtn')}
            onPress={handleLogin}
            style={{ marginBottom: 16, opacity: isLoading ? 0.7 : 1 }}
          />

          <TouchableOpacity onPress={() => nav.navigate('Register')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB(), textAlign: 'center', marginBottom: 12 }}>
              {T('authNoAccount')}<Text style={{ color: TH.primary }}>{T('authGoRegister')}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => nav.navigate('ForgotPassword')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB(), textAlign: 'center' }}>
              <Text style={{ color: TH.primary }}>{T('authForgotPassword')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
