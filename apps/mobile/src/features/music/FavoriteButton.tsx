import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTheme } from '../../components/UI';

interface Props {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

export default function FavoriteButton({ isFavorite, onToggle, size = 20 }: Props) {
  const TH = useTheme();
  return (
    <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Heart
        size={size}
        color={isFavorite ? '#ec4899' : TH.sub}
        fill={isFavorite ? '#ec4899' : 'transparent'}
        strokeWidth={isFavorite ? 2 : 1.5}
      />
    </TouchableOpacity>
  );
}
