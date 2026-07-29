import { FONT_BODY, FONT_SMALL , FONT_TITLE, type Vision } from '@egoless-do/core';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, ZoomIn, ZoomOut } from 'lucide-react-native';
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../../../components/UI';
import type { RootStackParamList } from '../../../navigation/types';
import { useShallowStore } from '../../../store/useAppStore';


import InsightsPanel from './InsightsPanel';
import NodeDetailPanel from './NodeDetailPanel';
import StatsBar from './StatsBar';
import { useRelationGraph } from './hooks/useRelationGraph';
import type {
  RelationNode,
  RelationEdge,
  RelationContext,
  EdgeStyleType,
} from './types';
import { NODE_LABELS, NODE_ICONS, EDGE_STYLES } from './types';

// ── SVG 常量（UI 专属，不进入 core）─────────────────────────────────
const VB_W = 800;
const VB_H = 1200;

const DASH_PATTERNS: Record<string, string> = {
  dashed: '8,4',
  dotted: '2,4',
};

export default function RelationMapView() {
  const TH = useTheme();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  const context = (route.params as { context?: RelationContext } | undefined)?.context;

  // ── 数据层 ─────────────────────────────────────────────────────
  const { nodes, edges, insights, contextNode } = useRelationGraph(context);
  const { visions } = useShallowStore(s => ({ visions: s.visions }));

  // ── 状态层 ─────────────────────────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [, setRenderTick] = useState(0);

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
  const shouldRenderRef = useRef(true);
  const contextNodeRef = useRef<RelationNode | null>(null);

  // Sync state to refs
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);

  // Sync graph data to refs
  useEffect(() => {
    nodesRef.current = nodes;
    const map = new Map<string, RelationNode>();
    nodes.forEach(n => map.set(n.id, n));
    nodeMapRef.current = map;
    edgesRef.current = edges;
    contextNodeRef.current = contextNode;
  }, [nodes, edges, contextNode]);

  // ── 交互层 ─────────────────────────────────────────────────────
  const handleNodeTap = useCallback((nodeId: string) => {
    setSelectedNode(nodeId === selectedNodeRef.current ? null : nodeId);
  }, []);

  // Resolve linked vision for selected plan node
  const selectedPlanVision = useMemo(() => {
    if (!selectedNode) return null;
    const node = nodes.find(n => n.id === selectedNode);
    if (node?.type === 'plan') {
      const planData = node.data as Record<string, unknown> | undefined;
      const visionId = planData?.visionId as string | undefined;
      if (visionId) return (visions ?? []).find((v: Vision) => v.id === visionId && !v.deleted) ?? null;
    }
    return null;
  }, [selectedNode, nodes, visions]);

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
      case 'vision':
        nav.navigate('Vow');
        break;
      case 'planItem': {
        const pi = (nodes ?? []).find(n => n.id === node.id);
        if (pi && pi.data.planId) nav.navigate('PlanDetail', { planId: pi.data.planId as string });
        break;
      }
      case 'reflection':
        break;
    }
  }, [nav, nodes]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find(n => n.id === selectedNode) ?? null;
  }, [selectedNode, nodes]);

  const contextTitle = useMemo(() => {
    if (!contextNode) return '关系全景图';
    return `${NODE_LABELS[contextNode.type]}关系`;
  }, [contextNode]);

  // ── 力导向布局 ─────────────────────────────────────────────────
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

  // ── 触摸手势 ───────────────────────────────────────────────────
  const touchState = useRef({
    startX: 0, startY: 0,
    startPanX: 0, startPanY: 0,
    startTime: 0, moved: false,
    pinchActive: false, pinchStartDist: 0, pinchStartZoom: 1,
  });

  const handleTouchStart = useCallback((e: { nativeEvent: { touches: Array<{ pageX: number; pageY: number }> } }) => {
    const touches = e.nativeEvent.touches;
    const ts = touchState.current;

    if (touches.length >= 2) {
      const [t1, t2] = touches;
      const dist = Math.sqrt(Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2));
      ts.pinchActive = true;
      ts.pinchStartDist = dist;
      ts.pinchStartZoom = zoomRef.current;
      return;
    }

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

    if (touches.length >= 2 && ts.pinchActive) {
      const [t1, t2] = touches;
      const dist = Math.sqrt(Math.pow(t2.pageX - t1.pageX, 2) + Math.pow(t2.pageY - t1.pageY, 2));
      const newZoom = Math.max(0.5, Math.min(2.0, ts.pinchStartZoom * (dist / ts.pinchStartDist)));
      zoomRef.current = newZoom;
      setZoom(newZoom);
      return;
    }

    if (touches.length !== 1) return;
    const touch = touches[0];
    const dx = touch.pageX - ts.startX;
    const dy = touch.pageY - ts.startY;

    if (!ts.moved && (dx * dx + dy * dy) > 100) ts.moved = true;

    panOffsetRef.current = { x: ts.startPanX + dx, y: ts.startPanY + dy };
    setPanOffset({ ...panOffsetRef.current });
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchState.current.pinchActive = false;
    simulationRunningRef.current = true;
  }, []);

  // ── 渲染 ──────────────────────────────────────────────────────
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

        {/* Zoom controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              const newZoom = Math.min(2.0, zoomRef.current + 0.2);
              zoomRef.current = newZoom;
              setZoom(newZoom);
            }}
          >
            <ZoomIn size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              const newZoom = Math.max(0.5, zoomRef.current - 0.2);
              zoomRef.current = newZoom;
              setZoom(newZoom);
            }}
          >
            <ZoomOut size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <StatsBar nodes={nodes} />

      {/* Node detail */}
      {selectedNodeData && (
        <NodeDetailPanel
          node={selectedNodeData}
          onNavigate={() => handleNavigateToDetail(selectedNodeData)}
          linkedVision={selectedPlanVision}
        />
      )}

      {/* Insights */}
      <InsightsPanel insights={insights} />
    </SafeAreaView>
  );
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
    fontSize: FONT_TITLE(),
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
  contextIcon: { fontSize: FONT_TITLE() },
  contextLabel: { fontSize: FONT_BODY(), fontWeight: '600', flex: 1 },
  contextType: { fontSize: FONT_SMALL() },
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
