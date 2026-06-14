import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { useTheme } from '../../components/UI';

interface AddReflectionFABProps {
  onWriteNote: () => void;
}

export function AddReflectionFAB({ onWriteNote }: AddReflectionFABProps) {
  const TH = useTheme();
  const P = TH.primary;

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: P }]}
      onPress={onWriteNote}
      activeOpacity={0.8}
    >
      <Pencil size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
