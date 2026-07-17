import json, os

OUT_DIR = "D:/MyProject/2026/egoless-do/.ua/intermediate"
os.makedirs(OUT_DIR, exist_ok=True)


def e(src, tgt, etype, weight):
    return {"source": src, "target": tgt, "type": etype, "direction": "forward", "weight": weight}


def fn(path, name, start, end, summary, tags, complexity, exported=False):
    return {"id": f"function:{path}:{name}", "type": "function", "name": name, "filePath": path,
            "lineRange": [start, end], "summary": summary, "tags": tags, "complexity": complexity}


def fnode(path, name, summary, tags, complexity, **extra):
    d = {"id": f"file:{path}", "type": "file", "name": name, "filePath": path,
         "summary": summary, "tags": tags, "complexity": complexity}
    d.update(extra)
    return d


def cnode(path, name, summary, tags, complexity, **extra):
    d = {"id": f"config:{path}", "type": "config", "name": name, "filePath": path,
         "summary": summary, "tags": tags, "complexity": complexity}
    d.update(extra)
    return d


def dnode(path, name, summary, tags, complexity, **extra):
    d = {"id": f"document:{path}", "type": "document", "name": name, "filePath": path,
         "summary": summary, "tags": tags, "complexity": complexity}
    d.update(extra)
    return d


def snode(path, name, summary, tags, complexity, **extra):
    d = {"id": f"service:{path}", "type": "service", "name": name, "filePath": path,
         "summary": summary, "tags": tags, "complexity": complexity}
    d.update(extra)
    return d


def pnode(path, name, summary, tags, complexity, **extra):
    d = {"id": f"pipeline:{path}", "type": "pipeline", "name": name, "filePath": path,
         "summary": summary, "tags": tags, "complexity": complexity}
    d.update(extra)
    return d


# ════════════════════════════════════════════════════════════════════════
# BATCH 26
# ════════════════════════════════════════════════════════════════════════
P = "packages/core/src/business/markerAggregation.ts"
PTEST = "packages/core/src/business/markerAggregation.test.ts"
PT = "packages/core/src/types/globalPulse.ts"

n26 = [
    fnode(PTEST, "markerAggregation.test.ts",
          "markerAggregation 聚合算法的单元测试，覆盖网格分组、聚合中心点计算与样式阈值。",
          ["test", "business", "global-pulse", "aggregation"], "simple"),
    fnode(P, "markerAggregation.ts",
          "全球脉动地图标记聚合纯函数，基于缩放级别网格化打卡坐标并计算聚合中心与样式。",
          ["business", "global-pulse", "aggregation", "pure-function", "map"], "moderate"),
    fnode(PT, "globalPulse.ts",
          "全球脉动功能类型定义，包含打卡记录、聚合标记、排行榜条目与活跃会话等接口。",
          ["type-definition", "global-pulse", "interface", "shared"], "moderate"),
    fn(PTEST, "makeCheckin", 5, 16, "构造 GlobalCheckin 测试桩对象，用于聚合算法测试输入。",
       ["test-helper", "global-pulse", "fixture"], "simple"),
    fn(P, "calculateClusterCenter", 51, 66, "计算一组打卡记录的经纬度平均中心点坐标。",
       ["business", "aggregation", "geometry"], "simple"),
    fn(P, "aggregateMarkers", 74, 128,
       "主聚合函数：按缩放级别网格化打卡记录，生成 ClusterMarker 列表。",
       ["business", "aggregation", "exported", "map"], "moderate"),
    fn(P, "shouldCluster", 133, 143,
       "判断两个标记在当前缩放级别是否应被聚合（相同网格 ID）。",
       ["business", "aggregation", "exported"], "simple"),
    fn(P, "getClusterStyle", 148, 166,
       "根据聚合数量返回标记大小、颜色与字号样式。",
       ["business", "aggregation", "exported", "style"], "simple"),
]

