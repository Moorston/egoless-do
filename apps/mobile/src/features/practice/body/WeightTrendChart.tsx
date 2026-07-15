import { FONT_BODY, FONT_SUB, FONT_SMALL, FONT_STAT_CARD, FONT_TINY, type CheckinEntry, type Theme } from '@egoless-do/core';
import { TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useState, useRef, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity, FlatList } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  TH: Theme;
  T: (key: string) => string;
  checkins: CheckinEntry[];
}

interface MonthData {
  month: string;      // "2026-07"
  label: string;       // "7月" or "2026年7月"
  records: CheckinEntry[];
  minW: number;
  maxW: number;
}

export default function WeightTrendChart({ TH, T, checkins }: Props) {
  const validRecords = checkins
    .filter(r => !r.deleted && r.weight != null && r.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (validRecords.length === 0) {
    return (
      <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text, marginBottom: 12 }}>{T('bodyWeightTrend')}</Text>
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: FONT_BODY(), color: TH.sub, textAlign: 'center' }}>{T('bodyWeightNoData')}</Text>
        </View>
      </View>
    );
  }

  // Trend direction (global)
  const first = validRecords[0].weight;
  const last = validRecords[validRecords.length - 1].weight;
  const diff = last - first;
  const TrendIcon = diff > 0.1 ? TrendingUp : diff < -0.1 ? TrendingDown : Minus;
  const trendColor = diff > 0.1 ? '#ef4444' : diff < -0.1 ? '#10b981' : TH.sub;

  // Group by month
  const months = useMemo(() => {
    const map = new Map<string, CheckinEntry[]>();
    for (const r of validRecords) {
      const m = r.date.slice(0, 7); // "2026-07"
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(r);
    }
    const result: MonthData[] = [];
    for (const [month, records] of map) {
      const weights = records.map(r => r.weight);
      const [year, mon] = month.split('-');
      result.push({
        month,
        label: `${parseInt(mon)}月`,
        records,
        minW: Math.min(...weights),
        maxW: Math.max(...weights),
      });
    }
    return result;
  }, [validRecords]);

  const [currentIndex, setCurrentIndex] = useState(months.length - 1);
  const flatListRef = useRef<FlatList>(null);

  const currentMonth = months[currentIndex];

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const handleNext = () => {
    if (currentIndex < months.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const renderMonthPage = ({ item, index }: { item: MonthData; index: number }) => {
    const barMaxHeight = 80;
    const range = item.maxW - item.minW || 1;
    const isActive = index === currentIndex;

    return (
      <View style={{ width: SCREEN_WIDTH - 32, paddingHorizontal: 4 }}>
        {/* Month chart */}
        <View style={{ flexDirection: 'row', height: barMaxHeight, alignItems: 'flex-end', gap: 2 }}>
          {item.records.map((r) => {
            const normalizedHeight = Math.max(4, ((r.weight - item.minW) / range) * (barMaxHeight - 4) + 4);
            const day = r.date.slice(8); // "01"..."31"
            return (
              <View key={r.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Text style={{ fontSize: FONT_TINY(), color: isActive ? TH.text : TH.sub, fontWeight: '600', marginBottom: 2 }}>
                  {r.weight}
                </Text>
                <View style={{
                  width: '70%',
                  height: normalizedHeight,
                  backgroundColor: isActive ? '#10b981' : '#10b98160',
                  borderRadius: 2,
                }} />
              </View>
            );
          })}
        </View>
        {/* X-axis: day numbers */}
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {item.records.map((r) => (
            <View key={r.date} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_TINY(), color: TH.sub }}>
                {r.date.slice(8)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: TH.text }}>{T('bodyWeightTrend')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TrendIcon size={14} color={trendColor} />
          <Text style={{ fontSize: FONT_SMALL(), color: trendColor }}>
            {diff > 0 ? '+' : ''}{diff.toFixed(1)}kg
          </Text>
        </View>
      </View>

      {/* Latest weight */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <Text style={{ fontSize: FONT_STAT_CARD(), fontWeight: '900', color: TH.text }}>{last}</Text>
        <Text style={{ fontSize: FONT_SUB(), color: TH.sub }}>kg</Text>
      </View>

      {/* Month navigator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <TouchableOpacity onPress={handlePrev} disabled={currentIndex <= 0} style={{ padding: 4, opacity: currentIndex <= 0 ? 0.3 : 1 }}>
          <ChevronLeft size={18} color={TH.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_SMALL(), fontWeight: '600', color: TH.text }}>{currentMonth.month}</Text>
        <TouchableOpacity onPress={handleNext} disabled={currentIndex >= months.length - 1} style={{ padding: 4, opacity: currentIndex >= months.length - 1 ? 0.3 : 1 }}>
          <ChevronRight size={18} color={TH.text} />
        </TouchableOpacity>
      </View>

      {/* Swipeable month chart */}
      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonthPage}
        keyExtractor={(item) => item.month}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={months.length - 1}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH - 32, offset: (SCREEN_WIDTH - 32) * index, index })}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
          setCurrentIndex(index);
        }}
      />

      {/* Page indicator dots */}
      {months.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {months.map((m, i) => (
            <View key={m.month} style={{
              width: i === currentIndex ? 16 : 6, height: 6, borderRadius: 3,
              backgroundColor: i === currentIndex ? '#10b981' : TH.border,
            }} />
          ))}
        </View>
      )}
    </View>
  );
}