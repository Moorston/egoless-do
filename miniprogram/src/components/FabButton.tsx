import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useRef, useCallback } from 'react';
import { getPrimaryColor } from '../utils/theme';

export default function FabButton() {
  const P = getPrimaryColor();
  const [pos, setPos] = useState({ x: 630, y: 1100 });
  const startRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const onTouchStart = useCallback((e: any) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    movedRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: any) => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startRef.current.x);
    const dy = Math.abs(t.clientY - startRef.current.y);
    if (dx > 5 || dy > 5) {
      movedRef.current = true;
      setPos({ x: t.clientX - 26, y: t.clientY - 26 });
    }
  }, []);

  const onTap = useCallback(() => {
    if (movedRef.current) return;
    Taro.navigateTo({ url: '/pages/reflections/index?showNew=true' });
  }, []);

  return (
    <View
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onClick={onTap}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '104rpx',
        height: '104rpx',
        borderRadius: '52rpx',
        background: `linear-gradient(135deg,${P}99,${P})`,
        boxShadow: `0 8rpx 40rpx ${P}80`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <Text style={{ color: '#fff', fontSize: '48rpx' }}>✦</Text>
    </View>
  );
}
