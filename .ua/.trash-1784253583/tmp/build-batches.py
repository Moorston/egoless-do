import json, os

PROJECT = "D:/MyProject/2026/egoless-do"
os.makedirs(f"{PROJECT}/.ua/intermediate", exist_ok=True)

def rid(prefix, path):
    return f"{prefix}:{path}"

def doc_node(path, summary, tags, complexity, name=None):
    return {
        "id": rid("file", path),
        "type": "document",
        "name": name or path.rsplit("/", 1)[-1],
        "filePath": path,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }

def cfg_node(path, summary, tags, complexity, name=None):
    return {
        "id": rid("file", path),
        "type": "config",
        "name": name or path.rsplit("/", 1)[-1],
        "filePath": path,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }

def file_node(path, summary, tags, complexity, name=None):
    return {
        "id": rid("file", path),
        "type": "file",
        "name": name or path.rsplit("/", 1)[-1],
        "filePath": path,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    }

def rel(src_path, tgt_path):
    return {
        "source": rid("file", src_path),
        "target": rid("file", tgt_path),
        "type": "related",
        "direction": "forward",
        "weight": 0.5,
    }

def build_batch(nodes, edges):
    return {"nodes": nodes, "edges": edges}

# ============================================================
# BATCH 46 — trellis tasks: body-page-optimization
# ============================================================
t46 = ".trellis/tasks/archive/2026-07/07-15-body-page-optimization"
b46 = build_batch(
    nodes=[
        doc_node(
            f"{t46}/design.md",
            "调身页全面优化的技术设计文档，涵盖 Dashboard 翻新 (R1)、BodyFlow 流程增强 (R2)、训练计划升级 (R3)、SportPage 优化 (R4) 四个阶段的组件架构、状态机重构方案与文件变更清单。",
            ["documentation", "technical-design", "body-module", "architecture"],
            "complex"),
        doc_node(
            f"{t46}/implement.md",
            "调身页优化的执行计划文档，按 R1→R4 顺序拆解为具体实施步骤、阶段验证命令与风险缓解方案，支持每阶段独立提交与回滚。",
            ["documentation", "implementation-plan", "body-module", "rollout"],
            "moderate"),
        doc_node(
            f"{t46}/prd.md",
            "调身页优化的产品需求文档，列出优化目标、当前代码结构与已知 Bug、R1~R4 具体需求以及视觉风格与交互流程层面的关键决策。",
            ["documentation", "prd", "product-requirements", "body-module"],
            "moderate"),
        cfg_node(
            f"{t46}/task.json",
            "Trellis 任务元数据，标识 body-page-optimization 任务的 id、状态（completed）、优先级 P2、创建者与完成时间等基本信息。",
            ["configuration", "task-metadata", "trellis"],
            "simple",
            name="task.json"),
    ],
    edges=[
        rel(f"{t46}/task.json", f"{t46}/prd.md"),
        rel(f"{t46}/prd.md", f"{t46}/design.md"),
        rel(f"{t46}/design.md", f"{t46}/implement.md"),
    ],
)

# ============================================================
# BATCH 47 — _archive/web-legacy
# ============================================================
b47 = build_batch(
    nodes=[
        doc_node(
            "_archive/web-legacy/README.md",
            "已归档 Web Legacy 应用的说明文档，记录归档日期 (2026-07-05)、归档原因 (AR-03 业务逻辑已迁至 packages/core) 与原 Next.js PWA 目录结构。",
            ["documentation", "archive", "web-legacy"],
            "simple"),
        cfg_node(
            "_archive/web-legacy/package.json",
            "已归档 Web 应用的包配置，声明 Next.js 15 项目依赖（含 workspace 引用 @egoless-do/core、PWA/Sentry/Zustand）及 vitest 开发依赖。",
            ["configuration", "web-legacy", "dependencies"],
            "simple",
            name="package.json"),
        cfg_node(
            "_archive/web-legacy/tsconfig.json",
            "已归档 Web 应用的 TypeScript 配置，继承 packages/config 基础配置，启用 Next.js 插件并配置路径别名指向 core 与 src。",
            ["configuration", "typescript", "web-legacy"],
            "simple",
            name="tsconfig.json"),
    ],
    edges=[
        rel("_archive/web-legacy/README.md", "_archive/web-legacy/package.json"),
        rel("_archive/web-legacy/package.json", "_archive/web-legacy/tsconfig.json"),
    ],
)

