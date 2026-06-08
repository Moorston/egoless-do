import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useTheme, useT, PillSelector, PrimaryButton, ThemedInput } from '../../components/UI';
import { MIND_COLORS_EXTENDED, COLORS, FONT_BODY, FONT_LABEL } from '@egoless-do/core';

interface ReflectionFormProps {
  content: string;
  onContentChange: (text: string) => void;
  colorIdx: number;
  onColorIdxChange: (idx: number) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  mood: string;
  onMoodChange: (mood: string) => void;
  onSave: () => void;
  saveLabel: string;
  allTagOptions: string[];
  allMoodOptions: string[];
  dynamicTagCounts: Record<string, number>;
  onOpenTagManager: () => void;
  onOpenMoodManager: () => void;
}

export default function ReflectionForm({
  content,
  onContentChange,
  colorIdx,
  onColorIdxChange,
  tags,
  onTagsChange,
  mood,
  onMoodChange,
  onSave,
  saveLabel,
  allTagOptions,
  allMoodOptions,
  dynamicTagCounts,
  onOpenTagManager,
  onOpenMoodManager,
}: ReflectionFormProps) {
  const TH = useTheme();
  const T = useT();
  const P = TH.primary;

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* Card theme color */}
      <View style={styles.colorContainer}>
        {MIND_COLORS_EXTENDED.map((c, i) => {
          const isActive = colorIdx === i;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onColorIdxChange(i)}
              style={[
                styles.colorButton,
                {
                  width: isActive ? 36 : 32,
                  height: isActive ? 36 : 32,
                  backgroundColor: isActive ? c[0] : 'transparent',
                  padding: isActive ? 2 : 0,
                },
              ]}
            >
              <View
                style={[
                  styles.colorInner,
                  {
                    borderWidth: isActive ? 2 : 0,
                    borderColor: isActive ? '#fff' : 'transparent',
                  },
                ]}
              >
                <View style={[styles.colorBase, { backgroundColor: c[0] }]} />
                <View style={[styles.colorOverlay, { backgroundColor: c[1] }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content with 200-char limit */}
      <View style={styles.contentContainer}>
        <ThemedInput
          value={content}
          onChangeText={onContentChange}
          placeholder={T('reflPlaceholder')}
          multiline
          numberOfLines={4}
          style={styles.contentInput}
        />
        <Text
          style={[
            styles.charCount,
            { color: content.length > 200 ? COLORS.RED : TH.sub },
          ]}
        >
          {content.length}/200
        </Text>
      </View>

      {/* Tags */}
      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
        {T('reflAddTag')}
      </Text>
      <View style={styles.pillsRow}>
        <PillSelector
          options={allTagOptions}
          selected={tags}
          onChange={(t) =>
            onTagsChange(
              tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]
            )
          }
          counts={dynamicTagCounts}
          color={P}
          textActiveColor={P}
          trailing={
            <TouchableOpacity
              onPress={onOpenTagManager}
              style={[styles.managerButton, { borderColor: TH.border }]}
            >
              <Settings size={16} color={TH.sub} />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Mood */}
      <Text style={[styles.sectionLabel, { color: TH.sub }]}>
        {T('reflMood')}
      </Text>
      <View style={styles.pillsRow}>
        <PillSelector
          options={allMoodOptions}
          selected={mood ? [mood] : []}
          onChange={(m) => onMoodChange(mood === m ? '' : m)}
          color={P}
          textActiveColor={P}
          trailing={
            <TouchableOpacity
              onPress={onOpenMoodManager}
              style={[styles.managerButton, { borderColor: TH.border }]}
            >
              <Settings size={16} color={TH.sub} />
            </TouchableOpacity>
          }
        />
      </View>

      <PrimaryButton label={saveLabel} onPress={onSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 4,
  },
  colorButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  colorInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  colorBase: {
    flex: 1,
  },
  colorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  contentContainer: {
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 90,
  },
  charCount: {
    fontSize: FONT_BODY,
    textAlign: 'right',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: FONT_LABEL,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  managerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
