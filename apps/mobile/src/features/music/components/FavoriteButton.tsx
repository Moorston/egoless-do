import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme } from '../../../components/UI';

interface Props {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

export default function FavoriteButton({ isFavorite, onToggle, size = 20 }: Props) {
  const TH = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    // Heartbeat animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onToggle();
  }, [onToggle, scale]);

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart
          size={size}
          color={isFavorite ? '#ec4899' : TH.sub}
          fill={isFavorite ? '#ec4899' : 'transparent'}
          strokeWidth={isFavorite ? 2 : 1.5}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
