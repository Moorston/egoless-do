import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ZoomIn, ZoomOut, Brain } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../components/UI';
import { FONT_TITLE, FONT_BODY, FONT_SUB, FONT_SMALL, FONT_TINY } from '@egoless-do/core';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Node types
type NodeType = 'reflection' | 'plan' | 'habit';

interface RelationNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  data: any;
}

interface RelationEdge {
  from: string;
  to: string;
  type: string;
  label: string;
}

// Color map for node types
const NODE_COLORS: Record<NodeType, string> = {
  reflection: '#3B82F6',
  plan: '#10B981',
  habit: '#F59E0B',
};

const NODE_LABELS: Record<NodeType, string> = {
  reflection: '感念',
  plan: '计划',
  habit: '习惯',
};

const NODE_ICONS: Record<NodeType, string> = {
  reflection: '💭',
  plan: '📋',
  habit: '🌱',
};

// Context type for filtering
interface RelationContext {
  type: 'plan' | 'habit' | 'reflection';
  id: string;
}

export default function RelationMapView() {
  const TH = useTheme();
  const P = TH.primary;
  const store = useAppStore();
  const nav = useNavigation();
  const route = useRoute();

  // Get context from route params
  const context = (route.params as any)?.context as RelationContext | undefined;

  // State
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Build graph data based on context
  const { nodes, edges, insights, contextNode } = useMemo(() => {
    const nodes: RelationNode[] = [];
    const edges: RelationEdge[] = [];
    const nodeMap = new Map<string, RelationNode>();
    let contextNode: RelationNode | null = null;

    // Helper to add a node
    const addNode = (id: string, type: NodeType, label: string, data: any, x?: number, y?: number) => {
      if (nodeMap.has(id)) return nodeMap.get(id)!;
      const node: RelationNode = {
        id,
        type,
        label: label.slice(0, 20) + (label.length > 20 ? '...' : ''),
        x: x ?? SCREEN_WIDTH / 2 + (Math.random() - 0.5) * SCREEN_WIDTH * 0.6,
        y: y ?? SCREEN_HEIGHT / 2 + (Math.random() - 0.5) * SCREEN_HEIGHT * 0.4,
        vx: 0,
        vy: 0,
        color: NODE_COLORS[type],
        size: type === 'plan' || type === 'habit' ? 40 : 30,
        data,
      };
      nodes.push(node);
      nodeMap.set(id, node);
      return node;
    };

    // Helper to add an edge
    const addEdge = (from: string, to: string, type: string, label: string) => {
      // Avoid duplicate edges
      const exists = edges.some(e => e.from === from && e.to === to && e.type === type);
      if (!exists) {
        edges.push({ from, to, type, label });
      }
    };

    if (context) {
      // Context-based filtering: show related nodes only
      switch (context.type) {
        case 'plan': {
          const plan = (store.plans ?? []).find(p => p.id === context.id);
          if (!plan) break;

          // Add the plan as center node
          const planNode = addNode(plan.id, 'plan', plan.name, plan, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
          contextNode = planNode;

          // Find reflections linked to plan items
          const planItems = (store.planItems ?? []).filter(pi => pi.planId === plan.id && !pi.deleted);
          planItems.forEach(item => {
            if (item.reflectionId) {
              const reflection = (store.reflections ?? []).find(r => r.id === item.reflectionId);
              if (reflection && !reflection.deleted) {
                addNode(reflection.id, 'reflection', reflection.content, reflection);
                addEdge(reflection.id, plan.id, 'related', '相关');
              }
            }
          });

          // Find habits linked to plan items
          planItems.forEach(item => {
            if (item.linkConfig?.habitId) {
              const habit = (store.habits ?? []).find(h => h.id === item.linkConfig!.habitId);
              if (habit && !habit.deleted) {
                addNode(habit.id, 'habit', habit.name, habit);
                addEdge(habit.id, plan.id, 'linked', '关联');
              }
            }
          });
          break;
        }

        case 'habit': {
          const habit = (store.habits ?? []).find(h => h.id === context.id);
          if (!habit) break;

          // Add the habit as center node
          const habitNode = addNode(habit.id, 'habit', habit.name, habit, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
          contextNode = habitNode;

          // Find related reflections (from tags)
          const tagReflections = (store.reflections ?? []).filter(r =>
            !r.deleted && r.tags.some(t => t.includes(habit.name))
          );

          tagReflections.forEach(reflection => {
            addNode(reflection.id, 'reflection', reflection.content, reflection);
            addEdge(reflection.id, habit.id, 'related', '相关');
          });

          // Find plans that link to this habit
          const linkedPlanItems = (store.planItems ?? []).filter(i =>
            !i.deleted && i.linkConfig?.habitId === habit.id
          );
          linkedPlanItems.forEach(item => {
            const plan = (store.plans ?? []).find(p => p.id === item.planId);
            if (plan && !plan.deleted) {
              addNode(plan.id, 'plan', plan.name, plan);
              addEdge(plan.id, habit.id, 'linked', '关联');
            }
          });
          break;
        }

        case 'reflection': {
          const reflection = (store.reflections ?? []).find(r => r.id === context.id);
          if (!reflection) break;

          // Add the reflection as center node
          const reflectionNode = addNode(reflection.id, 'reflection', reflection.content, reflection, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
          contextNode = reflectionNode;

          // Find related reflections (from links)
          const relatedLinks = (store.reflectionLinks ?? []).filter(l =>
            !l.deleted && (l.fromId === reflection.id || l.toId === reflection.id)
          );
          relatedLinks.forEach(link => {
            const otherId = link.fromId === reflection.id ? link.toId : link.fromId;
            const other = (store.reflections ?? []).find(r => r.id === otherId);
            if (other && !other.deleted) {
              addNode(other.id, 'reflection', other.content, other);
              addEdge(link.fromId, link.toId, link.type, link.type);
            }
          });

          // Find same-tag reflections
          const sameTagReflections = (store.reflections ?? []).filter(r =>
            !r.deleted &&
            r.id !== reflection.id &&
            r.tags.some(t => reflection.tags.includes(t))
          ).slice(0, 3); // Limit to 3

          sameTagReflections.forEach(r => {
            if (!nodeMap.has(r.id)) {
              addNode(r.id, 'reflection', r.content, r);
              addEdge(reflection.id, r.id, 'same_tag', '同标签');
            }
          });

          // Find linked plan item
          if (reflection.linkedPlanItemId) {
            const planItem = (store.planItems ?? []).find(i => i.id === reflection.linkedPlanItemId);
            if (planItem && !planItem.deleted) {
              const plan = (store.plans ?? []).find(p => p.id === planItem.planId);
              if (plan && !plan.deleted) {
                addNode(plan.id, 'plan', plan.name, plan);
                addEdge(reflection.id, plan.id, 'related', '相关');
              }
            }
          }
          break;
        }
      }
    }

    // Generate insights
    const insights = generateInsights(nodes, edges, context?.type);

    return { nodes, edges, insights, contextNode };
  }, [store, context]);

  // Simple force-directed layout
  useEffect(() => {
    if (nodes.length === 0) return;

    const timer = setInterval(() => {
      const centerX = SCREEN_WIDTH / 2;
      const centerY = SCREEN_HEIGHT / 2;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let fx = 0, fy = 0;

        // Repulsion from other nodes
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        // Attraction along edges
        edges.forEach(e => {
          let other: RelationNode | undefined;
          if (e.from === node.id) other = nodes.find(n => n.id === e.to);
          if (e.to === node.id) other = nodes.find(n => n.id === e.from);
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 120) * 0.008;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Center gravity (stronger for context node)
        const gravity = contextNode && node.id === contextNode.id ? 0.02 : 0.005;
        fx += (centerX - node.x) * gravity;
        fy += (centerY - node.y) * gravity;

        // Update velocity
        node.vx = (node.vx + fx) * 0.85;
        node.vy = (node.vy + fy) * 0.85;

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounds
        node.x = Math.max(50, Math.min(SCREEN_WIDTH - 50, node.x));
        node.y = Math.max(100, Math.min(SCREEN_HEIGHT - 150, node.y));
      }
    }, 50);

    return () => clearInterval(timer);
  }, [nodes, edges, contextNode]);

  // Handle node tap
  const handleNodeTap = useCallback((nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
  }, [selectedNode]);

  // Navigate to detail
  const handleNavigateToDetail = useCallback((node: RelationNode) => {
    switch (node.type) {
      case 'plan':
        (nav as any).navigate('PlanDetail', { planId: node.id });
        break;
      case 'habit':
        (nav as any).navigate('HabitDetail', { habitId: node.id });
        break;
      case 'reflection':
        // 感念详情在当前页面展示，不需要导航
        break;
    }
  }, [nav]);

  // Get selected node details
  const selectedNodeData = useMemo(() => {
    if (!selectedNode) return null;
    return nodes.find(n => n.id === selectedNode);
  }, [selectedNode, nodes]);

  // Get context title
  const contextTitle = useMemo(() => {
    if (!contextNode) return '关系全景图';
    return `${NODE_LABELS[contextNode.type]}关系`;
  }, [contextNode]);

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
          <Text style={[styles.contextLabel, { color: TH.text }]} numberOfLines={1}>
            {contextNode.label}
          </Text>
          <Text style={[styles.contextType, { color: TH.sub }]}>
            {NODE_LABELS[contextNode.type]}
          </Text>
        </View>
      )}

      {/* Graph Area */}
      <View style={styles.graphContainer}>
        {/* Edges */}
        {edges.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          return (
            <View
              key={`edge-${idx}`}
              style={[
                styles.edge,
                {
                  left: fromNode.x,
                  top: fromNode.y,
                  width: Math.sqrt(
                    Math.pow(toNode.x - fromNode.x, 2) +
                    Math.pow(toNode.y - fromNode.y, 2)
                  ),
                  transform: [
                    { rotate: `${Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)}rad` }
                  ],
                  backgroundColor: TH.border,
                },
              ]}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isContext = contextNode && node.id === contextNode.id;
          return (
            <TouchableOpacity
              key={node.id}
              onPress={() => handleNodeTap(node.id)}
              onLongPress={() => handleNavigateToDetail(node)}
              style={[
                styles.node,
                {
                  left: node.x - node.size / 2,
                  top: node.y - node.size / 2,
                  width: node.size,
                  height: node.size,
                  borderRadius: node.size / 2,
                  backgroundColor: node.color,
                  borderWidth: isContext ? 4 : selectedNode === node.id ? 3 : 0,
                  borderColor: isContext ? '#fff' : selectedNode === node.id ? '#fff' : 'transparent',
                  transform: isContext ? [{ scale: 1.2 }] : [],
                },
              ]}
            >
              <Text style={styles.nodeIcon}>{NODE_ICONS[node.type]}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity onPress={() => setZoom(z => Math.min(z + 0.2, 2))} style={styles.zoomButton}>
            <ZoomIn size={20} color={TH.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setZoom(z => Math.max(z - 0.2, 0.5))} style={styles.zoomButton}>
            <ZoomOut size={20} color={TH.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Node Detail */}
      {selectedNodeData && (
        <View style={[styles.detailPanel, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailDot, { backgroundColor: selectedNodeData.color }]} />
            <Text style={[styles.detailType, { color: TH.sub }]}>
              {NODE_LABELS[selectedNodeData.type]}
            </Text>
          </View>
          <Text style={[styles.detailLabel, { color: TH.text }]} numberOfLines={2}>
            {selectedNodeData.label}
          </Text>
          <TouchableOpacity
            onPress={() => handleNavigateToDetail(selectedNodeData)}
            style={[styles.detailButton, { backgroundColor: P }]}
          >
            <Text style={styles.detailButtonText}>查看详情</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Summary */}
      <View style={[styles.statsBar, { backgroundColor: TH.card, borderColor: TH.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: P }]}>{nodes.filter(n => n.type === 'reflection').length}</Text>
          <Text style={[styles.statLabel, { color: TH.sub }]}>感念</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: P }]}>{nodes.filter(n => n.type === 'plan').length}</Text>
          <Text style={[styles.statLabel, { color: TH.sub }]}>计划</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: P }]}>{nodes.filter(n => n.type === 'habit').length}</Text>
          <Text style={[styles.statLabel, { color: TH.sub }]}>习惯</Text>
        </View>
      </View>

      {/* Insights */}
      {insights.length > 0 && (
        <View style={[styles.insightsPanel, { backgroundColor: TH.card, borderColor: TH.border }]}>
          <View style={styles.insightsHeader}>
            <Brain size={16} color={P} />
            <Text style={[styles.insightsTitle, { color: TH.text }]}>关联洞察</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {insights.map((insight, idx) => (
              <View key={idx} style={[styles.insightCard, { borderColor: TH.border }]}>
                <Text style={[styles.insightText, { color: TH.text }]}>{insight}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// Generate insights from graph data
function generateInsights(
  nodes: RelationNode[],
  edges: RelationEdge[],
  contextType?: string
): string[] {
  const insights: string[] = [];

  // Context-specific insights
  if (contextType === 'plan') {
    const reflectionNodes = nodes.filter(n => n.type === 'reflection');
    if (reflectionNodes.length > 0) {
      insights.push(`关联了 ${reflectionNodes.length} 条感念`);
    }
    const habitNodes = nodes.filter(n => n.type === 'habit');
    if (habitNodes.length > 0) {
      insights.push(`关联了 ${habitNodes.length} 个习惯`);
    }
  }

  if (contextType === 'habit') {
    const reflectionNodes = nodes.filter(n => n.type === 'reflection');
    if (reflectionNodes.length > 0) {
      insights.push(`有 ${reflectionNodes.length} 条相关感念`);
    }
    const planNodes = nodes.filter(n => n.type === 'plan');
    if (planNodes.length > 0) {
      insights.push(`关联了 ${planNodes.length} 个计划`);
    }
  }

  if (contextType === 'reflection') {
    const linkEdges = edges.filter(e => e.type === 'same_tag');
    if (linkEdges.length > 0) {
      insights.push(`有 ${linkEdges.length} 条同标签感念`);
    }
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
  contextIcon: {
    fontSize: 18,
  },
  contextLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    flex: 1,
  },
  contextType: {
    fontSize: FONT_SMALL,
  },
  graphContainer: {
    flex: 1,
    position: 'relative',
  },
  edge: {
    position: 'absolute',
    height: 2,
    transformOrigin: '0 0',
  },
  node: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  nodeIcon: {
    fontSize: 14,
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
  detailPanel: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailType: {
    fontSize: FONT_SMALL,
  },
  detailLabel: {
    fontSize: FONT_BODY,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailButton: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#fff',
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FONT_BODY,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_TINY,
    marginTop: 2,
  },
  insightsPanel: {
    padding: 12,
    borderTopWidth: 1,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightsTitle: {
    fontSize: FONT_SMALL,
    fontWeight: '600',
  },
  insightCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  insightText: {
    fontSize: FONT_SMALL,
  },
});
