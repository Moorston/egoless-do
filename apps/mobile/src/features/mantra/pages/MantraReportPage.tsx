// ─── MantraReportPage — Session completion report + dedication modal ──
// Shows stats, dedication button, and finish action.

import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_SECTION, DEDICATION_TEMPLATES } from '@egoless-do/core';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT, PrimaryButton, OutlineButton } from '../../../components/UI';

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
// ─── Styles ──────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  backButton: { marginRight: 12 },
  backArrow: { fontSize: 24 },
  headerTitle: { fontWeight: '800', flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  summaryCardOuter: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  summaryCardInner: { backgroundColor: '#FBBF24', padding: 24, alignItems: 'center' },
  wheelIcon: { fontSize: 48 },
  mantraName: { fontWeight: '800', color: '#fff', marginTop: 8 },
  countText: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 8 },
  durationText: { color: 'rgba(255,255,255,.8)', marginTop: 4 },
  statsCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statColumn: { alignItems: 'center' },
  statNumber: { fontWeight: '800', color: '#FBBF24' },
  statNumberAmber: { fontWeight: '800', color: '#F59E0B' },
  statNumberGreen: { fontWeight: '800', color: '#10B981' },
  statLabel: {},
  dedicationButton: { borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dedicationIcon: { fontSize: 24 },
  dedicationTextBox: { flex: 1 },
  dedicationTitle: { fontWeight: '600' },
  dedicationHint: {},
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontWeight: '700', marginBottom: 16 },
  templateScroll: { maxHeight: 200, marginBottom: 12 },
  templateButton: { padding: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1 },
  templateText: {},
  dedicationInput: { borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
  modalButtonRow: { flexDirection: 'row', gap: 10 },
});
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
    <SafeAreaView edges={['top', 'bottom']} style={[S.safeArea, { backgroundColor: TH.bg }]}>
      <View style={S.headerRow}>
        <TouchableOpacity onPress={onReset} style={S.backButton}>
          <Text style={[S.backArrow, { color: TH.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[S.headerTitle, { fontSize: FONT_TITLE(), color: TH.text }]}>{T('mantraSessionComplete')}</Text>
      </View>
      <ScrollView contentContainerStyle={S.scrollContent}>
        {/* Summary Card */}
        <View style={S.summaryCardOuter}>
          <View style={S.summaryCardInner}>
            <Text style={S.wheelIcon}>☸</Text>
            <Text style={[S.mantraName, { fontSize: FONT_TITLE() }]}>{mantraName}</Text>
            <Text style={S.countText}>
              {count.toLocaleString()} {T('mantraCount')} · {rounds} {T('mantraRounds')}
            </Text>
            <Text style={[S.durationText, { fontSize: FONT_SUB() }]}>
              {formatTime(elapsed)}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[S.statsCard, { backgroundColor: TH.card }]}>
          <View style={S.statsRow}>
            <View style={S.statColumn}>
              <Text style={[S.statNumber, { fontSize: FONT_STAT_SECTION() }]}>{totalAfter.toLocaleString()}</Text>
              <Text style={[S.statLabel, { fontSize: FONT_SUB(), color: TH.sub }]}>{T('mantraCumulative')}</Text>
            </View>
            <View style={S.statColumn}>
              <Text style={[S.statNumberAmber, { fontSize: FONT_STAT_SECTION() }]}>🔥 {streak}</Text>
              <Text style={[S.statLabel, { fontSize: FONT_SUB(), color: TH.sub }]}>{T('mantraStreak')}</Text>
            </View>
            <View style={S.statColumn}>
              <Text style={[S.statNumberGreen, { fontSize: FONT_STAT_SECTION() }]}>{durationSec > 60 ? `${Math.floor(durationSec / 60)}m` : `${durationSec}s`}</Text>
              <Text style={[S.statLabel, { fontSize: FONT_SUB(), color: TH.sub }]}>{T('mantraSessionDuration')}</Text>
            </View>
          </View>
        </View>

        {/* Dedication */}
        <TouchableOpacity onPress={() => setShowDedication(true)}
          style={[S.dedicationButton, { backgroundColor: TH.card }]}>
          <Text style={S.dedicationIcon}>🙏</Text>
          <View style={S.dedicationTextBox}>
            <Text style={[S.dedicationTitle, { fontSize: FONT_BODY(), color: TH.text }]}>{T('mantraDedication')}</Text>
            <Text style={[S.dedicationHint, { fontSize: FONT_SMALL(), color: TH.sub }]}>{T('mantraDedicationHint')}</Text>
          </View>
        </TouchableOpacity>

        <PrimaryButton label={T('mantraFinish')} onPress={onReset} color="#FBBF24" />
      </ScrollView>

      {/* Dedication Modal */}
      <Modal visible={showDedication} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={[S.modalContent, { backgroundColor: TH.cardSolid }]}>
            <Text style={[S.modalTitle, { fontSize: FONT_TITLE(), color: TH.text }]}>{T('mantraDedication')}</Text>
            <ScrollView style={S.templateScroll}>
              {DEDICATION_TEMPLATES.map((tmpl, i) => (
                <TouchableOpacity key={i} onPress={() => setDedicationText(tmpl)}
                  style={[S.templateButton, { backgroundColor: dedicationText === tmpl ? '#FBBF2415' : TH.card, borderColor: dedicationText === tmpl ? '#FBBF24' : TH.border }]}>
                  <Text style={[S.templateText, { fontSize: FONT_SMALL(), color: dedicationText === tmpl ? '#FBBF24' : TH.text }]}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[S.dedicationInput, { backgroundColor: TH.card, color: TH.text, fontSize: FONT_BODY() }]}
              multiline maxLength={500} value={dedicationText} onChangeText={setDedicationText}
              placeholder={T('mantraDedicationPlaceholder')} placeholderTextColor={TH.sub}
            />
            <View style={S.modalButtonRow}>
              <OutlineButton label={T('mantraCancel') || T('cancel')} onPress={() => setShowDedication(false)} style={{ flex: 1 }} />
              <PrimaryButton label={T('mantraFinish')} onPress={() => setShowDedication(false)} color="#FBBF24" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
