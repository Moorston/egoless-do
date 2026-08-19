// ─── BreathReportPage — Post-session report + reflection UI ───────
// Shows session summary, distress assessment, reflection input, save button.

import { FONT_BODY, fmtMS , FONT_SMALL } from '@egoless-do/core';
import type { BreathingPreset } from '@egoless-do/core';
import { X, Check } from 'lucide-react-native';
import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, TextInput} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { styles } from '../breathStyles';


/**
 * Props for {@link BreathReportPage}.
 *
 * @property preset         - The completed breathing preset (used to display name).
 * @property cycles          - Number of cycles completed during the session.
 * @property totalElapsed    - Total elapsed seconds for the session.
 * @property preDistress     - Pre-session distress level (0-10) recorded before the session.
 * @property postDistress    - Post-session distress level (0-10) selected by the user on this screen.
 * @property setPostDistress - Setter to update the post-session distress value.
 * @property reflection      - Current text of the user's post-session reflection note.
 * @property setReflection   - Setter to update the reflection text.
 * @property saving          - Whether the save operation is currently in progress (disables the save button).
 * @property onClose         - Callback invoked when the user taps the close (X) button.
 * @property onSave          - Callback invoked when the user taps the save button to persist the record.
 */
interface Props {
  preset: BreathingPreset;
  cycles: number;
  totalElapsed: number;
  preDistress: number;
  postDistress: number;
  setPostDistress: (n: number) => void;
  reflection: string;
  setReflection: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Post-session report screen shown after a breathing session completes.
 *
 * Renders a scrollable view with:
 *   - Session summary card (preset name, cycles completed, total duration)
 *   - Post-session distress assessment (0-10 scale) with computed change from
 *     pre-session distress (percentage improvement or worsening)
 *   - Multiline text input for the user to write a reflection (max 500 chars)
 *   - Save button that triggers persistence (disabled while saving)
 *
 * Computes `distressChange` (pre - post) and `distressPercent` locally for display.
 *
 * @param props - See {@link Props}.
 * @returns A `SafeAreaView` containing the full post-session report UI.
 */
export default function BreathReportPage(props: Props) {
  const { preset, cycles, totalElapsed, preDistress, postDistress, setPostDistress,
    reflection, setReflection, saving, onClose, onSave } = props;
  const TH = useTheme();
  const T = useT();

  const distressChange = preDistress - postDistress;
  const distressPercent = preDistress > 0 ? Math.round((distressChange / preDistress) * 100) : 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={styles.prepHeader}>
        <Text style={[styles.prepTitle, { color: TH.text }]}>{T('breathReport')}</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Session summary */}
        <View style={[styles.reportCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.reportName, { color: TH.primary }]}>{T(preset.nameKey)}</Text>
          <View style={styles.reportRow}>
            <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathCycles')}</Text>
            <Text style={[styles.reportValue, { color: TH.text }]}>{cycles}</Text>
          </View>
          <View style={styles.reportRow}>
            <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathDuration')}</Text>
            <Text style={[styles.reportValue, { color: TH.text }]}>{fmtMS(totalElapsed)}</Text>
          </View>
        </View>

        {/* Post-distress assessment */}
        <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathPostDistress')}</Text>
          <View style={styles.distressRow}>
            <Text style={{ color: TH.sub }}>😌</Text>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.distressValue, { color: TH.primary }]}>{postDistress}</Text>
            </View>
            <Text style={{ color: TH.sub }}>😰</Text>
          </View>
          <View style={styles.distressButtons}>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.distressBtn, postDistress === n && { backgroundColor: TH.primary }]}
                onPress={() => setPostDistress(n)}
              >
                <Text style={[styles.distressBtnText, { color: postDistress === n ? '#fff' : TH.sub }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Distress change */}
          <View style={[styles.reportRow, { marginTop: 12 }]}>
            <Text style={[styles.reportLabel, { color: TH.sub }]}>{T('breathDistressChange')}</Text>
            <Text style={[styles.reportValue, { color: distressChange > 0 ? '#10B981' : distressChange < 0 ? '#EF4444' : TH.sub }]}>
              {preDistress} → {postDistress} {distressChange === 0 ? '—' : `(${distressChange > 0 ? '-' : '+'}${Math.abs(distressPercent)}%)`}
            </Text>
          </View>
        </View>

        {/* Reflection input */}
        <View style={[styles.infoCard, { borderColor: `${TH.primary}20` }]}>
          <Text style={[styles.infoTitle, { color: TH.primary }]}>{T('breathThisReflection')}</Text>
          <TextInput
            value={reflection}
            onChangeText={setReflection}
            placeholder={T('breathReflectionPlaceholder')}
            placeholderTextColor={TH.sub}
            multiline
            maxLength={500}
            style={{
              minHeight: 80, maxHeight: 160,
              backgroundColor: TH.bg,
              borderRadius: 10,
              padding: 12,
              color: TH.text,
              fontSize: FONT_BODY(),
              borderWidth: 1,
              borderColor: TH.border,
              textAlignVertical: 'top',
            }}
          />
          <Text style={{ color: TH.sub, fontSize: FONT_SMALL(), marginTop: 4 }}>{T('breathSaveTagHint')}</Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: saving ? TH.sub : TH.primary, marginTop: 16 }]}
          onPress={onSave}
          disabled={saving}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.startBtnText}>{saving ? T('breathSaving') : T('breathSaveRecord')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
