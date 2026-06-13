# 打卡复盘系统 - 任务列表

## 阶段1: 数据模型与类型定义

### 1.1 创建review类型定义 ✓
- **文件**: `packages/core/src/types/review.ts`
- **内容**: 
  - CheckinReview接口
  - IncompleteReasonStat接口
  - IncompleteItemStat接口
  - HabitProgressStat接口
  - PlanProgressStat接口
  - ReviewMetrics接口
  - ReviewComparison接口
- **预计时间**: 1小时
- **依赖**: 无

### 1.2 更新store类型 ✓
- **文件**: `packages/core/src/store/types.ts`
- **内容**: 
  - 新增ReviewSlice接口
  - 更新FullStore类型
- **预计时间**: 30分钟
- **依赖**: 1.1

### 1.3 更新默认值 ✓
- **文件**: `packages/core/src/defaults.ts`
- **内容**: 
  - 新增checkinReviews默认值
- **预计时间**: 15分钟
- **依赖**: 1.1

## 阶段2: 分析引擎

### 2.1 创建review业务逻辑 ✓
- **文件**: `packages/core/src/business/review.ts`
- **内容**:
  - calculateReviewData() 计算复盘数据
  - getWeekRange() 计算周起止日期
  - getMonthRange() 计算月起止日期
  - buildReviewPrompt() 构建AI提示词
  - parseReviewAIResponse() 解析AI响应
- **预计时间**: 4小时
- **依赖**: 1.1

### 2.2 编写review单元测试 ✓
- **文件**: `packages/core/src/business/review.test.ts`
- **内容**:
  - 测试getWeekRange
  - 测试getMonthRange
  - 测试calculateReviewData
  - 测试buildReviewPrompt
  - 测试parseReviewAIResponse
- **预计时间**: 3小时
- **依赖**: 2.1

## 阶段3: AI服务扩展

### 3.1 扩展AIService ✓
- **文件**: `packages/core/src/ai/ai-service.ts`
- **内容**:
  - 新增generateCheckinReview()方法
- **预计时间**: 1小时
- **依赖**: 2.1

## 阶段4: Store层

### 4.1 创建ReviewSlice ✓
- **文件**: `packages/core/src/store/createReviewSlice.ts`
- **内容**:
  - checkinReviews状态
  - generateReview() 生成复盘
  - getReview() 获取复盘
  - getLatestReview() 获取最新复盘
  - deleteReview() 删除复盘
- **预计时间**: 3小时
- **依赖**: 1.2, 2.1, 3.1

### 4.2 集成到useAppStore ✓
- **文件**: `apps/mobile/src/store/useAppStore.ts`
- **内容**:
  - 集成ReviewSlice
  - 配置持久化
- **预计时间**: 1小时
- **依赖**: 4.1

## 阶段5: 自动触发

### 5.1 扩展dailyReset ✓
- **文件**: `packages/core/src/dailyReset.ts`
- **内容**:
  - 新增checkAndGenerateReviews()函数
  - 周日自动触发周复盘生成
  - 月末自动触发月复盘生成
- **预计时间**: 1小时
- **依赖**: 4.1

## 阶段6: UI组件

### 6.1 创建ReviewView组件 ✓
- **文件**: `apps/mobile/src/features/home/ReviewView.tsx`
- **内容**:
  - 核心指标卡片
  - 未完成分析卡片
  - 习惯养成卡片
  - 计划任务卡片
  - 健康指标卡片
  - AI分析卡片
  - 历史复盘入口
  - 加载状态
  - 空状态
  - 下拉刷新
- **预计时间**: 6小时
- **依赖**: 4.2

### 6.2 修改CheckinHistoryScreen ✓
- **文件**: `apps/mobile/src/features/home/CheckinHistoryScreen.tsx`
- **内容**:
  - 新增Tab切换（历史记录/周复盘/月复盘）
  - 集成ReviewView组件
  - 新增跳转到复盘历史的入口
- **预计时间**: 2小时
- **依赖**: 6.1

### 6.3 创建ReviewHistoryScreen ✓
- **文件**: `apps/mobile/src/features/home/ReviewHistoryScreen.tsx`
- **内容**:
  - 周/月切换Tab
  - 按年月分组显示
  - 点击展开查看完整复盘
  - 空状态处理
- **预计时间**: 3小时
- **依赖**: 4.2

## 阶段7: 国际化

### 7.1 添加翻译 ✓
- **文件**: 
  - `packages/core/src/i18n/zh.ts`
  - `packages/core/src/i18n/en.ts`
  - `packages/core/src/i18n/zh-Hant.ts`
- **内容**:
  - 复盘相关翻译键
- **预计时间**: 1小时
- **依赖**: 无

## 阶段8: 同步配置

### 8.1 PocketBase集合配置 ✓
- **文件**: `backend/pb_migrations/`
- **内容**:
  - 创建checkin_reviews集合
  - 配置字段和权限
- **预计时间**: 1小时
- **依赖**: 1.1

## 阶段9: 测试与优化

### 9.1 功能测试 ✓
- **内容**:
  - 测试周复盘生成
  - 测试月复盘生成
  - 测试自动触发
  - 测试手动刷新
  - 测试历史查看
  - 测试同步功能
- **预计时间**: 3小时
- **依赖**: 所有任务

### 9.2 性能优化 ✓
- **内容**:
  - 优化计算性能
  - 优化UI渲染
  - 优化缓存策略
- **预计时间**: 2小时
- **依赖**: 9.1

## 任务依赖图

```
1.1 (类型定义)
  ↓
1.2 (Store类型) ──→ 2.1 (分析引擎) ──→ 3.1 (AI服务)
  ↓                      ↓                    ↓
1.3 (默认值)         2.2 (单元测试)      4.1 (ReviewSlice)
                                          ↓
                                    4.2 (集成Store)
                                      ↓       ↓
                               5.1 (自动触发) 6.1 (ReviewView)
                                                  ↓
                                            6.2 (修改History)
                                            6.3 (HistoryScreen)
```

## 预计总时间

- 阶段1: 1.75小时
- 阶段2: 7小时
- 阶段3: 1小时
- 阶段4: 4小时
- 阶段5: 1小时
- 阶段6: 11小时
- 阶段7: 1小时
- 阶段8: 1小时
- 阶段9: 5小时

**总计**: 约32.75小时

## 优先级

### P0 (必须)
- 1.1, 1.2, 1.3 - 数据模型
- 2.1 - 分析引擎
- 3.1 - AI服务
- 4.1, 4.2 - Store层
- 6.1, 6.2 - 核心UI
- 7.1 - 国际化

### P1 (重要)
- 2.2 - 单元测试
- 5.1 - 自动触发
- 6.3 - 历史页面
- 8.1 - 同步配置

### P2 (优化)
- 9.1 - 功能测试
- 9.2 - 性能优化
