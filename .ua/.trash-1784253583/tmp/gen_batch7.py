#!/usr/bin/env python3
# Generate batch-7.json knowledge graph from extracted structural data.
import json

PROJECT = "D:/MyProject/2026/egoless-do"
full = json.load(open(f"{PROJECT}/.ua/tmp/batch-7-full.json", encoding="utf-8"))
results = json.load(open(f"{PROJECT}/.ua/tmp/ua-file-extract-results-7.json", encoding="utf-8"))

batch_imports = full["batchImportData"]

META = {
    "apps/mobile/src/features/reflections/trails/LinkReflectionModal.tsx": ("感念关联弹窗，允许用户选择关联类型（引发/演进/转折/回应/相关）将当前感念与历史感念建立联系，并附加备注。","trail modal reflection link","moderate"),
    "apps/mobile/src/features/reflections/trails/MindTrailEntryCard.tsx": ("感念心迹入口卡片组件，展示当前脉络数量并作为进入心迹主页的入口，使用 React.memo 优化渲染。","trail ui-component entry-card","moderate"),
    "apps/mobile/src/features/reflections/trails/MindTrailScreen.tsx": ("感念心迹主页，集成 AI 推荐脉络、智能查询、手动创建脉络以及忽略推荐模式的学习与持久化等核心功能。","trail ai smart-query recommendation screen","complex"),
    "apps/mobile/src/features/reflections/trails/QuickCreateTrailScreen.tsx": ("快速创建脉络页，支持按时间范围/标签/情绪筛选感念、多选感念、AI 分析流与洞察面板，最终串联生成新脉络。","trail ai selection screen","complex"),
    "apps/mobile/src/features/reflections/trails/ReflectionCheckItem.tsx": ("感念多选列表项组件，展示日期、情绪、标签与内容摘要，带勾选状态，用于快速创建脉络的感念选择。","trail ui-component check-item","simple"),
    "apps/mobile/src/features/reflections/trails/RelatedTrailsSection.tsx": ("相关脉络区块组件，按相似度百分比展示与当前脉络相关的其他脉络，点击可跳转。","trail ui-component related","simple"),
    "apps/mobile/src/features/reflections/trails/ReviewAIPanel.tsx": ("回顾 AI 面板，提供洞察与复盘两个子 Tab，支持生成、展开/折叠以及引导写笔记等功能。","trail ai review panel","complex"),
    "apps/mobile/src/features/reflections/trails/SmartQueryPanel.tsx": ("智能查询面板组件，展示解析中的加载态、智能提问气泡、查询结果与快速创建脉络入口。","trail smart-query panel","moderate"),
    "apps/mobile/src/features/reflections/trails/ThoughtTrailDetailScreen.tsx": ("思想脉络详情页，展示脉络时间线、笔记、计划任务、相关脉络与 AI 回顾面板，支持编辑名称/描述与删除等操作。","trail detail review timeline screen","complex"),
    "apps/mobile/src/features/reflections/trails/TrailOverviewCard.tsx": ("脉络概览卡片，展示感念数、笔记数、日期跨度与情绪变化趋势，数据为空时自动隐藏。","trail ui-component overview","simple"),
    "apps/mobile/src/features/reflections/trails/TrailPickerModal.tsx": ("脉络选择弹窗，展示所有脉络及其统计，支持将某条感念加入/移出脉络，或新建脉络。","trail modal picker","moderate"),
    "apps/mobile/src/features/reflections/trails/TrailSuggestionBanner.tsx": ("脉络推荐横幅，基于近 30 天感念计算推荐脉络并支持忽略，用户点击可跳转创建。","trail recommendation banner","moderate"),
    "apps/mobile/src/features/reflections/trails/index.ts": ("感念心迹模块桶文件（barrel），统一导出心迹相关屏幕、模态框与子组件。","trail barrel exports","simple"),
    "apps/mobile/src/features/settings/AISettingsScreen.tsx": ("AI 设置页，管理多模型配置（增删改、设默认、启用/禁用、连接测试），以及本地/云端/混合模式切换。","settings ai model-config screen","complex"),
    "apps/mobile/src/features/settings/PrivacyPolicyScreen.tsx": ("隐私政策展示页，以分区文本形式呈现应用隐私条款，属于静态内容屏幕。","settings privacy screen","simple"),
    "apps/mobile/src/features/settings/ProfileScreen.tsx": ("个人资料页，展示用户信息、修行数据摘要，并提供进入 AI 设置、回收站等入口。","settings profile screen","complex"),
    "apps/mobile/src/features/settings/RecycleBinScreen.tsx": ("回收站页，列出已删除项目并支持恢复，显示剩余保留天数倒计时。","settings recycle-bin screen","moderate"),
    "apps/mobile/src/features/settings/SettingsScreen.tsx": ("设置主页，集成提醒时间、同步冲突、通知、账户等多项设置入口与功能开关。","settings screen notifications","complex"),
    "apps/mobile/src/features/shared/components/MalaRing.tsx": ("念珠环形可视化组件，按 beadCount 均匀分布珠子并高亮已完成数量，支持中心标签。","shared ui-component visualization","moderate"),
    "apps/mobile/src/features/shared/hooks/useAudioCache.ts": ("音频缓存 hook，基于 expo-file-system 实现音频文件的本地下载、目录管理与缓存状态追踪。","shared audio custom-hook cache","moderate"),
    "apps/mobile/src/features/shared/utils/lazyModule.ts": ("懒加载模块工具，通过 require 动态加载与错误日志封装，创建单模块与批量模块的懒加载器。","shared lazy-load utility","simple"),
    "apps/mobile/src/features/sleep/DiaryModal.tsx": ("睡眠日记弹窗，录入就寝/起床时间、睡眠质量、身/心/灵状态与备注，并持久化到 store。","sleep modal diary","complex"),
    "apps/mobile/src/features/sleep/SleepEngine.tsx": ("睡眠引擎主屏幕，协调入睡屏障、感恩、报告等阶段，管理睡眠周期计时与通知调度。","sleep engine screen","complex"),
    "apps/mobile/src/features/sleep/SleepHistoryPage.tsx": ("睡眠历史页，提供统计卡片、热力图、详情弹窗与连续天数计算，含多个内部子组件。","sleep history stats screen","complex"),
    "apps/mobile/src/features/sleep/SleepScreen.tsx": ("睡眠模块入口屏幕，仅作标题占位与导航入口，属于轻量级容器组件。","sleep screen entry","simple"),
    "apps/mobile/src/features/sleep/hooks/useBarrierTimer.ts": ("入睡屏障计时 hook，管理多阶段练习倒计时、完成状态与阶段切换逻辑。","sleep custom-hook timer barrier","moderate"),
    "apps/mobile/src/features/sleep/pages/SleepBarrierPage.tsx": ("入睡屏障练习页，展示呼吸/冥想/持咒/阅读选项与倒计时动画，引导用户完成睡前仪式。","sleep barrier screen","moderate"),
    "apps/mobile/src/features/sleep/pages/SleepGratitudePage.tsx": ("睡眠感恩页，让用户对今日事项进行感恩记录，并选择睡眠质量星级。","sleep gratitude screen","moderate"),
    "apps/mobile/src/features/sleep/pages/SleepReportPage.tsx": ("睡眠报告页，汇总本次睡眠时长、质量评分与感恩记录，展示完成总结。","sleep report screen","moderate"),
    "apps/mobile/src/features/sleep/sleepStyles.ts": ("睡眠模块共享样式文件，集中定义睡眠相关组件的 StyleSheet 样式对象。","sleep styles shared","complex"),
    "apps/mobile/src/features/sleep/useSleepNotifications.ts": ("睡眠通知 hook，封装 expo-notifications 权限请求与睡前提醒调度逻辑。","sleep custom-hook notifications","moderate"),
    "apps/mobile/src/features/stats/StatsScreen.tsx": ("统计页，利用 BarChart/LineChart/CalendarGrid 等图表组件展示运动、修行等多维度数据。","stats charts screen","complex"),
    "apps/mobile/src/features/sutra/SutraHistoryScreen.tsx": ("经文历史页，按日期聚合展示诵经记录，支持按天查看累计次数与详细条目。","sutra history screen","moderate"),
}

