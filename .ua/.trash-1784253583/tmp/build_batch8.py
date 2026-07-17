import json
nodes=[];edges=[]
def F(p,n,s,t,co):nodes.append({"id":"file:"+p,"type":"file","name":n,"filePath":p,"summary":s,"tags":t,"complexity":co})
def FN(p,n,a,b,s,t,co):nodes.append({"id":"function:"+p+":"+n,"type":"function","name":n,"filePath":p,"lineRange":[a,b],"summary":s,"tags":t,"complexity":co})
def CL(p,n,a,b,s,t,co):nodes.append({"id":"class:"+p+":"+n,"type":"class","name":n,"filePath":p,"lineRange":[a,b],"summary":s,"tags":t,"complexity":co})
def E(s,t,tp,w):edges.append({"source":s,"target":t,"type":tp,"direction":"forward","weight":w})

F("packages/core/src/__tests__/performDailyReset.test.ts","performDailyReset.test.ts","performDailyReset 的单元测试，验证计划每日重置逻辑：自动启动到期任务、标记延迟任务、生成每日待办历史、hasChanges 标志等场景。",["test","business-logic","plan","pure-function"],"moderate")
F("packages/core/src/ai/ai-service.ts","ai-service.ts","AI 子系统核心服务类 AIService（单例），管理本地引擎与多云提供商，提供情绪检测、标签建议、思维脉络洞察、复盘引导、打卡复盘等 AI 能力。",["ai","ai-service","singleton","cloud-providers"],"complex")
CL("packages/core/src/ai/ai-service.ts","AIService",16,442,"AI 服务核心类，封装 LocalAIEngine 与多个 CloudProvider，提供 detectMood/suggestTags/generateTrailInsight/generateReviewGuide/generateCheckinReview 等 25 个方法。",["ai","ai-service","singleton","cloud-providers"],"complex")
FN("packages/core/src/ai/ai-service.ts","getAIService",447,455,"AIService 单例工厂函数，首次创建实例，后续可传入 config 更新现有实例配置。",["ai","singleton","factory"],"simple")
FN("packages/core/src/ai/ai-service.ts","resetAIService",457,459,"重置 AIService 单例（置为 null）。",["ai","singleton"],"simple")
F("packages/core/src/ai/cloud-providers.ts","cloud-providers.ts","OpenAI 兼容云提供商实现，包含 OpenAICompatibleProvider 类与 createProvider 工厂、testConnection 连接测试函数。",["ai","cloud-providers","api-client"],"moderate")
CL("packages/core/src/ai/cloud-providers.ts","OpenAICompatibleProvider",13,73,"通用 OpenAI 兼容云提供商类，通过 fetch 调用 /chat/completions 接口生成 AI 回复，支持本地模型与远程 API。",["ai","cloud-providers","api-client"],"moderate")
FN("packages/core/src/ai/cloud-providers.ts","createProvider",76,78,"创建云提供商实例的工厂函数（当前统一返回 OpenAICompatibleProvider）。",["ai","cloud-providers","factory"],"simple")
FN("packages/core/src/ai/cloud-providers.ts","testConnection",81,97,"测试指定模型配置的连通性，返回 success/error/latency 结果。",["ai","cloud-providers","connectivity"],"simple")
F("packages/core/src/ai/context-reminder.ts","context-reminder.ts","情境感知提醒服务，基于感念、习惯、打卡历史检测情绪模式、习惯风险、连续打卡风险、感念间隔并生成 ContextReminder 列表。",["ai","risk-detection","analytics","recommendations"],"moderate")
for fn,s,e,sm,tg in [("detectMoodPatterns",16,60,"检测连续负面情绪与情绪波动模式，生成情绪关注/波动提醒。",["ai","risk-detection","mood"]),("detectHabitRisks",63,107,"检测习惯长时间未打卡、进度落后等风险并生成提醒。",["ai","risk-detection","habit"]),("detectStreakRisks",110,147,"检测今日未打卡、连续打卡中断风险并生成提醒。",["ai","risk-detection","streak"]),("detectReflectionGaps",150,176,"检测距上次感念记录间隔过长并生成补记提醒。",["ai","risk-detection","reflection"]),("getAllContextReminders",179,194,"汇总四类情境提醒并按优先级排序的入口函数。",["ai","risk-detection","aggregator"])]:FN("packages/core/src/ai/context-reminder.ts",fn,s,e,sm,tg,"moderate" if e-s>20 else "simple")
F("packages/core/src/ai/insight-profile.test.ts","insight-profile.test.ts","computeLocalInsights 的单元测试，验证空输入、时间范围过滤、删除项排除、情绪分布、热门标签趋势等逻辑。",["test","ai","analytics"],"moderate")
F("packages/core/src/ai/insight-profile.ts","insight-profile.ts","洞察画像模块，提供本地统计（computeLocalInsights：连续天数、热门标签、情绪分布）与 AI 驱动的高频主题词提取（generateInsightProfile/parseInsightResponse）。",["ai","analytics","insight","pure-function"],"moderate")
for fn,s,e,sm,tg in [("computeLocalInsights",58,84,"同步计算感念的本地统计指标：总数、日均、连续天数、热门标签、情绪分布。",["ai","analytics","pure-function"]),("computeStreakDays",88,111,"计算感念连续天数的辅助函数。",["ai","analytics","streak"]),("computeHotTags",115,150,"统计当前与上期标签频次，计算热门标签及其上升/稳定/下降趋势。",["ai","analytics","tags"]),("computeMoodDistribution",154,169,"计算情绪分布及对应图标、百分比。",["ai","analytics","mood"]),("generateInsightProfile",177,218,"异步生成洞察画像：先算本地统计，若 AI 可用则调用云端提取高频主题词。",["ai","analytics","insight"]),("parseInsightResponse",220,267,"解析 AI 返回的 JSON 主题词列表，使用 extractJSON/repairJSON 容错并映射到感念 ID。",["ai","analytics","json-utils"])]:FN("packages/core/src/ai/insight-profile.ts",fn,s,e,sm,tg,"moderate")
F("packages/core/src/ai/json-utils.test.ts","json-utils.test.ts","json-utils 单元测试，覆盖 extractJSON、findLastBalancedJSON、repairJSON 在 markdown 代码块、嵌套文本、残缺 JSON 等场景的表现。",["test","ai","json-utils"],"moderate")
F("packages/core/src/ai/json-utils.ts","json-utils.ts","AI 响应 JSON 解析工具集，提供 extractJSON、findLastBalancedJSON、repairJSON 三个纯函数。",["ai","json-utils","utility","pure-function"],"moderate")
FN("packages/core/src/ai/json-utils.ts","extractJSON",12,24,"从 AI 原始响应中提取 JSON：优先 markdown 代码块，否则找最后平衡的数组/对象。",["ai","json-utils","utility"],"simple")
FN("packages/core/src/ai/json-utils.ts","findLastBalancedJSON",30,57,"从右向左扫描找最后一个平衡的 JSON 结构（支持嵌套、字符串、转义）。",["ai","json-utils","utility"],"moderate")
FN("packages/core/src/ai/json-utils.ts","repairJSON",64,96,"修复截断/残缺 JSON：截断到最后一个结构闭合处并自动补全缺失的括号。",["ai","json-utils","utility"],"moderate")
F("packages/core/src/ai/local-engine.ts","local-engine.ts","本地规则引擎 LocalAIEngine，基于关键词词典与模式匹配实现情绪检测、标签建议、内容扩展、思维脉络洞察等离线 AI 能力。",["ai","local-engine","rule-based"],"moderate")
CL("packages/core/src/ai/local-engine.ts","LocalAIEngine",52,185,"基于关键词词典与正则的本地 AI 引擎，提供 detectMood/suggestTags/suggestContentExpansion/generateTrailInsight 等 7 个方法。",["ai","local-engine","rule-based"],"moderate")
F("packages/core/src/ai/personalized-suggestions.ts","personalized-suggestions.ts","个性化建议引擎，综合情绪模式、习惯进度、风险警告、时间上下文生成去重排序的 PersonalizedSuggestion 列表。",["ai","recommendations","analytics"],"moderate")
for fn,s,e,sm,tg in [("generateMoodSuggestions",19,67,"基于情绪模式（焦虑循环、成长趋势）生成行动/心态类建议。",["ai","recommendations","mood"]),("generateHabitSuggestions",70,122,"基于习惯进度与相关感念生成习惯类建议。",["ai","recommendations","habit"]),("generateRiskBasedSuggestions",125,174,"将 RiskWarning 列表转化为对应的建议项。",["ai","recommendations","risk-detection"]),("generateTimeBasedSuggestions",177,233,"基于星期、时段、周末情绪、今日打卡状态生成时间上下文建议。",["ai","recommendations","time"]),("getAllPersonalizedSuggestions",236,259,"汇总四类建议并按优先级排序去重的入口函数。",["ai","recommendations","aggregator"])]:FN("packages/core/src/ai/personalized-suggestions.ts",fn,s,e,sm,tg,"moderate" if e-s>20 else "simple")
F("packages/core/src/ai/rag/cache.ts","cache.ts","RAG 缓存层，实现带 TTL 与 LRU 淘汰的 AICache 类及 generateCacheKey 键生成函数。",["ai","rag","cache","utility"],"moderate")
CL("packages/core/src/ai/rag/cache.ts","AICache",11,62,"带 TTL 过期与 maxSize LRU 淘汰的泛型缓存类，提供 get/set/has/clear/delete/size 方法。",["ai","rag","cache"],"moderate")
FN("packages/core/src/ai/rag/cache.ts","generateCacheKey",70,75,"基于查询与 ID 指纹数组生成稳定哈希缓存键。",["ai","rag","cache"],"simple")
F("packages/core/src/ai/rag/indexer.ts","indexer.ts","RAG 索引模块，buildIndex 将感念列表构建为索引数组，extractKeywords 提取关键词。",["ai","rag","indexer"],"simple")
FN("packages/core/src/ai/rag/indexer.ts","buildIndex",20,34,"将感念列表构建为可检索的索引数组。",["ai","rag","indexer"],"simple")
F("packages/core/src/ai/rag/prompt-builder.ts","prompt-builder.ts","RAG 提示词构建模块，提供 formatReflectionSummary、buildRecommendPrompt、buildQueryParsePrompt 三个导出函数。",["ai","rag","prompt-builder"],"moderate")
FN("packages/core/src/ai/rag/prompt-builder.ts","formatReflectionSummary",12,23,"格式化单条感念为摘要文本。",["ai","rag","prompt-builder"],"simple")
FN("packages/core/src/ai/rag/prompt-builder.ts","buildRecommendPrompt",28,48,"构建思维脉络推荐的 AI 提示词。",["ai","rag","prompt-builder"],"simple")
FN("packages/core/src/ai/rag/prompt-builder.ts","buildQueryParsePrompt",53,79,"构建智能查询解析的 AI 提示词。",["ai","rag","prompt-builder"],"moderate")
F("packages/core/src/ai/rag/retriever.test.ts","retriever.test.ts","retriever 单元测试，验证 expandTerms 同义词扩展与 retrieveTopK 排序检索逻辑。",["test","ai","rag"],"moderate")
F("packages/core/src/ai/rag/retriever.ts","retriever.ts","RAG 检索模块，基于关键词/同义词/情绪/时间/标签多维度打分，通过 retrieveTopK 返回 Top-K 感念。",["ai","rag","retriever","pure-function"],"moderate")
for fn,s,e,sm,tg in [("expandTerms",82,107,"基于 SYNONYM_MAP 对查询词做同义词扩展。",["ai","rag","retriever"]),("retrieveTopK",112,148,"综合多维度打分对索引检索并返回 Top-K 结果。",["ai","rag","retriever"]),("calcKeywordScore",153,165,"计算关键词匹配得分。",["ai","rag","retriever"]),("calcSynonymScore",170,183,"计算同义词匹配得分。",["ai","rag","retriever"]),("calcMoodScore",188,199,"计算情绪匹配得分。",["ai","rag","retriever"]),("calcTagScore",213,222,"计算标签匹配得分。",["ai","rag","retriever"])]:FN("packages/core/src/ai/rag/retriever.ts",fn,s,e,sm,tg,"moderate" if e-s>15 else "simple")
F("packages/core/src/ai/risk-warning.test.ts","risk-warning.test.ts","risk-warning 单元测试，验证习惯放弃、计划延迟、连续打卡中断、情绪下降四类风险检测逻辑。",["test","ai","risk-detection"],"moderate")
F("packages/core/src/ai/risk-warning.ts","risk-warning.ts","风险警告模块，检测习惯放弃、计划延迟、连续打卡中断、情绪下降四类风险并汇总为 RiskWarning 列表。",["ai","risk-detection","analytics"],"moderate")
for fn,s,e,sm,tg in [("detectHabitAbandonRisk",17,68,"检测习惯长时间未打卡与进度落后风险。",["ai","risk-detection","habit"]),("detectPlanDelayRisk",71,121,"检测进行中的计划进度落后或即将到期风险。",["ai","risk-detection","plan"]),("detectStreakBreakRisk",124,173,"检测连续打卡中断风险。",["ai","risk-detection","streak"]),("detectMoodDeclineRisk",176,213,"检测近期情绪下降趋势风险。",["ai","risk-detection","mood"]),("getAllRiskWarnings",216,232,"汇总四类风险警告并按严重程度排序的入口函数。",["ai","risk-detection","aggregator"])]:FN("packages/core/src/ai/risk-warning.ts",fn,s,e,sm,tg,"moderate")
F("packages/core/src/ai/thought-patterns.test.ts","thought-patterns.test.ts","thought-patterns 单元测试，验证情绪序列、标签、时间、关键词、成长五类模式检测逻辑。",["test","ai","analytics"],"moderate")
F("packages/core/src/ai/thought-patterns.ts","thought-patterns.ts","思维模式检测模块，从感念中识别情绪序列、标签、时间、关键词、成长五类 ThoughtPattern。",["ai","analytics","pattern-detection"],"complex")
for fn,s,e,sm,tg in [("detectMoodSequencePatterns",45,90,"检测特定情绪序列模式（如连续焦虑）。",["ai","analytics","mood"]),("detectTagPatterns",93,130,"按标签分组检测高频标签模式。",["ai","analytics","tags"]),("detectTimePatterns",133,173,"按时段分组检测记录时间偏好模式。",["ai","analytics","time"]),("detectKeywordPatterns",176,219,"基于关键词匹配检测主题模式。",["ai","analytics","keyword"]),("detectGrowthPatterns",222,275,"按周分组检测情绪成长趋势模式。",["ai","analytics","growth"]),("getAllThoughtPatterns",278,289,"汇总五类思维模式的入口函数。",["ai","analytics","aggregator"])]:FN("packages/core/src/ai/thought-patterns.ts",fn,s,e,sm,tg,"moderate")
F("packages/core/src/ai/trail-recommender.ts","trail-recommender.ts","思维脉络推荐模块，基于 RAG 索引+缓存+AI 生成实现 recommendTrailsViaAI、matchReflectionsToTopic、semanticSearchReflections、parseSmartQuery 等能力。",["ai","rag","recommendations","ai-service"],"complex")
for fn,s,e,sm,tg in [("clearAICaches",55,61,"清空推荐/匹配/查询三类 AI 缓存。",["ai","rag","cache"]),("batchedAIGenerate",133,206,"批量调用 AI 生成并解析结果，含错误回退。",["ai","ai-service","rag"]),("recommendTrailsViaAI",210,269,"基于 RAG 检索 + AI 生成思维脉络推荐。",["ai","rag","recommendations"]),("matchReflectionsToTopic",273,330,"将感念按主题匹配并返回相关感念。",["ai","rag","recommendations"]),("semanticSearchReflections",336,408,"语义搜索感念并返回匹配结果。",["ai","rag","retriever"]),("parseSmartQuery",419,475,"解析自然语言智能查询为结构化过滤条件。",["ai","rag","prompt-builder"]),("isAIRecommendAvailable",479,487,"判断当前 AI 配置是否可用。",["ai","ai-service"]),("parseAIRecommendations",491,513,"解析 AI 推荐的 JSON 结果。",["ai","json-utils"]),("parseAIMatchResults",515,535,"解析 AI 主题匹配的 JSON 结果。",["ai","json-utils"]),("parseSmartQueryResult",537,570,"解析智能查询的 JSON 结果。",["ai","json-utils"])]:FN("packages/core/src/ai/trail-recommender.ts",fn,s,e,sm,tg,"moderate" if e-s>15 else "simple")
F("packages/core/src/ai/types.ts","types.ts","AI 子系统类型定义文件，定义 AIConfig/AIResult/ModelConfig/AIMode/TagSuggestion/MoodDetection/TrailInsight/ReviewGuide 等类型及 PROVIDER_TEMPLATES 常量。",["ai","type-definition"],"moderate")
F("packages/core/src/auth.test.ts","auth.test.ts","auth 模块的单元测试（680 行），覆盖注册/登录/微信登录/Token 刷新/获取用户/登出/密码重置/同步推拉等全部 API 场景。",["test","auth","api-client"],"complex")
F("packages/core/src/auth.ts","auth.ts","认证与同步 API 客户端，封装注册/登录/微信登录/Token 刷新/获取用户/登出/密码重置/同步推拉等 19 个导出函数，基于 fetchWithTimeout。",["auth","api-client","sync"],"moderate")
for fn,s,e,sm,tg in [("validatePassword",52,60,"校验密码强度（长度、数字、字母）。",["auth","validation"]),("apiRegister",63,70,"用户注册 API。",["auth","api-client"]),("apiSendCode",73,80,"发送邮箱验证码 API。",["auth","api-client"]),("apiCheckEmail",83,90,"检查邮箱是否已注册 API。",["auth","api-client"]),("apiLogin",93,100,"邮箱密码登录 API。",["auth","api-client"]),("apiWechatLogin",103,110,"微信登录 API。",["auth","api-client"]),("apiRefreshToken",113,120,"刷新访问令牌 API。",["auth","api-client"]),("apiGetMe",123,128,"获取当前用户信息 API。",["auth","api-client"]),("apiLogout",131,141,"登出 API。",["auth","api-client"]),("apiResetPassword",144,151,"重置密码 API。",["auth","api-client"]),("apiChangePassword",154,161,"修改密码 API。",["auth","api-client"]),("apiSyncPush",164,173,"同步推送本地变更 API。",["auth","sync"]),("apiSyncPullPost",176,184,"同步拉取（POST 模式）API。",["auth","sync"]),("apiSyncPull",187,194,"同步拉取变更 API。",["auth","sync"]),("apiSyncCheck",197,203,"同步检查是否需要拉取 API。",["auth","sync"]),("apiSyncPullEntity",215,239,"分页拉取单个实体类型的同步数据 API。",["auth","sync"])]:FN("packages/core/src/auth.ts",fn,s,e,sm,tg,"simple")
F("packages/core/src/business/body.test.ts","body.test.ts","body 业务逻辑单元测试，验证 BMI/BMR 计算、目标进度、PR 记录、肌群统计等。",["test","business-logic","body"],"moderate")
F("packages/core/src/business/body.ts","body.ts","调身业务逻辑模块，提供 BMI/BMR 计算、目标进度、策略推荐、目标/计划/体重记录/打卡创建、PR 记录、肌群统计、月频率、训练建议等 12 个导出函数。",["business-logic","body","analytics"],"complex")
for fn,s,e,sm,tg in [("calcBMI",5,9,"计算 BMI 身体质量指数。",["business-logic","body"]),("calcBMR",11,16,"计算基础代谢率 BMR。",["business-logic","body"]),("calcGoalProgress",18,28,"计算目标完成进度百分比。",["business-logic","body"]),("recommendStrategy",30,37,"基于身体标签推荐训练策略。",["business-logic","body"]),("createBodyGoal",39,60,"创建身体目标记录。",["business-logic","body"]),("createBodyPlan",62,79,"创建训练计划。",["business-logic","body"]),("createWeightRecord",81,94,"创建体重记录。",["business-logic","body"]),("createBodyCheckin",96,117,"创建调身打卡记录。",["business-logic","body"]),("computePRs",134,155,"计算训练 PR（个人记录）。",["business-logic","body","analytics"]),("computeMuscleGroupStats",170,195,"统计肌群训练分布。",["business-logic","body","analytics"]),("computeMonthFrequency",211,241,"计算月度训练频率。",["business-logic","body","analytics"]),("generateSuggestions",256,358,"基于训练日志、打卡、计划生成训练建议。",["business-logic","body","recommendations"])]:FN("packages/core/src/business/body.ts",fn,s,e,sm,tg,"moderate" if e-s>15 else "simple")
F("packages/core/src/business/checkin.test.ts","checkin.test.ts","checkin 业务逻辑单元测试，验证未完成项获取、打卡提交、打卡备注解析等。",["test","business-logic","checkin"],"simple")
F("packages/core/src/business/checkin.ts","checkin.ts","打卡业务逻辑模块，提供未完成项获取、按日饮食日志、最长连续打卡、当日统计、打卡提交、打卡备注解析等函数。",["business-logic","checkin","analytics"],"moderate")
for fn,s,e,sm,tg in [("getIncompleteItems",23,48,"获取当日未完成的习惯与计划项及其原因。",["business-logic","checkin"]),("getStatsForDate",60,69,"获取指定日期的打卡统计（含连续打卡）。",["business-logic","checkin"]),("submitCheckinEntry",71,91,"提交打卡条目并更新连续打卡天数。",["business-logic","checkin"]),("parseCheckinNote",108,154,"解析打卡备注中的实践、自定义项与表情符号。",["business-logic","checkin"])]:FN("packages/core/src/business/checkin.ts",fn,s,e,sm,tg,"moderate")
F("packages/core/src/business/dateChangeDetection.ts","dateChangeDetection.ts","日期变化检测模块，createDateChangeDetector 返回检测器，当系统日期变化时触发回调。",["business-logic","utility","date"],"simple")
FN("packages/core/src/business/dateChangeDetection.ts","createDateChangeDetector",8,25,"创建日期变化检测器，日期变化时调用回调。",["business-logic","utility","date"],"simple")
F("packages/core/src/business/exercise.test.ts","exercise.test.ts","exercise 业务逻辑单元测试，验证按 ID 删除训练动作。",["test","business-logic","exercise"],"simple")
F("packages/core/src/business/exercise.ts","exercise.ts","训练业务逻辑模块，提供 deleteExerciseFromList 按 ID 软删除训练动作。",["business-logic","exercise"],"simple")
FN("packages/core/src/business/exercise.ts","deleteExerciseFromList",4,7,"按 ID 软删除训练动作（标记 deleted）。",["business-logic","exercise"],"simple")
F("packages/core/src/business/fasting.test.ts","fasting.test.ts","fasting 业务逻辑单元测试，验证禁食会话启动与停止逻辑。",["test","business-logic","fasting"],"simple")
F("packages/core/src/business/fasting.ts","fasting.ts","禁食业务逻辑模块，提供 startFastingSession 启动禁食会话与 stopFastingSession 停止禁食会话。",["business-logic","fasting"],"simple")
FN("packages/core/src/business/fasting.ts","startFastingSession",6,9,"启动新的禁食会话。",["business-logic","fasting"],"simple")
FN("packages/core/src/business/fasting.ts","stopFastingSession",19,39,"停止当前禁食会话并估算消耗热量。",["business-logic","fasting"],"moderate")
F("packages/core/src/business/food.test.ts","food.test.ts","food 业务逻辑单元测试，验证删除食物与获取最近食物列表。",["test","business-logic","food"],"simple")

