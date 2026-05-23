# Egoless Do — Backend (PocketBase)

## 快速启动

```bash
# 下载 PocketBase（单文件，无需安装）
curl -L https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip -o pb.zip
unzip pb.zip && rm pb.zip

# 首次启动（会提示创建 admin 账户）
./pocketbase serve --http="0.0.0.0:8090"

# 导入 Schema
curl -X POST http://localhost:8090/api/collections/import \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d @pb_schema.json
```

## 推荐部署：甲骨文云永久免费 VPS

```bash
# 1. 创建 systemd 服务
sudo tee /etc/systemd/system/egoless-pb.service << SERVICE
[Unit]
Description=Egoless Do PocketBase
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/egoless-pb
ExecStart=/home/ubuntu/egoless-pb/pocketbase serve --http="0.0.0.0:8090"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# 2. 启动服务
sudo systemctl enable --now egoless-pb

# 3. 配置 Nginx 反向代理（可选 HTTPS）
sudo apt install nginx certbot python3-certbot-nginx -y
```

## Collections

| 集合              | 说明                       |
|------------------|--------------------------|
| `users`          | 账户（可匿名，无需注册）     |
| `checkins`       | 匿名打卡（脱敏位置）         |
| `map_pins`       | 全球地图节点（±500m 模糊）   |
| `published_minds`| 用户主动发布的感念（匿名）    |

## 隐私设计

- 坐标上传前在客户端做随机偏移，服务端 Hook 二次加噪
- `published_minds` 写入前自动脱敏手机号、邮箱、证件号
- 感念内容默认存本地，仅用户主动点击"发布"才上传
- 用户可完全匿名使用（OpenID 或无账号）
