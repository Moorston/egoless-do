import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Vibration, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT, ScreenHeader } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, COLORS, dateStr, PRESET_MANTRAS, DEDICATION_TEMPLATES, SUTRA_CATEGORIES } from '@egoless-do/core';
import type { MantraDef, MantraCategory, MantraSession } from '@egoless-do/core';
import { useTabNavigation } from '../../navigation/hooks';
import { BookOpen, Timer, BarChart3, Plus, X, ChevronRight, RotateCcw, Play, Pause, Volume2, VolumeX } from 'lucide-react-native';

type SutraTab = 'library' | 'counter' | 'stats';

const TABS: { key: SutraTab; labelKey: string; icon: typeof BookOpen }[] = [
  { key: 'library', labelKey: 'sutraTabLibrary', icon: BookOpen },
  { key: 'counter', labelKey: 'sutraTabCounter', icon: Timer },
  { key: 'stats',   labelKey: 'sutraTabStats',   icon: BarChart3 },
];

const BEADS_PER_ROUND = 108;

export default function SutraScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useTabNavigation();
  const [activeTab, setActiveTab] = useState<SutraTab>('library');

  const { mantraDefs, mantraSessions, readingSessions, addMantraDef, addMantraSession, addReadingSession,
    getMantraTotalCount, getMantraStreak } = useAppStore(
    useShallow(s => ({
      mantraDefs: s.mantraDefs, mantraSessions: s.mantraSessions, readingSessions: s.readingSessions,
      addMantraDef: s.addMantraDef, addMantraSession: s.addMantraSession, addReadingSession: s.addReadingSession,
      getMantraTotalCount: s.getMantraTotalCount, getMantraStreak: s.getMantraStreak,
    }))
  );

  // ── 念诵状态 ──
  const [selectedMantra, setSelectedMantra] = useState<MantraDef | null>(null);
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [targetRounds, setTargetRounds] = useState(7);
  const [isCounting, setIsCounting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showDedication, setShowDedication] = useState(false);
  const [dedicationText, setDedicationText] = useState(DEDICATION_TEMPLATES[0]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [customTarget, setCustomTarget] = useState(108);
  const startTimeRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 阅读器状态 ──
  const [showReader, setShowReader] = useState(false);
  const [readerMantra, setReaderMantra] = useState<MantraDef | null>(null);
  const [fontSize, setFontSize] = useState(18);

  // 计时器
  useEffect(() => {
    if (isCounting && !isPaused) {
      if (startTimeRef.current === 0) startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCounting, isPaused]);

  // 念诵计数
  const handleCount = useCallback(() => {
    if (!isCounting) {
      setIsCounting(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
    }
    if (isPaused) return;
    const newCount = count + 1;
    setCount(newCount);
    Vibration.vibrate(10);
    if (newCount >= BEADS_PER_ROUND) {
      setCount(0);
      const newRounds = rounds + 1;
      setRounds(newRounds);
      if (newRounds >= targetRounds) {
        setIsCounting(false);
        setShowDedication(true);
      }
    }
  }, [count, rounds, targetRounds, isCounting, isPaused]);

  // 保存念诵
  const handleSaveChant = useCallback(() => {
    if (!selectedMantra) return;
    const now = Date.now();
    addMantraSession({
      mantraId: selectedMantra.id,
      date: dateStr(),
      count: rounds * BEADS_PER_ROUND + count,
      rounds,
      durationSec: elapsed,
      startedAt: startTimeRef.current,
      completedAt: now,
      targetRounds,
      dedication: dedicationText || undefined,
    });
    setCount(0); setRounds(0); setIsCounting(false); setElapsed(0);
    startTimeRef.current = 0; setShowDedication(false);
    setSelectedMantra(null);
  }, [selectedMantra, rounds, count, elapsed, targetRounds, dedicationText, addMantraSession]);

  // 活跃 mantra 列表
  const activeDefs = useMemo(() => (mantraDefs ?? []).filter(d => !d.deleted), [mantraDefs]);
  const presetDefs = useMemo(() => {
    const presetNames = PRESET_MANTRAS.map(p => p.name);
    return activeDefs.filter(d => presetNames.includes(d.name));
  }, [activeDefs]);
  const customDefs = useMemo(() => activeDefs.filter(d => d.category === 'custom'), [activeDefs]);

  // 初始化预设
  useEffect(() => {
    const existingNames = new Set(activeDefs.map(d => d.name));
    PRESET_MANTRAS.forEach(p => {
      if (!existingNames.has(p.name)) {
        addMantraDef({ name: p.name, subtitle: p.subtitle, category: 'dharani', fullText: p.fullText, pageCount: p.fullText ? Math.ceil(p.fullText.length / 200) : undefined });
      }
    });
  }, []);

  // 统计
  const totalCount = useMemo(() => mantraSessions.filter(s => !s.deleted).reduce((sum, s) => sum + s.count, 0), [mantraSessions]);
  const totalDuration = useMemo(() => mantraSessions.filter(s => !s.deleted).reduce((sum, s) => sum + s.durationSec, 0), [mantraSessions]);
  const uniqueDates = useMemo(() => new Set(mantraSessions.filter(s => !s.deleted).map(s => s.date)), [mantraSessions]);
  const streak = useMemo(() => {
    const dates = [...uniqueDates].sort().reverse();
    if (dates.length === 0) return 0;
    const today = dateStr();
    const yesterday = dateStr(new Date(Date.now() - 86400000));
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let s = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      if ((prev.getTime() - curr.getTime()) / 86400000 === 1) s++;
      else break;
    }
    return s;
  }, [uniqueDates]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── 经文库 Tab ──
  const renderLibrary = useCallback(() => (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{T('sutraCategoryDharani')}</Text>
        <TouchableOpacity onPress={() => setShowAddCustom(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Plus size={16} color={TH.primary} />
          <Text style={{ fontSize: FONT_SUB, color: TH.primary }}>{T('sutraAddCustom')}</Text>
        </TouchableOpacity>
      </View>
      {activeDefs.filter(d => d.category === 'dharani').map(d => {
        const total = getMantraTotalCount(d.id);
        const st = getMantraStreak(d.id);
        return (
          <TouchableOpacity key={d.id} onPress={() => { setSelectedMantra(d); setActiveTab('counter'); }}
            style={{ backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: TH.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>🔔 {d.name}</Text>
                {d.subtitle && <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{d.subtitle}</Text>}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: TH.sub }}>累计 {total.toLocaleString()} 遍</Text>
                  {st > 0 && <Text style={{ fontSize: 10, color: '#F59E0B' }}>连续 {st} 天</Text>}
                </View>
              </View>
              <ChevronRight size={16} color={TH.sub} />
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12, marginTop: 16 }}>{T('sutraCategorySutra')}</Text>
      {activeDefs.filter(d => d.category === 'sutra').map(d => {
        const total = getMantraTotalCount(d.id);
        const st = getMantraStreak(d.id);
        return (
          <TouchableOpacity key={d.id} onPress={() => {
            if (d.fullText) { setReaderMantra(d); setShowReader(true); }
            else { setSelectedMantra(d); setActiveTab('counter'); }
          }}
            style={{ backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: TH.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>📖 {d.name}</Text>
                {d.subtitle && <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{d.subtitle}</Text>}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: TH.sub }}>累计 {total.toLocaleString()} 遍</Text>
                  {d.pageCount && <Text style={{ fontSize: 10, color: TH.sub }}>{d.pageCount} 页</Text>}
                  {st > 0 && <Text style={{ fontSize: 10, color: '#F59E0B' }}>连续 {st} 天</Text>}
                </View>
              </View>
              <ChevronRight size={16} color={TH.sub} />
            </View>
          </TouchableOpacity>
        );
      })}

      {customDefs.length > 0 && (
        <>
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12, marginTop: 16 }}>{T('sutraCategoryCustom')}</Text>
          {customDefs.map(d => (
            <TouchableOpacity key={d.id} onPress={() => { setSelectedMantra(d); setActiveTab('counter'); }}
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>✏️ {d.name}</Text>
              {d.subtitle && <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 2 }}>{d.subtitle}</Text>}
              <Text style={{ fontSize: 10, color: TH.sub, marginTop: 4 }}>累计 {getMantraTotalCount(d.id).toLocaleString()} 遍</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  ), [activeDefs, customDefs, getMantraTotalCount, getMantraStreak, TH, T]);

  // ── 念诵计数器 Tab ──
  const renderCounter = useCallback(() => {
    if (!selectedMantra) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Timer size={48} color={TH.sub} />
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginTop: 16 }}>请从经文库选择经文开始念诵</Text>
          <TouchableOpacity onPress={() => setActiveTab('library')}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: TH.primary }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{T('sutraTabLibrary')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentBeadIndex = count;
    const progress = currentBeadIndex / BEADS_PER_ROUND;
    const beads = Array.from({ length: BEADS_PER_ROUND }, (_, i) => i);

    return (
      <View style={{ alignItems: 'center' }}>
        {/* 经文名 */}
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text, marginBottom: 4 }}>{selectedMantra.name}</Text>
        {selectedMantra.subtitle && <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 16 }}>{selectedMantra.subtitle}</Text>}

        {/* 佛珠环 */}
        <TouchableOpacity onPress={handleCount} activeOpacity={0.8}
          style={{ width: 280, height: 280, position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {beads.map((i) => {
            const angle = (i / BEADS_PER_ROUND) * 360 - 90;
            const radius = 120;
            const x = 140 + radius * Math.cos(angle * Math.PI / 180);
            const y = 140 + radius * Math.sin(angle * Math.PI / 180);
            const isPassed = i < currentBeadIndex;
            const isCurrent = i === currentBeadIndex;
            const beadSize = isCurrent ? 12 : 8;
            return (
              <View key={i} style={{
                position: 'absolute', left: x - beadSize / 2, top: y - beadSize / 2,
                width: beadSize, height: beadSize, borderRadius: beadSize / 2,
                backgroundColor: isPassed ? '#D4A574' : isCurrent ? '#F59E0B' : `${TH.primary}25`,
                ...(isCurrent ? { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 } : {}),
              }} />
            );
          })}
          {/* 中心计数 */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: TH.primary }}>{rounds}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraRound')}</Text>
          </View>
        </TouchableOpacity>

        {/* 统计信息 */}
        <View style={{ flexDirection: 'row', gap: 24, marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: TH.text }}>{rounds * BEADS_PER_ROUND + count}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraCount')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: TH.text }}>{formatTime(elapsed)}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>时长</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: TH.text }}>{rounds}/{targetRounds}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraRound')}</Text>
          </View>
        </View>

        {/* 控制按钮 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {!isCounting ? (
            <TouchableOpacity onPress={handleCount}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: TH.primary }}>
              <Play size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700' }}>{T('sutraStartChant')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={() => setIsPaused(!isPaused)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: isPaused ? TH.primary : TH.card, borderWidth: isPaused ? 0 : 1, borderColor: TH.border }}>
                {isPaused ? <Play size={18} color="#fff" /> : <Pause size={18} color={TH.text} />}
                <Text style={{ color: isPaused ? '#fff' : TH.text, fontWeight: '700' }}>{isPaused ? T('sutraResume') : T('sutraPause')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsCounting(false); setIsPaused(false); setCount(0); setRounds(0); setElapsed(0); startTimeRef.current = 0; }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444450' }}>
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>{T('sutraStop')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 目标轮次设置 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('sutraTargetRounds')}:</Text>
          {[1, 3, 7, 10].map(n => (
            <TouchableOpacity key={n} onPress={() => setTargetRounds(n)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: targetRounds === n ? TH.primary : TH.card, borderWidth: targetRounds === n ? 0 : 1, borderColor: TH.border }}>
              <Text style={{ color: targetRounds === n ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_SUB }}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 提示 */}
        <Text style={{ fontSize: 10, color: TH.sub, marginTop: 16, textAlign: 'center' }}>点击佛珠环念诵计数 · 每108遍为一轮</Text>
      </View>
    );
  }, [selectedMantra, count, rounds, targetRounds, isCounting, isPaused, elapsed, handleCount, TH, T]);

  // ── 统计 Tab ──
  const renderStats = useCallback(() => {
    const recentSessions = mantraSessions.filter(s => !s.deleted).sort((a, b) => b.completedAt - a.completedAt).slice(0, 20);
    // 日历热力图数据
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const monthDates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      return dateStr(d);
    });

    return (
      <View>
        {/* 总览 */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[
            { label: T('sutraTotalChants'), value: totalCount.toLocaleString(), color: '#8B5CF6' },
            { label: T('sutraTotalDuration'), value: formatTime(totalDuration), color: '#10B981' },
            { label: T('sutraStreak'), value: `${streak}天`, color: '#F59E0B' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: TH.sub, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 本月热力图 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>本月念诵热力图</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: firstDay }, (_, i) => <View key={`empty-${i}`} style={{ width: 32, height: 32 }} />)}
            {monthDates.map(d => {
              const hasSession = uniqueDates.has(d);
              const dayNum = new Date(d).getDate();
              return (
                <View key={d} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 4,
                    backgroundColor: hasSession ? '#8B5CF6' : `${TH.primary}15`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, color: hasSession ? '#fff' : TH.sub }}>{dayNum}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#8B5CF6' }} />
              <Text style={{ fontSize: 10, color: TH.sub }}>已念诵</Text>
            </View>
            <Text style={{ fontSize: 10, color: TH.sub }}>本月 {uniqueDates.size} 天</Text>
          </View>
        </View>

        {/* 各经文分布 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>经文念诵分布</Text>
          {activeDefs.map(d => {
            const total = getMantraTotalCount(d.id);
            if (total === 0) return null;
            const pct = totalCount > 0 ? Math.round(total / totalCount * 100) : 0;
            return (
              <View key={d.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text }}>{d.name}</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{pct}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: `${TH.primary}15`, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 }} />
                </View>
              </View>
            );
          })}
        </View>

        {/* 历史记录 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>{T('sutraHistory')}</Text>
          {recentSessions.length === 0 ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>{T('sutraNoRecords')}</Text>
          ) : (
            recentSessions.map(s => {
              const mantra = activeDefs.find(d => d.id === s.mantraId);
              return (
                <View key={s.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600' }}>{mantra?.name ?? '未知'}</Text>
                    <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{s.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Text style={{ fontSize: 10, color: TH.sub }}>{s.count}遍 · {s.rounds}轮</Text>
                    <Text style={{ fontSize: 10, color: TH.sub }}>{formatTime(s.durationSec)}</Text>
                    {s.dedication && <Text style={{ fontSize: 10, color: '#8B5CF6' }}>回向</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  }, [totalCount, totalDuration, streak, uniqueDates, mantraSessions, activeDefs, getMantraTotalCount, TH, T]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScreenHeader title={T('sutraTitle')} onBack={() => nav.goBack()} />

      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 6 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                paddingVertical: 10, borderRadius: 12,
                backgroundColor: isActive ? '#D4A574' : TH.card,
                borderWidth: isActive ? 0 : 1, borderColor: TH.border,
              }}>
              <Icon size={14} color={isActive ? '#fff' : TH.sub} />
              <Text style={{ fontSize: FONT_SUB, fontWeight: isActive ? '700' : '400', color: isActive ? '#fff' : TH.sub }}>
                {T(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'counter' && renderCounter()}
        {activeTab === 'stats' && renderStats()}
      </ScrollView>

      {/* ── 回向面板 ── */}
      <Modal visible={showDedication} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>🙏 {T('sutraComplete')}</Text>
              <TouchableOpacity onPress={() => setShowDedication(false)}><X size={22} color={TH.sub} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>
              {selectedMantra?.name} × {rounds * BEADS_PER_ROUND + count} 遍 · {formatTime(elapsed)}
            </Text>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '600', color: TH.text, marginBottom: 8 }}>{T('sutraDedication')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {DEDICATION_TEMPLATES.map((tmpl, i) => (
                <TouchableOpacity key={i} onPress={() => setDedicationText(tmpl)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: dedicationText === tmpl ? '#D4A574' : TH.card, borderWidth: dedicationText === tmpl ? 0 : 1, borderColor: TH.border }}>
                  <Text style={{ fontSize: 10, color: dedicationText === tmpl ? '#fff' : TH.sub }}>
                    {i === 0 ? T('sutraDedicationAll') : i === 1 ? T('sutraDedicationFamily') : i === 2 ? '自利利他' : '法界有情'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={dedicationText} onChangeText={setDedicationText} multiline
              placeholderTextColor={TH.sub}
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: TH.border, marginBottom: 16 }} />
            <TouchableOpacity onPress={handleSaveChant}
              style={{ backgroundColor: '#D4A574', borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('sutraSaveComplete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 添加自定义弹窗 ── */}
      <Modal visible={showAddCustom} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>{T('sutraCustomMantra')}</Text>
              <TouchableOpacity onPress={() => setShowAddCustom(false)}><X size={22} color={TH.sub} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraCustomMantraName')}</Text>
            <TextInput value={customName} onChangeText={setCustomName} placeholder="例如：药师咒" placeholderTextColor={TH.sub}
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }} />
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraCustomMantraSubtitle')}</Text>
            <TextInput value={customSubtitle} onChangeText={setCustomSubtitle} placeholder="副标题（可选）" placeholderTextColor={TH.sub}
              style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, marginBottom: 12 }} />
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('sutraCustomMantraTarget')}: {customTarget}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[108, 216, 540, 1080].map(n => (
                <TouchableOpacity key={n} onPress={() => setCustomTarget(n)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: customTarget === n ? '#D4A574' : TH.card, borderWidth: customTarget === n ? 0 : 1, borderColor: TH.border }}>
                  <Text style={{ color: customTarget === n ? '#fff' : TH.text, fontWeight: '600' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => {
              if (!customName.trim()) return;
              addMantraDef({ name: customName.trim(), subtitle: customSubtitle.trim() || undefined, category: 'custom', targetCount: customTarget });
              setShowAddCustom(false); setCustomName(''); setCustomSubtitle('');
            }} disabled={!customName.trim()}
              style={{ backgroundColor: '#D4A574', borderRadius: 12, padding: 14, alignItems: 'center', opacity: customName.trim() ? 1 : 0.5 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{T('sutraAddCustom')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 经文阅读弹窗 ── */}
      <Modal visible={showReader} transparent animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <TouchableOpacity onPress={() => setShowReader(false)}>
              <X size={24} color={TH.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>{readerMantra?.name}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setFontSize(Math.max(14, fontSize - 2))}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: TH.primary }}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFontSize(Math.min(28, fontSize + 2))}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: TH.primary }}>A+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <Text style={{ fontSize: fontSize + 4, fontWeight: '700', color: TH.text, textAlign: 'center', marginBottom: 24 }}>
              {readerMantra?.subtitle}
            </Text>
            <Text style={{ fontSize, lineHeight: fontSize * 1.8, color: TH.text, fontFamily: Platform.select({ ios: 'STSong', android: 'serif' }) as string }}>
              {readerMantra?.fullText}
            </Text>
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: TH.border, backgroundColor: TH.cardSolid }}>
            <TouchableOpacity onPress={() => { setShowReader(false); setSelectedMantra(readerMantra); setActiveTab('counter'); }}
              style={{ backgroundColor: '#D4A574', borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{T('sutraStartChant')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