e26 = [
    e(f"file:{PTEST}", f"file:{P}", "imports", 0.7),
    e(f"file:{PTEST}", f"file:{PT}", "imports", 0.7),
    e(f"file:{P}", f"file:{PT}", "imports", 0.7),
    e(f"file:{PTEST}", f"function:{PTEST}:makeCheckin", "contains", 1.0),
    e(f"file:{P}", f"function:{P}:calculateClusterCenter", "contains", 1.0),
    e(f"file:{P}", f"function:{P}:aggregateMarkers", "contains", 1.0),
    e(f"file:{P}", f"function:{P}:shouldCluster", "contains", 1.0),
    e(f"file:{P}", f"function:{P}:getClusterStyle", "contains", 1.0),
    e(f"file:{P}", f"function:{P}:aggregateMarkers", "exports", 0.8),
    e(f"file:{P}", f"function:{P}:shouldCluster", "exports", 0.8),
    e(f"file:{P}", f"function:{P}:getClusterStyle", "exports", 0.8),
    e(f"function:{P}:aggregateMarkers", f"function:{P}:calculateClusterCenter", "calls", 0.8),
    e(f"function:{P}:shouldCluster", f"function:{P}:aggregateMarkers", "calls", 0.6),
]
B26 = {"nodes": n26, "edges": e26}


# ════════════════════════════════════════════════════════════════════════
# BATCH 27
# ════════════════════════════════════════════════════════════════════════
R = "packages/core/src/business/reflectionGraph.ts"
RTEST = "packages/core/src/business/reflectionGraph.test.ts"
RT = "packages/core/src/types/reflectionGraph.ts"

n27 = [
    fnode(RTEST, "reflectionGraph.test.ts",
          "reflectionGraph 关系图构建的单元测试，构造感念/计划/习惯输入并校验图输出。",
          ["test", "business", "graph", "reflections"], "simple"),
    fnode(R, "reflectionGraph.ts",
          "感念关系图纯函数，依据 context 将计划/习惯/感念/心轨/愿景构建为节点-边图并生成洞察。",
          ["business", "graph", "reflections", "pure-function", "insights"], "complex"),
    fnode(RT, "reflectionGraph.ts",
          "关系图构建的类型定义，包含 RelationNode、RelationEdge、GraphBuildInput/Output 等接口。",
          ["type-definition", "graph", "reflections", "interface", "shared"], "moderate"),
    fn(RTEST, "makeReflection", 10, 17,
       "构造感念测试桩对象（含 id/content/tags）。",
       ["test-helper", "reflections", "fixture"], "simple"),
    fn(RTEST, "makeInput", 19, 32,
       "构造 GraphBuildInput 测试桩，组合感念/计划/习惯等输入。",
       ["test-helper", "graph", "fixture"], "simple"),
    fn(R, "makeNode", 36, 56,
       "创建 RelationNode，截断超长标签并随机布局坐标。",
       ["graph", "reflections", "builder"], "simple"),
    fn(R, "addEdge", 59, 69,
       "向边列表追加 RelationEdge，跳过重复三元组。",
       ["graph", "reflections", "builder"], "simple"),
    fn(R, "buildPlanGraph", 72, 122,
       "plan 上下文图构建：创建计划节点并关联子项、感念与心轨边。",
       ["graph", "reflections", "builder"], "moderate"),
    fn(R, "buildHabitGraph", 125, 169,
       "habit 上下文图构建：创建习惯节点并关联愿景边。",
       ["graph", "reflections", "builder"], "moderate"),
    fn(R, "buildReflectionGraph", 172, 238,
       "reflection 上下文图构建：创建感念节点并关联标签与链接边。",
       ["graph", "reflections", "builder"], "moderate"),
    fn(R, "buildTrailGraph", 241, 297,
       "trail 上下文图构建：创建心轨节点并关联感念与计划项边。",
       ["graph", "reflections", "builder"], "moderate"),
    fn(R, "buildPlanItemGraph", 300, 358,
       "planItem 上下文图构建：创建计划项节点并与计划/感念/习惯连边。",
       ["graph", "reflections", "builder"], "moderate"),
    fn(R, "limitNodes", 364, 388,
       "按上下文节点截断图规模，保留关联节点与边。",
       ["graph", "reflections", "builder"], "simple"),
    fn(R, "generateInsights", 391, 433,
       "依据当前图结构与上下文类型生成洞察文本列表（导出）。",
       ["graph", "reflections", "insights", "exported"], "moderate"),
    fn(R, "buildRelationGraph", 436, 474,
       "主入口：组合各上下文图构建、节点截断与洞察生成，返回 GraphBuildResult（导出）。",
       ["graph", "reflections", "entry", "exported"], "moderate"),
    fn(R, "linkPlansToVisions", 477, 495,
       "建立计划节点到愿景节点的关联边。",
       ["graph", "reflections", "builder"], "simple"),
    fn(R, "linkHabitsToVisions", 498, 516,
       "建立习惯节点到愿景节点的关联边。",
       ["graph", "reflections", "builder"], "simple"),
]

