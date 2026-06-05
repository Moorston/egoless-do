## 1. Typography 调整

- [ ] 1.1 修改 `packages/core/src/typography.ts`：FONT_BODY 16→15, FONT_BUTTON 16→15, FONT_LABEL 16→13, 新增 FONT_CARD_TITLE=17
- [ ] 1.2 在 `packages/core/src/index.ts` 导出 FONT_CARD_TITLE

## 2. i18n 文案

- [ ] 2.1 在 `packages/core/src/i18n/types.ts` 新增 `checkinEditing: string` 字段
- [ ] 2.2 在 `packages/core/src/i18n/zh.ts` 添加 `checkinEditing:'继续今日打卡'`
- [ ] 2.3 在 `packages/core/src/i18n/en.ts` 添加 `checkinEditing:'Continue your check-in'`
- [ ] 2.4 在 `packages/core/src/i18n/zh-Hant.ts` 添加 `checkinEditing:'繼續今日打卡'`

## 3. HomeScreen 重写（核心）

- [ ] 3.1 移除 CheckinModal 引用，新增内联打卡表单状态管理（done/practices/weight/note 等 local state）
- [ ] 3.2 实现三态 Banner（未打卡/编辑中/已完成），显示累计天数 + 连续天数 + 状态文案
- [ ] 3.3 实现核心打卡卡片：实践（坐/站/诵）Checkbox 列表
- [ ] 3.4 实现核心打卡卡片：习惯 Checkbox 列表（带连续天数）
- [ ] 3.5 实现核心打卡卡片：感悟文本输入框
- [ ] 3.6 实现数据卡片：饮水（进度条 + +250ml 按钮）、热量（进度条 + 添加食物按钮）、体重、步数
- [ ] 3.7 实现底部状态按钮（已完成/修改打卡），点击切换 done 状态
- [ ] 3.8 实现实时保存逻辑：Toggle/输入立即调用 store.submitCheckin
- [ ] 3.9 实现已完成状态下的字段锁定（实践/习惯/感悟只读，饮水/热量/体重仍可编辑）
- [ ] 3.10 保留 Grace 提醒条、添加食物弹窗、饮水/热量目标设置弹窗

## 4. 清理

- [ ] 4.1 检查 CheckinModal 是否仍被其他页面引用，决定保留或删除
