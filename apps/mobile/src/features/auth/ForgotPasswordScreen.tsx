import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRootNavigation } from '../../navigation/hooks';
import { useTheme, useT, PrimaryButton, ThemedInput, Card } from '../../components/UI';
import { apiCheckEmail, apiSendCode, apiResetPassword, validatePassword, FONT_TITLE, FONT_SUB, FONT_BUTTON, FONT_ERROR, FONT_STAT_SECTION } from '@egoless-do/core';

const COOLDOWN = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useRootNavigation();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [step, setStep] = useState<1 | 2>(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); };
  }, []);

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

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSendCode = async () => {
    if (!email || !EMAIL_REGEX.test(email)) {
      setError(T('authInvalidEmailAddr'));
      return;
    }
    setError('');
    setSending(true);
    try {
      const checkRes = await apiCheckEmail(email);
      if (checkRes.available) {
        setError(T('authEmailNotRegisteredShort'));
        return;
      }
      await apiSendCode(email, 'reset');
      startCooldown();
    } catch (e: any) {
      setError(e.message || T('authSendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = () => {
    setError('');
    if (!code.trim()) {
      setError(T('authEnterVerifyCode'));
      return;
    }
    setStep(2);
  };

  const handleResetPassword = async () => {
    setError('');
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirm) {
      setError(T('authPasswordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(email, code, password);
      setSuccess(T('authResetSuccess'));
      navTimerRef.current = setTimeout(() => nav.navigate('Login'), 1500);
    } catch (e: any) {
      setError(e.message || T('authResetFailed'));
    } finally {
      setLoading(false);
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
          <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', textAlign: 'center', marginBottom: 4, color: TH.text }}>心流纪</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.primary, textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>Egoless Do</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', marginBottom: 32 }}>
            {step === 1 ? T('authVerifyEmail') : T('authSetNewPassword')}
          </Text>

          <Card style={{ marginBottom: 16 }}>
            {step === 1 ? (
              <>
                <ThemedInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={T('authEmailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ marginBottom: 12 }}
                />
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
                    <Text style={{ color: '#fff', fontSize: FONT_SUB, fontWeight: '600' }}>
                      {cooldown > 0 ? `${cooldown}s` : sending ? T('authSending') : T('authSendCode')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <ThemedInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={T('authNewPasswordPlaceholder')}
                  secureTextEntry
                  style={{ marginBottom: 12 }}
                />
                <ThemedInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={T('authConfirmNewPasswordPlaceholder')}
                  secureTextEntry
                  style={{ marginBottom: 4 }}
                />
              </>
            )}
          </Card>

          {error !== '' && (
            <Text style={{ color: '#ff6b6b', fontSize: FONT_ERROR, textAlign: 'center', marginBottom: 12 }}>
              {error}
            </Text>
          )}
          {success !== '' && (
            <Text style={{ color: '#10b981', fontSize: FONT_SUB, textAlign: 'center', marginBottom: 12 }}>
              {success}
            </Text>
          )}

          <PrimaryButton
            label={step === 1 ? T('authNextStep') : loading ? T('authResetting') : T('authResetPassword')}
            onPress={step === 1 ? handleVerifyCode : handleResetPassword}
            style={{ marginBottom: 16, opacity: loading ? 0.7 : 1 }}
          />

          <TouchableOpacity onPress={() => nav.navigate('Login')} activeOpacity={0.7}>
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center' }}>
              <Text style={{ color: TH.primary }}>{T('authBackToLogin')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