FUNC_META = {
    "LinkReflectionModal":"感念关联弹窗主组件，管理关联类型选择、目标感念选择与备注输入。 trail modal moderate",
    "MindTrailEntryCard":"心迹入口卡片，展示脉络数量并提供进入心迹主页的入口。 trail ui-component simple",
    "MindTrailScreen":"心迹主页主组件，集成 AI 推荐、智能查询与创建脉络等核心逻辑。 trail ai screen complex",
    "QuickCreateTrailScreen":"快速创建主组件，支持筛选、多选感念与 AI 分析后生成脉络。 trail ai screen complex",
    "RelatedTrailsSection":"相关脉络区块，按相似度展示可跳转的相关脉络列表。 trail ui-component simple",
    "ReviewAIPanel":"AI 回顾面板，提供洞察与复盘双 Tab 及生成/引导写笔记功能。 trail ai panel complex",
    "SmartQueryPanel":"智能查询面板，展示解析态、提问气泡与查询结果。 trail smart-query panel moderate",
    "ThoughtTrailDetailScreen":"脉络详情主组件，展示时间线、笔记、计划与 AI 回顾面板。 trail detail screen complex",
    "TrailPickerModal":"脉络选择弹窗，支持将感念加入/移出脉络或新建脉络。 trail modal moderate",
    "TrailSuggestionBanner":"脉络推荐横幅，基于近期感念计算推荐并支持忽略。 trail recommendation moderate",
    "AISettingsScreen":"AI 设置主组件，管理多模型配置与运行模式切换。 settings ai screen complex",
    "PrivacyPolicyScreen":"隐私政策静态展示页。 settings privacy simple",
    "ProfileScreen":"个人资料主组件，展示用户信息与修行数据摘要。 settings profile screen complex",
    "getItemName":"回收站辅助函数，根据条目类型提取展示名称。 settings utility simple",
    "RecycleBinScreen":"回收站主组件，列出已删除项目并支持恢复。 settings recycle-bin screen moderate",
    "SettingsScreen":"设置主页主组件，集成提醒、同步、通知等多项设置。 settings screen complex",
    "MalaRing":"念珠环形可视化组件，均匀分布珠子并高亮已完成数量。 shared ui-component moderate",
    "useAudioCache":"音频缓存 hook，实现本地下载与缓存状态追踪。 shared audio custom-hook moderate",
    "createLazyModule":"创建单个懒加载模块，封装 require 与错误日志。 shared lazy-load utility simple",
    "createLazyModules":"批量创建懒加载模块映射。 shared lazy-load utility simple",
    "DiaryModal":"睡眠日记弹窗主组件，录入睡眠时间、质量与状态。 sleep modal complex",
    "SleepEngine":"睡眠引擎主组件，协调入睡屏障到报告的各阶段。 sleep engine screen complex",
    "calcStreak":"计算睡眠连续天数的辅助函数。 sleep utility simple",
    "StatsCard":"睡眠统计卡片子组件，展示平均时长、质量等聚合指标。 sleep stats moderate",
    "Heatmap":"睡眠热力图子组件，按日历格展示每日睡眠时长分布。 sleep stats moderate",
    "DetailModal":"睡眠详情弹窗子组件，展示单条睡眠记录详情并支持删除。 sleep modal complex",
    "SleepHistoryPage":"睡眠历史主组件，聚合统计、热力图与详情弹窗。 sleep history screen moderate",
    "mkStyles":"睡眠历史页样式生成函数，返回主题化的 StyleSheet 对象。 sleep styles complex",
    "SleepScreen":"睡眠模块入口容器组件。 sleep screen simple",
    "useBarrierTimer":"入睡屏障计时 hook，管理多阶段倒计时与阶段切换。 sleep custom-hook timer moderate",
    "SleepBarrierPage":"入睡屏障练习页，展示睡前仪式选项与倒计时动画。 sleep barrier screen moderate",
    "SleepGratitudePage":"睡眠感恩页，记录感恩事项与质量星级。 sleep gratitude screen moderate",
    "SleepReportPage":"睡眠报告页，汇总睡眠时长、质量评分与感恩记录。 sleep report screen moderate",
    "getNotifications":"动态导入 expo-notifications 并返回通知 API 的辅助函数。 sleep notifications utility simple",
    "useSleepNotifications":"睡眠通知 hook，封装权限请求与睡前提醒调度。 sleep custom-hook notifications moderate",
    "StatsScreen":"统计主组件，利用图表展示运动、修行等多维度数据。 stats charts screen complex",
    "SutraHistoryScreen":"经文历史主组件，按日期聚合展示诵经记录。 sutra history screen moderate",
}

