import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRootNavigation } from '../../navigation/hooks';
import { useAppStore } from '../../store/useAppStore';
import { useTheme, ScreenHeader, useT, PrimaryButton, OutlineButton } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_BADGE, FONT_STAT_SECTION, FONT_SMALL, dateStr } from '@egoless-do/core';
import { Dumbbell, Target, Edit3, ChevronRight, Check, X } from 'lucide-react-native';
import { calcBMI, calcBMR, calcGoalProgress, recommendStrategy, BODY_TAGS_PRESET, BODY_STRATEGIES, type BodyStrategy, type BodyGoal, type BodyPlan } from '@egoless-do/core';

const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const PART_OPTIONS = ['胸+三头', '背+二头', '腿+核心', '有氧', '肩+手臂', '全身', '休息'];

// ── Body Profile Card ──
function BodyProfileCard({ TH, profile, onEditAssessment }: { TH: any; profile: any; onEditAssessment: () => void }) {
  const bmi = calcBMI(profile.weight ?? 0, profile.height ?? 0);
  const bmr = calcBMR(profile.weight ?? 0, profile.height ?? 0, profile.age ?? 30, profile.gender ?? 'male');
  const bmiLabel = bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '偏胖' : '肥胖';
  const bmiColor = bmi < 18.5 ? '#3b82f6' : bmi < 24 ? '#10b981' : bmi < 28 ? '#f59e0b' : '#ef4444';

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
      <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: '#fff', marginBottom: 16 }}>🏋️ 身体档案</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            { label: '身高', value: profile.height ? `${profile.height}cm` : '-' },
            { label: '体重', value: profile.weight ? `${profile.weight}kg` : '-' },
            { label: 'BMI', value: bmi > 0 ? `${bmi}` : '-', sub: bmi > 0 ? bmiLabel : '' },
            { label: '体脂', value: profile.bodyFat ? `${profile.bodyFat}%` : '未设置' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: s.sub ? bmiColor : '#fff' }}>{s.value}</Text>
              <Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{s.label}</Text>
              {s.sub ? <Text style={{ fontSize: FONT_BADGE, color: bmiColor, marginTop: 2 }}>{s.sub}</Text> : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{profile.age ?? '-'}岁</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>年龄</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{profile.gender === 'female' ? '女' : '男'}</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>性别</Text></View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#fff' }}>{bmr > 0 ? `${bmr}` : '-'}</Text><Text style={{ fontSize: FONT_SUB, color: 'rgba(255,255,255,.5)' }}>基础代谢</Text></View>
        </View>

        {/* Self-assessment */}
        <TouchableOpacity onPress={onEditAssessment} style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.15)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: '#fff' }}>🗣️ 身体自评</Text>
            <Edit3 size={14} color="rgba(255,255,255,.6)" />
          </View>
          <Text style={{ fontSize: FONT_BODY, color: profile.selfAssessment ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.5)', lineHeight: 20 }}>
            {profile.selfAssessment || '点击添加身体自评...'}
          </Text>
          {(profile.bodyTags ?? []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {(profile.bodyTags ?? []).map((tag: string) => (
                <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: FONT_BADGE, color: '#fff' }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ── Assessment Edit Modal ──
function AssessmentModal({ visible, TH, profile, onClose, onSave }: { visible: boolean; TH: any; profile: any; onClose: () => void; onSave: (text: string, tags: string[]) => void }) {
  const [text, setText] = useState(profile.selfAssessment ?? '');
  const [tags, setTags] = useState<string[]>(profile.bodyTags ?? []);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>身体自评</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 8 }}>描述你目前的身体状况</Text>
          <TextInput
            style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, minHeight: 100, maxHeight: 150, textAlignVertical: 'top', marginBottom: 8 }}
            multiline maxLength={500} value={text} onChangeText={setText}
            placeholder="体能状况、疼痛部位、生活习惯..." placeholderTextColor={TH.sub}
          />
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'right', marginBottom: 16 }}>{text.length}/500</Text>
          <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>身体标签 (可选)</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {BODY_TAGS_PRESET.map(group => (
              <View key={group.category} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginBottom: 6 }}>{group.category}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {group.tags.map(tag => (
                    <TouchableOpacity key={tag} onPress={() => toggleTag(tag)}
                      style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: tags.includes(tag) ? '#10b981' : TH.border, backgroundColor: tags.includes(tag) ? '#10b98115' : 'transparent' }}>
                      <Text style={{ fontSize: FONT_BADGE, color: tags.includes(tag) ? '#10b981' : TH.text }}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <OutlineButton label="取消" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label="保存" onPress={() => { onSave(text, tags); onClose(); }} color="#10b981" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Goal Card ──
function GoalCard({ TH, goal, profile, onEdit }: { TH: any; goal: BodyGoal | undefined; profile: any; onEdit: () => void }) {
  const progress = calcGoalProgress(profile.weight, goal?.targetWeight, profile.weight);
  const strategyLabel = goal?.strategy ? (BODY_STRATEGIES.find(s => s.key === goal.strategy)?.nameKey ?? goal.strategy) : null;
  const recommended = recommendStrategy(profile.bodyTags ?? []);

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Target size={18} color="#8b5cf6" />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>调身目标</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#8b5cf615' }}>
          <Text style={{ fontSize: FONT_BADGE, color: '#8b5cf6' }}>{goal ? '编辑' : '设置'}</Text>
        </TouchableOpacity>
      </View>
      {!goal ? (
        <View>
          <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', paddingVertical: 16 }}>尚未设置调身目标</Text>
          {recommended && (
            <View style={{ backgroundColor: '#8b5cf610', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: FONT_SMALL, color: '#8b5cf6' }}>💡 根据你的自评标签，建议策略：</Text>
              <Text style={{ fontSize: FONT_SMALL, color: '#8b5cf6', fontWeight: '600' }}>{recommended}</Text>
            </View>
          )}
        </View>
      ) : (
        <View>
          {(profile.bodyTags ?? []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {(profile.bodyTags ?? []).slice(0, 4).map((tag: string) => (
                <Text key={tag} style={{ fontSize: FONT_SMALL, color: '#8b5cf6' }}>#{tag}</Text>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            {goal.targetWeight ? (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.text }}>{goal.targetWeight}kg</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>目标体重 (当前{profile.weight ?? '-'}kg)</Text>
              </View>
            ) : null}
            {goal.targetBodyFat ? (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: FONT_STAT_SECTION, fontWeight: '900', color: TH.text }}>{goal.targetBodyFat}%</Text>
                <Text style={{ fontSize: FONT_SUB, color: TH.sub }}>目标体脂 (当前{profile.bodyFat ?? '-'}%)</Text>
              </View>
            ) : null}
          </View>
          {goal.targetDate ? <Text style={{ fontSize: FONT_SUB, color: TH.sub, textAlign: 'center', marginBottom: 8 }}>目标日期: {goal.targetDate}</Text> : null}
          {strategyLabel && (
            <View style={{ backgroundColor: '#8b5cf615', borderRadius: 8, padding: 8, marginBottom: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_BADGE, color: '#8b5cf6', fontWeight: '600' }}>策略: {strategyLabel}</Text>
            </View>
          )}
          <View style={{ height: 6, backgroundColor: `${TH.border}80`, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${progress}%`, backgroundColor: '#8b5cf6', borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: FONT_SMALL, color: TH.sub, textAlign: 'center', marginTop: 4 }}>进度 {progress}%</Text>
        </View>
      )}
    </View>
  );
}

// ── Plan Card ──
function PlanCard({ TH, plans, onEdit, onPressSport }: { TH: any; plans: BodyPlan[]; onEdit: () => void; onPressSport: (sportKey: string) => void }) {
  const activePlans = plans.filter(p => !p.deleted);
  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Dumbbell size={18} color="#f59e0b" />
          <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text }}>调身方案</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f59e0b15' }}>
          <Text style={{ fontSize: FONT_BADGE, color: '#f59e0b' }}>{activePlans.length > 0 ? '编辑' : '设置'}</Text>
        </TouchableOpacity>
      </View>
      {activePlans.length === 0 ? (
        <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', paddingVertical: 16 }}>尚未设置训练方案</Text>
      ) : (
        <View>
          {WEEKDAY_NAMES.map((dayName, idx) => {
            const dayPlan = activePlans.find(p => p.weekday === idx + 1);
            if (!dayPlan) return null;
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < 6 ? 1 : 0, borderBottomColor: TH.border }}>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, width: 40 }}>{dayName}</Text>
                <Text style={{ fontSize: FONT_BODY, color: dayPlan.part === '休息' ? TH.sub : TH.text, flex: 1 }}>{dayPlan.part}</Text>
                {dayPlan.sportKey && dayPlan.part !== '休息' ? (
                  <TouchableOpacity onPress={() => onPressSport(dayPlan.sportKey!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: FONT_BADGE, color: '#f59e0b' }}>{dayPlan.sportKey}</Text>
                    <ChevronRight size={14} color="#f59e0b" />
                  </TouchableOpacity>
                ) : null}
                {dayPlan.note ? <Text style={{ fontSize: FONT_SMALL, color: TH.sub, marginLeft: 8 }} numberOfLines={1}>{dayPlan.note}</Text> : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Weekly Execution Card ──
function WeeklyExecCard({ TH, plans, exerciseLog }: { TH: any; plans: BodyPlan[]; exerciseLog: any[] }) {
  const activePlans = plans.filter(p => !p.deleted);
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon, 7=Sun
  const todayStr = dateStr(today);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - (todayDow - 1));
  const weekStartStr = dateStr(weekStart);

  const weekExercises = (exerciseLog ?? []).filter((e: any) => {
    if (e.deleted) return false;
    const d = new Date(e.ts ?? 0);
    return dateStr(d) >= weekStartStr && dateStr(d) <= todayStr;
  });

  let completedDays = 0;
  let totalPlanned = 0;
  let totalKcal = 0;

  return (
    <View style={{ backgroundColor: TH.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: TH.text, marginBottom: 12 }}>📊 本周执行情况</Text>
      {activePlans.length === 0 ? (
        <Text style={{ fontSize: FONT_BODY, color: TH.sub, textAlign: 'center', paddingVertical: 8 }}>设置训练方案后自动跟踪</Text>
      ) : (
        <View>
          {WEEKDAY_NAMES.map((dayName, idx) => {
            const weekday = idx + 1;
            const dayPlan = activePlans.find(p => p.weekday === weekday);
            if (!dayPlan) return null;
            const isPast = weekday <= todayDow;
            const isRest = dayPlan.part === '休息';
            if (!isRest) totalPlanned++;
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + idx);
            const dayStr = dateStr(dayDate);
            const matched = !isRest && weekExercises.some((e: any) => {
              const eDate = dateStr(new Date(e.ts ?? 0));
              return eDate === dayStr && (!dayPlan.sportKey || e.sportKey === dayPlan.sportKey);
            });
            if (matched) {
              completedDays++;
              const dayExercises = weekExercises.filter((e: any) => dateStr(new Date(e.ts ?? 0)) === dayStr);
              totalKcal += dayExercises.reduce((s: number, e: any) => s + (e.calories ?? 0), 0);
            }
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: FONT_SUB, color: isPast ? TH.text : TH.sub, width: 40 }}>{dayName}</Text>
                <Text style={{ fontSize: FONT_BODY, color: isRest ? TH.sub : TH.text, flex: 1 }}>{dayPlan.part}</Text>
                {isRest ? (
                  <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>休息</Text>
                ) : isPast ? (
                  matched ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Check size={14} color="#10b981" />
                      <Text style={{ fontSize: FONT_BADGE, color: '#10b981' }}>完成</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: FONT_BADGE, color: '#ef4444' }}>未完成</Text>
                  )
                ) : (
                  <Text style={{ fontSize: FONT_BADGE, color: TH.sub }}>待执行</Text>
                )}
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: TH.border }}>
            <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#f59e0b' }}>{completedDays}/{totalPlanned}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>完成天数</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: '#f59e0b' }}>{totalKcal}</Text><Text style={{ fontSize: FONT_SUB, color: TH.sub }}>消耗 kcal</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Goal Edit Modal ──
function GoalEditModal({ visible, TH, goal, profile, onClose, onSave }: { visible: boolean; TH: any; goal?: BodyGoal; profile: any; onClose: () => void; onSave: (data: any) => void }) {
  const [targetWeight, setTargetWeight] = useState(goal?.targetWeight?.toString() ?? '');
  const [targetBodyFat, setTargetBodyFat] = useState(goal?.targetBodyFat?.toString() ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [strategy, setStrategy] = useState<BodyStrategy | undefined>(goal?.strategy);
  const recommended = recommendStrategy(profile.bodyTags ?? []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>设置调身目标</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>目标体重 (kg)</Text>
            <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, marginBottom: 12 }} keyboardType="numeric" value={targetWeight} onChangeText={setTargetWeight} placeholder={`当前 ${profile.weight ?? '-'} kg`} placeholderTextColor={TH.sub} />
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>目标体脂率 (%) 可选</Text>
            <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, marginBottom: 12 }} keyboardType="numeric" value={targetBodyFat} onChangeText={setTargetBodyFat} placeholder={`当前 ${profile.bodyFat ?? '-'} %`} placeholderTextColor={TH.sub} />
            <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 6 }}>目标日期 (YYYY-MM-DD)</Text>
            <TextInput style={{ backgroundColor: TH.card, borderRadius: 12, padding: 12, color: TH.text, fontSize: FONT_BODY, marginBottom: 16 }} value={targetDate} onChangeText={setTargetDate} placeholder="2026-09-30" placeholderTextColor={TH.sub} />
            <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 8 }}>调身策略</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {BODY_STRATEGIES.map(s => (
                <TouchableOpacity key={s.key} onPress={() => setStrategy(s.key)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: strategy === s.key ? '#8b5cf6' : TH.border, backgroundColor: strategy === s.key ? '#8b5cf615' : 'transparent' }}>
                  <Text style={{ fontSize: FONT_BADGE, color: strategy === s.key ? '#8b5cf6' : TH.text, fontWeight: strategy === s.key ? '600' : '400' }}>{s.nameKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {recommended && !strategy && (
              <View style={{ backgroundColor: '#8b5cf610', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SMALL, color: '#8b5cf6' }}>💡 根据你的标签推荐: {recommended}</Text>
              </View>
            )}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <OutlineButton label="取消" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label="保存" onPress={() => { onSave({ targetWeight: parseFloat(targetWeight) || undefined, targetBodyFat: parseFloat(targetBodyFat) || undefined, targetDate, strategy }); onClose(); }} color="#8b5cf6" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Plan Edit Modal ──
function PlanEditModal({ visible, TH, plans, onClose, onSave }: { visible: boolean; TH: any; plans: BodyPlan[]; onClose: () => void; onSave: (plans: BodyPlan[]) => void }) {
  const [editingPlans, setEditingPlans] = useState<BodyPlan[]>(() => {
    const result: BodyPlan[] = [];
    for (let i = 1; i <= 7; i++) {
      const existing = plans.find(p => p.weekday === i && !p.deleted);
      result.push(existing ?? { id: `temp_${i}`, weekday: i, part: '', sportKey: '', note: '', updatedAt: 0, deleted: false } as BodyPlan);
    }
    return result;
  });

  const updatePlan = (idx: number, field: string, value: string) => {
    setEditingPlans(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: TH.cardSolid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_TITLE, fontWeight: '700', color: TH.text }}>调身方案</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TH.sub} /></TouchableOpacity>
          </View>
          <ScrollView>
            {editingPlans.map((plan, idx) => (
              <View key={idx} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: FONT_SUB, fontWeight: '600', color: TH.text, marginBottom: 6 }}>{WEEKDAY_NAMES[idx]}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {PART_OPTIONS.map(part => (
                    <TouchableOpacity key={part} onPress={() => updatePlan(idx, 'part', part)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: plan.part === part ? '#f59e0b' : TH.border, backgroundColor: plan.part === part ? '#f59e0b15' : 'transparent' }}>
                      <Text style={{ fontSize: FONT_SMALL, color: plan.part === part ? '#f59e0b' : TH.text }}>{part}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={{ backgroundColor: TH.card, borderRadius: 8, padding: 10, color: TH.text, fontSize: FONT_BODY }} value={plan.note ?? ''} onChangeText={v => updatePlan(idx, 'note', v)} placeholder="备注 (可选)" placeholderTextColor={TH.sub} />
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <OutlineButton label="取消" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label="保存方案" onPress={() => { onSave(editingPlans.filter(p => p.part)); onClose(); }} color="#f59e0b" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Page ──
export default function BodyScreen() {
  const nav = useRootNavigation();
  const TH = useTheme();
  const T = useT();
  const store = useAppStore();
  const profile = store.userProfile ?? {};
  const [showAssessment, setShowAssessment] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [showPlanEdit, setShowPlanEdit] = useState(false);

  const activeGoal = useMemo(() => (store.bodyGoals ?? []).find((g: BodyGoal) => !g.deleted), [store.bodyGoals]);
  const activePlans = useMemo(() => (store.bodyPlans ?? []).filter((p: BodyPlan) => !p.deleted), [store.bodyPlans]);

  const handleSaveAssessment = useCallback((text: string, tags: string[]) => {
    store.updateUserProfile({ selfAssessment: text, bodyTags: tags });
  }, [store]);

  const handleSaveGoal = useCallback((data: any) => {
    if (activeGoal) {
      store.updateBodyGoal(activeGoal.id, data);
    } else {
      store.addBodyGoal(data);
    }
  }, [activeGoal, store]);

  const handleSavePlans = useCallback((newPlans: BodyPlan[]) => {
    // Remove old plans and add new ones
    for (const p of activePlans) {
      store.removeBodyPlan(p.id);
    }
    for (const p of newPlans) {
      store.addBodyPlan({ weekday: p.weekday, part: p.part, sportKey: p.sportKey, note: p.note, goalId: activeGoal?.id });
    }
  }, [activePlans, activeGoal, store]);

  const handlePressSport = useCallback((sportKey: string) => {
    (nav as any).navigate('Sport', { sport: sportKey });
  }, [nav]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <ScreenHeader title="调身" onBack={() => nav.goBack()} />
        <BodyProfileCard TH={TH} profile={profile} onEditAssessment={() => setShowAssessment(true)} />
        <GoalCard TH={TH} goal={activeGoal} profile={profile} onEdit={() => setShowGoalEdit(true)} />
        <PlanCard TH={TH} plans={activePlans} onEdit={() => setShowPlanEdit(true)} onPressSport={handlePressSport} />
        <WeeklyExecCard TH={TH} plans={activePlans} exerciseLog={store.exerciseLog ?? []} />
      </ScrollView>
      <AssessmentModal visible={showAssessment} TH={TH} profile={profile} onClose={() => setShowAssessment(false)} onSave={handleSaveAssessment} />
      <GoalEditModal visible={showGoalEdit} TH={TH} goal={activeGoal} profile={profile} onClose={() => setShowGoalEdit(false)} onSave={handleSaveGoal} />
      <PlanEditModal visible={showPlanEdit} TH={TH} plans={activePlans} onClose={() => setShowPlanEdit(false)} onSave={handleSavePlans} />
    </SafeAreaView>
  );
}