e27 = [
    e(f"file:{RTEST}", f"file:{R}", "imports", 0.7),
    e(f"file:{RTEST}", f"file:{RT}", "imports", 0.7),
    e(f"file:{R}", f"file:{RT}", "imports", 0.7),
    e(f"file:{RTEST}", f"function:{RTEST}:makeReflection", "contains", 1.0),
    e(f"file:{RTEST}", f"function:{RTEST}:makeInput", "contains", 1.0),
]
for name in ["makeNode", "addEdge", "buildPlanGraph", "buildHabitGraph", "buildReflectionGraph",
             "buildTrailGraph", "buildPlanItemGraph", "limitNodes", "generateInsights",
             "buildRelationGraph", "linkPlansToVisions", "linkHabitsToVisions"]:
    e27.append(e(f"file:{R}", f"function:{R}:{name}", "contains", 1.0))
e27 += [
    e(f"file:{R}", f"function:{R}:generateInsights", "exports", 0.8),
    e(f"file:{R}", f"function:{R}:buildRelationGraph", "exports", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:buildPlanGraph", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:buildHabitGraph", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:buildReflectionGraph", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:buildTrailGraph", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:buildPlanItemGraph", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:linkPlansToVisions", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:linkHabitsToVisions", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:limitNodes", "calls", 0.8),
    e(f"function:{R}:buildRelationGraph", f"function:{R}:generateInsights", "calls", 0.8),
    e(f"function:{R}:buildPlanGraph", f"function:{R}:makeNode", "calls", 0.8),
    e(f"function:{R}:buildPlanGraph", f"function:{R}:addEdge", "calls", 0.8),
    e(f"function:{R}:buildReflectionGraph", f"function:{R}:makeNode", "calls", 0.8),
    e(f"function:{R}:buildTrailGraph", f"function:{R}:addEdge", "calls", 0.8),
    e(f"function:{RTEST}:makeInput", f"function:{RTEST}:makeReflection", "calls", 0.8),
]
B27 = {"nodes": n27, "edges": e27}


# ════════════════════════════════════════════════════════════════════════
# BATCH 28 — infra Dockerfile
# ════════════════════════════════════════════════════════════════════════
n28 = [
    snode("infra/docker/api/Dockerfile", "Dockerfile",
          "API 服务多阶段 Dockerfile：base(启用 corepack)→deps(安装依赖)→runner(复制并构建) 产出 node:20-alpine 生产镜像。",
          ["containerization", "infrastructure", "docker", "multi-stage", "deployment"],
          "moderate",
          languageNotes="多阶段构建分离构建依赖与运行时，减小镜像体积并加速 CI 构建。"),
]
e28 = [
    e("service:infra/docker/api/Dockerfile", "config:package.json", "deploys", 0.7),
]
B28 = {"nodes": n28, "edges": e28}


# ════════════════════════════════════════════════════════════════════════
# BATCH 29 — CI pipeline (sequence-only YAML, no data-flow edges)
# ════════════════════════════════════════════════════════════════════════
n29 = [
    pnode(".github/workflows/ci.yml", "ci.yml",
          "GitHub Actions CI/CD 工作流：lint/type-check → 单元集成测试 → 安全审计 → main 分支 EAS Android/iOS 预览构建。",
          ["ci-cd", "deployment", "testing", "security", "infrastructure"],
          "moderate"),
]
e29 = [
    e("pipeline:.github/workflows/ci.yml", "config:package.json", "triggers", 0.6),
    e("pipeline:.github/workflows/ci.yml", "config:turbo.json", "triggers", 0.6),
]
B29 = {"nodes": n29, "edges": e29}