funcs_per_file={}
for n in nodes:
    if n["type"] in ("function","class"):
        funcs_per_file.setdefault(n["filePath"],[]).append(n["name"])

exports_by_file={
  "packages/core/src/ai/ai-service.ts":["AIService","getAIService","resetAIService"],
  "packages/core/src/ai/cloud-providers.ts":["OpenAICompatibleProvider","createProvider","testConnection"],
  "packages/core/src/ai/context-reminder.ts":["detectMoodPatterns","detectHabitRisks","detectStreakRisks","detectReflectionGaps","getAllContextReminders"],
  "packages/core/src/ai/insight-profile.ts":["computeLocalInsights","generateInsightProfile"],
  "packages/core/src/ai/json-utils.ts":["extractJSON","findLastBalancedJSON","repairJSON"],
  "packages/core/src/ai/local-engine.ts":["LocalAIEngine"],
  "packages/core/src/ai/personalized-suggestions.ts":["generateMoodSuggestions","generateHabitSuggestions","generateRiskBasedSuggestions","generateTimeBasedSuggestions","getAllPersonalizedSuggestions"],
  "packages/core/src/ai/rag/cache.ts":["AICache","generateCacheKey"],
  "packages/core/src/ai/rag/indexer.ts":["buildIndex"],
  "packages/core/src/ai/rag/prompt-builder.ts":["formatReflectionSummary","buildRecommendPrompt","buildQueryParsePrompt"],
  "packages/core/src/ai/rag/retriever.ts":["SYNONYM_MAP","expandTerms","retrieveTopK"],
  "packages/core/src/ai/risk-warning.ts":["detectHabitAbandonRisk","detectPlanDelayRisk","detectStreakBreakRisk","detectMoodDeclineRisk","getAllRiskWarnings"],
  "packages/core/src/ai/thought-patterns.ts":["detectMoodSequencePatterns","detectTagPatterns","detectTimePatterns","detectKeywordPatterns","detectGrowthPatterns","getAllThoughtPatterns"],
  "packages/core/src/ai/trail-recommender.ts":["clearAICaches","recommendTrailsViaAI","matchReflectionsToTopic","semanticSearchReflections","parseSmartQuery","isAIRecommendAvailable"],
  "packages/core/src/auth.ts":["setApiBase","setSyncApiBase","getSyncUrl","validatePassword","apiRegister","apiSendCode","apiCheckEmail","apiLogin","apiWechatLogin","apiRefreshToken","apiGetMe","apiLogout","apiResetPassword","apiChangePassword","apiSyncPush","apiSyncPullPost","apiSyncPull","apiSyncCheck","apiSyncPullEntity"],
  "packages/core/src/business/body.ts":["calcBMI","calcBMR","calcGoalProgress","recommendStrategy","createBodyGoal","createBodyPlan","createWeightRecord","createBodyCheckin","computePRs","computeMuscleGroupStats","computeMonthFrequency","generateSuggestions"],
  "packages/core/src/business/checkin.ts":["INCOMPLETE_REASONS","getIncompleteItems","getFoodLogByDate","computeLongestStreakFromHistory","getStatsForDate","submitCheckinEntry","parseCheckinNote"],
  "packages/core/src/business/dateChangeDetection.ts":["createDateChangeDetector"],
  "packages/core/src/business/exercise.ts":["deleteExerciseFromList"],
  "packages/core/src/business/fasting.ts":["startFastingSession","stopFastingSession"],
}

