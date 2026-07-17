import json, os

def load_input(idx):
    with open(f'.ua/tmp/ua-file-analyzer-input-{idx}.json','r',encoding='utf-8') as f:
        return json.load(f)

def load_manifest(idx):
    with open(f'.ua/tmp/manifest-{idx}.json','r',encoding='utf-8') as f:
        return json.load(f)

with open('.ua/tmp/meta.json','r',encoding='utf-8') as f:
    META = json.load(f)["files"]

# Notable function overrides (path, name) -> (summary, tags, complexity)
FN_OVERRIDES = {
    ('apps/mobile/src/features/sutra/SutraScreen.tsx','SutraScreenInner'): ('经咒主页面内部实现。', ['sutra','screen'], 'complex'),
    ('apps/mobile/src/features/vow/VowScreen.tsx','VowScreen'): ('发愿主页面实现。', ['vow','vision'], 'complex'),
    ('apps/mobile/src/features/vow/components/VisionCard.tsx','VisionCard'): ('愿景卡片实现，含进度与操作。', ['vow','vision'], 'complex'),
    ('apps/mobile/src/features/vow/modals/VisionEditModal.tsx','VisionEditModal'): ('愿景编辑弹窗实现。', ['vow','vision','modal'], 'complex'),
    ('apps/mobile/src/features/vow/modals/VisionEditModal.tsx','MonthPicker'): ('月份迷你日历选择器。', ['vow','picker'], 'moderate'),
    ('apps/mobile/src/features/vow/useVowProgress.ts','useVowProgress'): ('发愿进度数据计算hook。', ['vow','progress'], 'complex'),
    ('apps/mobile/src/features/zhiguan/ZhiguanHistoryScreen.tsx','ZhiguanHistoryScreen'): ('止观履历页实现。', ['zhiguan','history'], 'moderate'),
    ('apps/mobile/src/hooks/usePagination.ts','usePagination'): ('分页hook实现。', ['pagination'], 'simple'),
    ('apps/mobile/src/store/createMobileUiSlice.ts','createMobileUiSlice'): ('移动端UI切片工厂函数。', ['store','slice'], 'moderate'),
    ('apps/mobile/src/store/useAppStore.ts','useAppStore'): ('移动端store组合装配。', ['store','composition'], 'complex'),
    ('apps/mobile/src/store/useAppStore.ts','useShallowStore'): ('基于useShallow的store选择器hook。', ['store','selector'], 'simple'),
    ('apps/mobile/App.tsx','App'): ('应用根组件实现。', ['entry-point','app-root'], 'moderate'),
    ('apps/mobile/src/components/FabButton.tsx','FabButton'): ('可拖拽浮动操作按钮实现。', ['fab','component'], 'moderate'),
    ('apps/mobile/src/components/StarfieldBackground.tsx','StarfieldBackground'): ('星空背景组件实现。', ['visual','background'], 'complex'),
    ('apps/mobile/src/db/queries.ts','dbGetFastingSessions'): ('查询禁食会话记录。', ['database','query'], 'simple'),
    ('apps/mobile/src/db/queries.ts','dbGetFoodEntries'): ('按日期查询饮食记录。', ['database','query'], 'simple'),
    ('apps/mobile/src/db/schema.ts','migrateDatabase'): ('数据库迁移主函数。', ['database','migration'], 'complex'),
    ('apps/mobile/src/db/syncQueue.ts','enqueueChange'): ('入队一条变更请求。', ['sync','queue'], 'moderate'),
    ('apps/mobile/src/db/syncQueue.ts','drainQueue'): ('消费并取出待同步队列项。', ['sync','queue'], 'moderate'),
    ('apps/mobile/src/db/syncQueue.ts','updateSyncProgress'): ('更新指定实体的同步进度。', ['sync','queue'], 'moderate'),
    ('apps/mobile/src/features/splash/SplashScreen.tsx','SplashScreen'): ('启动屏动画组件实现。', ['splash','animation'], 'complex'),
    ('apps/mobile/src/features/sync/RealtimeAgent.ts','RealtimeAgent'): ('SSE实时同步代理类。', ['sync','realtime'], 'complex'),
    ('apps/mobile/src/features/sync/SyncApplyService.ts','SyncApplyService'): ('将服务端变更落本地的服务类。', ['sync','apply'], 'complex'),
    ('apps/mobile/src/features/sync/SyncEngine.ts','SyncEngine'): ('同步引擎主类实现。', ['sync','engine'], 'complex'),
    ('apps/mobile/src/features/sync/SyncRealtimeController.ts','SyncRealtimeController'): ('同步实时控制器实现。', ['sync','realtime'], 'complex'),
    ('apps/mobile/src/features/sync/SyncRehydrationManager.ts','SyncRehydrationManager'): ('同步水合管理器实现。', ['sync','rehydration'], 'complex'),
    ('apps/mobile/src/features/sync/useSync.ts','useSync'): ('连接SyncService与前端生命周期的hook。', ['sync','hook'], 'complex'),
    ('apps/mobile/src/features/sync/mergeSyncPatch.ts','mergeSyncPatch'): ('合并同步增量patch的纯函数。', ['sync','merge'], 'moderate'),
    ('apps/mobile/src/features/sync/migrateToSyncQueue.ts','migrateToSyncQueue'): ('旧记录迁入同步队列的迁移函数。', ['sync','migration'], 'complex'),
    ('apps/mobile/src/features/sync/orphanRecovery.ts','recoverOrphans'): ('执行孤立记录恢复。', ['sync','orphan'], 'simple'),
    ('apps/mobile/src/sentry.ts','initSentry'): ('初始化Sentry监控。', ['monitoring','sentry'], 'complex'),
    ('apps/mobile/src/store/WriteBatcher.ts','WriteBatcher'): ('批量写入封装类。', ['store','write-batcher'], 'moderate'),
    ('apps/mobile/src/store/initApp.ts','initApp'): ('应用启动初始化主函数。', ['store','initialization'], 'complex'),
    ('apps/mobile/src/store/migrateAsyncStorage.ts','migrateAsyncStorageToSQLite'): ('AsyncStorage迁移到SQLite主函数。', ['store','migration'], 'complex'),
    ('apps/mobile/src/store/storageAdapter.ts','flushWrites'): ('刷新挂起的批量写入。', ['store','storage-adapter'], 'simple'),
    ('apps/mobile/src/features/exercise/SportPage.tsx','SportPage'): ('运动主页面实现。', ['exercise','sport'], 'complex'),
    ('apps/mobile/src/features/exercise/layouts/StrengthActive.tsx','StrengthActive'): ('力量训练布局实现。', ['exercise','strength'], 'complex'),
    ('apps/mobile/src/features/exercise/pages/PrepPage.tsx','PrepPage'): ('运动准备页面实现。', ['exercise','prep'], 'complex'),
    ('apps/mobile/src/navigation/index.tsx','AppNavigator'): ('应用导航根装配。', ['navigation','router'], 'complex'),
}

