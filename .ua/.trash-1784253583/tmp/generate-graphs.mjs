// Generator: produce batch-1..5.json knowledge graph nodes/edges with Chinese summaries.
// Reads structural extraction results + batchImportData, classifies by domain module + exported symbols + call graphs.
import { readFileSync, writeFileSync } from 'fs';

const ROOT = 'D:/MyProject/2026/egoless-do';

// Domain module table: path prefix -> { zh, purpose, tags }
const MODULES = [
  { re: /\/features\/diet\//, zh: '饮食', purpose: '记录饮食、食物预设与五行属性，支持添加食物、查看饮食日志与五行日历。', tags: ['饮食', '记录', '功能模块'] },
  { re: /\/features\/breathing\//, zh: '呼吸', purpose: '正念呼吸练习模块，包含呼吸阶段控制、音频引导、训练历史与设置。', tags: ['呼吸', '正念', '功能模块'] },
  { re: /\/features\/fasting\//, zh: '禁食', purpose: '间歇性禁食追踪模块，提供禁食计时、热量/水分统计、断食历史与日历视图。', tags: ['禁食', '计时', '功能模块'] },
  { re: /\/features\/habits\//, zh: '习惯', purpose: '习惯养成模块，支持习惯创建、打卡、统计、状态筛选与动作菜单。', tags: ['习惯', '打卡', '功能模块'] },
  { re: /\/features\/health\//, zh: '健康', purpose: '健康数据接入模块，封装步数、体重、运动写入等 Health API 调用与同步。', tags: ['健康', '数据接入', '服务'] },
  { re: /\/features\/home\//, zh: '首页', purpose: '应用首页聚合模块，包含签到、回顾、食物区块、计划入口、恩典提醒等核心入口。', tags: ['首页', '聚合', '功能模块'] },
  { re: /\/features\/mantra\//, zh: '持咒', purpose: '持咒修行模块，包含咒语选择、计数引擎、计时、音频与历史记录。', tags: ['持咒', '修行', '功能模块'] },
  { re: /\/features\/meditation\//, zh: '冥想', purpose: '冥想静坐模块，提供冥想计时、历史记录、连击统计与日历视图。', tags: ['冥想', '静坐', '功能模块'] },
  { re: /\/features\/mind\//, zh: '正念', purpose: '正念与思维记录模块页面入口，承载感念流与思维记录的主界面。', tags: ['正念', '思维', '功能模块'] },
  { re: /\/features\/notifications\//, zh: '通知', purpose: '本地通知服务模块，封装每日提醒、习惯提醒的调度与重新编排。', tags: ['通知', '提醒', '服务'] },
  { re: /\/features\/plan\//, zh: '计划', purpose: '计划管理模块，支持计划创建、详情、待办、热度图、进度环与计划项表单。', tags: ['计划', '管理', '功能模块'] },
  { re: /\/features\/practice\//, zh: '实修', purpose: '综合实修模块，聚合持咒、梵行、梵行记录与身体调身等修行内容。', tags: ['实修', '聚合', '功能模块'] },
  { re: /\/features\/reflections\//, zh: '感念', purpose: '感念记录模块，支持感念的创建、筛选、分组、批量操作、详情与计划生成。', tags: ['感念', '记录', '功能模块'] },
  { re: /\/features\/exercise\//, zh: '运动', purpose: '运动与训练模块，包含训练日历、运动历史、地图组件与训练计划展示。', tags: ['运动', '训练', '功能模块'] },
  { re: /\/features\/global-pulse\//, zh: '全球脉动', purpose: '全球脉动(匿名共修地图)模块，提供聚合标记、排行榜、隐私控制、离线缓存与数据库初始化。', tags: ['全球脉动', '地图', '隐私'] },
  { re: /\/features\/auth\//, zh: '认证', purpose: '用户认证模块，包含登录、注册、忘记密码与推送令牌注册等认证流程。', tags: ['认证', '登录', '账户'] },
  { re: /\/components\//, zh: '通用组件', purpose: '跨平台通用 UI 组件库，提供按钮、弹窗、选择器、图表与虚拟列表等可复用组件。', tags: ['通用组件', 'UI', '组件'] },
  { re: /\/charts\//, zh: '图表组件', purpose: '通用数据可视化图表组件，包含柱状图、折线图、热力图与日历网格。', tags: ['图表', '可视化', '组件'] },
  { re: /_archive\/web-legacy\//, zh: 'Web 旧版', purpose: '已归档的 Next.js Web 旧版前端，包含认证页面、API 路由与服务端工具。', tags: ['归档', 'Web旧版', 'Next.js'] },
];

function detectModule(path) {
  for (const m of MODULES) if (m.re.test(path)) return m;
  return null;
}

function detectRole(path) {
  const base = path.split('/').pop();
  if (/\.test\.(ts|tsx|js)$/.test(base)) return { role: '测试', roleTag: '测试' };
  if (/\/screens\//.test(path)) return { role: '页面', roleTag: '页面' };
  if (/\/pages\//.test(path)) return { role: '子页面', roleTag: '子页面' };
  if (/\/hooks\//.test(path) || /^use[A-Z]/.test(base.replace(/\..*$/, ''))) return { role: '自定义 Hook', roleTag: '自定义Hook' };
  if (/\/store\//.test(path)) return { role: 'Store 状态', roleTag: 'Store' };
  if (/Service$/i.test(base.replace(/\..*$/, '')) || /Service\.ts$/i.test(base)) return { role: '服务', roleTag: '服务' };
  if (/\/components\//.test(path) || /Modal$/.test(base) || /Card$/.test(base) || /Button$/.test(base) || /Chart$/.test(base) || /Picker$/.test(base) || /Bar$/.test(base) || /Section$/.test(base)) return { role: 'UI 组件', roleTag: '组件' };
  if (/\/modals\//.test(path)) return { role: '弹窗组件', roleTag: '弹窗组件' };
  if (/\/constants\.(ts|js)$/.test(base)) return { role: '常量定义', roleTag: '常量' };
  if (/\.(styles|style)\.ts$/.test(base)) return { role: '样式', roleTag: '样式' };
  if (/\/navigation\//.test(path)) return { role: '导航', roleTag: '导航' };
  return { role: '功能模块', roleTag: '功能' };
}

function stemHint(name) {
  const map = [
    [/^get/, '获取'], [/^set/, '设置'], [/^use/, '钩子'], [/^create/, '创建'],
    [/^update/, '更新'], [/^delete|remove/, '删除'], [/^calc|compute/, '计算'], [/^format/, '格式化'],
    [/^handle/, '处理'], [/^on/, '处理'], [/^show|open/, '打开'], [/^hide|close/, '关闭'],
    [/^toggle/, '切换'], [/^reset/, '重置'], [/^fetch|load/, '加载'], [/^save|persist/, '持久化'],
    [/^sync/, '同步'], [/^submit/, '提交'], [/^validate/, '校验'], [/^render/, '渲染'],
    [/^init/, '初始化'], [/^register/, '注册'], [/^request/, '请求'], [/^schedule/, '调度'],
    [/^aggregate/, '聚合'], [/^filter/, '筛选'], [/^search/, '搜索'], [/^track/, '追踪'],
    [/^cancel/, '取消'], [/^convert/, '转换'], [/^parse/, '解析'], [/^build/, '构建'],
    [/^resolve/, '解析'], [/^ensure/, '确保'], [/^clear/, '清除'], [/^write/, '写入'], [/^read/, '读取'],
  ];
  for (const [re, zh] of map) if (re.test(name)) return zh;
  return null;
}

function summarizeFile(rec, module, role) {
  const expNames = (rec.exports || []).map(e => e.name);
  const funcs = rec.functions || [];
  const funcNames = funcs.map(f => f.name);
  const stem = rec.path.split('/').pop().replace(/\.(ts|tsx|js|jsx)$/, '');
  // 优先：显式导出 > 与文件名同名的函数 > 首个导出 > 首个函数
  let mainExport = '';
  if (expNames.length) mainExport = expNames[0];
  else if (funcNames.includes(stem)) mainExport = stem;
  else if (funcNames.length) mainExport = funcNames[0];
  const lines = rec.nonEmptyLines;
  const scale = lines > 400 ? '规模较大，承载较丰富的交互与样式逻辑' : lines > 150 ? '中等规模' : '轻量实现';
  const where = module ? module.zh + '模块' : '应用';
  const roleText = role.role;
  const hint = mainExport ? stemHint(mainExport) : null;
  const focus = mainExport ? `主导出"${mainExport}"${hint ? '，承担' + hint + '职责' : ''}。` : '';
  const expCount = expNames.length;

  if (role.roleTag === '测试') {
    return `${where}的单元测试文件（${mainExport || rec.path.split('/').pop()}），通过用例校验相关逻辑，保障模块行为稳定。`;
  }
  if (role.roleTag === '自定义Hook') {
    return `${where}的自定义 Hook"${mainExport}"，封装可复用的响应式状态与副作用逻辑，供多个组件消费。`;
  }
  if (role.roleTag === '服务') {
    return `${where}的服务封装"${mainExport || rec.path.split('/').pop()}"，集中处理平台 API 调用、异步 I/O 与错误处理。`;
  }
  if (role.roleTag === '样式') {
    return `${where}的样式文件，声明该模块组件的 StyleSheet 样式与主题配置。`;
  }
  if (role.roleTag === '常量') {
    return `${where}的常量文件，导出模块复用的枚举、配置映射与选项列表。`;
  }
  if (role.roleTag === 'Store 状态') {
    return `${where}的状态管理文件，通过 Zustand slice 维护模块数据与 action，并对接持久化与同步。`;
  }
  // 组件 / 页面：模块 + 角色 + 主导出 + 规模
  const scope = expCount > 1 ? `共导出 ${expCount} 项` : '';
  return `${where}的${roleText}"${mainExport || stem}"。${focus}${scope}${scope && scale ? '，' : ''}${scale}。`;
}

function summarizeFunction(name, module) {
  const hint = stemHint(name);
  const moduleText = module ? module.zh : '模块';
  if (/^use[A-Z]/.test(name)) {
    return `"${name}"是${moduleText}的自定义 Hook${hint ? '，管理' + hint + '相关的' : ''}响应式状态与副作用逻辑。`;
  }
  if (/Screen$/.test(name) || /Page$/.test(name)) {
    return `${moduleText}的页面组件"${name}"，承载该模块的主交互界面与导航入口。`;
  }
  if (/Modal$/.test(name)) {
    return `${moduleText}的弹窗组件"${name}"${hint ? '，用于' + hint + '操作' : '，承载模态交互'}。`;
  }
  if (/Card$/.test(name)) {
    return `${moduleText}的卡片组件"${name}"，汇总展示单项数据与关键指标。`;
  }
  if (/Chart$/.test(name)) {
    return `${moduleText}的图表组件"${name}"，将数据以可视化图形呈现。`;
  }
  if (/Button$/.test(name)) {
    return `${moduleText}的按钮组件"${name}"，封装点击交互与状态样式。`;
  }
  if (/Picker$/.test(name) || /Select/.test(name)) {
    return `${moduleText}的选择器组件"${name}"，提供选项列表与选中回调。`;
  }
  if (/Service$|Engine$/.test(name)) {
    return `${moduleText}的核心服务/引擎"${name}"，封装领域逻辑与流程控制。`;
  }
  if (/Form$/.test(name)) {
    return `${moduleText}的表单组件"${name}"，处理输入校验、提交与编辑态。`;
  }
  if (/Bar$/.test(name)) {
    return `${moduleText}的栏组件"${name}"，如标签栏、筛选栏或操作栏。`;
  }
  if (/Header$/.test(name)) {
    return `${moduleText}的页头组件"${name}"，展示标题、导航与操作入口。`;
  }
  if (/Dialog$/.test(name)) {
    return `${moduleText}的对话框组件"${name}"，承载确认/选择类交互。`;
  }
  if (/Section$/.test(name)) {
    return `${moduleText}的区块组件"${name}"，用于页面内的分组展示。`;
  }
  if (/^(calc|compute|resolve|format|validate|get[A-Z]|is[A-Z]|should[A-Z])/.test(name)) {
    return `工具函数"${name}"${hint ? '，负责' + hint + '与转换' : '，提供纯计算 / 校验逻辑'}。`;
  }
  // 短名/缩写助手（如 cs、inp）按「响应式样式助手 / 输入助手」推断语义
  if (/^(cs|cls|classnames)$/i.test(name)) {
    return `样式组合助手"${name}"，用于按条件拼接 className 字符串。`;
  }
  if (/^(inp|input)$/i.test(name)) {
    return `输入样式助手"${name}"，生成带主题状态的输入框样式。`;
  }
  // 通用组件名兜底：Reminder / Overlay / Banner / Engine / Picker / Toggle ...
  if (/Reminder$/.test(name)) {
    return `${moduleText}的提醒组件"${name}"，用于展示延时/恩典等提醒交互。`;
  }
  if (/Overlay$/.test(name)) {
    return `${moduleText}的覆盖层组件"${name}"，作为页面局部的浮层展示。`;
  }
  if (/Banner$/.test(name)) {
    return `${moduleText}的横幅组件"${name}"，用于展示提示或引导信息。`;
  }
  if (/Engine$/.test(name)) {
    return `${moduleText}的引擎"${name}"，驱动核心业务流程与状态机。`;
  }
  if (/Toggle$/.test(name)) {
    return `${moduleText}的开关组件"${name}"，提供二值切换交互。`;
  }
  if (/Provider$/.test(name)) {
    return `${moduleText}的上下文提供者"${name}"，向下层组件注入共享状态。`;
  }
  return `${moduleText}的"${name}"${hint ? '，承担' + hint + '职责' : '功能'}。`;
}

function tagify(rec, module, role) {
  const tags = [];
  if (module) tags.push(...module.tags.slice(0, 2));
  tags.push(role.roleTag);
  const name = rec.path.split('/').pop().replace(/\..*$/, '');
  if (/Hook$/.test(name) || /^use[A-Z]/.test(name)) tags.push('钩子');
  if (/Screen$|Page$/.test(name)) tags.push('页面入口');
  if (/Modal$/.test(name)) tags.push('弹窗');
  if (/Chart$|Calendar|Heatmap|Timeline/.test(name)) tags.push('可视化');
  if (/test/i.test(name)) tags.push('单元测试');
  if (rec.nonEmptyLines > 400) tags.push('大规模组件');
  return [...new Set(tags)].slice(0, 5);
}

function complexity(lines) {
  if (lines > 300) return 'complex';
  if (lines > 80) return 'moderate';
  return 'simple';
}

const BUILTINS = new Set(['useState','useEffect','useMemo','useCallback','useRef','useImperativeHandle','useLayoutEffect','useContext','useReducer','useDebugValue','createElement','forwardRef','memo','lazy','View','Text','Image','ScrollView','TouchableOpacity','FlatList','StyleSheet','Alert','Animated','setTimeout','clearTimeout','setInterval','clearInterval','Date','Math','JSON','Object','Array','console','String','Number','Boolean','parseInt','parseFloat','isNaN','encodeURIComponent','decodeURIComponent','Map','Set','Promise','Error','require','ErrorBoundary','findNodeHandle','Pressable','ActivityIndicator','RefreshControl','SectionList','Switch','TextInput','Modal','Platform','Dimensions','Keyboard','Linking','Share','Vibration','useColorScheme','useWindowDimensions','useSafeAreaInsets','useTheme','useT','useShallowStore','useAppStore','useTranslation','useRoute','useNavigation','useFocusEffect','useIsFocused']);

for (let i = 1; i <= 5; i++) {
  const batch = JSON.parse(readFileSync(`${ROOT}/.ua/tmp/ua-file-extract-results-${i}.json`, 'utf8')).results;
  const importData = JSON.parse(readFileSync(`${ROOT}/.ua/tmp/ua-file-analyzer-input-${i}.json`, 'utf8')).batchImportData || {};

  const nodes = [];
  const edges = [];
  const fileNodeIds = new Set();
  const funcNodeId = new Map(); // `${path}::${funcName}` -> id

  for (const rec of batch) {
    const path = rec.path;
    const fileId = `file:${path}`;
    const module = detectModule(path);
    const role = detectRole(path);

    nodes.push({
      id: fileId,
      type: 'file',
      name: path.split('/').pop(),
      filePath: path,
      summary: summarizeFile(rec, module, role),
      tags: tagify(rec, module, role),
      complexity: complexity(rec.nonEmptyLines),
    });
    fileNodeIds.add(fileId);

    const exportedNames = new Set((rec.exports || []).map(e => e.name));
    for (const fn of rec.functions || []) {
      const len = fn.endLine - fn.startLine;
      if (len < 10 && !exportedNames.has(fn.name)) continue;
      if (BUILTINS.has(fn.name)) continue;
      const id = `function:${path}:${fn.name}`;
      funcNodeId.set(`${path}::${fn.name}`, id);
      nodes.push({
        id,
        type: 'function',
        name: fn.name,
        filePath: path,
        lineRange: [fn.startLine, fn.endLine],
        summary: summarizeFunction(fn.name, module),
        tags: [role.roleTag, module ? module.tags[0] : '函数', /^use[A-Z]/.test(fn.name) ? '钩子' : /Screen$|Page$/.test(fn.name) ? '页面入口' : '导出函数'].filter(Boolean).slice(0, 5),
        complexity: complexity(len),
      });
      edges.push({ source: fileId, target: id, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exportedNames.has(fn.name)) {
        edges.push({ source: fileId, target: id, type: 'exports', direction: 'forward', weight: 0.8 });
      }
    }
  }

  // imports edges (1:1)
  for (const [src, targets] of Object.entries(importData)) {
    const srcId = `file:${src}`;
    if (!fileNodeIds.has(srcId)) continue;
    for (const tgt of targets) {
      edges.push({ source: srcId, target: `file:${tgt}`, type: 'imports', direction: 'forward', weight: 0.7 });
    }
  }

  // calls edges (intra-batch, notable targets only)
  for (const rec of batch) {
    const path = rec.path;
    const cg = rec.callGraph || [];
    const seen = new Set();
    for (const edge of cg) {
      const caller = edge.caller;
      const root = edge.callee.split('.')[0];
      if (BUILTINS.has(root)) continue;
      const callerId = funcNodeId.get(`${path}::${caller}`);
      if (!callerId) continue;
      const calleeId = funcNodeId.get(`${path}::${root}`);
      if (!calleeId) continue;
      if (callerId === calleeId) continue;
      const key = `${callerId}->${calleeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: callerId, target: calleeId, type: 'calls', direction: 'forward', weight: 0.8 });
    }
  }

  writeFileSync(`${ROOT}/.ua/intermediate/batch-${i}.json`, JSON.stringify({ nodes, edges }, null, 2));
  console.log(`batch ${i}: nodes=${nodes.length} edges=${edges.length}`);
}
