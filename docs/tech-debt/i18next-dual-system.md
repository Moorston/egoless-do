# TODO: i18next 双系统重构（技术债）

## 现状
- **core i18n**: `packages/core/src/i18n/` 提供类型安全 `t()`、翻译字典（zh/en/zh-Hant）
- **mobile i18next**: `apps/mobile/src/i18n/index.ts` 用 i18next + react-i18next 包装 core 翻译

## 问题
- 双系统维护成本（i18next 配置 + core 翻译字典需同步）
- i18next 包体积大（~50KB）
- core `t()` 类型安全优势未在 mobile 充分利用

## 重构方案（未来）
1. 创建 `useTHook`（基于 React useState + core `t()`）
2. 替换所有 `useTranslation()` → `useT()`
3. 移除 i18next / react-i18next / intl-pluralrules 依赖
4. 保留语言切换 Context

## 影响
- ~100+ 组件文件需改 import
- 需全面回归测试
- 预计 1-2 天工作量

## 优先级
低（当前系统功能正常，重构收益为包体积 + 维护性）

> 创建于 session 61 — session 52-61 已完整（19 commit），此项延后。