# Notable class overrides
CL_OVERRIDES = {
    ('apps/mobile/src/components/ErrorBoundary.tsx','_ErrorBoundary'): ('错误边界内部类组件。', ['error-boundary'], 'moderate'),
    ('apps/mobile/src/features/sync/SyncTimestampManager.ts','SyncTimestampManager'): ('时钟偏移与同步时间戳管理类。', ['sync','timestamp'], 'moderate'),
    ('apps/mobile/src/features/sync/SyncEngine.ts','SyncEngine'): ('同步引擎主类定义。', ['sync','engine'], 'complex'),
    ('apps/mobile/src/features/sync/RealtimeAgent.ts','RealtimeAgent'): ('SSE实时同步代理类。', ['sync','realtime'], 'complex'),
    ('apps/mobile/src/features/sync/SyncApplyService.ts','SyncApplyService'): ('服务端变更应用服务类。', ['sync','apply'], 'complex'),
    ('apps/mobile/src/store/WriteBatcher.ts','WriteBatcher'): ('批量写入封装类。', ['store','write-batcher'], 'moderate'),
    ('.trellis/scripts/common/active_task.py','ActiveTask'): ('活动任务解析类。', ['trellis','task'], 'simple'),
}

# Generic fallback summary generator for functions/classes
def gen_func_summary(name, path, tags):
    # Use override if present
    return None

def infer_complexity(lines):
    if lines is None:
        return 'simple'
    if lines < 50:
        return 'simple'
    if lines <= 200:
        return 'moderate'
    return 'complex'

