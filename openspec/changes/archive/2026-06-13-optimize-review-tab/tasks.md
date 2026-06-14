## 1. AI 面板组件

- [x] 1.1 新建 `ReviewAIPanel.tsx`，使用 SegmentBar 实现「洞察 / 引导」子 tab 切换
- [x] 1.2 将 InsightSection 的洞察内容渲染逻辑迁移到 ReviewAIPanel 的洞察子 tab
- [x] 1.3 将 ReviewGuideSection 的引导内容渲染逻辑迁移到 ReviewAIPanel 的引导子 tab
- [x] 1.4 实现默认子 tab 逻辑：有 insightCache → 洞察，仅有 reviewCache → 引导，都没有 → 洞察
- [x] 1.5 实现空状态：无缓存时显示并排「生成洞察」「生成引导」按钮

## 2. 复盘笔记卡片

- [x] 2.1 新建 `ReviewNoteCard.tsx`，简洁卡片样式（无时间线点线连接）
- [x] 2.2 卡片显示：来源标签 + 日期、引导问题（如有）、内容摘要（截断 2 行）、标签 + 心情
- [x] 2.3 点击卡片展开/收起全文

## 3. 复盘 tab 整合

- [x] 3.1 修改 `ThoughtTrailDetailScreen.tsx` 复盘 tab，用 ReviewAIPanel 替换 InsightSection + ReviewGuideSection
- [x] 3.2 用 ReviewNoteCard 替换 TimelineNoteItem 渲染复盘笔记
- [x] 3.3 实现空状态：无复盘笔记时显示引导文案
- [x] 3.4 清理未使用的 InsightSection 和 ReviewGuideSection 引用

## 4. 验证

- [x] 4.1 验证有洞察+引导+笔记的完整状态
- [x] 4.2 验证无 AI 缓存的空状态
- [x] 4.3 验证无复盘笔记的空状态
- [x] 4.4 验证子 tab 切换和生成按钮功能
