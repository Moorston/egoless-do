// ─── MantraReportPage — Session completion report + dedication modal ──
// Shows stats, dedication button, and finish action.

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useT, PrimaryButton, OutlineButton } from '../../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_SECTION, DEDICATION_TEMPLATES } from '@egoless-do/core';

// ─── Props interface ────────────────────────────────────────────────

/**
 * Props for the {@link MantraReportPage} component.
 *
 * Provides the session results, lifetime statistics, time formatting,
 * dedication modal state and setters, and the navigation callback
 * to return to the selection screen.
 */
interface Props {
  /** Display name of the mantra that was chanted. */
  mantraName?: string;
  /** Total bead count achieved in the completed session. */
  count: number;
  /** Total elapsed active time in milliseconds for the session. */
  elapsed: number;
  /** Cumulative all-time bead count for this mantra after the session. */
  totalAfter: number;
  /** Current consecutive-day chanting streak. */
  streak: number;
  /** Utility function to format milliseconds into a human-readable time string. */
  formatTime: (ms: number) => string;
  /** Whether the dedication modal is currently visible. */
  showDedication: boolean;
  /** Setter to show or hide the dedication modal. */
  setShowDedication: (v: boolean) => void;
  /** Current dedication text entered by the user. */
  dedicationText: string;
  /** Setter to update the dedication text. */
  setDedicationText: (v: string) => void;
  /** Callback to reset state and navigate back to the mantra selection page. */
  onReset: () => void;
}

/**
 * Session completion report page with optional dedication modal.
 *
 * Displayed after the user ends a chanting session. Shows:
 * - A golden summary card with the mantra name, bead count, rounds completed,
 *   and formatted session duration.
 * - A stats row with cumulative lifetime count, current streak, and session duration.
 * - A dedication button that opens a modal for writing or selecting a dedication text
 *   (merit dedication / transfer of merit, a common Buddhist practice).
 * - A "Finish" button that resets state and returns to the selection screen.
 *
 * The dedication modal provides:
 * - A scrollable list of preset dedication templates from {@link DEDICATION_TEMPLATES}.
 * - A free-text input (max 500 chars) for custom dedication text.
 * - Cancel and Finish actions at the bottom.
 *
 * @param props - {@link Props}
 * @returns A full-screen safe-area view with the session report and dedication modal.
 */
export default function MantraReportPage(props: Props) {
  const {
    mantraName, count, elapsed, totalAfter, streak, formatTime,
    showDedication, setShowDedication, dedicationText, setDedicationText, onReset,
  } = props;

  const TH = useTheme();
  const T = useT();
  const rounds = Math.floor(count / 108);
  const durationSec = Math.floor(elapsed / 1000);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onReset} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24, color: TH.text }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, flex: 1 }}>{T('mantraSessionComplete')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Summary Card */}
        <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FBBF24', padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 48 }}>☸</Text>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: '#fff', marginTop: 8 }}>{mantraName}</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 8 }}>
              {count.toLocaleString()} {T('mantraCount')} · {rounds} {T('mantraRounds')}
            </Text>
            <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
              {formatTime(elapsed)}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#FBBF24' }}>{totalAfter.toLocaleString()}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraCumulative')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#F59E0B' }}>🔥 {streak}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraStreak')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '800', color: '#10B981' }}>{durationSec > 60 ? `${Math.floor(durationSec / 60)}m` : `${durationSec}s`}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mantraSessionDuration')}</Text>
            </View>
          </View>
        </View>

        {/* Dedication */}
        <TouchableOpacity onPress={() => setShowDedication(true)}
          style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>🙏</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text }}>{T('mantraDedication')}</Text>
            <Text style={{ fontSize: FONT_SMALL, color: TH.sub }}>{T('mantraDedicationHint')}</Text>
          </View>
        </TouchableOpacity>

        <PrimaryButton label={T('mantraFinish')} onPress={onReset} color="#FBBF24" />
      </ScrollView>

      {/* Dedication Modal */}
      <Modal visible={showDedication} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 16 }}>{T('mantraDedication')}</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
              {DEDICATION_TEMPLATES.map((tmpl, i) => (
                <TouchableOpacity key={i} onPress={() => setDedicationText(tmpl)}
                  style={{ padding: 12, borderRadius: 8, backgroundColor: dedicationText === tmpl ? '#FBBF2415' : TH.card, marginBottom: 6, borderWidth: 1, borderColor: dedicationText === tmpl ? '#FBBF24' : TH.border }}>
                  <Text style={{ fontSize: FONT_SMALL, color: dedicationText === tmpl ? '#FBBF24' : TH.text }}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }}
              multiline maxLength={500} value={dedicationText} onChangeText={setDedicationText}
              placeholder={T('mantraDedicationPlaceholder')} placeholderTextColor={TH.sub}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <OutlineButton label={T('mantraCancel') || T('cancel')} onPress={() => setShowDedication(false)} style={{ flex: 1 }} />
              <PrimaryButton label={T('mantraFinish')} onPress={() => setShowDedication(false)} color="#FBBF24" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
