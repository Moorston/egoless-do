import json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
MP = "apps/mobile/src/features/global-pulse/"

def F(rel, summ, tags, comp, fns=None):
    return (rel, summ, tags, comp, fns)

ROWS = [
 F("apps/mobile/src/config.ts","移动应用配置入口：导出 API_URL 等运行时常量。",["mobile","config","entry"],"simple"),
 F(MP+"components/ActiveMarker.tsx","地图活动 marker：展示用户/打卡类型图标，useGlobalTick 驱动脉搏动画。",["mobile","global-pulse","map","marker"],"moderate",
   {"ActiveMarker":("渲染脉搏动画 marker，使用 Animated 缩放。",["marker","animation"],"moderate"),"formatDuration":("格式化持续时长为 mm:ss。",["format","duration"],"simple")}),
 F(MP+"components/ActiveUserItem.tsx","活动用户列表项：展示用户名(formatDisplayName)、城市(useCityName)、打卡类型图标/颜色、相对时长(useGlobalTick)。",["mobile","global-pulse","list","user"],"moderate",
   {"formatDuration":("格式化持续时长。",["format","duration"],"simple")}),
 F(MP+"components/ActiveUsersList.tsx","活动用户分组列表(SectionList)：按类型分组，渲染 ActiveUserItem。",["mobile","global-pulse","list","section"],"moderate",
   {"ActiveUsersList":("渲染分组活动用户列表。",["list","section"],"moderate")}),
 F(MP+"components/BottomPanel.tsx","底部面板：嵌入 ActiveUsersList/Leadboard，展示今日/统计概览。",["mobile","global-pulse","panel","bottom"],"complex",
   {"BottomPanel":("底部抽屉面板：活动用户+排行榜+统计。",["panel","dashboard"],"complex")}),
 F(MP+"components/CityCallout.tsx","城市标注城市：调用 useCityName 反查城市名并渲染 callout。",["mobile","global-pulse","map","city"],"simple",
   {"CityCallout":("渲染地图城市气泡(反查城市名)。",["city","callout"],"simple")}),
 F(MP+"components/GlobalPulseMap.tsx","全球脉动主地图(MapView)：aggregateMarkers 聚合、UrlTile 瓦片、MarkerDetail/OfflineBanner/PulseMarker、getUserHash 匿名。",["mobile","global-pulse","map","main"],"complex",
   {"GlobalPulseMap":("主地图组件：聚合 marker 与详情面板。",["map","marker"],"complex")}),
 F(MP+"components/Leaderboard.tsx","排行榜：排序切换(LeaderboardSort)、PodiumItem 前三名、LeaderboardItem 列表。",["mobile","global-pulse","leaderboard","sort"],"moderate",
   {"buildLeaderboard":("按排序规则聚合排行榜数据。",["leaderboard","aggregate"],"simple"),"Leaderboard":("渲染排序切换与排行榜列表。",["leaderboard","ui"],"moderate")}),
 F(MP+"components/LeaderboardItem.tsx","排行榜行项：展示名次/用户名/城市/天数、daysSince、ActivityIndicator。",["mobile","global-pulse","leaderboard","item"],"moderate",
   {"daysSince":("计算距今天数。",["date"],"simple"),"formatDate":("格式化日期。",["date","format"],"simple")}),
 F(MP+"components/MarkerDetail.tsx","Marker 详情面板：展示打卡详情/活动会话/城市/时长(useGlobalTick)+scaleFontSize。",["mobile","global-pulse","detail","panel"],"complex",
   {"MarkerDetail":("渲染选中 marker 详情与活跃会话列表。",["detail","panel"],"complex"),"formatDuration":("格式化时长。",["format","duration"],"simple")}),
 F(MP+"components/OfflineBanner.tsx","离线横幅提示组件。",["mobile","global-pulse","offline","banner"],"simple",
   {"OfflineBanner":("渲染网络离线提示横幅。",["offline","banner"],"simple")}),
 F(MP+"components/PodiumItem.tsx","领奖台项：前三名金银铜样式。",["mobile","global-pulse","leaderboard","podium"],"simple",
   {"formatDate":("格式化日期。",["date","format"],"simple")}),
 F(MP+"components/PrivacyControl.tsx","隐私控制：optIn/optOut/deleteGlobalData(AsyncStorage)+getUserHash。",["mobile","global-pulse","privacy","settings"],"complex",
   {"PrivacyControl":("渲染 opt-in/opt-out/删除全球数据操作。",["privacy","settings"],"complex")}),
 F(MP+"components/PulseMarker.tsx","打卡类型 marker(memo)：按 CheckinType 着色图标。",["mobile","global-pulse","map","marker"],"simple"),
 F(MP+"hooks/useActiveSessions.ts","活动会话 Hook：订阅活跃会话、连接状态、增量更新。",["mobile","global-pulse","hook","session"],"moderate",
   {"useActiveSessions":("订阅活跃会话流并维护本地列表。",["session","hook"],"moderate")}),
 F(MP+"hooks/useCheckinSync.ts","打卡同步 Hook：fuzzCoordinate 模糊定位+expo-location+submitCheckin，用 useNetworkStatus/usePrivacy。",["mobile","global-pulse","hook","sync","checkin"],"moderate",
   {"useCheckinSync":("定位模糊化并提交全球打卡。",["checkin","geo","privacy"],"moderate")}),
 F(MP+"hooks/useCityName.ts","城市名 Hook：getCityInfo 反向地理编码，单条(useCityName)/批量(useCityNameBatch)/clearCityCache。",["mobile","global-pulse","hook","geo","city"],"moderate",
   {"useCityName":("单个坐标→城市名(缓存)。",["geo","city"],"moderate"),"useCityNameBatch":("批量坐标→城市名。",["geo","city","batch"],"moderate"),"clearCityCache":("清空城市名缓存。",["cache"],"simple")}),
 F(MP+"hooks/useGlobalPulse.ts","全球脉动数据 Hook：getCheckins/getGlobalStats，依赖 useNetworkStatus。",["mobile","global-pulse","hook","data"],"moderate",
   {"useGlobalPulse":("拉取打卡与全局统计。",["data","hook"],"moderate")}),
 F(MP+"hooks/useGlobalTick.ts","全局节拍 Hook：useSyncExternalStore 订阅定时 tick，驱动实时相对时间，自动清理。",["mobile","global-pulse","hook","tick"],"simple",
   {"useGlobalTick":("订阅全局 tick 派发相对时间。",["tick","sync-external-store"],"simple")}),
 F(MP+"hooks/useNetworkStatus.ts","网络状态 Hook：NetInfo 订阅 NetworkStatus 变化。",["mobile","global-pulse","hook","network"],"moderate",
   {"useNetworkStatus":("NetInfo 订阅并映射为 NetworkStatus。",["network","hook"],"moderate")}),
 F(MP+"hooks/usePrivacy.ts","隐私 Hook：读写 AsyncStorage 匿名偏好、optIn/optOut/deleteGlobalData。",["mobile","global-pulse","hook","privacy"],"moderate",
   {"usePrivacy":("管理匿名数据偏好与删除。",["privacy","hook"],"moderate")}),
 F(MP+"hooks/useSessionHeartbeat.ts","会话心跳 Hook：AppState 切换时更新活跃会话(updateSession)，保持心跳。",["mobile","global-pulse","hook","heartbeat"],"moderate",
   {"useSessionHeartbeat":("应用前后台切换时维持会话心跳。",["heartbeat","session"],"moderate")}),
 F(MP+"services/activeSessionApi.ts","活跃会话 API：CRUD(create/update/delete/deleteSessionsByUserHash/getActiveSessions)+subscribeSessions 实时订阅+pbRequest。",["mobile","global-pulse","api","session"],"complex",
   {"createSession":("创建活跃会话。",["session","api"],"simple"),"updateSession":("更新会话心跳。",["session","api"],"simple"),"deleteSessionsByUserHash":("按用户 hash 删除会话。",["session","api"],"simple"),"getActiveSessions":("拉取活跃会话列表。",["session","api"],"moderate"),"subscribeSessions":("订阅会话变更流(pb)。",["session","subscribe"],"moderate")}),
 F(MP+"services/globalPulseApi.ts","全球脉动 API：submitCheckin/getCheckins/getGlobalStats/getLeaderboard/optOut/optIn/deleteGlobalData+formatDisplayName/getCheckinTypeIcon/Color。",["mobile","global-pulse","api","data"],"complex",
   {"submitCheckin":("提交全球打卡。",["checkin","api"],"simple"),"getCheckins":("拉取打卡列表(离线感知)。",["checkin","api"],"moderate"),"getLeaderboard":("拉取排行榜。",["leaderboard","api"],"simple"),"formatDisplayName":("匿名化显示用户名。",["privacy","format"],"simple")}),
 F(MP+"services/offlineCache.ts","离线缓存(SQLite)：瓦片/打卡/统计/同步状态表 CACHE，initDatabase+CRUD+cleanup。",["mobile","global-pulse","cache","sqlite"],"complex",
   {"initDatabase":("初始化 SQLite 缓存表。",["sqlite","init"],"moderate"),"cacheCheckins":("缓存打卡数据。",["cache","checkin"],"moderate"),"getCachedCheckins":("读取缓存打卡。",["cache","checkin"],"moderate"),"clearAllCache":("清空所有缓存。",["cache"],"simple")}),
 F(MP+"services/pbFilterEscape.ts","PocketBase filter 转义：escapeFilter 防注入。",["mobile","global-pulse","util","security"],"simple",
   {"escapeFilter":("转义 PB filter 参数防注入。",["security","pb"],"simple")}),
 F(MP+"services/userHash.ts","用户匿名 hash：SecureStore/AsyncStorage 持久化 userID+fuzzSecret 定位密钥。",["mobile","global-pulse","privacy","hash"],"simple",
   {"getUserHash":("读取/创建匿名用户 hash。",["privacy","hash"],"simple"),"getFuzzSecret":("读取定位模糊密钥。",["geo","privacy"],"simple")}),
 F("apps/mobile/src/net/offlineAware.ts","离线感知 fetch：自动附加 authToken、失败时走离线缓存。",["mobile","net","offline","fetch"],"simple",
   {"offlineAwareFetch":("带 token、离线回退的网络请求封装。",["fetch","offline"],"simple")}),
 F("apps/mobile/src/store/authToken.ts","认证 token 工具：从 useAppStore 取 token/userId。",["mobile","store","auth","token"],"simple",
   {"getAuthToken":("从 store 读取 auth token。",["auth","token"],"simple"),"getAuthUserId":("从 store 读取用户 id。",["auth","token"],"simple")}),
 F("apps/mobile/src/store/useNetworkStatus.ts","网络状态 store：zustand+NetInfo 维护 NetworkStatus。",["mobile","store","network","zustand"],"simple"),
]

def build():
    out = {}
    for rel, summ, tags, comp, fns in ROWS:
        node = {"summary": summ, "tags": tags, "complexity": comp}
        if fns:
            node["functions"] = {n: {"summary": s, "tags": t, "complexity": c} for n,(s,t,c) in fns.items()}
        out[rel] = node
    return out

sem = build()
out = P/".ua/tmp/sem-batch14.json"
out.write_text(json.dumps(sem, ensure_ascii=False, indent=2), "utf-8")
json.loads(out.read_text("utf-8"))
print("batch 14 sem valid:", len(sem))