# ════════════════════════════════════════════════════════════════════════
# BATCH 30 — root configs + docs
# ════════════════════════════════════════════════════════════════════════
n30 = [
    snode(".dockerignore", ".dockerignore",
          "Docker 构建忽略规则文件，排除 node_modules、git、.env 与构建产物等无关构建上下文。",
          ["containerization", "infrastructure", "docker", "configuration"], "simple"),
    cnode(".env.example", ".env.example",
          "环境变量模板，涵盖 PocketBase、SMTP、加密密钥、微信登录、Sentry、Expo/EAS 等配置说明。",
          ["configuration", "environment", "secrets", "documentation"], "complex"),
    dnode("AGENTS.md", "AGENTS.md",
          "项目宪法与工程规范：产品定位、核心原则、目录结构决策树、Forbidden Imports 红线、开发流程与 PR Review 清单。",
          ["documentation", "governance", "architecture", "entry-point", "conventions"], "complex"),
    dnode("CLAUDE.md", "CLAUDE.md",
          "Claude Memory 入口：描述项目、引用 memory 文件列表、指令与技能路由表。",
          ["documentation", "entry-point", "claude-memory", "conventions"], "simple"),
    dnode("PRIVACY_POLICY.md", "PRIVACY_POLICY.md",
          "隐私政策：感念/打卡/位置/健康数据的存储位置与上传承诺，匿名社区规则及数据删除方式。",
          ["documentation", "privacy", "policy", "legal"], "simple"),
    dnode("README.md", "README.md",
          "项目总览文档：平台支持、功能模块列表、技术架构、统一存储/同步架构、快速开始与测试说明。",
          ["documentation", "entry-point", "overview", "architecture"], "complex"),
    cnode("package.json", "package.json",
          "Turborepo 根包配置：定义 workspace 脚本、devDependencies、pnpm overrides 与依赖。",
          ["configuration", "build-system", "turbo", "workspace", "entry-point"], "moderate"),
    cnode("pnpm-workspace.yaml", "pnpm-workspace.yaml",
          "pnpm workspace 声明，指定 apps/mobile 与 packages/* 为工作区（排除 apps/web）。",
          ["configuration", "workspace", "pnpm", "infrastructure"], "simple"),
    cnode("skills-lock.json", "skills-lock.json",
          "已安装 skills 锁定文件：grill-me、improve-codebase-architecture、tdd 的来源与哈希。",
          ["configuration", "skills", "lockfile"], "simple"),
    cnode("tsconfig.json", "tsconfig.json",
          "TypeScript 根配置，继承 expo/tsconfig.base 并排除 _archive 与 node_modules。",
          ["configuration", "typescript", "build-system"], "simple"),
    cnode("turbo.json", "turbo.json",
          "Turborepo 任务定义：build 依赖链、输出缓存与 dev/test/lint/type-check 任务。",
          ["configuration", "build-system", "turbo", "ci-cd"], "simple"),
]
e30 = [
    e("service:.dockerignore", "service:infra/docker/api/Dockerfile", "related", 0.5),
    e("config:.env.example", "config:package.json", "related", 0.5),
    e("config:turbo.json", "config:package.json", "configures", 0.6),
    e("config:turbo.json", "config:pnpm-workspace.yaml", "depends_on", 0.6),
    e("config:tsconfig.json", "config:package.json", "related", 0.5),
    e("config:pnpm-workspace.yaml", "config:package.json", "depends_on", 0.6),
    e("document:CLAUDE.md", "document:README.md", "related", 0.5),
    e("document:AGENTS.md", "document:README.md", "documents", 0.5),
    e("document:AGENTS.md", "config:package.json", "documents", 0.5),
    e("document:PRIVACY_POLICY.md", "document:README.md", "related", 0.5),
    e("document:README.md", "config:package.json", "documents", 0.5),
    e("document:README.md", "document:CLAUDE.md", "related", 0.5),
    e("config:skills-lock.json", "config:package.json", "related", 0.5),
]
B30 = {"nodes": n30, "edges": e30}


# ── write outputs ──────────────────────────────────────────────────────────
batches = [(26, B26), (27, B27), (28, B28), (29, B29), (30, B30)]
for idx, b in batches:
    path = os.path.join(OUT_DIR, f"batch-{idx}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(b, f, ensure_ascii=False, indent=2)
    print(f"batch-{idx}: nodes={len(b['nodes'])}, edges={len(b['edges'])} → {path}")

# verify import-edge 1:1 coverage for code batches
import json as _json
with open("D:/MyProject/2026/egoless-do/.ua/tmp/ua-file-analyzer-input-26.json", encoding="utf-8") as _f:
    inp26 = _json.load(_f)
with open("D:/MyProject/2026/egoless-do/.ua/tmp/ua-file-analyzer-input-27.json", encoding="utf-8") as _f:
    inp27 = _json.load(_f)
expected = sum(len(v) for v in inp26["batchImportData"].values()) + sum(len(v) for v in inp27["batchImportData"].values())
actual = sum(1 for e in (e26+e27) if e["type"] == "imports")
print(f"import edges: expected={expected} actual={actual}")
