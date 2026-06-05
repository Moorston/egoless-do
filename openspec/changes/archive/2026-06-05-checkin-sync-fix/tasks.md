# 任务清单

- [x] 移除 `habitCheckins` 本地状态，改为从 store habits 直接读取
- [x] 移除 `planToggles` 本地状态，改为从 planCheckins 直接读取
- [x] 移除过时的同步 useEffect（原依赖 todayRecord?.updatedAt）
- [x] 修复 `buildNote` 回调，从 store 读取习惯打卡状态
- [x] 修复 `togglePractice` 回调，移除对 habitCheckins 的引用
- [x] 修复 `toggleHabit`，只调用 store.checkinHabit()，移除本地状态更新
- [x] 修复 `togglePlanItem`，从 store 实时读取状态，消除 stale closure
- [x] 修复计划待办渲染，直接从 planCheckins 读取 done 状态
- [x] 修复习惯渲染，从 h.checkedDates 读取打卡状态
- [x] 添加 `autoSyncPlanItems()` + `checkAutoStatus()` 挂载调用
- [x] TypeScript 编译验证通过
