import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useAppStore, THEMES, t, ALL_SPORTS, SPORT_BG_COLORS, SPORT_GROUPS } from '@egoless/core';
import { Card, Btn, Modal } from '../../components/helpers';

export default function Exercise() {
  const themeName = useAppStore((s) => s.themeName);
  const TH = THEMES[themeName];
  const lang = useAppStore((s) => s.lang);
  const T = (k: string) => t(k, lang);

  const [showSports, setShowSports] = useState(false);
  const [prepSport, setPrepSport] = useState<any>(null);
  const [active, setActive] = useState(false);
  const [sec, setSec] = useState(0);
  const timerRef = useRef<any>(null);

  const gpsSports = new Set(['行走', '跑步', '骑行']);

  useEffect(() => {
    if (active) {
      timerRef.current = setInterval(() => setSec((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [active]);

  function handleSportSelect(sport: any) {
    setPrepSport(sport);
    setShowSports(false);
  }

  function handleGo() {
    setSec(0);
    setActive(true);
  }

  function handleBack() {
    setActive(false);
    setPrepSport(null);
    setSec(0);
  }

  const mainSports = ALL_SPORTS.slice(0, 3);
  const otherSports = ALL_SPORTS.slice(3);

  if (active && prepSport) {
    const bg = SPORT_BG_COLORS[prepSport.key] || '#4CAF50';
    return (
      <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: '#2a2835' } as any}>
        <Card style={{ textAlign: 'center', padding: 32, background: bg + '22' }}>
          <Text style={{ fontSize: 72, display: 'block' }}>{prepSport.icon}</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 8, display: 'block' }}>
            {String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 4, display: 'block' }}>{prepSport.key}</Text>
        </Card>
        <View style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
          <View onClick={() => setActive(!active)}
            style={{ width: 64, height: 64, borderRadius: 32, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, color: '#333' }}>{active ? '⏸' : '▶'}</Text>
          </View>
          <View onClick={handleBack}
            style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 16, color: '#fff' }}>✕</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (prepSport) {
    const bg = SPORT_BG_COLORS[prepSport.key] || '#4CAF50';
    return (
      <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg } as any}>
        <View style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 18 }}>{prepSport.icon}</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text }}>{prepSport.key}</Text>
          <View onClick={handleBack} style={{ marginLeft: 'auto', padding: '4px 8px' }}>
            <Text style={{ fontSize: 18, color: TH.sub }}>✕</Text>
          </View>
        </View>
        <View style={{
          borderRadius: 16, height: 260, background: bg, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          position: 'relative', marginBottom: 14,
        }}>
          <Text style={{ fontSize: 72, position: 'relative', zIndex: 1 }}>{prepSport.icon}</Text>
          <View style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            background: 'rgba(255,255,255,.85)', borderRadius: 10, padding: '8px 10px',
          }}>
            <Text style={{ fontSize: 11, color: '#333', lineHeight: 1.5 }}>
              💡 {prepSport.key}运动数据将自动记录。请确保健康权限已开启，以获取更准确的数据。
            </Text>
          </View>
        </View>
        <Btn onClick={handleGo} style={{ background: bg, fontSize: 24, fontWeight: '900', height: 56, borderRadius: 28 }}>
          GO
        </Btn>
        <View onClick={handleBack} style={{ textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: TH.sub }}>← 返回</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ minHeight: '100vh', padding: '14px 16px', background: TH.bg } as any}>
      {/* Main Sports */}
      {mainSports.map((sport: any) => {
        const bg = SPORT_BG_COLORS[sport.key] || '#4CAF50';
        return (
          <Card key={sport.key} onClick={() => setPrepSport(sport)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              borderLeft: `3px solid ${bg}`,
            }}>
            <Text style={{ fontSize: 24 }}>{sport.icon}</Text>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: TH.text }}>{sport.key}</Text>
              <Text style={{ fontSize: 11, color: TH.sub }}>{gpsSports.has(sport.key) ? '🛰️ GPS 轨迹追踪' : '简单计时'}</Text>
            </View>
            <Text style={{ marginLeft: 'auto', fontSize: 12, color: TH.sub }}>{'>'}</Text>
          </Card>
        );
      })}

      {/* Other Sports */}
      <Card onClick={() => setShowSports(true)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <Text style={{ fontSize: 14, color: TH.text }}>🏋️ 其他运动</Text>
        <Text style={{ fontSize: 12, color: TH.sub }}>{'>'}</Text>
      </Card>

      {/* Other Sports Modal */}
      <Modal show={showSports} onClose={() => setShowSports(false)} title="🏋️ 选择运动">
        <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {otherSports.slice(0, 14).map((sport: any) => (
            <View key={sport.key} onClick={() => handleSportSelect(sport)}
              style={{
                padding: 12, borderRadius: 10, textAlign: 'center',
                background: 'rgba(255,255,255,.06)',
              }}>
              <Text style={{ fontSize: 24, display: 'block' }}>{sport.icon}</Text>
              <Text style={{ fontSize: 11, color: TH.sub, marginTop: 4, display: 'block' }}>{sport.key}</Text>
            </View>
          ))}
        </View>
      </Modal>
    </ScrollView>
  );
}
