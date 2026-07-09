import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type MobileStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_STAT_CARD, FONT_STAT_SECTION, COLORS, dateStr } from '@egoless-do/core';
import type { FearEntry, FearClassification, FearCategory, BodyRegion, BodyShape, BodyTemp, FeelingTag, AchievementType, CourageEntry, FearAchievement } from '@egoless-do/core';
import { FEAR_CATEGORY_DEFS, BODY_REGION_DEFS, ACHIEVEMENT_DEFS } from '@egoless-do/core';
import { useTabNavigation } from '../../navigation/hooks';
import SimpleHeader from '../../navigation/SimpleHeader';
import { Shield, Zap, Lightbulb, Plus, ChevronRight, X, Check } from 'lucide-react-native';

type MindTab = 'fear' | 'courage' | 'insight';

const TABS: { key: MindTab; labelKey: string; icon: typeof Shield }[] = [
  { key: 'fear',    labelKey: 'mindTabFear',    icon: Shield },
  { key: 'courage', labelKey: 'mindTabCourage', icon: Zap },
  { key: 'insight', labelKey: 'mindTabInsight', icon: Lightbulb },
];

const CLASSIFICATION_COLORS: Record<FearClassification, string> = {
  rational: '#3B82F6', irrational: '#EF4444', mixed: '#F59E0B',
};
const CLASSIFICATION_LABELS: Record<FearClassification, string> = {
  rational: 'mindClassificationRational', irrational: 'mindClassificationIrrational', mixed: 'mindClassificationMixed',
};

const BODY_REGION_POSITIONS: Record<BodyRegion, { x: number; y: number }> = {
  head: { x: 50, y: 8 }, throat: { x: 50, y: 18 }, chest: { x: 50, y: 30 },
  stomach: { x: 50, y: 42 }, pelvis: { x: 50, y: 52 }, back: { x: 50, y: 36 },
  shoulders: { x: 50, y: 22 }, hands: { x: 25, y: 45 }, legs: { x: 50, y: 68 }, feet: { x: 50, y: 88 },
};

const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  tight: 'mindBodyTight', heavy: 'mindBodyHeavy', tremble: 'mindBodyTremble', hollow: 'mindBodyHollow',
  burning: 'mindBodyBurning', ache: 'mindBodyAche', block: 'mindBodyBlock',
};
const BODY_TEMP_LABELS: Record<BodyTemp, string> = { cold: 'mindBodyCold', hot: 'mindBodyHot', neutral: 'mindBodyNeutral' };

const FEELING_TAGS: FeelingTag[] = ['relief', 'pride', 'calm', 'still_scared', 'surprise', 'exhausted'];
const FEELING_LABELS: Record<FeelingTag, string> = {
  relief: 'mindFeelingRelief', pride: 'mindFeelingPride', calm: 'mindFeelingCalm',
  still_scared: 'mindFeelingStillScared', surprise: 'mindFeelingSurprise', exhausted: 'mindFeelingExhausted',
};
const CATEGORY_LABELS: Record<FearCategory, string> = {
  social: 'mindCategorySocial', loss: 'mindCategoryLoss', health: 'mindCategoryHealth',
  attachment: 'mindCategoryAttachment', failure: 'mindCategoryFailure', unknown: 'mindCategoryUnknown',
};

