import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../utils/store';
import { useT } from '../../utils/i18n';
import { fmtMS, MEDITATION_DURATIONS_MIN, MED_SOUNDS, COLORS } from '../../core';
import { getPrimaryColor } from '../../utils/theme';
import FabButton from '../../components/FabButton';

// Remote audio URLs (miniprogram can't bundle large files locally)
const SOUND_URLS: Record<string, string> = {
  '海潮': 'https://egoless-do.app/sounds/ocean.mp3',
  '雨声': 'https://egoless-do.app/sounds/rain.mp3',
  '钵声': 'https://egoless-do.app/sounds/bowl.mp3',
  '鸟叫': 'https://egoless-do.app/sounds/birds.mp3',
  '流水': 'https://egoless-do.app/sounds/flowing-stream.mp3',
  '风铃': 'https://egoless-do.app/sounds/wind-chimes.mp3',
};
const BELL_URL = 'https://egoless-do.app/sounds/temple_bell.mp3';

export default function MeditationPage() {
  const P = getPrimaryColor();
  const store = useStore();
  const T = useT();
  const [durMin, setDurMin] = useState(10);
  const [sec, setSec] = useState(0);
  const [active, setActive] = useState(false);
  const [sound, setSound] = useState('海潮');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const bgAudioRef = useRef<Taro.InnerAudioContext | null>(null);
  const bellAudioRef = useRef<Taro.InnerAudioContext | null>(null);
  const targetSec = durMin * 60;
  const remaining = targetSec - sec;

  // Init audio contexts
  useEffect(() => {
    const bg = Taro.createInnerAudioContext();
    bg.loop = true;
    bgAudioRef.current = bg;

    const bell = Taro.createInnerAudioContext();
    bell.loop = false;
    bellAudioRef.current = bell;

    return () => {
      bg.destroy();
      bell.destroy();
    };
  }, []);

  const playBgSound = (name: string) => {
    const url = SOUND_URLS[name];
    if (!url || !bgAudioRef.current) return;
    bgAudioRef.current.stop();
    bgAudioRef.current.src = url;
    bgAudioRef.current.play();
  };

  const stopBgSound = () => {
    if (bgAudioRef.current) {
      bgAudioRef.current.stop();
    }
  };

  const playBell = () => {
    if (!bellAudioRef.current) return;
    bellAudioRef.current.stop();
    bellAudioRef.current.src = BELL_URL;
    bellAudioRef.current.play();
  };

  useEffect(() => {
    if (active) {
      completedRef.current = false;
      if (sound !== '无') playBgSound(sound);
      timerRef.current = setInterval(() => {
        setSec(s => {
          if (s + 1 >= targetSec) {
            if (timerRef.current) clearInterval(timerRef.current);
            setActive(false);
            if (!completedRef.current) { completedRef.current = true; store.addMedMinutes(durMin); }
            stopBgSound();
            playBell();
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, targetSec]);

  const handleStop = () => {
    if (active && !completedRef.current) {
      completedRef.current = true;
      const elapsedMin = Math.round((sec) / 60);
      if (elapsedMin > 0) store.addMedMinutes(elapsedMin);
    }
    setActive(false);
    stopBgSound();
    playBell();
  };

  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#0F0A1E', padding: '32rpx' }}>
      <Text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold', display: 'block', marginBottom: '8rpx' }}>{T('meditation')}</Text>
      <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginBottom: '32rpx' }}>{T('accMed')} {store.totalMedMinutes} {T('medMinutes')}</Text>

      {/* Accumulated */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '40rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        <Text style={{ fontSize: '72rpx', fontWeight: '800', color: P, display: 'block', textAlign: 'center' }}>{store.totalMedMinutes}</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', textAlign: 'center' }}>{T('accMed')}</Text>
      </View>

      {/* Main card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '48rpx 32rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        {active ? (
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View style={{ background: `${P}18`, borderRadius: '40rpx', padding: '56rpx 40rpx', marginBottom: '40rpx', width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: '100rpx', fontWeight: '800', color: P, letterSpacing: '4rpx', display: 'block', textAlign: 'center' }}>
                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx', display: 'block', marginTop: '12rpx', textAlign: 'center' }}>
                {T('medActive')} {sound !== '无' ? `🎵 ${sound}` : ''}
              </Text>
            </View>
            <View onClick={handleStop} style={{ background: COLORS.RED, borderRadius: '24rpx', padding: '24rpx 96rpx' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('stopMed')}</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Sound selector */}
            <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingVertical: '20rpx', borderBottom: '1rpx solid rgba(255,255,255,.09)', marginBottom: '24rpx', width: '100%' }}>
              <Text style={{ fontSize: '40rpx', color: 'rgba(255,255,255,.45)' }}>{T('bgMusic')}</Text>
              <Text style={{ color: P, fontSize: '40rpx' }}>🎵 {sound} ›</Text>
            </View>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginBottom: '28rpx' }}>
              {MED_SOUNDS.map(s => (
                <View key={s} onClick={() => setSound(s)} style={{ padding: '12rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${sound === s ? P : 'rgba(255,255,255,.2)'}`, background: sound === s ? `${P}30` : 'transparent' }}>
                  <Text style={{ color: sound === s ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{s}</Text>
                </View>
              ))}
            </View>

            {/* Duration selector */}
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '12rpx', marginBottom: '32rpx' }}>
              {MEDITATION_DURATIONS_MIN.map(d => (
                <View key={d} onClick={() => { setDurMin(d); setSec(0); setActive(false); }} style={{ padding: '12rpx 24rpx', borderRadius: '40rpx', border: `2rpx solid ${durMin === d ? P : 'rgba(255,255,255,.2)'}`, background: durMin === d ? `${P}30` : 'transparent' }}>
                  <Text style={{ color: durMin === d ? '#fff' : 'rgba(255,255,255,.5)', fontSize: '40rpx' }}>{d}{T('medMinutes')}</Text>
                </View>
              ))}
            </View>

            <View onClick={() => { setSec(0); setActive(true); }} style={{ width: '100%', background: COLORS.GREEN, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('startMed')}</Text>
            </View>
          </>
        )}
      </View>

      {/* Today card */}
      <View style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', padding: '32rpx', marginBottom: '24rpx' }}>
        <View style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: '40rpx' }}>{T('medTitle')}</Text>
          <Text style={{ color: P, fontWeight: '600', fontSize: '40rpx' }}>{store.totalMedMinutes} {T('medMinutes')}</Text>
        </View>
      </View>

      {/* Global meditators */}
      <View onClick={() => Taro.navigateTo({ url: '/pages/home/globalmap' })}
        style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', display: 'flex', alignItems: 'center', gap: '16rpx', padding: '24rpx', marginBottom: '24rpx' }}>
        <Text style={{ fontSize: '40rpx' }}>🌍</Text>
        <Text style={{ color: '#fff', fontSize: '40rpx', flex: 1 }}>{T('globalMeditators')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>›</Text>
      </View>

      {/* History entry */}
      <View onClick={() => Taro.navigateTo({ url: '/pages/meditation/history' })}
        style={{ background: 'rgba(255,255,255,.07)', border: '1rpx solid rgba(255,255,255,.09)', borderRadius: '32rpx', display: 'flex', alignItems: 'center', gap: '16rpx', padding: '24rpx', marginBottom: '24rpx' }}>
        <Text style={{ fontSize: '40rpx' }}>☯</Text>
        <Text style={{ color: '#fff', fontSize: '40rpx', flex: 1 }}>{T('meditationHistory')}</Text>
        <Text style={{ color: 'rgba(255,255,255,.45)', fontSize: '40rpx' }}>›</Text>
      </View>

      {/* Share */}
      <View style={{ background: P, borderRadius: '24rpx', padding: '28rpx', alignItems: 'center', marginBottom: '24rpx' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: '40rpx', textAlign: 'center', display: 'block' }}>{T('shareMed')}</Text>
      </View>

      <Text style={{ textAlign: 'center', fontSize: '40rpx', color: 'rgba(255,255,255,.35)', display: 'block' }}>{T('medAttribution')}</Text>
    </ScrollView>
    <FabButton />
  );
}
