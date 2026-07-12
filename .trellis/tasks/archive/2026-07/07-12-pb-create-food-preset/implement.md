# PB 创建 custom_food_presets collection — 执行计划

## 执行顺序清单

### Step 1: 创建 PB 初始化 hook
- [ ] 新建 `backend/pb_hooks/init.pb.js`
- [ ] 使用 `onAfterBootstrap` 事件
- [ ] 启动时检查 `custom_food_presets` 是否存在，不存在则自动创建
- [ ] 字段和权限规则与 `pb_schema.json` 一致

### Step 2: 创建备用脚本
- [ ] 新建 `backend/create-collection.ps1`
- [ ] 使用 PB Admin API 创建 collection
- [ ] 支持自定义 PB URL 和管理员凭据

### Step 3: 验证
- [ ] 检查 `init.pb.js` 无语法错误
- [ ] 检查 `create-collection.ps1` PowerShell 语法正确
- [ ] 重启 PB 后 collection 自动创建

## 验证命令

```bash
node -c backend/pb_hooks/init.pb.js
```

## 使用方式

### 方式 A：自动创建（推荐）
1. 重启 PocketBase
2. `init.pb.js` 会在启动时自动检查并创建缺失的 collection

### 方式 B：手动脚本
```powershell
.\backend\create-collection.ps1 -AdminEmail "admin@example.com" -AdminPassword "yourpassword"
```

### 方式 C：Admin UI
1. 打开 http://localhost:8090/_/
2. 登录管理员账号
3. Collections → New collection
4. 从 `backend/pb_schema.json` 复制字段定义