def parse_func_meta(s):
    parts = s.rsplit(" ", 2)
    summary = parts[0]
    tags = parts[1].split()
    complexity = parts[2]
    return summary, tags, complexity

nodes = []
edges = []
file_ids = set()

for r in results["results"]:
    p = r["path"]
    file_ids.add(p)
    meta = META[p]
    summary, tags_str, complexity = meta[0], meta[1], meta[2]
    tags = tags_str.split()
    nodes.append({
        "id": f"file:{p}",
        "type": "file",
        "name": p.rsplit("/", 1)[-1],
        "filePath": p,
        "summary": summary,
        "tags": tags,
        "complexity": complexity,
    })

    # imports edges (1:1)
    for imp in batch_imports.get(p, []):
        edges.append({
            "source": f"file:{p}",
            "target": f"file:{imp}",
            "type": "imports",
            "direction": "forward",
            "weight": 0.7,
        })

    # function nodes + edges
    exports = {e["name"]: e for e in r.get("exports", [])}
    for f in r.get("functions", []):
        fname = f["name"]
        start = f["startLine"]
        end = f["endLine"]
        length = end - start + 1
        is_exported = fname in exports
        significant = (length >= 10) or is_exported
        if not significant:
            continue
        fmeta = FUNC_META.get(fname)
        if fmeta is None:
            # fallback
            fsummary = f"{fname} 函数"
            ftags = ["utility"]
            fcomp = "simple" if length < 50 else "moderate" if length < 200 else "complex"
        else:
            fsummary, ftags, fcomp = parse_func_meta(fmeta)
        fnode_id = f"function:{p}:{fname}"
        nodes.append({
            "id": fnode_id,
            "type": "function",
            "name": fname,
            "filePath": p,
            "lineRange": [start, end],
            "summary": fsummary,
            "tags": ftags,
            "complexity": fcomp,
        })
        edges.append({
            "source": f"file:{p}",
            "target": fnode_id,
            "type": "contains",
            "direction": "forward",
            "weight": 1.0,
        })
        if is_exported:
            edges.append({
                "source": f"file:{p}",
                "target": fnode_id,
                "type": "exports",
                "direction": "forward",
                "weight": 0.8,
            })

