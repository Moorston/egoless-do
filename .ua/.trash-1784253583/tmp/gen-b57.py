import json, os
OUT_DIR = "D:/MyProject/2026/egoless-do/.ua/intermediate"

# ---- Batch 57 metadata ----
B57 = {
  ".github/dependabot.yml": {
    "summary": "GitHub Dependabot 自动更新配置，定义 npm/pnpm 依赖与 GitHub Actions 的周期版本升级策略。",
    "tags": ["config","dependabot","dependencies","automation"],"complexity":"simple","nodeType":"config"
  },
  ".gitmodules": {
    "summary": "Git 子模块定义文件（当前未配置任何子模块，为空清单）。",
    "tags": ["config","git","submodules"],"complexity":"simple","nodeType":"config"
  },
  ".npmrc": {
    "summary": "pnpm/npm 注册表配置文件，设定包管理行为（如严格对等依赖、hoist 策略等）。",
    "tags": ["config","npm","pnpm"],"complexity":"simple","nodeType":"config"
  },
  ".trellis/.version": {
    "summary": "Trellis 工具的版本锁文件，记录当前使用的 Trellis 版本号（空/占位）。",
    "tags": ["config","trellis","version"],"complexity":"simple","nodeType":"config"
  },
  ".trellis/agents/check.md": {
    "summary": "Trellis Check Agent 的提示指令：由 channel runtime 派生，对未提交 diff 按任务产物和规范进行代码审查、自修复并报告。",
    "tags": ["documentation","trellis","agent","code-review"],"complexity":"moderate","nodeType":"document"
  },
  ".trellis/agents/implement.md": {
    "summary": "Trellis Implement Agent 的提示指令：按计划产物执行具体编码任务，遵照设计/实现文档落地功能。",
    "tags": ["documentation","trellis","agent","implementation"],"complexity":"moderate","nodeType":"document"
  },
  ".trellis/plans/auth-proxy-extraction.md": {
    "summary": "认证代理提取（auth-proxy-extraction）计划文档，规划将鉴权逻辑抽取为独立代理/模块的方案与阶段。",
    "tags": ["documentation","trellis","plan","auth"],"complexity":"moderate","nodeType":"document"
  },
  ".trellis/scripts/__init__.py": {
    "summary": "Trellis scripts 包的 Python 初始化文件（空），将 scripts 目录标记为包。",
    "tags": ["trellis","python","init"],"complexity":"simple","nodeType":"file"
  },
  ".trellis/scripts/common/cli_adapter.py": {
    "summary": "多平台 CLI 适配器：抽象 Claude Code/OpenCode/Cursor/iFlow/Codex 等 16+ AI 编码 CLI 工具差异，提供统一 agent 名/命令/目录映射。",
    "tags": ["trellis","python","cli","multi-platform"],"complexity":"complex","nodeType":"file",
    "classes":[{"name":"CLIAdapter","startLine":63,"endLine":629,
                "summary":"dataclass 适配器，按 platform 提供 agent name、config 目录、命令构建、session 等差异化方法（20+ 成员）。",
                "tags":["cli","adapter","multi-platform"],"complexity":"complex"}],
    "functions":[
      {"name":"get_cli_adapter","startLine":637,"endLine":679,"summary":"工厂函数：按平台名返回 CLIAdapter，兼容 windsurf 已弃用别名并校验支持列表。","tags":["cli","factory"]},
      {"name":"_has_other_platform_dir","startLine":709,"endLine":715,"summary":"检测项目根是否已存在其他平台的配置目录，辅助平台推断。","tags":["cli","detect"]},
      {"name":"detect_platform","startLine":718,"endLine":873,"summary":"自动检测项目所用 CLI 平台：遍历配置目录、依据特征判定并返回 Platform。","tags":["cli","detect","platform"]},
      {"name":"get_cli_adapter_auto","startLine":876,"endLine":886,"summary":"自动检测项目平台并返回对应 CLIAdapter 的便捷入口。","tags":["cli","factory","auto"]},
    ]
  },
  ".trellis/scripts/hooks/linear_sync.py": {
    "summary": "Linear 同步钩子：在 Trellis 任务 create/start/archive 生命周期事件时，通过 linearis CLI 同步状态到 Linear。",
    "tags": ["trellis","python","linear","hook"],"complexity":"complex","nodeType":"file",
    "functions":[
      {"name":"_load_config","startLine":48,"endLine":62,"summary":"从 .trellis/hooks.local.json 加载本地钩子配置（team/project/assignees）。","tags":["linear","config"]},
      {"name":"_read_task","startLine":75,"endLine":81,"summary":"读取 TASK_JSON_PATH 指向的 task.json 内容。","tags":["linear","task"]},
      {"name":"_write_task","startLine":84,"endLine":87,"summary":".write_task(data,path) 写回 task.json。","tags":["linear","task"]},
      {"name":"_linearis","startLine":90,"endLine":104,"summary":"封装 linearis CLI 子进程调用，错误时退出。","tags":["linear","cli"]},
      {"name":"_get_linear_issue","startLine":107,"endLine":111,"summary":"查询 Linear 中关联 task 的 issue。","tags":["linear","query"]},
      {"name":"cmd_create","startLine":117,"endLine":158,"summary":"create 命令：在 Linear 创建对应 issue 并回写 task。","tags":["linear","create"]},
      {"name":"cmd_start","startLine":161,"endLine":168,"summary":"start 命令：将 Linear issue 状态推进到 In Progress。","tags":["linear","workflow"]},
      {"name":"cmd_archive","startLine":171,"endLine":177,"summary":"archive 命令：将 Linear issue 标记完成/归档。","tags":["linear","archive"]},
      {"name":"cmd_sync","startLine":180,"endLine":197,"summary":"sync 命令：根据 task 状态与解决状态映射同步 Linear issue。","tags":["linear","sync"]},
      {"name":"_resolve_parent_linear_issue","startLine":203,"endLine":224,"summary":"解析任务关联的父 Linear issue（如归属 team/project）。","tags":["linear","resolve"]},
    ]
  },
}

def build_trellis_task(prefix, title, description, relatedFiles=None):
    """Generic metadata for trellis task sub-files given the task title."""
    prd = {
        "summary": f"Trellis 归档任务「{title}」的需求文档（prd.md）：{description}",
        "tags": ["documentation","trellis","prd","archive"],"complexity":"moderate","nodeType":"document"
    }
    task = {
        "summary": f"Trellis 归档任务「{title}」的元数据（task.json）：id、标题、状态、优先级、相关文件等。",
        "tags": ["config","trellis","task","archive"],"complexity":"simple","nodeType":"config"
    }
    check = {
        "summary": f"Trellis 归档任务「{title}」的审查清单（check.jsonl）：列出本轮需审查的文件与原因。",
        "tags": ["trellis","check","archive","qa"],"complexity":"simple","nodeType":"file"
    }
    impl = {
        "summary": f"Trellis 归档任务「{title}」的实施记录（implement.jsonl）：记录实际修改的文件与原因。",
        "tags": ["trellis","implement","archive"],"complexity":"simple","nodeType":"file"
    }
    return {
        f".trellis/tasks/archive/2026-07/{prefix}/prd.md": prd,
        f".trellis/tasks/archive/2026-07/{prefix}/task.json": task,
        f".trellis/tasks/archive/2026-07/{prefix}/check.jsonl": check,
        f".trellis/tasks/archive/2026-07/{prefix}/implement.jsonl": impl,
    }
