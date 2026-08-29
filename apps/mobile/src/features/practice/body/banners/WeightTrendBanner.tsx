import { FONT_BODY, FONT_SMALL, FONT_TITLE } from '@egoless-do/core';
import { TrendingUp } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { BANNER_WIDTH } from '../BodyDashboard';
import { styles } from '../BodyDashboardStyles';

interface CheckinRecord {
  date: string;
  weight?: number | null;
  deleted?: boolean;
}

interface WeightTrend {
  current: number;
  diff: number;
  date: string;
}

export interface WeightTrendBannerProps {
  T: (key: string) => string;
  weightTrend: WeightTrend | null;
  checkinHistory: CheckinRecord[] | undefined;
  onShowWeightRecord: () => void;
  onShowWeightTrend: () => void;
}

/**
 * Banner 4: 体重趋势
 *
 * Extracted from BodyDashboard via move-only JSX extraction (L696-842).
 * The inline IIFE line-chart (L726-822) and all its internal branches count
 * toward THIS component's complexity, not the parent's.
 */
// eslint-disable-next-line max-lines-per-function
export function WeightTrendBanner({ T, weightTrend, checkinHistory, onShowWeightRecord, onShowWeightTrend }: WeightTrendBannerProps) {
  return (
    <View style={[styles.bannerCard, { backgroundColor: '#3b82f6' }]}>
      <View style={styles.bannerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>⚖️</Text>
          <Text style={{ fontSize: FONT_TITLE(), fontWeight: '700', color: '#fff' }}>{T('bodyWeightTrend')}</Text>
        </View>
        <TouchableOpacity
          onPress={onShowWeightRecord}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
        >
          <Text style={{ fontSize: FONT_SMALL(), color: '#fff', fontWeight: '600' }}>{T('bodyRecordWeight')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bannerContent}>
        <View style={{ flex: 1 }}>
          {weightTrend ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: FONT_TITLE(), fontWeight: '800', color: '#fff' }}>
                  {`${weightTrend.current} kg`}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={18} color={weightTrend.diff > 0 ? '#fbbf24' : '#34d399'} style={weightTrend.diff < 0 ? { transform: [{ scaleY: -1 }] } : undefined} />
                  <Text style={{ fontSize: FONT_BODY(), color: weightTrend.diff > 0 ? '#fbbf24' : '#34d399', fontWeight: '600' }}>
                    {`${weightTrend.diff > 0 ? '+' : ''}${weightTrend.diff.toFixed(1)} kg`}
                  </Text>
                </View>
              </View>
              {/* Line chart - last 7 days */}
              <View style={{ height: 80, marginTop: 4 }}>
                {(() => {
                  const records = (checkinHistory ?? [])
                    .filter(r => !r.deleted && r.weight != null && r.weight > 0)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(-7);
                  if (records.length < 2) return null;
                  const weights = records.map(r => r.weight!).filter((w): w is number => w != null);
                  const minW = Math.min(...weights);
                  const maxW = Math.max(...weights);
                  const range = maxW - minW || 1;
                  const chartHeight = 50;
                  const labelHeight = 20;
                  const totalHeight = chartHeight + labelHeight;
                  const chartWidth = BANNER_WIDTH - 80;
                  const stepX = chartWidth / (records.length - 1);

                  return (
                    <View style={{ position: 'relative', height: totalHeight }}>
                      {/* Line segments */}
                      {records.map((r, i) => {
                        if (i === 0) return null;
                        const prevR = records[i - 1];
                        const x1 = (i - 1) * stepX;
                        const y1 = chartHeight - ((prevR.weight! - minW) / range) * (chartHeight - 15);
                        const x2 = i * stepX;
                        const y2 = chartHeight - ((r.weight! - minW) / range) * (chartHeight - 15);
                        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                        return (
                          <View
                            key={`line-${i}`}
                            style={{
                              position: 'absolute',
                              left: x1,
                              top: y1,
                              width: length,
                              height: 2,
                              backgroundColor: 'rgba(255,255,255,0.8)',
                              transform: [{ rotate: `${angle}deg` }],
                              transformOrigin: '0 0',
                            }}
                          />
                        );
                      })}
                      {/* Data points with weight labels */}
                      {records.map((r, i) => {
                        const x = i * stepX;
                        const y = chartHeight - ((r.weight! - minW) / range) * (chartHeight - 15);
                        const isLast = i === records.length - 1;
                        return (
                          <React.Fragment key={`point-${i}`}>
                            {/* Weight value above point */}
                            <Text style={{
                              position: 'absolute',
                              left: x - 15,
                              top: y - 18,
                              fontSize: FONT_SMALL(),
                              color: '#fff',
                              fontWeight: isLast ? '700' : '500',
                              width: 30,
                              textAlign: 'center',
                            }}>
                              {String(r.weight)}
                            </Text>
                            {/* Point */}
                            <View style={{
                              position: 'absolute',
                              left: x - 5,
                              top: y - 5,
                              width: isLast ? 12 : 8,
                              height: isLast ? 12 : 8,
                              borderRadius: isLast ? 6 : 4,
                              backgroundColor: isLast ? '#fff' : 'rgba(255,255,255,0.7)',
                            }} />
                          </React.Fragment>
                        );
                      })}
                      {/* Date labels at bottom */}
                      {records.map((r, i) => (
                        <Text
                          key={`label-${i}`}
                          style={{
                            position: 'absolute',
                            left: i * stepX - 12,
                            top: chartHeight + 4,
                            fontSize: FONT_SMALL(),
                            color: 'rgba(255,255,255,0.8)',
                            width: 24,
                            textAlign: 'center',
                          }}
                        >
                          {r.date.slice(8)}
                        </Text>
                      ))}
                    </View>
                  );
                })()}
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
              <Text style={{ fontSize: FONT_BODY(), color: 'rgba(255,255,255,0.8)' }}>
                {T('bodyWeightNoData')}
              </Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={onShowWeightTrend}
        activeOpacity={0.85}
        style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]}
      >
        <Text style={{ fontSize: FONT_BODY(), fontWeight: '700', color: '#3b82f6' }}>{T('bodyMoreWeightTrend')}</Text>
      </TouchableOpacity>
    </View>
  );
}
