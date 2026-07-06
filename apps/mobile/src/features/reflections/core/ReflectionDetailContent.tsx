import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import { useRootNavigation } from '../../../navigation/hooks';
import { useT } from '../../../components/UI';
import { MIND_COLORS_EXTENDED, FONT_BODY, FONT_SUB, FONT_BUTTON, FONT_SMALL, dateStr, getTrailsByReflection, createLogger } from '@egoless-do/core';
import type { MindReflection } from '@egoless-do/core';
import { ArrowLeft, ExternalLink, Link, Pin, Network, MoreHorizontal } from 'lucide-react-native';

import { TrailPickerModal } from '../trails';

const log = createLogger('Reflections');

interface ReflectionDetailContentProps {
  reflectionId: string;
  onClose: () => void;
  onEdit?: (reflection: MindReflection) => void;
  onShare?: (reflection: MindReflection) => void;
  onCreatePlanItem?: (reflectionId: string) => void;
  onDelete?: (reflectionId: string) => void;
}

export default function ReflectionDetailContent({
  reflectionId,
  onClose,
  onEdit,
  onShare,
  onCreatePlanItem,
  onDelete,
}: ReflectionDetailContentProps) {
  const { reflections, thoughtTrails, planItems, deletePlanItem, unlinkReflectionFromPlanItem } = useShallowStore(s => ({
    reflections: s.reflections,
    thoughtTrails: s.thoughtTrails,
    planItems: s.planItems,
    deletePlanItem: s.deletePlanItem,
    unlinkReflectionFromPlanItem: s.unlinkReflectionFromPlanItem,
  }));
  const nav = useRootNavigation();
  const T = useT();
  const [showMore, setShowMore] = useState(false);
  const [showTrailPicker, setShowTrailPicker] = useState(false);

  const r = useMemo(() => (reflections ?? []).find(x => !x.deleted && x.id === reflectionId), [reflections, reflectionId]);

  const linkedTrails = useMemo(() => {
    if (!r) return [];
    return getTrailsByReflection(r.id, thoughtTrails ?? []);
  }, [r, thoughtTrails]);

  if (!r) return null;

  const linkedPlanItem = r.linkedPlanItemId
    ? (planItems ?? []).find(i => i.id === r.linkedPlanItemId && !i.deleted)
    : null;
  const colors: [string, string] = [r.colors?.[0] || MIND_COLORS_EXTENDED[0][0], r.colors?.[1] || MIND_COLORS_EXTENDED[0][1]];
  const isToday = dateStr(new Date(r.timestamp ?? 0)) === dateStr();

  const handleUnlink = () => {
    Alert.alert(T('reflUnlinkConfirmTitle'), T('reflUnlinkConfirmMessage'), [
      { text: T('cancel'), style: 'cancel' },
      { text: T('confirm'), style: 'destructive', onPress: () => {
        if (r.linkedPlanItemId) deletePlanItem(r.linkedPlanItemId);
        unlinkReflectionFromPlanItem(r.id);
        onClose();
      }},
    ]);
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end' }}>
      <TouchableOpacity activeOpacity={1} onPress={() => { if (showMore) setShowMore(false); else onClose(); }} style={{ flex: 1 }} />
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20, maxHeight: '95%' }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={onClose}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {r.isPinned && <Pin size={14} color="#fff" />}
            <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_SMALL }}>
              {new Date(r.timestamp ?? 0).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              {' '}
              {new Date(r.timestamp ?? 0).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <ScrollView>
          {/* Content */}
          <Text style={{ color: '#fff', fontSize: FONT_BODY, lineHeight: 28, marginBottom: 16 }}>{r.content}</Text>

          {/* Tags + Mood */}
          {(r.tags.length > 0 || r.mood) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {r.tags.map(tag => (
                <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#fff', fontSize: FONT_SMALL }}>{tag}</Text>
                </View>
              ))}
              {r.mood && (
                <View style={{ backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: FONT_SMALL }}>{r.mood}</Text>
                </View>
              )}
            </View>
          )}

          {/* Link */}
          {r.link && (
            <TouchableOpacity onPress={() => r.link && Linking.openURL(r.link).catch((e) => log.error(e))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Link size={14} color="rgba(255,255,255,.7)" />
              <Text style={{ color: 'rgba(255,255,255,.7)', fontSize: FONT_SMALL, textDecorationLine: 'underline', flex: 1 }} numberOfLines={2}>{r.link}</Text>
            </TouchableOpacity>
          )}

          {/* Linked plan item */}
          {linkedPlanItem && (
            <TouchableOpacity
              onPress={() => { onClose(); nav.navigate('PlanDetail', { planId: linkedPlanItem.planId }); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: 'rgba(255,255,255,.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
            >
              <ExternalLink size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: FONT_SMALL }} numberOfLines={1}>{linkedPlanItem.name}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {onEdit && (
            <TouchableOpacity onPress={() => { onClose(); onEdit(r); }}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.25)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('reflEditTitle')}</Text>
            </TouchableOpacity>
          )}
          {linkedTrails.length > 0 ? (
            <TouchableOpacity onPress={() => { onClose(); nav.navigate('ThoughtTrailDetail', { trailId: linkedTrails[0].id }); }}
              style={{ flex: 1, backgroundColor: 'rgba(139,92,246,.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('reflLinkedTrail')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowTrailPicker(true)}
              style={{ flex: 1, backgroundColor: 'rgba(139,92,246,.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('reflLinkTrail')}</Text>
            </TouchableOpacity>
          )}
          {r.linkedPlanItemId ? (
            <TouchableOpacity onPress={handleUnlink}
              style={{ flex: 1, backgroundColor: 'rgba(139,92,246,.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('reflUnlinkTask')}</Text>
            </TouchableOpacity>
          ) : onCreatePlanItem ? (
            <TouchableOpacity onPress={() => { onClose(); onCreatePlanItem(r.id); }}
              style={{ flex: 1, backgroundColor: 'rgba(16,185,129,.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: FONT_BUTTON, fontWeight: '600' }}>{T('reflCreateTask')}</Text>
            </TouchableOpacity>
          ) : null}
          <View style={{ position: 'relative' }}>
            <Pressable onPress={() => setShowMore(!showMore)}
              style={{ backgroundColor: 'rgba(255,255,255,.25)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' }}>
              <MoreHorizontal size={20} color="#fff" />
            </Pressable>
            {showMore && (
              <Pressable style={{ position: 'absolute', bottom: 52, right: 0, backgroundColor: 'rgba(0,0,0,.85)', borderRadius: 12, paddingVertical: 4, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 2 }}>
                <TouchableOpacity onPress={() => { setShowMore(false); onClose(); nav.navigate('RelationMap', { context: { type: 'reflection', id: reflectionId } }); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 }}>
                  <Network size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: FONT_BUTTON }}>{T('reflRelationMap')}</Text>
                </TouchableOpacity>
                {onShare && (
                  <TouchableOpacity onPress={() => { setShowMore(false); onClose(); onShare(r); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 }}>
                    <ExternalLink size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: FONT_BUTTON }}>{T('reflShare')}</Text>
                  </TouchableOpacity>
                )}
                {isToday && onDelete && (
                  <TouchableOpacity onPress={() => { setShowMore(false); onClose(); onDelete(r.id); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={{ color: '#ff6b6b', fontSize: FONT_BUTTON }}>{T('reflDelete')}</Text>
                  </TouchableOpacity>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>

      <TrailPickerModal
        visible={showTrailPicker}
        reflectionId={reflectionId}
        linkedTrailIds={new Set(linkedTrails.map(t => t.id))}
        onClose={() => setShowTrailPicker(false)}
      />
    </View>
  );
}
