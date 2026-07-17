import json
from pathlib import Path
P = Path("D:/MyProject/2026/egoless-do")
API = "infra/docker/api/src/"

def E(rel, summ, tags, comp, fns=None):
    return (rel, summ, tags, comp, fns)

ROWS = [
 E(API+"account-lockout.ts","账户安全锁：isAccountLocked/recordLoginAttempt/cleanupExpiredLockouts/initAccountLockoutCollection 防爆破，含邮箱维度锁。",["api","auth","security","lockout"],"moderate",
   {"isAccountLocked":("检查账户是否被临时锁定。",["security","lockout"],"simple"),"recordLoginAttemptLocked":("记录登录尝试并在阈值后锁定。",["security","lockout"],"moderate"),"cleanupExpiredLockouts":("清理过期锁记录。",["lockout","cleanup"],"moderate"),"initAccountLockoutCollection":("初始化锁集合 schema。",["pocketbase","init"],"moderate")}),
 E(API+"audit-log.ts","审计日志：logAuditEvent/getUserAuditLogs/getRecentSecurityEvents/cleanupExpiredAuditLogs/initAuditLogCollection+extractClientInfo。",["api","security","audit"],"moderate",
   {"logAuditEvent":("记录安全审计事件。",["audit","security"],"simple"),"getUserAuditLogs":("按用户查询审计日志。",["audit","query"],"moderate"),"getRecentSecurityEvents":("查询近期安全事件。",["audit","security"],"moderate"),"cleanupExpiredAuditLogs":("清理过期审计日志。",["audit","cleanup"],"moderate"),"initAuditLogCollection":("初始化审计集合 schema。",["pocketbase","init"],"moderate"),"extractClientInfo":("提取客户端 IP/UA 信息。",["audit","util"],"simple")}),
 E(API+"auth-middleware.ts","认证中间件：verifyAuth(JWT 解析/黑名单校验)、sanitizeError、validatePassword、base64UrlDecode/jwtExp。",["api","auth","middleware","jwt"],"moderate",
   {"jwtPayload":("解析 JWT payload(base64url)。",["jwt","auth"],"simple"),"verifyAuth":("校验 Authorization 头并解析 user。",["auth","middleware"],"moderate"),"sanitizeError":("脱敏错误信息。",["security","error"],"simple"),"validatePassword":("校验密码强度。",["auth","validation"],"simple")}),
 E(API+"auth/change-password.ts","修改密码路由：校验旧密码、validatePassword、blacklistToken、revokeAllRefreshTokens。",["api","auth","route","password"],"simple"),
 E(API+"auth/check-email.ts","检查邮箱路由：escapeFilter 查询邮箱是否注册+邮箱维度限流(checkEmailRateLimit)。",["api","auth","route","check-email"],"simple"),
 E(API+"auth/login.ts","登录路由：rateLimit+lockout(isAccountLocked/recordLoginAttempt)+logAuditEvent+generateRefreshToken。",["api","auth","route","login"],"simple"),
 E(API+"auth/logout.ts","注销路由：verifyAuth+blacklistToken+revokeRefreshToken+logAuditEvent。",["api","auth","route","logout"],"simple"),
 E(API+"auth/me.ts","当前用户路由：verifyAuth+getPb 查询用户信息。",["api","auth","route","me"],"simple"),
 E(API+"auth/mfa.ts","MFA 路由：桥接 mfa.ts 的 enable/disable/verifyMFACode，logAuditEvent。",["api","auth","route","mfa"],"simple"),
 E(API+"auth/rbac.ts","角色路由：桥接 rbac.ts getUserRole/setUserRole/hasPermission，logAuditEvent。",["api","auth","route","rbac"],"simple"),
 E(API+"auth/refresh.ts","刷新令牌路由：validateAndRevokeRefreshToken+refreshRateLimit+createRefreshToken。",["api","auth","route","refresh"],"simple"),
 E(API+"auth/register.ts","注册路由：验证码(verification-code)+validatePassword+crypto+generateRefreshToken+logAuditEvent+registerRateLimit。",["api","auth","route","register"],"simple"),
 E(API+"auth/reset-password.ts","重置密码路由：验证码+validatePassword+blacklistToken+revokeAllRefreshTokens。",["api","auth","route","reset-password"],"simple"),
 E(API+"auth/send-code.ts","发送验证码路由：nodemailer 发邮件+saveVerificationCode+canSendCode+generateCode/getTransporter。",["api","auth","route","send-code"],"simple",
   {"generateCode":("生成数字验证码。",["verification","random"],"simple"),"getTransporter":("构建 nodemailer SMTP transport。",["email","nodemailer"],"simple")}),
 E(API+"auth/wechat.ts","微信登录路由：code→session+escapeFilter+generateRefreshToken+wechatRateLimit+wechatPassword。",["api","auth","route","wechat"],"simple",
   {"wechatPassword":("生成微信绑定用的随机密码。",["auth","wechat"],"simple")}),
 E(API+"config.ts","服务配置：dotenv 加载 + env/envRequired/getInternalSecret。",["api","config","env"],"simple",
   {"env":("读取环境变量(带默认值)。",["config","env"],"simple"),"envRequired":("读取必填环境变量，缺则抛错。",["config","env"],"simple"),"getInternalSecret":("读取内部服务密钥。",["config","secret"],"simple")}),
 E(API+"errors.ts","错误工具：errMessage/errStatus 构造统一错误响应。",["api","error","util"],"simple",
   {"errMessage":("构造错误消息体。",["error","util"],"simple"),"errStatus":("构造带状态码的错误响应。",["error","util"],"simple")}),
 E(API+"index.ts","API 入口：Hono 服务装配 cors+rate-limit+12 个 auth 路由+init*Collection。",["api","entry","hono"],"simple"),
 E(API+"mfa.ts","MFA 服务：TOTP(generateMFASecret/generateTOTP/verifyTOTP)+generateBackupCodes+enable/disable/verifyMFACode/initMFACollection+bcrypt。",["api","auth","mfa","totp"],"moderate",
   {"generateMFASecret":("生成 MFA 密钥。",["mfa","totp"],"simple"),"generateTOTP":("生成当前 TOTP 码。",["mfa","totp"],"simple"),"verifyTOTP":("校验 TOTP 码(含窗口)。",["mfa","totp"],"moderate"),"generateBackupCodes":("生成一次性备用码。",["mfa","backup"],"simple"),"enableMFA":("启用 MFA 并保存配置。",["mfa","enable"],"moderate"),"disableMFA":("关闭 MFA。",["mfa","disable"],"simple"),"verifyMFACode":("校验 TOTP 或备用码。",["mfa","verify"],"moderate"),"initMFACollection":("初始化 MFA 集合 schema。",["pocketbase","init"],"moderate")}),
 E(API+"monitoring.ts","监控路由：Hono 健康检查/指标端点。",["api","monitoring","hono"],"simple"),
 E(API+"pb.ts","PocketBase 客户端：getPb/authenticateAdmin/getAdminPb+escapeFilter。",["api","pocketbase","client"],"simple",
   {"getPb":("创建 PocketBase 客户端。",["pocketbase","client"],"simple"),"authenticateAdmin":("管理员认证 PB。",["pocketbase","admin"],"simple"),"getAdminPb":("获取已认证管理员客户端。",["pocketbase","admin"],"simple"),"escapeFilter":("转义 PB filter 字符串防注入。",["pocketbase","security"],"simple")}),
 E(API+"plan.ts","计划邮件通知路由：verifyAuth+nodemailer+escapeHtml+getTransporter+adminPb。",["api","plan","email"],"simple",
   {"escapeHtml":("HTML 实体转义防 XSS。",["security","xss"],"simple"),"getTransporter":("构建 SMTP transport。",["email","nodemailer"],"simple")}),
 E(API+"push.ts","推送路由：verifyAuth+Expo Push(sendExpoPush)+rateLimit。",["api","push","expo"],"simple",
   {"sendExpoPush":("调用 Expo Push API 发送通知。",["push","expo"],"moderate")}),
 E(API+"rate-limit.ts","限流服务：内存+持久化(fs)双维度 createRateLimiter/getClientIp/createPBRateLimiter/cleanupExpiredRateLimits。",["api","rate-limit","security"],"moderate",
   {"createRateLimiter":("创建内存限流中间件(滑动窗口)。",["rate-limit","security"],"moderate"),"getClientIp":("提取客户端 IP。",["rate-limit","util"],"simple"),"createPBRateLimiter":("创建基于 PB 的分布式限流。",["rate-limit","pocketbase"],"moderate"),"cleanupExpiredRateLimits":("清理过期限流记录。",["rate-limit","cleanup"],"moderate")}),
 E(API+"rbac.ts","RBAC 服务：角色权限 getUserRole/setUserRole/hasPermission/hasAnyPermission/getUserPermissions+initRBACCollection。",["api","rbac","security"],"moderate",
   {"getUserRole":("读取用户角色。",["rbac","security"],"simple"),"setUserRole":("设置用户角色。",["rbac","security"],"moderate"),"hasPermission":("判断单项权限。",["rbac","permission"],"simple"),"hasAnyPermission":("判断任一权限。",["rbac","permission"],"simple"),"getUserPermissions":("列出用户全部权限。",["rbac","permission"],"simple"),"initRBACCollection":("初始化 RBAC 集合 schema。",["pocketbase","init"],"moderate")}),
 E(API+"setup.ts","初始化/Setup 路由：HMAC signature(crypto)+timingSafeEqual+verifyPbSetupHook+getPb。",["api","setup","security"],"simple"),
 E(API+"token-blacklist.ts","令牌黑名单：isTokenBlacklisted/blacklistToken/cleanupExpiredTokens/initTokenBlacklistCollection。",["api","auth","token","security"],"moderate",
   {"isTokenBlacklisted":("校验 JWT 是否在黑名单。",["token","security"],"simple"),"blacklistToken":("将 JWT 加入黑名单。",["token","security"],"simple"),"cleanupExpiredTokens":("清理过期黑名单记录。",["token","cleanup"],"moderate"),"initTokenBlacklistCollection":("初始化黑名单集合 schema。",["pocketbase","init"],"moderate")}),
 E(API+"token-refresh-rotation.ts","刷新令牌轮换：generateNonce/generateRefreshToken/createRefreshToken/validateAndRevokeRefreshToken/validateRefreshToken/revokeRefreshToken/revokeAllUserRefreshTokens/cleanupExpiredRefreshTokens/initRefreshTokenCollection+randomBytes。",["api","auth","token","rotation"],"complex",
   {"generateRefreshToken":("生成加密随机 refresh token。",["token","crypto"],"simple"),"createRefreshToken":("为用户创建并存储 refresh token。",["token","create"],"simple"),"validateAndRevokeRefreshToken":("校验并单次消费 refresh token。",["token","rotation"],"moderate"),"revokeRefreshToken":("撤销指定 refresh token。",["token","revoke"],"simple"),"revokeAllUserRefreshTokens":("撤销用户全部 refresh token。",["token","revoke"],"moderate"),"cleanupExpiredRefreshTokens":("清理过期 refresh token。",["token","cleanup"],"moderate"),"initRefreshTokenCollection":("初始化 refresh 集合 schema。",["pocketbase","init"],"moderate")}),
 E(API+"verification-code.ts","验证码服务：save/get/delete/canSendCode/cleanupExpiredCodes/initVerificationCodeCollection。",["api","auth","verification"],"moderate",
   {"saveVerificationCode":("保存验证码(含 TTL)。",["verification","create"],"simple"),"getVerificationCode":("读取并校验验证码。",["verification","query"],"simple"),"deleteVerificationCode":("删除已用验证码。",["verification","delete"],"simple"),"cleanupExpiredCodes":("清理过期验证码。",["verification","cleanup"],"moderate"),"canSendCode":("判断是否可重发(频率限制)。",["verification","rate"],"simple"),"initVerificationCodeCollection":("初始化验证码集合 schema。",["pocketbase","init"],"moderate")}),
]

def build():
    out = {}
    for rel, summ, tags, comp, fns in ROWS:
        node = {"summary": summ, "tags": tags, "complexity": comp}
        if fns:
            node["functions"] = {n: {"summary": s, "tags": t, "complexity": c} for n,(s,t,c) in fns.items()}
        out[rel] = node
    return out

sem = build()
out = P/".ua/tmp/sem-batch15.json"
out.write_text(json.dumps(sem, ensure_ascii=False, indent=2), "utf-8")
json.loads(out.read_text("utf-8"))
print("batch 15 sem valid:", len(sem))
