import React from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import ReflectionDetailContent from './ReflectionDetailContent';

export default function ReflectionDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ReflectionDetail'>>();
  const nav = useNavigation();
  const { reflectionId } = route.params;

  return (
    <ReflectionDetailContent
      reflectionId={reflectionId}
      onClose={() => nav.goBack()}
    />
  );
}
