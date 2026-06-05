## 1. 移除置顶功能 UI

- [x] 1.1 ReflectionsScreen: 移除内联卡片的 Pin 徽章（line 386）
- [x] 1.2 ReflectionsScreen: 详情页移除置顶按钮，替换为创建任务/解绑任务按钮
- [x] 1.3 ReflectionCard: 移除 Swipeable 包装和 renderRightActions，移除 Pin 徽章，移除 onTogglePin prop
- [x] 1.4 ReflectionsScreen: 移除 renderRightActions 函数和相关 import（Swipeable, Pin）

## 2. 详情页增加创建任务/解绑任务

- [x] 2.1 ReflectionsScreen: 详情页按钮区域增加"创建任务"按钮（未关联时显示），复用已有 handleCreatePlanItem 逻辑
- [x] 2.2 ReflectionsScreen: 详情页按钮区域增加"解绑任务"按钮（已关联时显示），复用长按菜单的解绑逻辑

## 3. 移除左滑手势

- [x] 3.1 ReflectionsScreen: 移除内联卡片的 Swipeable 包装，保留 TouchableOpacity
- [x] 3.2 ReflectionCard: 确认 Swipeable 已移除（与 1.3 合并）

## 4. 日期范围筛选 UI

- [x] 4.1 FilterDrawer: 增加日期范围预设按钮区域（本周/本月/近7天/近30天）
- [x] 4.2 FilterDrawer: 实现预设按钮的激活/取消切换逻辑，调用 onApplyFilters 更新 dateRange
- [x] 4.3 FilterDrawer: handleClearAll 中清除 dateRange

## 5. 旧日期折叠

- [x] 5.1 ReflectionsScreen: 实现日期折叠逻辑——判断 byDay 中哪些是旧日期（非最近一天），默认折叠
- [x] 5.2 ReflectionsScreen: 折叠摘要卡片 UI（日期+感念数+Top3标签+主要心情，可点击展开）
- [x] 5.3 ReflectionsScreen: 展开日期组标题栏可点击收起
