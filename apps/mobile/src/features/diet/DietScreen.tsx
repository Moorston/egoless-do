import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, useT } from '../../components/UI';
import SimpleHeader from '../../navigation/SimpleHeader';
import { FONT_TITLE, FONT_BODY, FONT_SUB, COLORS, dateStr, WUXING_MAP, WUXING_ELEMENT_CONFIG, FLAVOR_CONFIG, EATING_MOTIVATIONS } from '@egoless-do/core';
import type { WuxingElement, FlavorType } from '@egoless-do/core';
import { Utensils, Compass, TrendingUp, Timer } from 'lucide-react-native';

type DietTab = 'today' | 'wuxing' | 'trend' | 'fasting';

const TABS: { key: DietTab; labelKey: string; icon: typeof Utensils }[] = [
  { key: 'today',   labelKey: 'dietTabToday',   icon: Utensils },
  { key: 'wuxing',  labelKey: 'dietTabWuxing',  icon: Compass },
  { key: 'trend',   labelKey: 'dietTabTrend',   icon: TrendingUp },
  { key: 'fasting', labelKey: 'dietTabFasting',  icon: Timer },
];

const ELEMENTS: WuxingElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
const FLAVORS: FlavorType[] = ['sour', 'bitter', 'sweet', 'pungent', 'salty'];

const ELEMENT_COLORS: Record<WuxingElement, string> = {
  wood: '#10B981', fire: '#EF4444', earth: '#F59E0B', metal: '#9CA3AF', water: '#3B82F6',
};
const FLAVOR_LABELS: Record<FlavorType, string> = {
  sour: '酸', bitter: '苦', sweet: '甘', pungent: '辛', salty: '咸',
};
const FLAVOR_TO_ELEMENT: Record<FlavorType, WuxingElement> = {
  sour: 'wood', bitter: 'fire', sweet: 'earth', pungent: 'metal', salty: 'water',
};

