import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigation } from '../../../navigation/hooks';
import { useAppStore } from '../../../store/useAppStore';
import { Card, useTheme, useT, ScreenHeader } from '../../../components/UI';
import { COLORS, yesterday, dateStr, FONT_BODY, FONT_TITLE, FONT_SUB, FONT_SMALL, FONT_TINY,
  getMonthGraceCount, getRemainingGrace, isGraceAvailable } from '@egoless-do/core';
import { Shield, ShieldCheck, CheckCircle2, Clock, Calendar, Settings } from 'lucide-react-native';
import CheckinModal from '../components/CheckinModal';

export default function GracePage() {
  const nav   = useRootNavigation();
  const TH    = useTheme();
  const T     = useT();
  const P     = TH.primary;
  const store = useAppStore();

  const [showCheckin, setShowCheckin] = useState(false);

  const yStr = yesterday();
  const currentMonth = dateStr().slice(0, 7); // "2026-06"

  const yesterdayRecord = store.checkinHistory?.find(h => !h.deleted && h.date === yStr);
  const yesterdayDone = yesterdayRecord?.done === true;
  const missed = !yesterdayDone;

  // Quota
  const quota = store.userProfile?.graceMonthlyQuota ?? 2;
  const monthUsed = useMemo(() => getMonthGraceCount(store.graceHistory ?? [], currentMonth), [store.graceHistory, currentMonth]);
  const remaining = useMemo(() => getRemainingGrace(store.graceHistory ?? [], quota, currentMonth), [store.graceHistory, quota, currentMonth]);
  const available = useMemo(() => isGraceAvailable(store.graceHistory ?? [], quota, currentMonth, yStr), [store.graceHistory, quota, currentMonth, yStr]);

  // Grace history (sorted by date desc)
  const graceHistory = useMemo(() =>
    (store.graceHistory ?? []).filter(g => !g.deleted).sort((a, b) => b.date.localeCompare(a.date)),
    [store.graceHistory],
  );

  const handleRestore = useCallback(() => {
    if (!available) return;
    setShowCheckin(true);
  }, [available]);

  const handleCheckinClose = useCallback(() => {
    setShowCheckin(false);
  }, []);

  const updateQuota = useCallback((q: number) => {
    store.updateUserProfile({ graceMonthlyQuota: q });
  }, [store]);

  // Quota selector options
  const quotaOptions = [0, 1, 2, 3, 4, 5];

  if (showCheckin) {
    return <CheckinModal onClose={handleCheckinClose} graceDate={yStr} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={T('graceTitle')} onBack={() => nav.goBack()} />

        {/* Status Card */}
        <Card style={{ padding: 20, marginBottom: 12 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            {missed ? (
              available ? (
                <View style={{ alignItems: 'center' }}>
                  <Shield size={48} color={P} />
                  <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginTop: 12 }}>
                    {T('graceNeedRestore')}
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Shield size={48} color={TH.sub} />
                  <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: COLORS.ORANGE, marginTop: 12 }}>
                    {T('graceQuotaExhausted')}
                  </Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>
                    {T('graceQuotaReset')}
                  </Text>
                </View>
              )
            ) : (
              <View style={{ alignItems: 'center' }}>
                <CheckCircle2 size={48} color={COLORS.GREEN} />
                <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: COLORS.GREEN, marginTop: 12 }}>
                  {T('graceAlreadyDone')}
                </Text>
              </View>
            )}
          </View>

          {/* Yesterday status */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 14, backgroundColor: TH.card, borderRadius: 12, marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Clock size={18} color={TH.sub} />
              <View>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{yStr}</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('graceYesterday')}</Text>
              </View>
            </View>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
              backgroundColor: missed ? `${COLORS.ORANGE}20` : `${COLORS.GREEN}20`,
            }}>
              <Text style={{
                fontSize: FONT_SUB, fontWeight: '600',
                color: missed ? COLORS.ORANGE : COLORS.GREEN,
              }}>
                {missed ? T('graceNotDone') : T('graceDone')}
              </Text>
            </View>
          </View>

          {/* Restore button */}
          {missed && available && (
            <TouchableOpacity
              onPress={handleRestore}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: P,
              }}
            >
              <Shield size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>
                {T('graceButton')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Grace hint */}
          {missed && !available && quota > 0 && (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>
                {T('graceQuotaUsed').replace('{used}', String(monthUsed)).replace('{total}', String(quota))}
              </Text>
            </View>
          )}
        </Card>

        {/* Quota Progress */}
        {quota > 0 && (
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                {T('graceQuotaUsed').replace('{used}', String(monthUsed)).replace('{total}', String(quota))}
              </Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{remaining} {T('graceUsedTimes')}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: TH.border, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{
                height: 8, borderRadius: 4,
                width: `${Math.min(100, (monthUsed / quota) * 100)}%`,
                backgroundColor: monthUsed >= quota ? COLORS.ORANGE : P,
              }} />
            </View>
          </Card>
        )}

        {/* Quota Setting */}
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Settings size={16} color={P} />
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
              {T('graceSettingTitle')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {quotaOptions.map(q => (
              <TouchableOpacity
                key={q}
                onPress={() => updateQuota(q)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                  backgroundColor: quota === q ? P : TH.card,
                  borderWidth: 1, borderColor: quota === q ? P : TH.border,
                }}
              >
                <Text style={{
                  fontSize: FONT_BODY, fontWeight: '700',
                  color: quota === q ? '#fff' : TH.text,
                }}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: FONT_TINY, color: TH.sub, marginTop: 8 }}>
            {T('graceSettingHint')}
          </Text>
        </Card>

        {/* Grace History Timeline */}
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color={P} />
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
              {T('graceHistory')}
            </Text>
          </View>
          {graceHistory.length === 0 ? (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', padding: 12 }}>
              {T('graceHistoryEmpty')}
            </Text>
          ) : (
            <View>
              {graceHistory.map((entry, idx) => {
                const restoredDate = new Date(entry.restoredAt);
                const timeStr = restoredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <View key={entry.date} style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                    paddingBottom: idx < graceHistory.length - 1 ? 12 : 0,
                    marginBottom: idx < graceHistory.length - 1 ? 12 : 0,
                    borderBottomWidth: idx < graceHistory.length - 1 ? 1 : 0,
                    borderBottomColor: TH.border,
                  }}>
                    <View style={{
                      width: 8, height: 8, borderRadius: 4, backgroundColor: P,
                      marginTop: 6,
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>
                        {entry.date}
                      </Text>
                      <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>
                        {T('graceCheckinTitle')} · {timeStr}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Info Card */}
        <Card style={{ padding: 16 }}>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, lineHeight: 22 }}>
            {T('graceDesc')}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
