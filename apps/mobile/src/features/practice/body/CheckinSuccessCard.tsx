import {
  FONT_TITLE, FONT_SUB, FONT_BADGE, FONT_SMALL, FONT_STAT_SECTION,
  type BodyCheckin, type Theme, FONT_STAT_CARD } from '@egoless-do/core';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';

import { PrimaryButton, Card } from '../../../components/UI';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  awarenessData: BodyCheckin | null;
  practiceCompleted: boolean;
  breathingCompleted: boolean;
  breathingDurationMs: number;
  totalMs: number;
  onFinish: () => void;
}

function loadEncouragements(T: (key: string) => string): string[] {
  try {
    const raw = T('bodyEncouragements');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function randomEncouragement(T: (key: string) => string): string {
  const list = loadEncouragements(T);
  if (list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CheckinSuccessCard({ TH, T, awarenessData, practiceCompleted, breathingCompleted, breathingDurationMs, totalMs, onFinish }: Props) {
  const hasData = awarenessData != null;
  const encouragement = useMemo(() => randomEncouragement(T), [T]);

  const DIMENSIONS = hasData
    ? [
        { label: T('bodyEnergy'), value: awarenessData!.energy, color: '#f59e0b' },
        { label: T('bodyPain'), value: awarenessData!.pain, color: '#ef4444' },
        { label: T('bodyComfort'), value: awarenessData!.comfort, color: '#10b981' },
        { label: T('bodySleepQuality'), value: awarenessData!.sleep, color: '#3b82f6' },
      ]
    : [];

  return (
    <View>
      {/* ── Header ── */}
      <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 24, alignItems: 'center' }}>
          <CheckCircle2 size={56} color="#fff" />
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 4 }}>
            {T('bodyFlowSummary')}
          </Text>
          <Text style={{ fontSize: FONT_SUB(), color: 'rgba(255,255,255,.85)' }}>
            {T('bodyFlowTotalTime')} {formatElapsed(totalMs)}
          </Text>
        </LinearGradient>
      </View>

      {/* ── Encouragement ── */}
      <Card style={{ marginBottom: 16, backgroundColor: '#10b98110', borderColor: '#10b98130' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Sparkles size={16} color="#10b981" style={{ marginTop: 2 }} />
          <Text style={{ fontSize: FONT_SUB(), color: '#10b981', lineHeight: 20, flex: 1, fontStyle: 'italic' }}>
            {encouragement}
          </Text>
        </View>
      </Card>

      {/* ── Stats summary ── */}
      <Card style={{ marginBottom: 16 }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-around',
          marginBottom: hasData ? 16 : 0, paddingBottom: hasData ? 12 : 0,
          borderBottomWidth: hasData ? 1 : 0, borderBottomColor: TH.border,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD(), marginBottom: 4 }}>{practiceCompleted ? '✅' : '⏭️'}</Text>
            <Text style={{ fontSize: FONT_BADGE(), color: practiceCompleted ? '#10b981' : TH.sub }}>
              {practiceCompleted ? T('bodyFlowDone') : T('bodyFlowSkipped')}
            </Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{T('bodyFlowPractice')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD(), marginBottom: 4 }}>{breathingCompleted ? '✅' : '⏭️'}</Text>
            <Text style={{ fontSize: FONT_BADGE(), color: breathingCompleted ? '#10b981' : TH.sub }}>
              {breathingCompleted ? `${Math.floor(breathingDurationMs / 60000)}${T('bodyMin')}` : T('bodyFlowSkipped')}
            </Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{T('bodyFlowBreathing')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD(), marginBottom: 4 }}>{hasData ? '✅' : '⏭️'}</Text>
            <Text style={{ fontSize: FONT_BADGE(), color: hasData ? '#10b981' : TH.sub }}>
              {hasData ? T('bodyFlowRecorded') : T('bodyFlowSkipped')}
            </Text>
            <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{T('bodyFlowAwareness')}</Text>
          </View>
        </View>

        {hasData && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {DIMENSIONS.map(item => (
              <View key={item.label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_STAT_SECTION(), fontWeight: '800', color: item.color }}>{String(item.value)}</Text>
                <Text style={{ fontSize: FONT_SMALL(), color: TH.sub, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <PrimaryButton
        label={T('bodyFlowFinish') || '完成'}
        onPress={onFinish}
        color="#10b981"
        icon={<CheckCircle2 size={18} color="#fff" />}
      />
    </View>
  );
}

export default CheckinSuccessCard;