export default function DietScreen() {
  const TH = useTheme();
  const T = useT();
  const [activeTab, setActiveTab] = useState<DietTab>('today');

  const { foodLog, lookupWuxing, getDailyFlavorStats, getDailyWuxingStats,
    motivationLog, activeFasting, fastingHistory, getMotivationStats, getEmotionSensitiveDays } = useAppStore(
    useShallow(s => ({
      foodLog: s.foodLog,
      lookupWuxing: s.lookupWuxing,
      getDailyFlavorStats: s.getDailyFlavorStats,
      getDailyWuxingStats: s.getDailyWuxingStats,
      motivationLog: s.motivationLog,
      activeFasting: s.activeFasting,
      fastingHistory: s.fastingHistory,
      getMotivationStats: s.getMotivationStats,
      getEmotionSensitiveDays: s.getEmotionSensitiveDays,
    }))
  );

  const today = useMemo(() => dateStr(), []);
  const todayFoods = useMemo(() => foodLog.filter(f => !f.deleted && dateStr(new Date(f.timestamp)) === today), [foodLog, today]);
  const flavorStats = useMemo(() => getDailyFlavorStats(today), [getDailyFlavorStats, today]);
  const wuxingStats = useMemo(() => getDailyWuxingStats(today), [getDailyWuxingStats, today]);

  // ── 今日总览 Tab ──
  const renderTodayTab = useCallback(() => {
    const total = flavorStats.total || 1;
    return (
      <View>
        {/* 五味分布 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('dietFlavorDist')}</Text>
          {FLAVORS.map(f => {
            const pct = Math.round((flavorStats[f] ?? 0) / total * 100);
            const element = FLAVOR_TO_ELEMENT[f];
            return (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ width: 30, fontSize: FONT_SUB, color: TH.text, fontWeight: '600' }}>{FLAVOR_LABELS[f]}</Text>
                <View style={{ flex: 1, height: 20, backgroundColor: `${ELEMENT_COLORS[element]}20`, borderRadius: 10, overflow: 'hidden', marginHorizontal: 8 }}>
                  <View style={{ width: `${Math.max(pct, 2)}%`, height: '100%', backgroundColor: ELEMENT_COLORS[element], borderRadius: 10 }} />
                </View>
                <Text style={{ width: 40, fontSize: FONT_SUB, color: TH.sub, textAlign: 'right' }}>{pct}%</Text>
              </View>
            );
          })}
        </View>

        {/* 五行分布 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>五行分布</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {ELEMENTS.map(e => {
              const pct = wuxingStats[e] ?? 0;
              return (
                <View key={e} style={{ alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${ELEMENT_COLORS[e]}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: ELEMENT_COLORS[e] }}>{pct}</Text>
                  </View>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{WUXING_ELEMENT_CONFIG[e]?.label ?? e}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 今日食物列表 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('dietFoodList')} ({todayFoods.length})</Text>
          {todayFoods.length === 0 ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 20 }}>{T('dietNoFoodToday')}</Text>
          ) : (
            todayFoods.map(f => {
              const wuxing = lookupWuxing(f.name);
              return (
                <View key={f.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TH.text, fontSize: FONT_BODY }}>{f.name}</Text>
                    {wuxing && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${ELEMENT_COLORS[wuxing.primaryElement]}20` }}>
                          <Text style={{ fontSize: 10, color: ELEMENT_COLORS[wuxing.primaryElement], fontWeight: '600' }}>
                            {FLAVOR_LABELS[wuxing.primaryFlavor]}·{WUXING_ELEMENT_CONFIG[wuxing.primaryElement]?.label}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: TH.sub }}>{wuxing.nature === 'hot' ? '热' : wuxing.nature === 'warm' ? '温' : wuxing.nature === 'cool' ? '凉' : wuxing.nature === 'cold' ? '寒' : '平'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: TH.primary, fontSize: FONT_SUB, fontWeight: '600' }}>{f.calories} kcal</Text>
                </View>
              );
            })
          )}
        </View>

        {/* 饮食建议 */}
        {!wuxingStats.isBalanced && (
          <View style={{ backgroundColor: `${COLORS.YELLOW}15`, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: `${COLORS.YELLOW}30` }}>
            <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: COLORS.YELLOW, marginBottom: 6 }}>{T('dietSuggestion')}</Text>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, lineHeight: 20 }}>
              {T('dietDominant')}: {WUXING_ELEMENT_CONFIG[wuxingStats.dominant]?.label}({wuxingStats[wuxingStats.dominant]}%){'\n'}
              {T('dietDeficient')}: {WUXING_ELEMENT_CONFIG[wuxingStats.deficient]?.label}({wuxingStats[wuxingStats.deficient]}%)
            </Text>
          </View>
        )}
      </View>
    );
  }, [flavorStats, wuxingStats, todayFoods, lookupWuxing, TH, T]);

  // ── 五行图谱 Tab ──
  const renderWuxingTab = useCallback(() => {
    // 按分类分组的食材列表
    const categories = ['grain', 'bean', 'vegetable', 'fruit', 'meat', 'seafood', 'seasoning', 'other'] as const;
    const commonFoods = WUXING_MAP.filter(m => m.isCommon);

    return (
      <View>
        {/* 雷达图占位 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 24, marginBottom: 12, borderWidth: 1, borderColor: TH.border, alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 16 }}>{T('dietWuxingRadar')}</Text>
          {/* 简易五边形可视化 */}
          <View style={{ width: 200, height: 200, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            {ELEMENTS.map((e, i) => {
              const angle = (i * 72 - 90) * Math.PI / 180;
              const r = 80;
              const x = 100 + r * Math.cos(angle) - 20;
              const y = 100 + r * Math.sin(angle) - 10;
              const pct = wuxingStats[e] ?? 0;
              return (
                <View key={e} style={{ position: 'absolute', left: x, top: y, alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${ELEMENT_COLORS[e]}30`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: ELEMENT_COLORS[e] }}>{pct}%</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: TH.sub, marginTop: 2 }}>{WUXING_ELEMENT_CONFIG[e]?.label}</Text>
                </View>
              );
            })}
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: TH.primary }} />
          </View>
          {/* 偏性解读 */}
          <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, lineHeight: 20 }}>
              {wuxingStats.isBalanced ? T('dietSuggestionBalanced') : `${T('dietDominant')}: ${WUXING_ELEMENT_CONFIG[wuxingStats.dominant]?.label} · ${T('dietDeficient')}: ${WUXING_ELEMENT_CONFIG[wuxingStats.deficient]?.label}`}
            </Text>
          </View>
        </View>

        {/* 食材五味速查 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('dietWuxingLookup')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>{T('dietCommonFoods')} ({commonFoods.length})</Text>
          {categories.map(cat => {
            const items = commonFoods.filter(m => m.category === cat);
            if (items.length === 0) return null;
            return (
              <View key={cat} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 6 }}>
                  {T(`dietCategory${cat.charAt(0).toUpperCase() + cat.slice(1)}`)}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {items.map(item => (
                    <View key={item.foodKey} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${ELEMENT_COLORS[item.primaryElement]}15`, borderWidth: 1, borderColor: `${ELEMENT_COLORS[item.primaryElement]}30` }}>
                      <Text style={{ fontSize: 11, color: ELEMENT_COLORS[item.primaryElement], fontWeight: '600' }}>
                        {item.name} {FLAVOR_LABELS[item.primaryFlavor]}·{WUXING_ELEMENT_CONFIG[item.primaryElement]?.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }, [wuxingStats, TH, T]);

  // ── 趋势分析 Tab ──
  const renderTrendTab = useCallback(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const dateFrom = dateStr(thirtyDaysAgo);
    const dateTo = dateStr(now);
    const motivationStats = getMotivationStats(dateFrom, dateTo);
    const sensitiveDays = getEmotionSensitiveDays(dateFrom, dateTo);

    return (
      <View>
        {/* 进食动机统计 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('dietMotivationTitle')}</Text>
          {motivationStats.total === 0 ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>暂无数据</Text>
          ) : (
            <View>
              {/* 生理 vs 情绪 */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#10B98115', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#10B981' }}>{motivationStats.physical}%</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('dietMotivationPhysical')}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#EF444415', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#EF4444' }}>{motivationStats.emotional}%</Text>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>{T('dietMotivationEmotional')}</Text>
                </View>
              </View>
              {/* 详细 breakdown */}
              {EATING_MOTIVATIONS.filter(m => motivationStats.breakdown[m.key] > 0).map(m => (
                <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: FONT_SUB, color: TH.text, width: 80 }}>{m.emoji} {m.label}</Text>
                  <View style={{ flex: 1, height: 16, backgroundColor: `${TH.primary}15`, borderRadius: 8, overflow: 'hidden', marginHorizontal: 8 }}>
                    <View style={{ width: `${Math.round(motivationStats.breakdown[m.key] / motivationStats.total * 100)}%`, height: '100%', backgroundColor: TH.primary, borderRadius: 8 }} />
                  </View>
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, width: 40, textAlign: 'right' }}>{motivationStats.breakdown[m.key]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 情绪敏感日时间线 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('dietEmotionTimeline')}</Text>
          {sensitiveDays.length === 0 ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>暂无情绪敏感日记录</Text>
          ) : (
            sensitiveDays.slice(0, 10).map(day => (
              <View key={day.date} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 14 }}>🟡</Text>
                  <Text style={{ fontWeight: '600', fontSize: FONT_SUB, color: TH.text }}>{day.date}</Text>
                  {day.moods.map(m => (
                    <Text key={m} style={{ fontSize: 10, color: COLORS.YELLOW, backgroundColor: `${COLORS.YELLOW}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{m}</Text>
                  ))}
                </View>
                {day.reflectionContent && (
                  <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginLeft: 20 }} numberOfLines={1}>{day.reflectionContent}</Text>
                )}
                {day.emotionalEatingCount > 0 && (
                  <Text style={{ fontSize: 10, color: '#EF4444', marginLeft: 20, marginTop: 2 }}>情绪进食 {day.emotionalEatingCount} 次</Text>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    );
  }, [getMotivationStats, getEmotionSensitiveDays, TH, T]);

  // ── 禁食 Tab ──
  const renderFastingTab = useCallback(() => {
    const isActive = !!activeFasting;
    const history = (fastingHistory ?? []).filter(f => !f.deleted).slice(0, 10);

    return (
      <View>
        {/* 禁食状态 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 8 }}>{T('dietFastingSync')}</Text>
          {isActive ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TH.primary }}>禁食进行中</Text>
              <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginTop: 4 }}>目标: {activeFasting?.targetHours}h</Text>
            </View>
          ) : (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 12 }}>当前无活跃禁食</Text>
          )}
        </View>

        {/* 禁食后首餐建议 */}
        <View style={{ backgroundColor: '#10B98115', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#10B98130' }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: '#10B981', marginBottom: 8 }}>{T('dietFastingSuggestion')}</Text>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, lineHeight: 20 }}>{T('dietFastingSuggestionText')}</Text>
        </View>

        {/* 禁食历史 */}
        <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TH.border }}>
          <Text style={{ fontWeight: '700', fontSize: FONT_BODY, color: TH.text, marginBottom: 12 }}>{T('dietFastingHistory')}</Text>
          {history.length === 0 ? (
            <Text style={{ color: TH.sub, fontSize: FONT_SUB, textAlign: 'center', paddingVertical: 16 }}>暂无禁食记录</Text>
          ) : (
            history.map(f => {
              const startTime = f.startedAt ? new Date(f.startedAt) : null;
              const endTime = f.endedAt ? new Date(f.endedAt) : null;
              const durationH = startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 3600000) : 0;
              const dateLabel = startTime ? dateStr(startTime) : '';
              // 查禁食结束后首餐
              const afterMeal = endTime ? foodLog.filter(fd => !fd.deleted && fd.timestamp > f.endedAt!).slice(0, 2) : [];
              return (
                <View key={f.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: TH.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: FONT_SUB, color: TH.text, fontWeight: '600' }}>{dateLabel}</Text>
                    <Text style={{ fontSize: FONT_SUB, color: durationH >= f.targetHours ? '#10B981' : COLORS.YELLOW, fontWeight: '600' }}>
                      ✓ {durationH}h
                    </Text>
                  </View>
                  {afterMeal.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, color: TH.sub }}>首餐: </Text>
                      {afterMeal.map(m => {
                        const w = lookupWuxing(m.name);
                        return (
                          <Text key={m.id} style={{ fontSize: 10, color: w ? ELEMENT_COLORS[w.primaryElement] : TH.sub }}>
                            {m.name}{w ? `(${FLAVOR_LABELS[w.primaryFlavor]}·${WUXING_ELEMENT_CONFIG[w.primaryElement]?.label})` : ''}
                          </Text>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  }, [activeFasting, fastingHistory, foodLog, lookupWuxing, TH, T]);

  return (
    <View style={{ flex: 1, backgroundColor: TH.bg }}>
      <SimpleHeader routeName="Diet" />

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
                backgroundColor: isActive ? TH.primary : TH.card,
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
        {activeTab === 'today' && renderTodayTab()}
        {activeTab === 'wuxing' && renderWuxingTab()}
        {activeTab === 'trend' && renderTrendTab()}
        {activeTab === 'fasting' && renderFastingTab()}
      </ScrollView>
    </View>
  );
}
