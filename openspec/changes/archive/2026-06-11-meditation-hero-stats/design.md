## Approach

参考 ExerciseScreen 的 Hero Banner 实现：

1. 用 `LinearGradient` 渐变背景（紫色系，与冥想主题匹配）
2. 顶部行：标题"冥想" + 右侧"冥想历史"链接（ChevronRight）
3. 统计区：3 列并排，竖线分隔
   - 累计分钟：`store.totalMedMinutes`
   - 今日分钟：`todayMedMin`
   - 累计次数：`(store.medHistory ?? []).length`
4. 底部：全球冥想者入口（borderTop 分隔线）
5. 移除原来的独立"累计打居"Card、"今日打居"Card、独立的全球冥想者入口和历史入口
