# 项目目录结构范本项目

> 实际使用时把下列内容根据本项目的技术栈替换占位即可

```
<project>/ (monorepo 或单仓)
├── apps/
│   ├── mobile/                    # 移动端
│   │   └── src/
│   │       ├── features/          # 功能模块（各自为政，保留 features/ 范式）
│   │       ├── components/        # 跨 feature 通用组件
│   │       ├── db/                # SQLite / 存储 schema
│   │       ├── store/             # 单端 local store
│   │       ├── net/               # 网络层工具 (offline-aware)
│   │       ├── i18n/              # 国际化初始化
│   │       └── navigation/        # 导航配置
│   └── _archive/ web-legacy/         # 已归档的废弃 web 应用
├── packages/
│   ├── core/                      # 共享业务逻辑（平台无关）
│   │   ├── ai/                    # AI 服务 + RAG
│   │   ├── business/              # 纯业务函数
│   │   ├── store/                 # 共享 local store slices
│   │   ├── sync/                  # 同步协议
│   │   ├── i18n/                  # 国际化
│   │   ├── types/                 # 共享类型
│   │   ├── constants/             # 常量
│   │   ├── data/                  # 数据网关接口
│   │   └── utils/                 # 工具函数
│   └── config/                    # ESLint + TypeScript 配置
├── backend/                       # 后端 (PocketBase / Node / …)
├── infra/                         # 部署和运维文件
│   ├── docker/                    # 生产 docker 配置
│   ├── nginx/                     # 反向代理
│   └── scripts/                   # 运维脚本
└── openspec/                      # 架构决策记录 (ADR)
```

## 已知技术债务

> 把各项目共通的、但是技术债写在这里，如：
> - `apps/web/` — deprecated，待归档
> - 6 个测试失败（预先存在），待修复