node_ids={n["id"] for n in nodes}
for p,names in funcs_per_file.items():
    for nm in names:
        tid="function:"+p+":"+nm
        if tid not in node_ids:
            tid="class:"+p+":"+nm
        if tid in node_ids:
            E("file:"+p,tid,"contains",1.0)
for p,expnames in exports_by_file.items():
    for nm in expnames:
        tid="function:"+p+":"+nm
        if tid not in node_ids:
            tid="class:"+p+":"+nm
        if tid in node_ids:
            E("file:"+p,tid,"exports",0.8)

imports_map={
  "packages/core/src/__tests__/performDailyReset.test.ts":["packages/core/src/business/plan.ts","packages/core/src/types.ts"],
  "packages/core/src/ai/ai-service.ts":["packages/core/src/ai/cloud-providers.ts","packages/core/src/ai/local-engine.ts","packages/core/src/ai/types.ts","packages/core/src/business/review.ts","packages/core/src/logger.ts","packages/core/src/types.ts"],
  "packages/core/src/ai/cloud-providers.ts":["packages/core/src/ai/types.ts","packages/core/src/logger.ts"],
  "packages/core/src/ai/context-reminder.ts":["packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/insight-profile.test.ts":["packages/core/src/ai/insight-profile.ts","packages/core/src/types/reflection.ts"],
  "packages/core/src/ai/insight-profile.ts":["packages/core/src/ai/ai-service.ts","packages/core/src/ai/json-utils.ts","packages/core/src/ai/trail-recommender.ts","packages/core/src/ai/types.ts","packages/core/src/business/thought-trail.ts","packages/core/src/business/trail-creation.ts","packages/core/src/logger.ts","packages/core/src/types/reflection.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/json-utils.test.ts":["packages/core/src/ai/json-utils.ts"],
  "packages/core/src/ai/json-utils.ts":["packages/core/src/logger.ts"],
  "packages/core/src/ai/local-engine.ts":["packages/core/src/ai/types.ts"],
  "packages/core/src/ai/personalized-suggestions.ts":["packages/core/src/ai/risk-warning.ts","packages/core/src/ai/thought-patterns.ts","packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/rag/indexer.ts":["packages/core/src/types/reflection.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/rag/prompt-builder.ts":["packages/core/src/ai/rag/indexer.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/rag/retriever.test.ts":["packages/core/src/ai/rag/indexer.ts","packages/core/src/ai/rag/retriever.ts"],
  "packages/core/src/ai/rag/retriever.ts":["packages/core/src/ai/rag/indexer.ts"],
  "packages/core/src/ai/risk-warning.test.ts":["packages/core/src/ai/risk-warning.ts","packages/core/src/types.ts"],
  "packages/core/src/ai/risk-warning.ts":["packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/thought-patterns.test.ts":["packages/core/src/ai/thought-patterns.ts","packages/core/src/types.ts"],
  "packages/core/src/ai/thought-patterns.ts":["packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/ai/trail-recommender.ts":["packages/core/src/ai/ai-service.ts","packages/core/src/ai/json-utils.ts","packages/core/src/ai/rag/cache.ts","packages/core/src/ai/rag/indexer.ts","packages/core/src/ai/rag/prompt-builder.ts","packages/core/src/ai/rag/retriever.ts","packages/core/src/ai/types.ts","packages/core/src/business/trail-creation.ts","packages/core/src/logger.ts","packages/core/src/types/reflection.ts","packages/core/src/utils.ts"],
  "packages/core/src/auth.test.ts":["packages/core/src/auth.ts","packages/core/src/fetch.ts"],
  "packages/core/src/auth.ts":["packages/core/src/fetch.ts","packages/core/src/logger.ts","packages/core/src/sync/types.ts","packages/core/src/types.ts"],
  "packages/core/src/business/body.test.ts":["packages/core/src/business/body.ts"],
  "packages/core/src/business/body.ts":["packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/business/checkin.test.ts":["packages/core/src/business/checkin.ts","packages/core/src/types.ts"],
  "packages/core/src/business/checkin.ts":["packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/business/dateChangeDetection.ts":["packages/core/src/utils.ts"],
  "packages/core/src/business/exercise.test.ts":["packages/core/src/business/exercise.ts","packages/core/src/types.ts"],
  "packages/core/src/business/exercise.ts":["packages/core/src/types.ts"],
  "packages/core/src/business/fasting.test.ts":["packages/core/src/business/fasting.ts","packages/core/src/types.ts"],
  "packages/core/src/business/fasting.ts":["packages/core/src/defaults.ts","packages/core/src/types.ts","packages/core/src/utils.ts"],
  "packages/core/src/business/food.test.ts":["packages/core/src/business/food.ts","packages/core/src/types.ts"],
}
ic=0
for src,tgts in imports_map.items():
    for t in tgts:
        E("file:"+src,"file:"+t,"imports",0.7);ic+=1

# confident cross-file calls
def calls(sf,fn,tf,tn):
    E("function:"+sf+":"+fn,"function:"+tf+":"+tn,"calls",0.8)
calls("packages/core/src/ai/trail-recommender.ts","recommendTrailsViaAI","packages/core/src/ai/rag/cache.ts","generateCacheKey")
calls("packages/core/src/ai/trail-recommender.ts","recommendTrailsViaAI","packages/core/src/ai/rag/indexer.ts","buildIndex")
calls("packages/core/src/ai/trail-recommender.ts","recommendTrailsViaAI","packages/core/src/ai/rag/retriever.ts","retrieveTopK")
calls("packages/core/src/ai/trail-recommender.ts","recommendTrailsViaAI","packages/core/src/ai/rag/prompt-builder.ts","buildRecommendPrompt")
calls("packages/core/src/ai/trail-recommender.ts","matchReflectionsToTopic","packages/core/src/ai/rag/retriever.ts","retrieveTopK")
calls("packages/core/src/ai/trail-recommender.ts","semanticSearchReflections","packages/core/src/ai/rag/indexer.ts","buildIndex")
calls("packages/core/src/ai/trail-recommender.ts","parseSmartQuery","packages/core/src/ai/rag/prompt-builder.ts","buildQueryParsePrompt")
calls("packages/core/src/ai/trail-recommender.ts","parseAIRecommendations","packages/core/src/ai/json-utils.ts","extractJSON")
calls("packages/core/src/ai/trail-recommender.ts","parseAIMatchResults","packages/core/src/ai/json-utils.ts","extractJSON")
calls("packages/core/src/ai/trail-recommender.ts","parseSmartQueryResult","packages/core/src/ai/json-utils.ts","extractJSON")
calls("packages/core/src/ai/insight-profile.ts","parseInsightResponse","packages/core/src/ai/json-utils.ts","extractJSON")
calls("packages/core/src/ai/insight-profile.ts","parseInsightResponse","packages/core/src/ai/json-utils.ts","repairJSON")
calls("packages/core/src/ai/insight-profile.ts","generateInsightProfile","packages/core/src/ai/trail-recommender.ts","isAIRecommendAvailable")
E("function:packages/core/src/ai/insight-profile.ts:generateInsightProfile","class:packages/core/src/ai/ai-service.ts:AIService","depends_on",0.6)
E("function:packages/core/src/ai/trail-recommender.ts:isAIRecommendAvailable","class:packages/core/src/ai/ai-service.ts:AIService","depends_on",0.6)
E("file:packages/core/src/ai/personalized-suggestions.ts","file:packages/core/src/ai/risk-warning.ts","depends_on",0.6)
E("file:packages/core/src/ai/personalized-suggestions.ts","file:packages/core/src/ai/thought-patterns.ts","depends_on",0.6)
E("file:packages/core/src/auth.ts","file:packages/core/src/fetch.ts","depends_on",0.6)
E("file:packages/core/src/business/checkin.ts","file:packages/core/src/utils.ts","depends_on",0.6)
E("file:packages/core/src/business/body.ts","file:packages/core/src/utils.ts","depends_on",0.6)
E("file:packages/core/src/business/fasting.ts","file:packages/core/src/defaults.ts","depends_on",0.6)

import pathlib
out=pathlib.Path(r"D:/MyProject/2026/egoless-do/.ua/intermediate/batch-8.json")
out.write_text(json.dumps({"nodes":nodes,"edges":edges},ensure_ascii=False,indent=2),encoding="utf-8")
print("nodes:",len(nodes),"edges:",len(edges),"imports_edges:",ic)