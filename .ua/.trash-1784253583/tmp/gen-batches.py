import json, os

OUT_DIR = "D:/MyProject/2026/egoless-do/.ua/intermediate"

B56 = {
  "_archive/web-legacy/instrumentation-client.ts": {
    "summary": "Web 端 Sentry instrumentation 客户端桩文件，标记为客户端插装入口（当前为空实现，实际逻辑归档至 instrumentation.ts）。",
    "tags": ["archive","monitoring","sentry","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/instrumentation.ts": {
    "summary": "Next.js 服务端/边缘运行时 Sentry 插装注册文件，根据 NEXT_RUNTIME 初始化 Sentry（仅在生产启用追踪采样）。",
    "tags": ["archive","monitoring","sentry","web-legacy"],"complexity": "simple",
    "functions":[{"name":"register","startLine":3,"endLine":21,"summary":"按 NEXT_RUNTIME（nodejs/edge）分别初始化 Sentry，读取 DSN、环境、采样率。","tags":["monitoring","sentry","init"]}]
  },
  "_archive/web-legacy/next-env.d.ts": {
    "summary": "Next.js 自动生成的 TypeScript 环境声明文件，确保 TS 识别 Next.js 类型，禁止手动编辑。",
    "tags": ["archive","typescript","nextjs","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/next.config.ts": {
    "summary": "Next.js（归档 Web 端）核心构建配置：转译 core/pocketbase、Standalone 输出、生产注入 PWA（webpack）并以 Sentry 包裹。",
    "tags": ["archive","nextjs","config","sentry","pwa"],"complexity": "moderate"
  },
  "_archive/web-legacy/public/manifest.json": {
    "summary": "Web App 清单文件，定义心流纪 PWA 安装元数据（名称、图标、主题色、显示模式）。",
    "tags": ["archive","pwa","manifest","web-legacy"],"complexity": "simple","nodeType":"config"
  },
  "_archive/web-legacy/public/sw-bg-sync.js": {
    "summary": "Service Worker 后台同步脚本，在 SW 激活后通知所有客户端触发同步（bg-sync 消息），并自注册为独立脚本。",
    "tags": ["archive","service-worker","sync","web-legacy"],"complexity": "simple",
    "functions":[{"name":"notifyClientsToSync","startLine":11,"endLine":16,"summary":"通知所有受控客户端发送 bg-sync 消息以触发后台同步。","tags":["service-worker","sync","messaging"]}]
  },
  "_archive/web-legacy/public/sw.js": {
    "summary": "Service Worker 注册脚本（当前为空实现/占位），用于在浏览器注册 SW。",
    "tags": ["archive","service-worker","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/public/workbox-495fd258.js": {
    "summary": "Workbox 生成的预缓存清单文件（PWA 构建产物），列出需离线缓存的静态资源；不应手动编辑。",
    "tags": ["archive","pwa","workbox","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/src/app/api/monitoring/route.ts": {
    "summary": "Next.js App Router 的 /api/monitoring 路由处理程序，接收 Sentry 隧道上报的监控数据并透传。",
    "tags": ["archive","api","sentry","monitoring","web-legacy"],"complexity": "moderate",
    "functions":[{"name":"POST","startLine":4,"endLine":38,"summary":"处理 Sentry 隧道转发的监控请求体，解析多路事件后返回。","tags":["api","sentry","monitoring"]}]
  },
  "_archive/web-legacy/src/app/error.tsx": {
    "summary": "Next.js 客户端错误边界页面，捕获未捕获异常、上报 Sentry 并提供重试按钮。",
    "tags": ["archive","error-boundary","sentry","web-legacy"],"complexity": "moderate",
    "functions":[{"name":"ErrorPage","startLine":6,"endLine":29,"summary":"错误边界客户端组件：effect 内 captureException，渲染错误提示与重试按钮。","tags":["error-boundary","sentry","react"]}]
  },
  "_archive/web-legacy/src/app/global-error.tsx": {
    "summary": "Next.js 全局错误边界（global-error.tsx），为 App Router 顶层错误兜底 UI，同样上报 Sentry 并提供 reset。",
    "tags": ["archive","error-boundary","sentry","web-legacy"],"complexity": "moderate",
    "functions":[{"name":"GlobalError","startLine":6,"endLine":31,"summary":"全局错误边界根组件：捕获异常并通过 Sentry 上报，渲染 fallback 界面。","tags":["error-boundary","sentry","react"]}]
  },
  "_archive/web-legacy/src/app/globals.css": {
    "summary": "Web 应用全局样式表，定义根容器背景色、排版与基础重置样式。",
    "tags": ["archive","css","global-style","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/src/app/layout.tsx": {
    "summary": "Next.js 根布局，声明站点 metadata、viewport 并渲染 html lang=zh-CN 骨架（深色主题 #0F0A1E）。",
    "tags": ["archive","nextjs","layout","metadata","web-legacy"],"complexity": "simple",
    "functions":[{"name":"RootLayout","startLine":20,"endLine":28,"summary":"根布局组件，输出 html/body 结构并注入深色主题与子内容。","tags":["nextjs","layout","react"]}]
  },
  "_archive/web-legacy/src/app/not-found.tsx": {
    "summary": "Next.js 404 Not Found 页面组件，显示中文「页面未找到」提示并给出返回首页链接。",
    "tags": ["archive","not-found","web-legacy"],"complexity": "simple",
    "functions":[{"name":"NotFound","startLine":3,"endLine":16,"summary":"404 页面组件，渲染中文未找到提示与回首页链接。","tags":["not-found","react"]}]
  },
  "_archive/web-legacy/src/app/page.tsx": {
    "summary": "Next.js 应用首页（当前为空默认导出占位），曾是 Web 端入口页面。",
    "tags": ["archive","page","entry","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/src/components/hooks/index.ts": {
    "summary": "组件 hooks 目录的 barrel 导出文件，聚合 re-export 自定义 React hooks。",
    "tags": ["archive","hooks","barrel","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/src/components/hooks/useCachedStyle.ts": {
    "summary": "自定义 hook：缓存计算后的样式对象，依赖不变时返回同一引用以避免重渲染。",
    "tags": ["archive","hooks","style","memo","web-legacy"],"complexity": "simple",
    "functions":[{"name":"useCachedStyle","startLine":5,"endLine":7,"summary":"按依赖缓存 factory 生成的样式对象，返回稳定引用。","tags":["hooks","style","memo"]}]
  },
  "_archive/web-legacy/src/components/hooks/useResponsive.ts": {
    "summary": "自定义 hook：根据视口宽度断点返回响应式标志（如 isMobile/isTablet），驱动响应式布局。",
    "tags": ["archive","hooks","responsive","web-legacy"],"complexity": "moderate",
    "functions":[{"name":"useResponsive","startLine":10,"endLine":30,"summary":"监听视口宽度，按断点计算并返回响应式标志对象。","tags":["hooks","responsive","viewport"]}]
  },
  "_archive/web-legacy/src/components/ui/index.ts": {
    "summary": "公共 UI 组件 barrel 导出文件，聚合 re-export 界面组件。",
    "tags": ["archive","ui","barrel","web-legacy"],"complexity": "simple"
  },
  "_archive/web-legacy/src/components/ui/VirtualList.tsx": {
    "summary": "客户端虚拟化列表组件：少量项直接 map 渲染，超过阈值使用 react-window FixedSizeList，并动态计算可用高度。",
    "tags": ["archive","ui","virtualization","react-window","web-legacy"],"complexity": "moderate",
    "functions":[{"name":"VirtualList","startLine":16,"endLine":97,"summary":"泛型虚拟列表：项数小于等于阈值直绘，否则 react-window 虚拟化并动态适配容器高度。","tags":["ui","virtualization","react"]}]
  },
  "_archive/web-legacy/src/middleware.ts": {
    "summary": "Next.js 中间件，给所有响应附加安全响应头（X-Frame-Options/CSP 类、HSTS），并排除静态资源匹配。",
    "tags": ["archive","middleware","security","web-legacy"],"complexity": "simple",
    "functions":[{"name":"middleware","startLine":4,"endLine":19,"summary":"为响应写入安全头：X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy/HSTS。","tags":["middleware","security","headers"]}]
  },
  "_archive/web-legacy/src/types/amap.d.ts": {
    "summary": "高德地图 JS API 的 TypeScript 类型声明文件，为 Web 端地图集成提供类型定义。",
    "tags": ["archive","types","amap","web-legacy"],"complexity": "moderate"
  },
  "_archive/web-legacy/vitest.config.ts": {
    "summary": "归档 Web 端的 Vitest 测试配置文件（jsdom 环境、路径别名），用于单元测试。",
    "tags": ["archive","test","vitest","web-legacy"],"complexity": "simple"
  },
  ".clinerules": {
    "summary": "Claude Code 全局指令/规则文件（.clinerules），为 AI 编码助手约定项目级行为、风格与禁止项。",
    "tags": ["claude","rules","instructions"],"complexity": "moderate"
  },
  ".github/copilot-instructions.md": {
    "summary": "GitHub Copilot 项目指令文件，自动由 codebase-memory 生成，向 Copilot 提供项目架构、技术栈、模块、数据模型、API、约定与注意事项等全面上下文。",
    "tags": ["documentation","copilot","instructions","architecture"],"complexity": "moderate","nodeType":"document"
  },
}

def build_batch(data, metadata):
    files = data["files"]
    imp = data["batchImportData"]
    nodes = []
    edges = []
    seen_ids = set()
    for fl in files:
        p = fl["path"]
        cat = fl.get("fileCategory","code")
        meta = metadata.get(p, {})
        ftype = meta.get("nodeType", None)
        if ftype is None:
            # default mapping by category
            if cat == "config":
                ftype = "config"
            elif cat == "docs":
                ftype = "document"
            else:
                ftype = "file"
        name = p.split("/")[-1]
        node = {"id": f"file:{p}", "type": ftype, "name": name,
                "filePath": p,
                "summary": meta.get("summary", f"文件 {p}。"),
                "tags": meta.get("tags", [cat]),
                "complexity": meta.get("complexity", "simple")}
        nodes.append(node)
        seen_ids.add(node["id"])
        for fn in meta.get("functions", []):
            fnode = {"id": f"function:{p}:{fn['name']}", "type": "function",
                     "name": fn["name"], "filePath": p,
                     "lineRange": [fn["startLine"], fn["endLine"]],
                     "summary": fn["summary"], "tags": fn["tags"],
                     "complexity": fn.get("complexity", "simple")}
            if fnode["id"] not in seen_ids:
                nodes.append(fnode)
                seen_ids.add(fnode["id"])
            edges.append({"source": f"file:{p}", "target": f"function:{p}:{fn['name']}",
                          "type": "contains", "direction": "forward", "weight": 1.0})
            if fn.get("exported", True):
                edges.append({"source": f"file:{p}", "target": f"function:{p}:{fn['name']}",
                              "type": "exports", "direction": "forward", "weight": 0.8})
        for cl in meta.get("classes", []):
            cnode = {"id": f"class:{p}:{cl['name']}", "type": "class",
                     "name": cl["name"], "filePath": p,
                     "lineRange": [cl["startLine"], cl["endLine"]],
                     "summary": cl["summary"], "tags": cl["tags"],
                     "complexity": cl.get("complexity", "moderate")}
            if cnode["id"] not in seen_ids:
                nodes.append(cnode)
                seen_ids.add(cnode["id"])
            edges.append({"source": f"file:{p}", "target": f"class:{p}:{cl['name']}",
                          "type": "contains", "direction": "forward", "weight": 1.0})
            edges.append({"source": f"file:{p}", "target": f"class:{p}:{cl['name']}",
                          "type": "exports", "direction": "forward", "weight": 0.8})
    # imports edges 1:1
    for src, tgts in imp.items():
        for t in tgts:
            edges.append({"source": f"file:{src}", "target": f"file:{t}",
                          "type": "imports", "direction": "forward", "weight": 0.7})
    return {"nodes": nodes, "edges": edges}

with open("D:/MyProject/2026/egoless-do/.ua/tmp/batch-56.json","r",encoding="utf-8") as f:
    b56 = json.load(f)
with open(os.path.join(OUT_DIR,"batch-56.json"),"w",encoding="utf-8") as f:
    json.dump(build_batch(b56, B56), f, ensure_ascii=False, indent=2)
print("wrote batch-56.json, nodes/edges:", len(build_batch(b56,B56)["nodes"]), len(build_batch(b56,B56)["edges"]))
