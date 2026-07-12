// ─── Init placeholder ───
// PB 0.38.2 JS API 不支持从 hook 创建 collection（DynamicModel 不可用）。
// 请使用以下方式创建 custom_food_presets collection：
//
// 方式 A: 运行 .\backend\create-collection.ps1
// 方式 B: Admin UI → Collections → New collection → 从 pb_schema.json 复制字段定义
//
// 此文件保留空壳避免加载错误，不执行任何操作。
console.log("[Init] Use create-collection.ps1 or Admin UI to create missing collections.");