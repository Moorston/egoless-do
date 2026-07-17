import json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
PR = "_archive/web-legacy/src/components/"
BASE = "_archive/web-legacy/src/"

# (relpath, summary, tags, complexity, optional functions dict)
# functions dict: name -> (summary, tags, complexity)
ROWS = [
 (PR+"PrivacyPolicyPage.tsx","隐私政策静态页：展示应用隐私条款，含返回按钮。",["web-legacy","page","privacy","simple"],"simple",
   {"PrivacyPolicyPage":("渲染隐私政策正文与返回导航。",["privacy","page"],"simple")}),
 (PR+"ReflectionsTab.tsx","感念 Tab：含感念列表、搜索高亮、标签/心情筛选、排序、收藏(Pin)、关联(trails)、LineChart 趋势、TagManagerPanel/MoodManagerPanel、useReflections 数据源。",["web-legacy","reflection","tab","search","chart"],"complex",
   {"ReflectionsTab":("感念列表 + 搜索/筛选/排序/收藏 + 趋势图 + 标签/心情面板。",["reflection","search","chart"],"complex")}),
 (PR+"SettingsTab.tsx","设置 Tab：主题、语言、提醒、AI、数据统计图、分享、导入导出、清数据、注销等系统设置。",["web-legacy","settings","tab","system"],"moderate",
   {"SettingsTab":("渲染主题/语言/提醒/AI/危险区(清数据/注销)等设置项。",["settings","ui"],"moderate")}),
 (PR+"SportPage.tsx","运动主页面：运动全流程 (SportPrepPage→SportActivePage→SportReportPage)，含热量估算(estimateCalories/MET_MAP)与距离计算、高德地图。",["web-legacy","sport","flow","map"],"complex",
   {"SportPage":("运动流程状态机：准备→进行中→报告三阶段。",["sport","flow"],"complex"),"computeDistance":("根据轨迹坐标计算 GPS 距离。",["sport","gps"],"simple")}),
 (PR+"StarfieldBackground.tsx","星空背景动画组件：用 canvas 渲染粒子星场背景装饰。",["web-legacy","canvas","animation","background"],"moderate",
   {"StarfieldBackground":("canvas 粒子星空循环动画。",["canvas","animation"],"moderate")}),
 (PR+"StatsPage.tsx","统计页壳：薄封装，注入 THEMES 后委托 StatsTab 渲染。",["web-legacy","stats","page"],"simple",
   {"StatsPage":("统计页入口，渲染 StatsTab。",["stats","shell"],"simple")}),
 (PR+"StatsTab.tsx","统计 Tab：体重/热量/周跑量聚合图(LineChart/BarChart)、冥想/打卡/日历热力图(CalendarGrid)、shield/grace 统计。",["web-legacy","stats","chart","aggregate"],"moderate",
   {"StatsTab":("渲染体重/热量/跑量折线图与日历热力图。",["stats","chart"],"moderate")}),
 (PR+"StreakBreakPage.tsx","连续中断页：展示 streak 断裂洞察(周/月分布、恢复天数)与鼓励文案、MiniBarChart；提供恢复打卡引导。",["web-legacy","streak","insights","recovery"],"moderate",
   {"StreakBreakPage":("展示 streak 断裂分析与恢复建议。",["streak","insights"],"moderate"),"MiniBarChart":("小型柱状图子组件(分布可视化)。",["chart","mini"],"simple")}),
 (PR+"TagManagerPanel.tsx","标签管理面板：自定义标签增删改、排序(drag-reorder)、预设 TAGS_PRESET。",["web-legacy","tag","manager"],"simple",None),
 (PR+"charts/BarChart.tsx","柱状图组件：基于 CSS/Flex 渲染 x 轴标签与柱形，含 tooltip。",["web-legacy","chart","bar"],"simple",
   {"BarChart":("渲染柱形图与坐标轴、tooltip。",["chart","bar"],"simple")}),
 (PR+"charts/CalendarGrid.tsx","日历网格组件：月历翻页，标记打卡 done/grace 状态与今日高亮。",["web-legacy","chart","calendar"],"moderate",
   {"CalendarGrid":("渲染月历网格，标记每日打卡/grace。",["calendar","chart"],"moderate")}),
 (PR+"charts/HeatmapGrid.tsx","热力图网格组件：按周×日格子展示强度热力图(通用)。",["web-legacy","chart","heatmap"],"simple",
   {"HeatmapGrid":("渲染通用热力图网格(周×日强度)。",["heatmap","chart"],"simple")}),
 (PR+"charts/LineChart.tsx","折线图组件：基于 SVG 渲染折线、坐标轴标签与 tooltip。",["web-legacy","chart","line"],"simple",
   {"LineChart":("渲染 SVG 折线图、坐标轴与 tooltip。",["chart","line"],"simple")}),
 (PR+"helpers.tsx","UI/样式/Hooks 聚合导出(barrel)：re-export ./ui、./hooks、./styles。",["web-legacy","barrel","helpers"],"simple",None),
 (PR+"hooks/useT.ts","多语言 Hook：基于 store.language 返回 t(k,语言) 的柯里化函数。",["web-legacy","i18n","hook"],"simple",
   {"useT":("绑定当前语言的翻译函数。",["i18n","hook"],"simple")}),
 (PR+"hooks/useTheme.ts","主题 Hook：根据 store.theme 从 THEMES 映当前配色(TH/primary)。",["web-legacy","theme","hook"],"simple",
   {"useTheme":("缓存并返回当前主题配色对象。",["theme","hook"],"simple")}),
 (PR+"sport/SportActivePage.tsx","运动中页面：计时器(Play/Pause/±)、距离/卡路里/组数实时更新、fmt 时间格式化。",["web-legacy","sport","active","timer"],"moderate",
   {"SportActivePageInner":("运动中计时/距离/卡路里实时面板。",["sport","timer"],"moderate")}),
 (PR+"sport/SportPrepPage.tsx","运动准备页：选择运动类型/目标(mode: free/target)与预设 target 开始计数。",["web-legacy","sport","prep"],"simple",
   {"SportPrepPageInner":("配置运动类型/目标并进入运动中。",["sport","setup"],"simple")}),
 (PR+"sport/SportReportPage.tsx","运动报告页：展示本次运动总时长/距离/卡路里/配速(formatPace)与地图轨迹。",["web-legacy","sport","report"],"simple",
   {"SportReportPageInner":("渲染运动结束报告摘要。",["sport","summary"],"simple")}),
 (PR+"ui/Checkbox.tsx","复选框 UI 组件：主题色 + Check 图标。",["web-legacy","ui","checkbox"],"simple",
   {"Checkbox":("渲染主题色复选框。",["ui","checkbox"],"simple")}),
 (PR+"ui/ErrorBoundary.tsx","错误边界类组件：捕获 React 异常上报 Sentry 并展示降级 UI。",["web-legacy","ui","error-boundary","sentry"],"simple",
   {"ErrorBoundary":("componentDidCatch 上报 Sentry 并渲染 AlertTriangle 降级。",["error-boundary","sentry"],"simple")},
   ("ErrorBoundaryInner",("内部错误边界实现类。",["error-boundary","class"],"simple"))),
 (PR+"ui/LinkWorldBtn.tsx","跳转运动世界外链按钮组件(ChevronRight 指示)。",["web-legacy","ui","link"],"simple",
   {"LinkWorldBtn":("渲染外链跳转按钮。",["ui","link"],"simple")}),
 (PR+"ui/Modal.tsx","通用弹窗组件：createPortal + 遮罩 + 点击外部关闭。",["web-legacy","ui","modal"],"simple",
   {"Modal":("基于 createPortal 渲染遮罩弹窗，点击外部关闭。",["ui","modal"],"simple")}),
 (PR+"ui/RowItem.tsx","通用行项组件：标题/副文本/右侧插槽，主题色。",["web-legacy","ui","list-item"],"simple",
   {"RowItem":("渲染通用行项布局。",["ui","list"],"simple")}),
 (PR+"ui/Toggle.tsx","开关 UI 组件：主题色 Toggle。",["web-legacy","ui","toggle"],"simple",
   {"Toggle":("渲染主题色开关。",["ui","toggle"],"simple")}),
 (PR+"useDailyTodo.ts","每日待办 Hook：用 core.createDailyTodoHook 绑定 useWebStore 切片生成。",["web-legacy","hook","daily-todo"],"simple",None),
 (PR+"useFoodSearch.ts","食物搜索 Hook：基于 FOOD_PRESETS 关键词过滤 + FOOD_ICON_MAP 图标分类。",["web-legacy","hook","food","search"],"simple",
   {"useFoodSearch":("按关键字搜索食物预设并分类图标。",["food","search","hook"],"simple")}),
 (PR+"useOverlay.ts","覆盖层管理：OverlayContext + useOverlayState(24 种 overlayKey 开关) + useOverlay 访问器。",["web-legacy","overlay","context","hook"],"simple",
   {"useOverlayState":("管理 24 种 OverlayKey 的开关与属性状态。",["overlay","state"],"simple"),"useOverlay":("OverlayContext 访问器，未包裹则抛错。",["overlay","context"],"simple")}),
 (PR+"useReflections.ts","感念数据 Hook：分页/搜索/筛选(防抖)、排序、收藏、关联遍历。",["web-legacy","hook","reflection","search"],"complex",
   {"useReflections":("感念列表数据源：搜索、筛选、排序、分页与关联。",["reflection","hook"],"complex"),"useDebouncedValue":("输入防抖 Hook，用于搜索框。",["debounce","hook"],"simple")}),
 (PR+"useReminder.ts","提醒 Hook：到设定时间(remindTime)调用 Notification API 发送常驻提醒(30s 轮询)。",["web-legacy","hook","reminder","notification"],"simple",
   {"useReminder":("每分钟检查 remindTime 并发送浏览器通知。",["reminder","notification"],"simple")}),
 (BASE+"lib/amapLoader.ts","高德地图 SDK 加载器：单例 loadPromise、配置安全码、懒加载 @amap/amap-jsapi-loader。",["web-legacy","amap","loader","geo"],"simple",
   {"loadAMap":("单例加载高德 SDK 并返回 AMap 命名空间。",["amap","loader"],"simple")}),
 (BASE+"store/useWebStore.ts","Web 端 Zustand store：用 persist(localStorage)+noopAdapter 组合 18 个 slice(无同步)，含 DailyResetManager 每日重置、autoSyncPlanItems 触发、rehydrate 后 habit 状态检查。",["web-legacy","store","zustand","persist"],"moderate",None),
]

def build():
    out = {}
    for row in ROWS:
        rel, summ, tags, comp, fns = row[0], row[1], row[2], row[3], row[4]
        cls = row[5] if len(row) > 5 else None
        node = {"summary": summ, "tags": tags, "complexity": comp}
        if fns:
            fd = {}
            for name, (s, t, c) in fns.items():
                fd[name] = {"summary": s, "tags": t, "complexity": c}
            node["functions"] = fd
        if cls:
            node["classes"] = {cls[0]: {"summary": cls[1][0], "tags": cls[1][1], "complexity": cls[1][2]}}
        out[rel] = node
    return out

sem = build()
out = P/".ua/tmp/sem-batch13.json"
out.write_text(json.dumps(sem, ensure_ascii=False, indent=2), "utf-8")
json.loads(out.read_text("utf-8"))
print("batch 13 sem written + valid:", len(sem), "files")