def build_batch(idx):
    inp = load_input(idx)
    manifest = load_manifest(idx)
    bid = inp['batchImportData']
    files = inp['batchFiles']

    # build manifest lookup
    man_by_path = {}
    for entry in manifest:
        # extract the result fields
        man_by_path[entry['path']] = entry

    nodes = []
    edges = []
    node_ids = set()

    def add_node(n):
        if n['id'] in node_ids:
            return
        node_ids.add(n['id'])
        nodes.append(n)

    # Create file nodes
    meta_files = set(META.keys())
    for finfo in files:
        path = finfo['path']
        if path not in meta_files:
            print(f"WARNING: no metadata for {path}")
        m = META.get(path, {})
        fmeta = man_by_path.get(path, {})
        nonEmpty = fmeta.get('nonEmptyLines') or finfo.get('sizeLines', 0)
        tags = m.get('t', ['code'])
        # Add test tag for test files
        if '.test.' in path or path.endswith('.test.ts'):
            if 'test' not in tags:
                tags = tags + ['test']
        complexity = m.get('c', infer_complexity(nonEmpty))
        fnode = {
            "id": f"file:{path}",
            "type": "file",
            "name": os.path.basename(path),
            "filePath": path,
            "summary": m.get('s', f"{path} 文件。"),
            "tags": tags,
            "complexity": complexity,
        }
        add_node(fnode)

    # Create function nodes (meeting significance filter) + contains + exports
    # Process manifest entries
    for finfo in files:
        path = finfo['path']
        m = man_by_path.get(path, {})
        funcs = m.get('functions', [])
        classes = m.get('classes', [])
        exports = m.get('exports', [])
        exported_names = {e['name'] for e in exports if not e.get('isDefault', False)}
        # default export name: try to find isDefault
        for e in exports:
            if e.get('isDefault', False):
                exported_names.add(e['name'])

        for fn in funcs:
            name = fn['name']
            sl = fn['startLine']; el = fn['endLine']
            flines = el - sl + 1
            # significance: 10+ lines OR exported
            is_exported = name in exported_names
            if flines < 10 and not is_exported:
                continue
            fid = f"function:{path}:{name}"
            key = (path, name)
            if key in FN_OVERRIDES:
                s, t, c = FN_OVERRIDES[key]
            else:
                # generic summary
                s = f"{name} 函数实现。"
                t = ['function']
                c = infer_complexity(flines)
            fnode = {
                "id": fid,
                "type": "function",
                "name": name,
                "filePath": path,
                "lineRange": [sl, el],
                "summary": s,
                "tags": t,
                "complexity": c,
            }
            add_node(fnode)
            # contains
            edges.append({"source": f"file:{path}", "target": fid, "type": "contains", "direction": "forward", "weight": 1.0})
            if is_exported:
                edges.append({"source": f"file:{path}", "target": fid, "type": "exports", "direction": "forward", "weight": 0.8})

        for cl in classes:
            name = cl['name']
            sl = cl['startLine']; el = cl['endLine']
            methods = cl.get('methods', [])
            clines = el - sl + 1
            # significance: 2+ methods or 20+ lines
            if len(methods) < 2 and clines < 20:
                continue
            cid = f"class:{path}:{name}"
            key = (path, name)
            if key in CL_OVERRIDES:
                s, t, c = CL_OVERRIDES[key]
            else:
                s = f"{name} 类定义。"
                t = ['class']
                c = infer_complexity(clines)
            cnode = {
                "id": cid,
                "type": "class",
                "name": name,
                "filePath": path,
                "lineRange": [sl, el],
                "summary": s,
                "tags": t,
                "complexity": c,
            }
            add_node(cnode)
            edges.append({"source": f"file:{path}", "target": cid, "type": "contains", "direction": "forward", "weight": 1.0})

    # Import edges (1:1 emission)
    for path, targets in bid.items():
        for tgt in targets:
            edges.append({"source": f"file:{path}", "target": f"file:{tgt}", "type": "imports", "direction": "forward", "weight": 0.7})

    return {"nodes": nodes, "edges": edges}

for idx in [16,17,18,19,20]:
    result = build_batch(idx)
    out_path = f".ua/intermediate/batch-{idx}.json"
    with open(out_path,'w',encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"batch-{idx}: {len(result['nodes'])} nodes, {len(result['edges'])} edges -> {out_path}")
