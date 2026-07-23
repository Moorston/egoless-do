import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_BUTTON, EXERCISE_CATEGORIES, buildExerciseLibrary, type ExerciseDef, type Theme } from '@egoless-do/core';
import { X, Search } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert } , KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (sportKey: string, exercises?: ExerciseDef[]) => void;
  TH: Theme;
  T: (key: string) => string;
}

const QUICK_OPTIONS = [
  { key: 'cardio', icon: '🏃', i18nKey: 'bodyPartCardio' },
  { key: 'upper_body', icon: '💪', i18nKey: 'bodyPartUpperBody' },
  { key: 'lower_body', icon: '🦵', i18nKey: 'bodyPartLowerBody' },
  { key: 'core', icon: '🧱', i18nKey: 'bodyPartCore' },
  { key: 'flexibility', icon: '🧘', i18nKey: 'bodyPartFlexibility' },
  { key: 'rest', icon: '😴', i18nKey: 'bodyDayRest' },
] as const;

export default function QuickSwapModal({ visible, onClose, onConfirm, TH, T }: Props) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [search, setSearch] = useState('');
  const exerciseLibrary = useMemo(() => buildExerciseLibrary(), []);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) return exerciseLibrary;
    const q = search.trim().toLowerCase();
    return exerciseLibrary.filter(ex =>
      ex.nameZh.toLowerCase().includes(q) ||
      ex.muscleGroups.some(m => m.toLowerCase().includes(q))
    );
  }, [exerciseLibrary, search]);

  const handleQuickSelect = (key: string) => {
    if (key === 'rest') {
      onConfirm('rest');
    } else {
      onConfirm(key);
    }
    onClose();
  };

  const handleExerciseSelect = (ex: ExerciseDef) => {
    onConfirm(ex.category, [ex]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: TH.border }}>
            <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: TH.text }}>{T('bodySwapExercise')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={TH.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 500 }}>
            {!showLibrary ? (
              <>
                {/* Quick options */}
                <View style={{ padding: 20 }}>
                  <Text style={{ fontSize: FONT_SUB(), fontWeight: '600', color: TH.sub, marginBottom: 12 }}>{T('bodyQuickSelect')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {QUICK_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => handleQuickSelect(opt.key)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: TH.border + '60', minWidth: '45%' }}
                      >
                        <Text style={{ fontSize: 20 }}>{opt.icon}</Text>
                        <Text style={{ fontSize: FONT_BODY(), color: TH.text, fontWeight: '600' }}>{T(opt.i18nKey)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Library button */}
                <TouchableOpacity
                  onPress={() => setShowLibrary(true)}
                  style={{ marginHorizontal: 20, marginBottom: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b40', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: FONT_BODY(), color: '#f59e0b', fontWeight: '600' }}>{T('bodyFromLibrary')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Search */}
                <View style={{ flexDirection: 'row', alignItems: 'center', margin: 20, marginBottom: 0, backgroundColor: TH.border + '40', borderRadius: 10, paddingHorizontal: 12 }}>
                  <Search size={16} color={TH.sub} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={T('bodySearchExercise')}
                    placeholderTextColor={TH.sub}
                    style={{ flex: 1, paddingVertical: 10, marginLeft: 8, color: TH.text, fontSize: FONT_BODY() }}
                  />
                </View>

                {/* Exercise list */}
                <ScrollView style={{ maxHeight: 400, padding: 20 }}>
                  {filteredExercises.map(ex => (
                    <TouchableOpacity
                      key={ex.id}
                      onPress={() => handleExerciseSelect(ex)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: TH.border }}
                    >
                      <Text style={{ fontSize: 20 }}>{ex.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{ex.nameZh}</Text>
                        <Text style={{ fontSize: FONT_SMALL(), color: TH.sub }}>{ex.muscleGroups.join(', ')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Back button */}
                <TouchableOpacity
                  onPress={() => { setShowLibrary(false); setSearch(''); }}
                  style={{ margin: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: TH.border + '60', alignItems: 'center' }}
                >
                  <Text style={{ fontSize: FONT_BODY(), color: TH.text }}>{T('bodyBack')}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
              </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
