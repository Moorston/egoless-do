# 决策树：代码该放哪

每个项目都必须执行这个决策树，它是架构一致性的硬约束。

```
这个文件是业务逻辑吗？
├── 是 → packages/core/src/business/ 或 domain/
└── 否 → 它是 UI 组件吗？
         ├── 是 → 跨 app 共享吗？
         │        ├── 是 → packages/core/src/ui/（仅纯 UI 原子）
         │        └── 否 → apps/<app>/components/ 或 features/<name>/components/
         └── 否 → 它是类型吗？
                  ├── 是 → packages/core/src/types/
                  └── 否 → 它是配置/常量吗？
                           ├── 是 → packages/core/src/constants/
                           └── 否 → 它是工具函数吗？
                                    ├── 是 → packages/core/src/utils/
                                    └── 否 → 重新评估，可能是设计问题
```

> 任何写出"put it in core"但不在上述路径里的代码 → 必须显式说明 why 并请用户确认
