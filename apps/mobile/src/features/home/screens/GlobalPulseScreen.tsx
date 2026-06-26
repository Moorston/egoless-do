import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigation } from '../../../navigation/hooks';
import { useTheme } from '../../../components/UI';
import { GlobalPulseMap } from '../global-pulse';

interface GlobalPulseScreenProps {
  route?: {
    params?: {
      icon?: string;
      title?: string;
      type?: 'exercise' | 'fasting' | 'meditation';
    };
  };
}

export default function GlobalPulseScreen({ route }: GlobalPulseScreenProps) {
  const nav = useRootNavigation();
  const TH = useTheme();
  const filterType = route?.params?.type;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: TH.bg }]}>
      <GlobalPulseMap
        type={filterType}
        title={route?.params?.title}
        showInlineLeaderboard={true}
        onClose={() => nav.goBack()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