export default function MindScreen() {
  const TH = useTheme();
  const T = useT();
  const nav = useTabNavigation();
  const [activeTab, setActiveTab] = useState<MindTab>('fear');

  const { fearEntries, courageEntries, achievements, addFearEntry, updateFearEntry, addCourageEntry,
    getFearStats, getCourageStreak, getBodyHeatmap, getDominantFearType, getFearTimeDistribution,
    getCourageTrend, getCrossModuleInsights } = useAppStore(
    useShallow((s: MobileStore) => ({
      fearEntries: s.fearEntries, courageEntries: s.courageEntries, achievements: s.achievements,
      addFearEntry: s.addFearEntry, updateFearEntry: s.updateFearEntry, addCourageEntry: s.addCourageEntry,
      getFearStats: s.getFearStats, getCourageStreak: s.getCourageStreak, getBodyHeatmap: s.getBodyHeatmap,
      getDominantFearType: s.getDominantFearType, getFearTimeDistribution: s.getFearTimeDistribution,
      getCourageTrend: s.getCourageTrend, getCrossModuleInsights: s.getCrossModuleInsights,
    }))
  );

  // ── 新增恐惧弹窗状态 ──
  const [showAddFear, setShowAddFear] = useState(false);
  const [fearStep, setFearStep] = useState(0); // 0=content, 1=classify, 2=done
  const [fearContent, setFearContent] = useState('');
  const [fearTrigger, setFearTrigger] = useState('');
  const [fearCategory, setFearCategory] = useState<FearCategory>('unknown');
  const [classifyA1, setClassifyA1] = useState<boolean | null>(null);
  const [classifyA2, setClassifyA2] = useState<boolean | null>(null);
  const [evidenceDesc, setEvidenceDesc] = useState('');

  // ── 炼金炉弹窗状态 ──
  const [showForge, setShowForge] = useState(false);
  const [forgeFear, setForgeFear] = useState<FearEntry | null>(null);
  const [forgeOutcome, setForgeOutcome] = useState('');
  const [forgeProbability, setForgeProbability] = useState(5);
  const [forgeCoping, setForgeCoping] = useState(5);

  // ── 勇气行动弹窗状态 ──
  const [showCourage, setShowCourage] = useState(false);
  const [courageAction, setCourageAction] = useState('');
  const [courageFearBefore, setCourageFearBefore] = useState(5);
  const [courageFeelingTags, setCourageFeelingTags] = useState<FeelingTag[]>([]);

  const stats = useMemo(() => getFearStats(), [fearEntries, courageEntries]);
  const streak = useMemo(() => getCourageStreak(), [courageEntries]);
  const heatmap = useMemo(() => getBodyHeatmap(), [fearEntries]);
  const dominant = useMemo(() => getDominantFearType(), [fearEntries]);
  const insights = useMemo(() => getCrossModuleInsights(), [fearEntries, courageEntries]);

  const resetFearForm = useCallback(() => {
    setFearStep(0); setFearContent(''); setFearTrigger(''); setFearCategory('unknown');
    setClassifyA1(null); setClassifyA2(null); setEvidenceDesc('');
  }, []);

  const handleSaveFear = useCallback(() => {
    if (!fearContent.trim()) return;
    let classification: FearClassification = 'mixed';
    if (classifyA1 === false && classifyA2 === false) classification = 'irrational';
    else if (classifyA1 === true && classifyA2 === true) classification = 'rational';
    addFearEntry({
      date: dateStr(), timestamp: Date.now(), content: fearContent.trim(), trigger: fearTrigger || '未指定',
      category: fearCategory, classification,
      classificationAnswers: { hasEvidence: classifyA1 ?? false, evidenceDesc, happened: classifyA2 ?? false },
      bodyLocations: [],
    });
    setShowAddFear(false); resetFearForm();
  }, [fearContent, fearTrigger, fearCategory, classifyA1, classifyA2, evidenceDesc, addFearEntry, resetFearForm]);

  const handleSaveForge = useCallback(() => {
    if (!forgeFear || !forgeOutcome.trim()) return;
    updateFearEntry(forgeFear.id, {
      worstOutcome: forgeOutcome.trim(), probability: forgeProbability, copingAbility: forgeCoping,
    });
    setShowForge(false); setForgeFear(null); setForgeOutcome('');
  }, [forgeFear, forgeOutcome, forgeProbability, forgeCoping, updateFearEntry]);

  const handleSaveCourage = useCallback(() => {
    if (!courageAction.trim()) return;
    addCourageEntry({
      date: dateStr(), timestamp: Date.now(), action: courageAction.trim(),
      fearBefore: courageFearBefore, feelingTags: courageFeelingTags,
    });
    setShowCourage(false); setCourageAction(''); setCourageFearBefore(5); setCourageFeelingTags([]);
  }, [courageAction, courageFearBefore, courageFeelingTags, addCourageEntry]);

  const activeFears = useMemo(() => fearEntries.filter((f: FearEntry) => !f.deleted).sort((a: FearEntry, b: FearEntry) => (a.fearIndex ?? 99) - (b.fearIndex ?? 99)), [fearEntries]);

  const renderFearItem = useCallback(({ item: f }: { item: FearEntry }) => {
    const clsColor = CLASSIFICATION_COLORS[f.classification as FearClassification];
    const clsLabel = CLASSIFICATION_LABELS[f.classification as FearClassification];
    return (
    <TouchableOpacity onPress={() => { setForgeFear(f); setForgeOutcome(f.worstOutcome ?? ''); setForgeProbability(f.probability ?? 5); setForgeCoping(f.copingAbility ?? 5); setShowForge(true); }}
      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TH.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: TH.text, fontSize: FONT_BODY, fontWeight: '600', flex: 1 }} numberOfLines={1}>{f.content}</Text>
        {f.fearIndex !== undefined && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: f.fearIndex < 15 ? '#10B98120' : f.fearIndex < 35 ? '#F59E0B20' : '#EF444420' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: f.fearIndex < 15 ? '#10B981' : f.fearIndex < 35 ? '#F59E0B' : '#EF4444' }}>{T('mindFearIndex')} {f.fearIndex}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: TH.sub }}>{f.trigger}</Text>
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${clsColor}15` }}>
          <Text style={{ fontSize: 10, color: clsColor }}>{T(clsLabel)}</Text>
        </View>
        <Text style={{ fontSize: 10, color: TH.sub }}>{f.occurrenceCount}次</Text>
      </View>
    </TouchableOpacity>
    );
  }, [TH, T, setForgeFear, setForgeOutcome, setForgeProbability, setForgeCoping, setShowForge]);

  // ── 恐惧图谱 Tab ──
  const renderFearTab = useCallback(() => {
    const heatmapEntries = Object.entries(heatmap).sort((a: [string, unknown], b: [string, unknown]) => (b[1] as number) - (a[1] as number));
    const topRegion = heatmapEntries[0];
    return (
      <View>
        {/* 统计卡片 */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[
            { label: T('mindFearCount'), value: stats.total, color: '#8B5CF6' },
            { label: T('mindClassificationIrrational'), value: stats.irrational, color: '#EF4444' },
            { label: T('mindCourageRecord'), value: stats.totalCourage, color: '#10B981' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: TH.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: TH.border }}>
              <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: TH.sub, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 躯体热图 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>{T('mindBodyMapping')}</Text>
          <View style={{ height: 200, position: 'relative', alignItems: 'center' }}>
            {/* 简化人体轮廓 - 用圆形+线条表示 */}
            <View style={{ position: 'absolute', top: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: TH.border }} />
            <View style={{ position: 'absolute', top: 35, width: 60, height: 80, borderRadius: 8, borderWidth: 2, borderColor: TH.border }} />
            <View style={{ position: 'absolute', top: 120, width: 50, height: 60, borderRadius: 8, borderWidth: 2, borderColor: TH.border }} />
            {/* 热图标注点 */}
            {heatmapEntries.map(([region, count]: [string, unknown]) => {
              const pos = BODY_REGION_POSITIONS[region as BodyRegion];
              if (!pos) return null;
              const intensity = Math.min((count as number) / 5, 1);
              return (
                <View key={region} style={{
                  position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
                  width: 24, height: 24, borderRadius: 12, marginLeft: -12, marginTop: -12,
                  backgroundColor: `rgba(239,68,68,${0.3 + intensity * 0.7})`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{count as number}</Text>
                </View>
              );
            })}
          </View>
          {topRegion && (
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', marginTop: 8 }}>
              {T('mindHeatmapHint')}{T(`mindBody${(topRegion[0] as string).charAt(0).toUpperCase() + (topRegion[0] as string).slice(1)}` as any)} ({topRegion[1] as number}次)
            </Text>
          )}
        </View>

        {/* 新增恐惧按钮 */}
        <TouchableOpacity onPress={() => { resetFearForm(); setShowAddFear(true); }}
          style={{ backgroundColor: TH.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Plus size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('mindAddFear')}</Text>
        </TouchableOpacity>

        {/* 恐惧清单 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('mindSortByIndex')}</Text>
          <FlatList
            data={activeFears}
            keyExtractor={(item) => item.id}
            renderItem={renderFearItem}
            scrollEnabled={false}
            removeClippedSubviews={true}
            ListEmptyComponent={<Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 20 }}>{T('mindNoFears')}</Text>}
          />
        </View>
      </View>
    );
  }, [stats, heatmap, activeFears, TH, T, resetFearForm]);

  const renderCourageItem = useCallback(({ item: c }: { item: CourageEntry }) => (
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
      <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{c.action}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: TH.sub }}>{c.date}</Text>
        <Text style={{ fontSize: 10, color: '#EF4444' }}>恐惧值 {c.fearBefore}</Text>
        {c.feelingTags.map((tag: FeelingTag) => (
          <Text key={tag} style={{ fontSize: 10, color: '#10B981', backgroundColor: '#10B98115', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>{T(FEELING_LABELS[tag] ?? tag)}</Text>
        ))}
      </View>
    </View>
  ), [TH, T]);

  const renderInsightItem = useCallback(({ item: insight, index: i }: { item: { titleKey: string; metric?: string; description: string }; index: number }) => (
    <View style={{ paddingVertical: 10, borderBottomWidth: i < insights.length - 1 ? 1 : 0, borderBottomColor: TH.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 14 }}>💡</Text>
        <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text }}>{T(insight.titleKey)}</Text>
        {insight.metric && (
          <Text style={{ fontSize: 10, color: '#10B981', backgroundColor: '#10B98115', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>{insight.metric}</Text>
        )}
      </View>
      <Text style={{ fontSize: FONT_SUB, color: TH.sub, lineHeight: 18, marginLeft: 20 }}>{insight.description}</Text>
    </View>
  ), [T, TH, insights.length]);

  // ── 勇气行动 Tab ──
  const renderCourageTab = useCallback(() => {
    const trend = getCourageTrend();
    const recentCourage = courageEntries.filter(c => !c.deleted).slice(0, 10);
    const unlockedTypes = new Set(achievements.filter(a => !a.deleted).map(a => a.type));
    return (
      <View>
        {/* 今日行动卡片 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text }}>{T('mindCourageLog')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text style={{ fontSize: FONT_BODY, fontWeight: '800', color: '#F59E0B' }}>{streak}</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mindCourageStreak')}</Text>
            </View>
          </View>
          {streak < 7 && streak > 0 && (
            <Text style={{ fontSize: FONT_SUB, color: '#F59E0B', marginBottom: 8 }}>再坚持{7 - streak}天解锁「勇者」称号！</Text>
          )}
          <TouchableOpacity onPress={() => setShowCourage(true)}
            style={{ backgroundColor: '#10B981', borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('mindCourageRecord')}</Text>
          </TouchableOpacity>
        </View>

        {/* 勇气趋势 */}
        {trend.length > 2 && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('mindInsightCourageTrend')}</Text>
            <View style={{ height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
              {trend.map((t, i) => {
                const h = Math.max(t.avgFearBefore / 10 * 80, 4);
                return (
                  <View key={i} style={{ flex: 1, height: h, backgroundColor: t.avgFearBefore > 6 ? '#EF4444' : t.avgFearBefore > 3 ? '#F59E0B' : '#10B981', borderRadius: 3 }} />
                );
              })}
            </View>
            <Text style={{ fontSize: 10, color: TH.sub, textAlign: 'center', marginTop: 4 }}>恐惧值趋势 (低=好)</Text>
          </View>
        )}

        {/* 历史行动 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>历史行动</Text>
          <FlatList
            data={recentCourage}
            keyExtractor={(item) => item.id}
            renderItem={renderCourageItem}
            scrollEnabled={false}
            removeClippedSubviews={true}
            ListEmptyComponent={<Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>{T('mindNoCourage')}</Text>}
          />
        </View>

        {/* 成就墙 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>成就墙</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ACHIEVEMENT_DEFS.map(def => {
              const unlocked = unlockedTypes.has(def.type);
              return (
                <View key={def.type} style={{
                  width: '47%', backgroundColor: unlocked ? `${TH.primary}15` : TH.card,
                  borderRadius: 12, padding: 12, borderWidth: 1,
                  borderColor: unlocked ? TH.primary : TH.border, opacity: unlocked ? 1 : 0.5,
                }}>
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{def.icon}</Text>
                  <Text style={{ fontSize: FONT_SUB, fontWeight: '700', color: unlocked ? TH.text : TH.sub }}>{T(def.labelKey)}</Text>
                  <Text style={{ fontSize: 10, color: TH.sub, marginTop: 2 }}>{T(def.descKey)}</Text>
                  {unlocked && <Text style={{ fontSize: 10, color: '#10B981', marginTop: 4 }}>✓ 已解锁</Text>}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, [streak, courageEntries, achievements, TH, T]);

  // ── 洞察分析 Tab ──
  const renderInsightTab = useCallback(() => {
    const timeSlots = getFearTimeDistribution();
    const peakHours = timeSlots.sort((a, b) => b.count - a.count).slice(0, 3);
    return (
      <View>
        {/* 主导恐惧类型 */}
        {dominant && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>{T('mindInsightDominant')}</Text>
            <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: TH.primary }}>{T(CATEGORY_LABELS[dominant.category as FearCategory])}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>{dominant.percentage}% 的恐惧与此相关</Text>
          </View>
        )}

        {/* 恐惧高发时段 */}
        {peakHours.length > 0 && (
          <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>{T('mindInsightFearTime')}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {peakHours.map((h) => (
                <View key={h.hour} style={{ flex: 1, alignItems: 'center', backgroundColor: `${TH.primary}10`, borderRadius: 8, padding: 8 }}>
                  <Text style={{ fontSize: FONT_STAT_CARD, fontWeight: '800', color: TH.primary }}>{h.hour}:00</Text>
                  <Text style={{ fontSize: 10, color: TH.sub }}>{h.count}次</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 跨模块洞察 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('mindInsightCrossModule')}</Text>
          <FlatList
            data={insights}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderInsightItem}
            scrollEnabled={false}
            removeClippedSubviews={true}
            ListEmptyComponent={<Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>记录更多数据后将生成洞察</Text>}
          />
        </View>
      </View>
    );
  }, [dominant, insights, TH, T]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Mind" />

      <Text style={{ fontSize: FONT_TITLE, fontWeight: '800', color: TH.text, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>{T('mindSubtitle')}</Text>

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
                backgroundColor: isActive ? '#8B5CF6' : TH.card,
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
        {activeTab === 'fear' && renderFearTab()}
        {activeTab === 'courage' && renderCourageTab()}
        {activeTab === 'insight' && renderInsightTab()}
      </ScrollView>

      {/* ── 新增恐惧弹窗 ── */}
      <Modal visible={showAddFear} transparent animationType="fade" onRequestClose={() => setShowAddFear(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', paddingTop: 48 }}>
          <View style={{ flex: 1, backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('mindAddFear')}</Text>
              <TouchableOpacity onPress={() => setShowAddFear(false)}><X size={22} color={TH.sub} /></TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
              {fearStep === 0 && (
                <View>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 8 }}>{T('mindFearContent')}</Text>
                  <TextInput value={fearContent} onChangeText={setFearContent} placeholder="例如：害怕在公开场合说错话"
                    placeholderTextColor={TH.sub} multiline style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: TH.border, marginBottom: 16 }} />
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 8 }}>{T('mindFearTrigger')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {['社交场合', '工作', '亲密关系', '深夜独处', '身体不适', '其他'].map(t => (
                      <TouchableOpacity key={t} onPress={() => setFearTrigger(t)}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: fearTrigger === t ? '#8B5CF6' : TH.card, borderWidth: fearTrigger === t ? 0 : 1, borderColor: TH.border }}>
                        <Text style={{ color: fearTrigger === t ? '#fff' : TH.sub, fontSize: FONT_SUB }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 8 }}>{T('mindFearCategory')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {FEAR_CATEGORY_DEFS.map(c => (
                      <TouchableOpacity key={c.key} onPress={() => setFearCategory(c.key)}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: fearCategory === c.key ? '#8B5CF6' : TH.card, borderWidth: fearCategory === c.key ? 0 : 1, borderColor: TH.border }}>
                        <Text style={{ color: fearCategory === c.key ? '#fff' : TH.sub, fontSize: FONT_SUB }}>{T(c.labelKey)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => setFearStep(1)} disabled={!fearContent.trim()}
                    style={{ backgroundColor: '#8B5CF6', borderRadius: 12, padding: 14, alignItems: 'center', opacity: fearContent.trim() ? 1 : 0.5 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('mindFearClassification')} →</Text>
                  </TouchableOpacity>
                </View>
              )}
              {fearStep === 1 && (
                <View>
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 12 }}>{T('mindClassifyQ1')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {[{ v: true, l: 'mindClassifyQ1Yes' }, { v: false, l: 'mindClassifyQ1No' }].map(o => (
                      <TouchableOpacity key={String(o.v)} onPress={() => setClassifyA1(o.v)}
                        style={{ flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: classifyA1 === o.v ? '#8B5CF6' : TH.card, borderWidth: classifyA1 === o.v ? 0 : 1, borderColor: TH.border }}>
                        <Text style={{ color: classifyA1 === o.v ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_SUB }}>{T(o.l)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {classifyA1 === true && (
                    <TextInput value={evidenceDesc} onChangeText={setEvidenceDesc} placeholder="请简述依据..."
                      placeholderTextColor={TH.sub} style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, marginBottom: 16 }} />
                  )}
                  <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 12 }}>{T('mindClassifyQ2')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {[{ v: true, l: 'mindClassifyQ2Yes' }, { v: false, l: 'mindClassifyQ2No' }].map(o => (
                      <TouchableOpacity key={String(o.v)} onPress={() => setClassifyA2(o.v)}
                        style={{ flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: classifyA2 === o.v ? '#8B5CF6' : TH.card, borderWidth: classifyA2 === o.v ? 0 : 1, borderColor: TH.border }}>
                        <Text style={{ color: classifyA2 === o.v ? '#fff' : TH.text, fontWeight: '600', fontSize: FONT_SUB }}>{T(o.l)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* 结果预览 */}
                  {classifyA1 !== null && classifyA2 !== null && (
                    <View style={{ backgroundColor: `${classifyA1 === false && classifyA2 === false ? '#EF4444' : classifyA1 === true && classifyA2 === true ? '#3B82F6' : '#F59E0B'}15`, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: `${classifyA1 === false && classifyA2 === false ? '#EF4444' : classifyA1 === true && classifyA2 === true ? '#3B82F6' : '#F59E0B'}30` }}>
                      <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: classifyA1 === false && classifyA2 === false ? '#EF4444' : classifyA1 === true && classifyA2 === true ? '#3B82F6' : '#F59E0B' }}>
                        {classifyA1 === false && classifyA2 === false ? T('mindClassificationIrrational') : classifyA1 === true && classifyA2 === true ? T('mindClassificationRational') : T('mindClassificationMixed')}
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => setFearStep(0)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
                      <Text style={{ color: TH.sub, fontWeight: '600', fontSize: FONT_BODY }}>返回</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveFear} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#8B5CF6', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── 斯多葛炼金炉弹窗 ── */}
      <Modal visible={showForge} transparent animationType="fade" onRequestClose={() => setShowForge(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('mindStoicForge')}</Text>
              <TouchableOpacity onPress={() => setShowForge(false)}><X size={20} color={TH.sub} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: FONT_BODY, color: TH.sub, marginBottom: 16 }}>{forgeFear?.content}</Text>
            <ScrollView>
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('mindForgeStep1')}</Text>
              <TextInput value={forgeOutcome} onChangeText={setForgeOutcome} placeholder="如果真的发生了..."
                placeholderTextColor={TH.sub} multiline style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: TH.border, marginBottom: 16 }} />
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('mindForgeStep2')}: {forgeProbability}/10</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <TouchableOpacity key={n} onPress={() => setForgeProbability(n)} style={{ flex: 1, height: 32, borderRadius: 6, backgroundColor: n <= forgeProbability ? '#EF4444' : TH.card, borderWidth: n <= forgeProbability ? 0 : 1, borderColor: TH.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, color: n <= forgeProbability ? '#fff' : TH.sub }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('mindForgeStep3')}: {forgeCoping}/10</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <TouchableOpacity key={n} onPress={() => setForgeCoping(n)} style={{ flex: 1, height: 32, borderRadius: 6, backgroundColor: n <= forgeCoping ? '#10B981' : TH.card, borderWidth: n <= forgeCoping ? 0 : 1, borderColor: TH.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, color: n <= forgeCoping ? '#fff' : TH.sub }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* 恐惧实质指数 */}
              <View style={{ backgroundColor: '#8B5CF615', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#8B5CF630' }}>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('mindFearIndex')}</Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#8B5CF6' }}>{forgeProbability * (10 - forgeCoping)}</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>概率{forgeProbability} × (10-应对力{forgeCoping})</Text>
              </View>
              <TouchableOpacity onPress={handleSaveForge}
                style={{ backgroundColor: '#8B5CF6', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>保存演练结果</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── 勇气行动弹窗 ── */}
      <Modal visible={showCourage} transparent animationType="fade" onRequestClose={() => setShowCourage(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.85)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: TH.cardSolid, borderRadius: 20, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', fontSize: FONT_TITLE, color: TH.text }}>{T('mindCourageLog')}</Text>
              <TouchableOpacity onPress={() => setShowCourage(false)}><X size={20} color={TH.sub} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('mindCourageAction')}</Text>
            <TextInput value={courageAction} onChangeText={setCourageAction} placeholder="例如：在会议上主动发言"
              placeholderTextColor={TH.sub} style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, borderWidth: 1, borderColor: TH.border, marginBottom: 16 }} />
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('mindCourageFearBefore')}: {courageFearBefore}/10</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <TouchableOpacity key={n} onPress={() => setCourageFearBefore(n)} style={{ flex: 1, height: 32, borderRadius: 6, backgroundColor: n <= courageFearBefore ? '#EF4444' : TH.card, borderWidth: n <= courageFearBefore ? 0 : 1, borderColor: TH.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, color: n <= courageFearBefore ? '#fff' : TH.sub }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: FONT_BODY, color: TH.text, fontWeight: '600', marginBottom: 6 }}>{T('mindCourageFeeling')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {FEELING_TAGS.map(tag => {
                const selected = courageFeelingTags.includes(tag);
                return (
                  <TouchableOpacity key={tag} onPress={() => setCourageFeelingTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: selected ? '#10B981' : TH.card, borderWidth: selected ? 0 : 1, borderColor: TH.border }}>
                    <Text style={{ color: selected ? '#fff' : TH.sub, fontSize: FONT_SUB }}>{T(FEELING_LABELS[tag] ?? tag)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={handleSaveCourage} disabled={!courageAction.trim()}
              style={{ backgroundColor: '#10B981', borderRadius: 12, padding: 14, alignItems: 'center', opacity: courageAction.trim() ? 1 : 0.5 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: FONT_BODY }}>{T('mindCourageRecord')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
