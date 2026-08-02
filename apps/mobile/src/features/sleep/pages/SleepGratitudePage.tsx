// ─── SleepGratitudePage — Gratitude form UI ──────────────────────
// Quality rating, gratitude inputs, note, and save button.

import { X, Star, Check } from 'lucide-react-native';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, useT } from '../../../components/UI';
import { styles } from '../sleepStyles';

/**
 * Props for the {@link SleepGratitudePage} component.
 *
 * @property quality - Current sleep quality rating (1-5 stars). 0 means
 *   not yet rated.
 * @property setQuality - Setter to update the quality rating.
 * @property gratitude - Array of gratitude text strings. Each element
 *   corresponds to one gratitude input field.
 * @property setGratitude - Setter to replace the entire gratitude array
 *   (used when editing or appending entries).
 * @property noteText - Free-form note / reflection text for the session.
 * @property setNoteText - Setter to update the note text.
 * @property onFinish - Callback invoked when the user taps the close (X)
 *   button to exit the gratitude phase without saving.
 * @property onSave - Callback invoked when the user taps the "Done"
 *   button to persist the gratitude data and complete the session.
 */
interface Props {
  quality: number;
  setQuality: (n: number) => void;
  gratitude: string[];
  setGratitude: (g: string[]) => void;
  noteText: string;
  setNoteText: (v: string) => void;
  onFinish: () => void;
  onSave: () => void;
}

/**
 * Sleep Gratitude page component.
 *
 * Renders the post-barrier gratitude and reflection form, which includes:
 *
 * - A **sleep quality** star rating (1-5) that the user taps to evaluate
 *   how well they slept.
 * - A dynamic list of **gratitude text inputs** where the user can type
 *   things they are grateful for, with an "add more" button to append
 *   additional fields.
 * - An optional **note / reflection** multi-line text input for capturing
 *   daily insights.
 * - A **save** button (disabled until a quality rating is selected) that
 *   fires `onSave`.
 * - A close (X) button in the header that fires `onFinish` to exit
 *   without saving.
 *
 * The save button is visually dimmed when `quality` is 0 (not yet rated).
 *
 * @param props - {@link Props}
 * @returns A `SafeAreaView` containing the gratitude form layout, themed
 *   with the current app theme via `useTheme()`.
 */
export default function SleepGratitudePage(props: Props) {
  const { quality, setQuality, gratitude, setGratitude, noteText, setNoteText, onFinish, onSave } = props;
  const TH = useTheme();
  const T = useT();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={styles.prepHeader}>
        <Text style={[styles.prepTitle, { color: TH.text }]}>{T('sleepStep2')}</Text>
        <TouchableOpacity onPress={onFinish}>
          <X size={22} color={TH.sub} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Quality Rating */}
        <Text style={[styles.qualityLabel, { color: TH.text }]}>{T('sleepHowWasSleep')}</Text>
        <View style={styles.qualityRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setQuality(i)}>
              <Star
                size={36}
                color={i <= quality ? '#F59E0B' : `${TH.sub}40`}
                fill={i <= quality ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Dynamic Gratitude */}
        <Text style={[styles.gratitudeTitle, { color: TH.text }]}>{T('sleepGratitude')}</Text>
        {gratitude.map((g, i) => (
          <TextInput
            key={i}
            value={g}
            onChangeText={v => { const arr = [...gratitude]; arr[i] = v; setGratitude(arr); }}
            placeholder={`${T('sleepGratitudePlaceholder')}${i + 1}`}
            placeholderTextColor={TH.sub}
            style={[styles.gratitudeInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
          />
        ))}
        <TouchableOpacity onPress={() => setGratitude([...gratitude, ''])}>
          <Text style={[styles.addGratitudeBtn, { color: TH.primary }]}>{T('sleepAddMore')}</Text>
        </TouchableOpacity>

        {/* Note */}
        <Text style={[styles.noteLabel, { color: TH.text }]}>{T('sleepTodayNote')}</Text>
        <TextInput
          value={noteText}
          onChangeText={setNoteText}
          placeholder={T('sleepTodayNotePlaceholder')}
          placeholderTextColor={TH.sub}
          multiline
          style={[styles.noteInput, { color: TH.text, borderColor: TH.border, backgroundColor: TH.card }]}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: quality > 0 ? TH.primary : `${TH.primary}50` }]}
          onPress={onSave}
          disabled={quality === 0}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{T('commonDone')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
