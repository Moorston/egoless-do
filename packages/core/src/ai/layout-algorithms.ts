// ─── Force-directed Layout Algorithm ────────────────────────────

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

export interface LayoutConfig {
  repulsionForce: number;
  attractionForce: number;
  centerGravity: number;
  damping: number;
  minDistance: number;
  maxIterations: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  repulsionForce: 1500,
  attractionForce: 0.005,
  centerGravity: 0.01,
  damping: 0.85,
  minDistance: 50,
  maxIterations: 100,
};

// 计算两点距离
function distance(a: LayoutNode, b: LayoutNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) || 1;
}

// 应用力导向布局
export function applyForceLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  config: Partial<LayoutConfig> = {}
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 初始化位置（如果未设置）
  nodes.forEach(node => {
    if (node.x === 0 && node.y === 0) {
      node.x = width / 2 + (Math.random() - 0.5) * width * 0.5;
      node.y = height / 2 + (Math.random() - 0.5) * height * 0.5;
    }
  });

  // 迭代计算
  for (let iter = 0; iter < cfg.maxIterations; iter++) {
    let totalMovement = 0;

    // 计算斥力（所有节点对之间）
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;

        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // 斥力与距离平方成反比
        const force = cfg.repulsionForce / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      nodes[i].vx += fx;
      nodes[i].vy += fy;
    }

    // 计算引力（沿边）
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    edges.forEach(edge => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // 引力与距离成正比
      const force = (dist - 100) * cfg.attractionForce;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      from.vx += fx;
      from.vy += fy;
      to.vx -= fx;
      to.vy -= fy;
    });

    // 中心引力
    nodes.forEach(node => {
      node.vx += (width / 2 - node.x) * cfg.centerGravity;
      node.vy += (height / 2 - node.y) * cfg.centerGravity;
    });

    // 更新位置
    nodes.forEach(node => {
      // 应用阻尼
      node.vx *= cfg.damping;
      node.vy *= cfg.damping;

      // 限制速度
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > 50) {
        node.vx = (node.vx / speed) * 50;
        node.vy = (node.vy / speed) * 50;
      }

      // 更新位置
      node.x += node.vx;
      node.y += node.vy;

      // 边界约束
      const padding = node.size;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));

      // 计算总移动量
      totalMovement += Math.abs(node.vx) + Math.abs(node.vy);
    });

    // 如果移动量很小，提前结束
    if (totalMovement < nodes.length * 0.1) {
      break;
    }
  }
}

// 层次布局
export function applyHierarchicalLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number
): void {
  // 构建邻接表
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  
  edges.forEach(edge => {
    const c = children.get(edge.from) ?? [];
    c.push(edge.to);
    children.set(edge.from, c);

    const p = parents.get(edge.to) ?? [];
    p.push(edge.from);
    parents.set(edge.to, p);
  });

  // 找到根节点（没有父节点的节点）
  const roots = nodes.filter(n => !parents.has(n.id) || parents.get(n.id)!.length === 0);
  
  // BFS 分层
  const levels = new Map<string, number>();
  const queue: { id: string; level: number }[] = roots.map(r => ({ id: r.id, level: 0 }));
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (levels.has(id)) continue;
    levels.set(id, level);

    const c = children.get(id) ?? [];
    c.forEach(childId => {
      queue.push({ id: childId, level: level + 1 });
    });
  }

  // 处理未访问的节点
  nodes.forEach(node => {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  });

  // 计算每层的节点数
  const levelCounts = new Map<number, number>();
  levels.forEach(level => {
    levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
  });

  // 分配位置
  const levelIndices = new Map<number, number>();
  const maxLevel = Math.max(...levels.values());
  const levelHeight = height / (maxLevel + 1);

  nodes.forEach(node => {
    const level = levels.get(node.id) ?? 0;
    const index = levelIndices.get(level) ?? 0;
    const count = levelCounts.get(level) ?? 1;
    const levelWidth = width / (count + 1);

    node.x = levelWidth * (index + 1);
    node.y = levelHeight * (level + 0.5);

    levelIndices.set(level, index + 1);
  });
}

// 环形布局
export function applyCircularLayout(
  nodes: LayoutNode[],
  width: number,
  height: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });
}

// 网格布局
export function applyGridLayout(
  nodes: LayoutNode[],
  width: number,
  height: number
): void {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  nodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    node.x = cellWidth * (col + 0.5);
    node.y = cellHeight * (row + 0.5);
  });
}

// 节点聚合（大量节点时使用）
export function aggregateNodes(
  nodes: LayoutNode[],
  threshold: number
): LayoutNode[] {
  if (nodes.length <= threshold) return nodes;

  const aggregated: LayoutNode[] = [];
  const used = new Set<string>();

  nodes.forEach(node => {
    if (used.has(node.id)) return;

    const cluster: LayoutNode[] = [node];
    used.add(node.id);

    // 找附近的节点
    nodes.forEach(other => {
      if (used.has(other.id)) return;
      const dist = Math.sqrt(
        Math.pow(node.x - other.x, 2) + Math.pow(node.y - other.y, 2)
      );
      if (dist < 50) {
        cluster.push(other);
        used.add(other.id);
      }
    });

    // 创建聚合节点
    if (cluster.length > 1) {
      const avgX = cluster.reduce((sum, n) => sum + n.x, 0) / cluster.length;
      const avgY = cluster.reduce((sum, n) => sum + n.y, 0) / cluster.length;
      aggregated.push({
        id: `cluster_${node.id}`,
        x: avgX,
        y: avgY,
        vx: 0,
        vy: 0,
        size: Math.min(60, 20 + cluster.length * 5),
      });
    } else {
      aggregated.push(node);
    }
  });

  return aggregated;
}
