import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Gesture handling via native touch events (no gesture handler library)
import Svg, { G, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../navigation/types';
import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/useAppStore';
import { useTheme } from '../../../components/UI';
import { FONT_BODY, FONT_SMALL } from '@egoless-do/core';
import NodeDetailPanel from './NodeDetailPanel';
import InsightsPanel from './InsightsPanel';
import StatsBar from './StatsBar';

// SVG viewBox dimensions (logical coordinate space)
const VB_W = 800;
const VB_H = 1200;

// Node types
export type NodeType = 'reflection' | 'plan' | 'habit' | 'trail' | 'planItem';

export interface RelationNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  data: Record<string, unknown>;
}

interface RelationEdge {
  from: string;
  to: string;
  type: string;
  label: string;
}

// Edge style types
type EdgeStyleType = 'related' | 'linked' | 'inspire' | 'evolve' | 'contrast' | 'respond' | 'same_tag' | 'contains' | 'belongs';

interface EdgeStyle {
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  label: string;
  thickness: number;
}

const NODE_COLORS: Record<NodeType, string> = {
  reflection: '#3B82F6',
  plan: '#10B981',
  habit: '#F59E0B',
  trail: '#06B6D4',
  planItem: '#8B5CF6',
};

const NODE_LABELS: Record<NodeType, string> = {
  reflection: '感念',
  plan: '计划',
  habit: '习惯',
  trail: '思维脉络',
  planItem: '计划任务',
};

const NODE_ICONS: Record<NodeType, string> = {
  reflection: '💭',
  plan: '📋',
  habit: '🌱',
  trail: '🧵',
  planItem: '📌',
};

const EDGE_STYLES: Record<EdgeStyleType, EdgeStyle> = {
  contains: { color: '#06B6D4', lineStyle: 'solid', label: '包含', thickness: 3 },
  linked: { color: '#F59E0B', lineStyle: 'solid', label: '关联', thickness: 2 },
  related: { color: '#3B82F6', lineStyle: 'solid', label: '相关', thickness: 2 },
  inspire: { color: '#8B5CF6', lineStyle: 'dashed', label: '启发', thickness: 2 },
  evolve: { color: '#8B5CF6', lineStyle: 'dashed', label: '演进', thickness: 2 },
  contrast: { color: '#8B5CF6', lineStyle: 'dashed', label: '对比', thickness: 2 },
  respond: { color: '#8B5CF6', lineStyle: 'dashed', label: '回应', thickness: 2 },
  same_tag: { color: '#9CA3AF', lineStyle: 'dotted', label: '同标签', thickness: 1 },
  belongs: { color: '#06B6D4', lineStyle: 'dashed', label: '所属', thickness: 2 },
};

const DASH_PATTERNS: Record<string, string> = {
  dashed: '8,4',
  dotted: '2,4',
};

interface RelationContext {
  type: 'plan' | 'habit' | 'reflection' | 'trail' | 'planItem';
  id: string;
}

