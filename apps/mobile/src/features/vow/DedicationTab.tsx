import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Settings, PenLine, History } from 'lucide-react-native';
import { FONT_BODY, FONT_SUB, FONT_BADGE, type Theme } from '@egoless-do/core';
import type { DedicationSettings, Dedication } from '@egoless-do/core';
import { useAppStore, useShallowStore } from '../../store/useAppStore';
import DedicationCard from './components/DedicationCard';
import DedicationSettingsModal from './modals/DedicationSettingsModal';

interface Props {
  TH: Theme;
  T: (key: string) => string;
  onNavigateToWrite: () => void;
}

export default function DedicationTab({ TH, T, onNavigateToWrite }: Props) {
  const { dedicationSettings, dedications, updateDedicationSettings } = useShallowStore(s => ({ dedicationSettings: s.dedicationSettings, dedications: s.dedications, updateDedicationSettings: s.updateDedicationSettings }));
  const [showSettings, setShowSettings] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const settings = dedicationSettings;
  const filteredDedications = useMemo(() =>
    (dedications ?? [])
      .filter((d: Dedication) => !d.deleted)
      .sort((a: Dedication, b: Dedication) => b.date.localeCompare(a.date)),
    [dedications]
  );

  // Check if overdue (no dedication for current period)
  const isOverdue = useMemo(() => {
    if (filteredDedications.length === 0) return true;
    const latest = filteredDedications[0];
    const latestDate = new Date(latest.date + 'T00:00:00');
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - latestDate.getTime()) / (24 * 60 * 60 * 1000));
    if (settings.frequency === 'weekly' && daysSince >= 7) return true;
    if (settings.frequency === 'biweekly' && daysSince >= 14) return true;
    if (settings.frequency === 'monthly' && daysSince >= 30) return true;
    if (settings.frequency === 'custom' && daysSince >= (settings.customDays ?? 14)) return true;
    return false;
  }, [filteredDedications, settings]);

  const frequencyLabel = useMemo(() => {
    const map: Record<string, string> = {
      weekly: T('vowDedWeekly'),
      biweekly: T('vowDedBiweekly'),
      monthly: T('vowDedMonthly'),
      custom: T('vowDedCustom'),
    };
    return map[settings.frequency] ?? settings.frequency;
  }, [settings.frequency, T]);

  const handleSaveSettings = (newSettings: Partial<DedicationSettings>) => {
    updateDedicationSettings(newSettings);
  };

  return (
    <View>
      {/* Settings summary */}
      <View style={{
        backgroundColor: TH.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: TH.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Settings size={18} color="#8B5CF6" />
          <View>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>
              {T('vowDedSettings')}
            </Text>
            <Text style={{ fontSize: FONT_BADGE, color: TH.sub, marginTop: 2 }}>
              {frequencyLabel}
              {settings.remindEnabled ? ` · ${T('vowDedRemind')}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={{
            paddingVertical: 6, paddingHorizontal: 14,
            borderRadius: 8, backgroundColor: '#8B5CF615',
          }}
        >
          <Text style={{ fontSize: FONT_BADGE, color: '#8B5CF6', fontWeight: '600' }}>
            {T('vowEdit')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Write dedication button */}
      <TouchableOpacity
        onPress={onNavigateToWrite}
        style={{
          borderRadius: 16, padding: 20, marginBottom: 16,
          backgroundColor: isOverdue ? '#8B5CF6' : `${TH.primary}15`,
          borderWidth: isOverdue ? 0 : 1,
          borderColor: isOverdue ? 'transparent' : `${TH.primary}30`,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <PenLine size={20} color={isOverdue ? '#fff' : '#8B5CF6'} />
        <Text style={{
          fontSize: FONT_BODY, fontWeight: '700',
          color: isOverdue ? '#fff' : '#8B5CF6',
        }}>
          {T('vowDedWrite')}
        </Text>
        {isOverdue && (
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
          }}>
            <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>
              {T('vowDedNoWrite')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* History */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginBottom: 12, marginLeft: 4,
      }}>
        <History size={16} color={TH.sub} />
        <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: TH.text }}>
          {T('vowDedHistory')}
        </Text>
        <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>{filteredDedications.length}</Text>
      </View>

      {filteredDedications.length === 0 ? (
        <View style={{
          backgroundColor: TH.card, borderRadius: 16, padding: 24,
          alignItems: 'center', borderWidth: 1, borderColor: TH.border,
        }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📝</Text>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center' }}>
            {T('vowDedNoWrite')}
          </Text>
        </View>
      ) : (
        filteredDedications.map(d => (
          <DedicationCard
            key={d.id}
            TH={TH}
            T={T}
            dedication={d}
            expanded={expandedId === d.id}
            onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
          />
        ))
      )}

      {/* Settings modal */}
      <DedicationSettingsModal
        visible={showSettings}
        TH={TH}
        T={T}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />
    </View>
  );
}