# cross-file calls edges from callGraph (confident cross-file references)
# Build a map of file -> exported function names for neighbor resolution
def build_cross_calls():
    # Map exported symbol -> node id
    export_map = {}  # (path, fname) -> node id
    for r in results["results"]:
        p = r["path"]
        for e in r.get("exports", []):
            export_map.setdefault((p, e["name"]), f"function:{p}:{e['name']}")

    # For each callGraph entry, detect cross-file calls via imported symbols.
    # We use batchImportData: if callee matches an exported symbol of an imported file, emit calls edge.
    # Build imported symbols per file from neighborMap
    imported = {}  # path -> set of symbol names
    for p, neighs in neighbor_map.items():
        s = set()
        for n in neighs:
            for sym in n.get("symbols", []):
                s.add(sym)
        imported[p] = s

    emitted = set()
    for r in results["results"]:
        p = r["path"]
        imps = batch_imports.get(p, [])
        imp_set = set(imps)
        impsyms = imported.get(p, set())
        for cg in r.get("callGraph", []):
            callee = cg["callee"]
            # skip React internals / obvious non-symbol
            if callee in ("useTheme","useT","useShallowStore","useState","useMemo","useCallback","useEffect","useRef","useNavigation","useRoute","useRootNavigation","useTabNavigation","require","import","Date.now","JSON.parse","JSON.stringify","Math.floor","Math.ceil","Math.round","Math.min","Math.max","Math.cos","Math.sin","String","parseInt","parseFloat","Array.from","Object.keys","Object.entries","clearTimeout","setTimeout","nav.goBack","nav.navigate","T","log.debug","log.error","log.warn","P","TH","setSelectedIds","setTrailName","setSearchQuery","setTimeRange","setSelectedTags","setSelectedMoods","setShowTimeDropdown","setShowTagDropdown","setShowMoodDropdown","setInputText","setSmartResult","setQueryResults","setShowQueryPanel","setIsSmartParsing","setIsLoadingRecs","setIsAILoading","setRefreshKey","setIgnoredVersion","setDismissed","setEditingName","setEditName","setEditingDesc","setEditDesc","setShowWriteNote","setGuidedQuestion","setShowEditNote","setEditingNote","setShowSelectReflection","setShowCreatePlan","setRefreshing","setTabIndex","setQuality","setGratitude","setNoteText","setWorkState","setBodyState","setMindState","setBedtimeStr","setWakeStr","setPage","setSkipThreshold","setShowPreview","setTrailName","setSelectedIds","setEditingModel","setFormName","setFormBaseUrl","setFormModel","setFormApiKey","setFormMaxTokens","setFormTemperature","setSelectedTemplate","setShowAddModal","setTestingModel","setTestResults","toggleTag","toggleMood","toggleSelect","handleSmartQuery","handleCloseQueryPanel","handleDeleteTrail","handleDismiss","handleRestore","handleSelectAll","handleDeselectAll","handleOnlyUnassigned","handleCreate","handleGoRecord","handleToggle","handleToggleModel","handleOpenEdit","handleTestConnection","handleSetDefault","handleDeleteModel","handleGenerateInsight","handleGenerateReview","handleSelectExisting","handleWriteNote","handleEditNote","handleCreatePlanFromReflection","handleStartEditName","handleFinishEditName","handleStartEditDesc","handleFinishEditDesc","handleSaveNoteAndClose","handlePlanCreateAndClose","handleConfirmReflections","onRefresh","onClose","onToggle","onSmartAnswer","onSmartQuery","onQuickCreate","onStartWrite","onGenerateInsight","onGenerateReview","onNavigateToTrail","getDescription","getDaysLeft","getItemName","getWeekday","formatMonth","formatTime","getWeekStart","renderStars","startOfDay","dateKey","mkStyles","getNotifications","getFS","getAudioDir","ensureAudioDir","localPath","createAnalysisMessages","createLazyModule","createLazyModules","parseHHMM","formatHHMM","calcStreak"):
                continue
            # If callee is an exported symbol of an imported file
            for imp in imps:
                nid = export_map.get((imp, callee))
                if nid:
                    key = (f"function:{p}:{cg['caller']}", nid)
                    if key not in emitted:
                        emitted.add(key)
                        edges.append({
                            "source": key[0],
                            "target": nid,
                            "type": "calls",
                            "direction": "forward",
                            "weight": 0.8,
                        })
                    break

neighbor_map = full.get("neighborMap", {})
build_cross_calls()

out = {"nodes": nodes, "edges": edges}
with open(f"{PROJECT}/.ua/intermediate/batch-7.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f"nodes={len(nodes)} edges={len(edges)}")
# validate
import_subtotal = sum(len(v) for v in batch_imports.values())
print(f"imports edges={sum(1 for e in edges if e['type']=='imports')} expected_imports={import_subtotal}")