export default function RelationMapView() {
  const TH = useTheme();
  const P = TH.primary;
  const { plans, planItems: storePlanItems, reflections: storeReflections, thoughtTrails: storeThoughtTrails, habits: storeHabits, reflectionLinks: storeReflectionLinks } = useAppStore(useShallow(s => ({
    plans: s.plans,
    planItems: s.planItems,
    reflections: s.reflections,
    thoughtTrails: s.thoughtTrails,
    habits: s.habits,
    reflectionLinks: s.reflectionLinks,
  })));
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  const context = (route.params as { context?: RelationContext } | undefined)?.context;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [renderTick, setRenderTick] = useState(0);

  // Refs for gesture handler (synchronous access)
  const nodesRef = useRef<RelationNode[]>([]);
  const nodeMapRef = useRef<Map<string, RelationNode>>(new Map());
  const edgesRef = useRef<RelationEdge[]>([]);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const selectedNodeRef = useRef<string | null>(null);
  const containerLayoutRef = useRef({ w: 1, h: 1 });
  const draggingNodeIdRef = useRef<string | null>(null);
  const fixedNodeIdsRef = useRef<Set<string>>(new Set());
  const simulationRunningRef = useRef(true);
  const nodesAtPanStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const shouldRenderRef = useRef(true);
  const contextNodeRef = useRef<RelationNode | null>(null);

  // Sync state to refs
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);

  // Build graph data
  const { nodes, edges, insights, contextNode } = useMemo(() => {
    const nodes: RelationNode[] = [];
    const edges: RelationEdge[] = [];
    const nodeMap = new Map<string, RelationNode>();
    let contextNode: RelationNode | null = null;

    const addNode = (id: string, type: NodeType, label: string, data: Record<string, unknown>, x?: number, y?: number) => {
      if (nodeMap.has(id)) return nodeMap.get(id)!;
      const node: RelationNode = {
        id,
        type,
        label: label.slice(0, 20) + (label.length > 20 ? '...' : ''),
        x: x ?? VB_W / 2 + (Math.random() - 0.5) * VB_W * 0.6,
        y: y ?? VB_H / 2 + (Math.random() - 0.5) * VB_H * 0.4,
        vx: 0, vy: 0,
        color: NODE_COLORS[type],
        size: type === 'reflection' ? 30 : 40,
        data,
      };
      nodes.push(node);
      nodeMap.set(id, node);
      return node;
    };

    const addEdge = (from: string, to: string, type: string, label: string) => {
      if (!edges.some(e => e.from === from && e.to === to && e.type === type)) {
        edges.push({ from, to, type, label });
      }
    };

    if (context) {
      switch (context.type) {
        case 'plan': {
          const plan = (plans ?? []).find(p => !p.deleted && p.id === context.id);
          if (!plan) break;
          const planNode = addNode(plan.id, 'plan', plan.name, plan, VB_W / 2, VB_H / 2);
          contextNode = planNode;
          const planItems = (storePlanItems ?? []).filter(pi => pi.planId === plan.id && !pi.deleted);
          planItems.forEach(item => {
            addNode(item.id, 'planItem', item.name, item);
            addEdge(plan.id, item.id, 'contains', '包含');
            if (item.reflectionId) {
              const reflection = (storeReflections ?? []).find(r => r.id === item.reflectionId);
              if (reflection && !reflection.deleted) {
                addNode(reflection.id, 'reflection', reflection.content, reflection);
                addEdge(reflection.id, item.id, 'related', '相关');
              }
            }
            if (item.trailId) {
              const trail = (storeThoughtTrails ?? []).find(t => t.id === item.trailId);
              if (trail && !trail.deleted) {
                addNode(trail.id, 'trail', trail.name, trail);
                addEdge(trail.id, item.id, 'related', '相关');
              }
            }
            if (item.linkConfig?.habitId) {
              const habit = (storeHabits ?? []).find(h => h.id === item.linkConfig!.habitId);
              if (habit && !habit.deleted) {
                addNode(habit.id, 'habit', habit.name, habit);
                addEdge(habit.id, item.id, 'linked', '关联');
              }
            }
          });
          break;
        }
        case 'habit': {
          const habit = (storeHabits ?? []).find(h => !h.deleted && h.id === context.id);
          if (!habit) break;
          const habitNode = addNode(habit.id, 'habit', habit.name, habit, VB_W / 2, VB_H / 2);
          contextNode = habitNode;
          const tagReflections = (storeReflections ?? []).filter(r =>
            !r.deleted && r.tags.some(t => t === `#${habit.name}` || t === habit.name)
          );
          tagReflections.forEach(reflection => {
            addNode(reflection.id, 'reflection', reflection.content, reflection);
            addEdge(reflection.id, habit.id, 'related', '相关');
          });
          const linkedPlanItems = (storePlanItems ?? []).filter(i =>
            !i.deleted && i.linkConfig?.habitId === habit.id
          );
          linkedPlanItems.forEach(item => {
            addNode(item.id, 'planItem', item.name, item);
            addEdge(habit.id, item.id, 'linked', '关联');
            const plan = (plans ?? []).find(p => p.id === item.planId);
            if (plan && !plan.deleted) {
              addNode(plan.id, 'plan', plan.name, plan);
              addEdge(plan.id, item.id, 'contains', '包含');
            }
          });
          break;
        }
        case 'reflection': {
          const reflection = (storeReflections ?? []).find(r => !r.deleted && r.id === context.id);
          if (!reflection) break;
          const reflectionNode = addNode(reflection.id, 'reflection', reflection.content, reflection, VB_W / 2, VB_H / 2);
          contextNode = reflectionNode;
          const relatedLinks = (storeReflectionLinks ?? []).filter(l =>
            !l.deleted && (l.fromId === reflection.id || l.toId === reflection.id)
          );
          relatedLinks.forEach(link => {
            const otherId = link.fromId === reflection.id ? link.toId : link.fromId;
            const other = (storeReflections ?? []).find(r => r.id === otherId);
            if (other && !other.deleted) {
              addNode(other.id, 'reflection', other.content, other);
              addEdge(link.fromId, link.toId, link.type, link.type);
            }
          });
          const sameTagReflections = (storeReflections ?? []).filter(r =>
            !r.deleted && r.id !== reflection.id && r.tags.some(t => reflection.tags.includes(t))
          ).slice(0, 3);
          sameTagReflections.forEach(r => {
            if (!nodeMap.has(r.id)) {
              addNode(r.id, 'reflection', r.content, r);
              addEdge(reflection.id, r.id, 'same_tag', '同标签');
            }
          });
          if (reflection.linkedPlanItemId) {
            const planItem = (storePlanItems ?? []).find(i => i.id === reflection.linkedPlanItemId);
            if (planItem && !planItem.deleted) {
              addNode(planItem.id, 'planItem', planItem.name, planItem);
              addEdge(reflection.id, planItem.id, 'related', '相关');
              const plan = (plans ?? []).find(p => p.id === planItem.planId);
              if (plan && !plan.deleted) {
                addNode(plan.id, 'plan', plan.name, plan);
                addEdge(plan.id, planItem.id, 'contains', '包含');
              }
            }
          }
          const containingTrails = (storeThoughtTrails ?? []).filter(
            t => !t.deleted && (t.reflectionIds ?? []).includes(reflection.id)
          );
          containingTrails.forEach(trail => {
            addNode(trail.id, 'trail', trail.name, trail);
            addEdge(trail.id, reflection.id, 'contains', '包含');
          });
          break;
        }
        case 'trail': {
          const trail = (storeThoughtTrails ?? []).find(t => !t.deleted && t.id === context.id);
          if (!trail) break;
          const trailNode = addNode(trail.id, 'trail', trail.name, trail, VB_W / 2, VB_H / 2);
          contextNode = trailNode;
          (trail.reflectionIds ?? []).forEach(reflectionId => {
            const reflection = (storeReflections ?? []).find(r => r.id === reflectionId);
            if (reflection && !reflection.deleted) {
              addNode(reflection.id, 'reflection', reflection.content, reflection);
              addEdge(trail.id, reflection.id, 'contains', '包含');
            }
          });
          (trail.linkedPlanItemIds ?? []).forEach(itemId => {
            const planItem = (storePlanItems ?? []).find(i => i.id === itemId);
            if (planItem && !planItem.deleted) {
              addNode(planItem.id, 'planItem', planItem.name, planItem);
              addEdge(trail.id, planItem.id, 'related', '相关');
              const plan = (plans ?? []).find(p => p.id === planItem.planId);
              if (plan && !plan.deleted) {
                addNode(plan.id, 'plan', plan.name, plan);
                addEdge(planItem.id, plan.id, 'linked', '关联');
              }
            }
          });
          const relatedTrailIds = new Set<string>();
          (storeThoughtTrails ?? []).forEach(t => {
            if (t.id === trail.id || t.deleted) return;
            if ((t.reflectionIds ?? []).some(rid => (trail.reflectionIds ?? []).includes(rid))) relatedTrailIds.add(t.id);
          });
          relatedTrailIds.forEach(tid => {
            const t = (storeThoughtTrails ?? []).find(tt => tt.id === tid);
            if (t && !t.deleted) {
              addNode(t.id, 'trail', t.name, t);
              addEdge(trail.id, t.id, 'related', '关联');
            }
          });
          break;
        }
        case 'planItem': {
          const planItem = (storePlanItems ?? []).find(i => i.id === context.id);
          if (!planItem || planItem.deleted) break;
          const planItemNode = addNode(planItem.id, 'planItem', planItem.name, planItem, VB_W / 2, VB_H / 2);
          contextNode = planItemNode;
          const plan = (plans ?? []).find(p => p.id === planItem.planId);
          if (plan && !plan.deleted) {
            addNode(plan.id, 'plan', plan.name, plan);
            addEdge(planItem.id, plan.id, 'linked', '关联');
          }
          if (planItem.reflectionId) {
            const reflection = (storeReflections ?? []).find(r => r.id === planItem.reflectionId);
            if (reflection && !reflection.deleted) {
              addNode(reflection.id, 'reflection', reflection.content, reflection);
              addEdge(reflection.id, planItem.id, 'related', '相关');
            }
          }
          if (planItem.trailId) {
            const trail = (storeThoughtTrails ?? []).find(t => t.id === planItem.trailId);
            if (trail && !trail.deleted) {
              addNode(trail.id, 'trail', trail.name, trail);
              addEdge(trail.id, planItem.id, 'related', '相关');
              (trail.reflectionIds ?? []).slice(0, 3).forEach(reflectionId => {
                const reflection = (storeReflections ?? []).find(r => r.id === reflectionId);
                if (reflection && !reflection.deleted) {
                  addNode(reflection.id, 'reflection', reflection.content, reflection);
                  addEdge(trail.id, reflection.id, 'contains', '包含');
                }
              });
            }
          }
          if (planItem.linkConfig?.habitId) {
            const habit = (storeHabits ?? []).find(h => h.id === planItem.linkConfig!.habitId);
            if (habit && !habit.deleted) {
              addNode(habit.id, 'habit', habit.name, habit);
              addEdge(habit.id, planItem.id, 'linked', '关联');
            }
          }
          break;
        }
      }
    }

    // Limit nodes
    const MAX_NODES = 20;
    if (nodes.length > MAX_NODES) {
      const edgeCounts = new Map<string, number>();
      edges.forEach(e => {
        edgeCounts.set(e.from, (edgeCounts.get(e.from) ?? 0) + 1);
        edgeCounts.set(e.to, (edgeCounts.get(e.to) ?? 0) + 1);
      });
      const keepIds = new Set<string>();
      if (contextNode) keepIds.add(contextNode.id);
      const sorted = nodes.filter(n => !keepIds.has(n.id)).sort((a, b) => (edgeCounts.get(b.id) ?? 0) - (edgeCounts.get(a.id) ?? 0));
      sorted.slice(0, MAX_NODES - keepIds.size).forEach(n => keepIds.add(n.id));
      nodes.splice(0, nodes.length, ...nodes.filter(n => keepIds.has(n.id)));
      edges.splice(0, edges.length, ...edges.filter(e => keepIds.has(e.from) && keepIds.has(e.to)));
    }

    const insights = generateInsights(nodes, edges, context?.type);
    return { nodes, edges, insights, contextNode };
  }, [plans, storePlanItems, storeReflections, storeThoughtTrails, storeHabits, storeReflectionLinks, context]);

  // Sync to refs
  useEffect(() => {
    nodesRef.current = nodes;
    const map = new Map<string, RelationNode>();
    nodes.forEach(n => map.set(n.id, n));
    nodeMapRef.current = map;
    edgesRef.current = edges;
    contextNodeRef.current = contextNode;
  }, [nodes, edges, contextNode]);

  // Node tap
  const handleNodeTap = useCallback((nodeId: string) => {
    setSelectedNode(nodeId === selectedNodeRef.current ? null : nodeId);
  }, []);

  // Navigate to detail
  const handleNavigateToDetail = useCallback((node: RelationNode) => {
    switch (node.type) {
      case 'plan':
        nav.navigate('PlanDetail', { planId: node.id });
        break;
      case 'habit':
        nav.navigate('HabitDetail', { habitId: node.id });
        break;
      case 'trail':
        nav.navigate('ThoughtTrailDetail', { trailId: node.id });
        break;
      case 'planItem': {
        const pi = (storePlanItems ?? []).find(i => !i.deleted && i.id === node.id);
        if (pi) nav.navigate('PlanDetail', { planId: pi.planId });
        break;
      }
      case 'reflection':
        break;
    }
  }, [nav, storePlanItems]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find(n => n.id === selectedNode) ?? null;
  }, [selectedNode, nodes]);

  const contextTitle = useMemo(() => {
    if (!contextNode) return '关系全景图';
    return `${NODE_LABELS[contextNode.type]}关系`;
  }, [contextNode]);

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;
    simulationRunningRef.current = true;
    let rafId: number;

    const simulate = () => {
      if (!simulationRunningRef.current) return;
      let totalEnergy = 0;
      const ns = nodesRef.current;

      for (let i = 0; i < ns.length; i++) {
        const node = ns[i];
        if (draggingNodeIdRef.current === node.id || fixedNodeIdsRef.current.has(node.id)) {
          node.vx = 0; node.vy = 0;
          continue;
        }
        let fx = 0, fy = 0;

        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const other = ns[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 50000 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        edgesRef.current.forEach(e => {
          let other: RelationNode | undefined;
          if (e.from === node.id) other = nodeMapRef.current.get(e.to);
          if (e.to === node.id) other = nodeMapRef.current.get(e.from);
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 100) * 0.05;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        const gravity = contextNodeRef.current && node.id === contextNodeRef.current.id ? 0.02 : 0.01;
        fx += (VB_W / 2 - node.x) * gravity;
        fy += (VB_H / 2 - node.y) * gravity;

        node.vx = (node.vx + fx) * 0.9;
        node.vy = (node.vy + fy) * 0.9;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(50, Math.min(VB_W - 50, node.x));
        node.y = Math.max(80, Math.min(VB_H - 100, node.y));
        totalEnergy += Math.abs(node.vx) + Math.abs(node.vy);
      }

      if (totalEnergy < 0.5) {
        simulationRunningRef.current = false;
        return;
      }

      // Trigger re-render (throttled)
      if (shouldRenderRef.current) {
        shouldRenderRef.current = false;
        setRenderTick(t => t + 1);
      } else {
        shouldRenderRef.current = true;
      }
      rafId = requestAnimationFrame(simulate);
    };

    rafId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(rafId);
  }, [nodes, edges, contextNode]);

  // Touch gesture handling (pan/pinch via native touch events on Svg background)
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    startTime: 0,
    moved: false,
    pinchActive: false,
    pinchStartDist: 0,
    pinchStartZoom: 1,
  });

  const handleTouchStart = useCallback((e: { nativeEvent: { touches: Array<{ pageX: number; pageY: number }> } }) => {
    const touches = e.nativeEvent.touches;
    const ts = touchState.current;

    // Pinch start (2+ fingers)
    if (touches.length >= 2) {
      const [t1, t2] = touches;
      const dist = Math.sqrt(
        Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2)
      );
      ts.pinchActive = true;
      ts.pinchStartDist = dist;
      ts.pinchStartZoom = zoomRef.current;
      return;
    }

    // Single finger - start pan
    const touch = touches[0];
    ts.startX = touch.pageX;
    ts.startY = touch.pageY;
    ts.startTime = Date.now();
    ts.moved = false;
    ts.startPanX = panOffsetRef.current.x;
    ts.startPanY = panOffsetRef.current.y;
    simulationRunningRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: { nativeEvent: { touches: Array<{ pageX: number; pageY: number }> } }) => {
    const touches = e.nativeEvent.touches;
    const ts = touchState.current;

    // Pinch zoom
    if (touches.length >= 2 && ts.pinchActive) {
      const [t1, t2] = touches;
      const dist = Math.sqrt(
        Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2)
      );
      const newZoom = Math.max(0.5, Math.min(2.0, ts.pinchStartZoom * (dist / ts.pinchStartDist)));
      zoomRef.current = newZoom;
      setZoom(newZoom);
      return;
    }

    // Single finger - pan canvas
    if (touches.length !== 1) return;
    const touch = touches[0];
    const dx = touch.pageX - ts.startX;
    const dy = touch.pageY - ts.startY;

    if (!ts.moved && (dx * dx + dy * dy) > 100) {
      ts.moved = true;
    }

    panOffsetRef.current = {
      x: ts.startPanX + dx,
      y: ts.startPanY + dy,
    };
    setPanOffset({ ...panOffsetRef.current });
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchState.current.pinchActive = false;
    simulationRunningRef.current = true;
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: TH.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={TH.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: TH.text }]}>{contextTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Context Info */}
      {contextNode && (
        <View style={[styles.contextInfo, { backgroundColor: `${contextNode.color}15`, borderColor: contextNode.color }]}>
          <Text style={styles.contextIcon}>{NODE_ICONS[contextNode.type]}</Text>
          <Text style={[styles.contextLabel, { color: TH.text }]} numberOfLines={1}>{contextNode.label}</Text>
          <Text style={[styles.contextType, { color: TH.sub }]}>{NODE_LABELS[contextNode.type]}</Text>
        </View>
      )}

      {/* SVG Graph */}
      <View
        style={styles.graphContainer}
        onLayout={(e) => {
          containerLayoutRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          pointerEvents="box-none"
        >
          <G transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map((edge, idx) => {
                const fromNode = nodeMapRef.current.get(edge.from);
                const toNode = nodeMapRef.current.get(edge.to);
                if (!fromNode || !toNode) return null;
                const edgeStyle = EDGE_STYLES[edge.type as EdgeStyleType] ?? EDGE_STYLES.related;
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;
                return (
                  <React.Fragment key={`edge-${idx}`}>
                    <Line
                      x1={fromNode.x} y1={fromNode.y}
                      x2={toNode.x} y2={toNode.y}
                      stroke={edgeStyle.color}
                      strokeWidth={edgeStyle.thickness}
                      strokeDasharray={DASH_PATTERNS[edgeStyle.lineStyle]}
                    />
                    {edgeStyle.label && (
                      <>
                        <Rect x={midX - 16} y={midY - 8} width={32} height={14} rx={3} fill="rgba(0,0,0,0.6)" />
                        <SvgText x={midX} y={midY + 3} textAnchor="middle" fill={edgeStyle.color} fontSize={9} fontWeight="500">
                          {edgeStyle.label}
                        </SvgText>
                      </>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const isContext = contextNode && node.id === contextNode.id;
                const isSelected = selectedNode === node.id;
                const r = isContext ? node.size * 0.6 : node.size / 2;
                const hitR = r + 20;
                const truncatedLabel = node.label.length > 8 ? node.label.slice(0, 8) + '..' : node.label;
                return (
                  <React.Fragment key={node.id}>
                    {/* Invisible larger hit area */}
                    <Circle
                      cx={node.x} cy={node.y} r={hitR}
                      fill="transparent"
                      onPress={() => handleNodeTap(node.id)}
                    />
                    <Circle
                      cx={node.x} cy={node.y} r={r}
                      fill={node.color}
                      stroke={isContext ? '#fff' : isSelected ? '#fff' : 'transparent'}
                      strokeWidth={isContext ? 4 : isSelected ? 3 : 0}
                      onPress={() => handleNodeTap(node.id)}
                    />
                    <SvgText x={node.x} y={node.y + 5} textAnchor="middle" fontSize={isContext ? 16 : 14}>
                      {NODE_ICONS[node.type]}
                    </SvgText>
                    <SvgText x={node.x} y={node.y + r + 14} textAnchor="middle" fill={TH.text} fontSize={10} fontWeight="500">
                      {truncatedLabel}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </G>
          </Svg>
        </View>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity onPress={() => { setZoom(z => { const n = Math.min(z + 0.2, 2); zoomRef.current = n; return n; }); }} style={styles.zoomButton}>
          <ZoomIn size={20} color={TH.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setZoom(z => { const n = Math.max(z - 0.2, 0.5); zoomRef.current = n; return n; }); }} style={styles.zoomButton}>
          <ZoomOut size={20} color={TH.text} />
        </TouchableOpacity>
      </View>

      {/* Selected Node Detail */}
      <NodeDetailPanel node={selectedNodeData} onNavigate={handleNavigateToDetail} />

      {/* Stats Summary */}
      <StatsBar nodes={nodes} />

      {/* Insights */}
      <InsightsPanel insights={insights} />
    </SafeAreaView>
  );
}

function generateInsights(nodes: RelationNode[], edges: RelationEdge[], contextType?: string): string[] {
  const insights: string[] = [];

  if (contextType === 'plan') {
    const rc = nodes.filter(n => n.type === 'reflection').length;
    if (rc > 0) insights.push(`关联了 ${rc} 条感念`);
    const hc = nodes.filter(n => n.type === 'habit').length;
    if (hc > 0) insights.push(`关联了 ${hc} 个习惯`);
  }
  if (contextType === 'habit') {
    const rc = nodes.filter(n => n.type === 'reflection').length;
    if (rc > 0) insights.push(`有 ${rc} 条相关感念`);
    const pc = nodes.filter(n => n.type === 'plan').length;
    if (pc > 0) insights.push(`关联了 ${pc} 个计划`);
  }
  if (contextType === 'reflection') {
    const lc = edges.filter(e => e.type === 'same_tag').length;
    if (lc > 0) insights.push(`有 ${lc} 条同标签感念`);
  }
  if (contextType === 'trail') {
    const rc = nodes.filter(n => n.type === 'reflection').length;
    if (rc > 0) insights.push(`包含 ${rc} 条感念`);
    const pc = nodes.filter(n => n.type === 'planItem').length;
    if (pc > 0) insights.push(`关联了 ${pc} 个计划任务`);
    const tc = nodes.filter(n => n.type === 'trail').length;
    if (tc > 0) insights.push(`发现 ${tc} 条关联脉络`);
  }
  if (contextType === 'planItem') {
    const types = new Set(nodes.filter(n => n.type !== 'planItem').map(n => n.type));
    if (types.size > 0) insights.push(`关联了 ${types.size} 种实体类型`);
    const total = nodes.filter(n => n.type !== 'planItem').length;
    if (total > 0) insights.push(`共 ${total} 个关联节点`);
  }

  return insights.slice(0, 3);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  contextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  contextIcon: { fontSize: 18 },
  contextLabel: { fontSize: FONT_BODY, fontWeight: '600', flex: 1 },
  contextType: { fontSize: FONT_SMALL },
  graphContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 8,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