# ============================================================
# BATCH 48 — Android XML resources
# ============================================================
base48 = "apps/mobile/android/app/src/main/res/values"
b48 = build_batch(
    nodes=[
        cfg_node(
            f"{base48}/colors.xml",
            "Android 颜色资源定义，声明 splashscreen_background、iconBackground 与主色（#0F0A1E 暗紫）等配色值。",
            ["configuration", "android", "resources"],
            "simple",
            name="colors.xml"),
        cfg_node(
            f"{base48}/strings.xml",
            "Android 字符串资源，定义应用名称「心流纪」与 expo 启动屏 resizeMode、状态栏 translucent 等配置项。",
            ["configuration", "android", "resources"],
            "simple",
            name="strings.xml"),
        cfg_node(
            f"{base48}/styles.xml",
            "Android 主题样式资源，定义 AppTheme（DayNight.NoActionBar）与 Theme.App.SplashScreen 启动屏主题，含状态栏颜色。",
            ["configuration", "android", "resources"],
            "simple",
            name="styles.xml"),
    ],
    edges=[
        rel(f"{base48}/colors.xml", f"{base48}/styles.xml"),
        rel(f"{base48}/strings.xml", f"{base48}/styles.xml"),
    ],
)

# ============================================================
# BATCH 49 — Android gradle build files
# ============================================================
b49 = build_batch(
    nodes=[
        cfg_node(
            "apps/mobile/android/build.gradle",
            "Android 顶层构建脚本，声明 buildscript 仓库与依赖（Android Gradle 插件、React Native Gradle 插件、Kotlin 插件），并应用 expo-root-project 与 react.rootproject 插件。",
            ["configuration", "android", "gradle"],
            "simple",
            name="build.gradle"),
        cfg_node(
            "apps/mobile/android/gradle.properties",
            "Gradle 构建属性配置，设定 JVM 内存、并行构建、Hermes 启用、新架构 (newArchEnabled) 与多架构打包 (armeabi-v7a/arm64/x86/x86_64) 等关键开关。",
            ["configuration", "android", "gradle"],
            "moderate",
            name="gradle.properties"),
        file_node(
            "apps/mobile/android/gradlew.bat",
            "Windows 平台的 Gradle Wrapper 批处理启动脚本 (gradlew.bat)，负责定位 JAVA_HOME、拼接 JVM 选项并启动 Gradle wrapper。",
            ["script", "gradle", "android", "wrapper"],
            "moderate",
            name="gradlew.bat"),
        cfg_node(
            "apps/mobile/android/settings.gradle",
            "Android 项目设置文件，通过 pluginManagement 解析 React Native 与 Expo Gradle 插件路径，配置 autolinking 并将 rootProject 命名为「心流纪」。",
            ["configuration", "android", "gradle"],
            "simple",
            name="settings.gradle"),
    ],
    edges=[
        rel("apps/mobile/android/gradlew.bat", "apps/mobile/android/gradle.properties"),
        rel("apps/mobile/android/settings.gradle", "apps/mobile/android/build.gradle"),
        rel("apps/mobile/android/build.gradle", "apps/mobile/android/gradle.properties"),
    ],
)

# ============================================================
# BATCH 50 — mobile app root configs
# ============================================================
b50 = build_batch(
    nodes=[
        cfg_node(
            "apps/mobile/app.json",
            "Expo 应用主配置，声明应用名「心流纪」/slug/bundleIdentifier、iOS 隐私权限描述（定位/健康/照片）、Android 权限与 expo-sqlite/Sentry 等插件。",
            ["configuration", "expo", "mobile"],
            "moderate",
            name="app.json"),
        cfg_node(
            "apps/mobile/eas.json",
            "EAS Build/Submit 构建配置，定义 development（内部分发）、preview（Android APK）、production（iOS 自增版本/Android app-bundle）三种构建 profile 与提交通道。",
            ["configuration", "eas", "build"],
            "simple",
            name="eas.json"),
        cfg_node(
            "apps/mobile/package.json",
            "mobile 应用入口包配置，声明 scripts（通过工作区 expo CLI 启动）、workspace 依赖 @egoless-do/core，以及 Expo ~54 / React Navigation / Zustand / Sentry 等运行时依赖。",
            ["configuration", "mobile", "dependencies"],
            "moderate",
            name="package.json"),
        cfg_node(
            "apps/mobile/tsconfig.json",
            "mobile 应用 TypeScript 配置，继承 packages/config 基础配置，指定 jsx 为 react-native，并通过路径别名指向 core 与 src。",
            ["configuration", "typescript", "mobile"],
            "simple",
            name="tsconfig.json"),
    ],
    edges=[
        rel("apps/mobile/app.json", "apps/mobile/eas.json"),
        rel("apps/mobile/package.json", "apps/mobile/app.json"),
        rel("apps/mobile/package.json", "apps/mobile/tsconfig.json"),
    ],
)

# ============================================================
# Write outputs
# ============================================================
batches = [(46, b46), (47, b47), (48, b48), (49, b49), (50, b50)]
for idx, obj in batches:
    out = f"{PROJECT}/.ua/intermediate/batch-{idx}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"batch-{idx}.json  nodes={len(obj['nodes'])} edges={len(obj['edges'])}")

# Self-validation: every edge target resolves to a node in its batch
for idx, obj in batches:
    ids = {n["id"] for n in obj["nodes"]}
    for e in obj["edges"]:
        assert e["source"] in ids, f"batch {idx}: source missing {e['source']}"
        assert e["target"] in ids, f"batch {idx}: target missing {e['target']}"
print("Self-validation passed.")
