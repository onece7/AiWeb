# novel2comic 完整设计文档

> 最后更新: 2026-06-27
> 对应 CLAUDE.md 中所有技术决策的详细展开

---

## 1. 项目概述

**文本转图片 Web 应用**。用户输入文字描述，选择预设风格或自定义参数，调用 Stable Diffusion 生成图片。支持历史记录和下载。

**核心特性:**
- 用户注册/登录（bcrypt 密码哈希 + JWT 双 Token）
- 普通模式：文字 + 风格选择 → 一键生成
- 专业模式：自定义所有 SD 参数（采样器、步数、CFG、分辨率、Seed）
- 异步生成：HTTP 202 + 后台处理 + 前端轮询
- 生成历史：分页列表、详情查看、删除
- 图片下载

---

## 2. 技术栈

| 层面 | 技术 | 版本 |
|------|------|:-----|
| 后端框架 | Go + Gin | 1.21+ / v1.9 |
| ORM | GORM | v1.25 |
| 数据库 | MySQL | 8.0 |
| 缓存/Session | Redis | 7 |
| 前端框架 | Vue 3 + TypeScript | 3.4+ / 5.4 |
| 构建工具 | Vite | 5 |
| 状态管理 | Pinia | 2 |
| 路由 | Vue Router | 4 |
| HTTP 客户端 | Axios | 1.7 |
| 认证 | JWT (Access + Refresh 轮换) | golang-jwt/v5 |
| 密码加密 | bcrypt | cost=12 |
| 生图后端 | SD A1111 / Replicate | — |
| 容器化 | Docker Compose | — |

---

## 3. 目录结构

```
novel2comic/
├── backend/
│   ├── cmd/server/main.go              # 应用入口, 依赖注入
│   ├── internal/
│   │   ├── config/config.go            # Viper 配置加载 + 结构体定义
│   │   ├── models/                     # GORM 数据模型 + API DTO
│   │   │   ├── user.go
│   │   │   ├── image_style.go
│   │   │   ├── generation_record.go
│   │   │   └── api.go
│   │   ├── repository/                 # 数据访问层 (接口+实现)
│   │   │   ├── user_repo.go
│   │   │   ├── style_repo.go
│   │   │   └── generation_repo.go
│   │   ├── service/                    # 业务逻辑层
│   │   │   ├── auth_service.go         # 注册/登录/Token管理
│   │   │   ├── sd_client.go           # SD API 抽象 (A1111/Replicate)
│   │   │   ├── generation_service.go   # 生成编排 + 异步处理
│   │   │   └── history_service.go      # 历史 CRUD
│   │   ├── handlers/                   # HTTP 处理器
│   │   │   ├── auth_handler.go
│   │   │   ├── generation_handler.go
│   │   │   ├── history_handler.go
│   │   │   └── download_handler.go
│   │   ├── middleware/                 # 中间件
│   │   │   ├── auth.go                 # JWT 鉴权
│   │   │   ├── cors.go
│   │   │   ├── ratelimit.go            # 令牌桶限流
│   │   │   └── logger.go
│   │   └── router/router.go           # 路由注册
│   ├── pkg/
│   │   ├── jwt/jwt.go                 # JWT Manager
│   │   ├── redis/redis.go             # Redis Client 封装
│   │   └── response/response.go       # 统一响应格式+错误码
│   ├── uploads/generated/              # 生成图片 (gitignored)
│   ├── migrations/001_init.sql         # DDL + 预设风格数据
│   ├── config.yaml                     # 默认配置
│   ├── .env.example
│   ├── go.mod / go.sum
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                        # Axios 封装 + API 函数
│   │   │   ├── client.ts              # 实例 + 拦截器 (Token 刷新)
│   │   │   ├── auth.ts
│   │   │   ├── generation.ts
│   │   │   └── history.ts
│   │   ├── components/                 # 复用组件
│   │   │   ├── AppHeader.vue           # 顶部导航栏
│   │   │   ├── PromptInput.vue         # 提示词输入框
│   │   │   ├── StyleSelector.vue       # 风格选择网格
│   │   │   ├── GenerationResult.vue    # 生成结果 (含状态)
│   │   │   └── ImageCard.vue           # 历史卡片
│   │   ├── views/                      # 页面视图
│   │   │   ├── LoginView.vue
│   │   │   ├── RegisterView.vue
│   │   │   ├── SimpleModeView.vue
│   │   │   ├── ProModeView.vue
│   │   │   ├── HistoryView.vue
│   │   │   └── NotFoundView.vue
│   │   ├── stores/auth.ts             # Pinia 认证 Store
│   │   ├── router/index.ts            # Vue Router + 导航守卫
│   │   ├── types/index.ts             # TypeScript 类型
│   │   ├── style.css
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── env.d.ts
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
├── DESIGN.md
├── CLAUDE.md
├── README.md
└── .gitignore
```

---

## 4. 数据库设计

数据库名: `novel2comic`，字符集: `utf8mb4`

### 4.1 users 表

```sql
CREATE TABLE users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(64)   NOT NULL,
    phone         VARCHAR(20)   NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,  -- bcrypt(cost=12)
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_phone (phone)
) ENGINE=InnoDB;
```

### 4.2 image_styles 表

```sql
CREATE TABLE image_styles (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(64)   NOT NULL,    -- 内部标识: "anime", "realistic"
    display_name  VARCHAR(128)  NOT NULL,    -- 界面显示: "动漫风格"
    description   TEXT,
    preset_params JSON,                      -- {"negative_prompt":"...", "cfg_scale":7, ...}
    sort_order    INT           NOT NULL DEFAULT 0,
    preview_url   VARCHAR(512),
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_name (name)
) ENGINE=InnoDB;
```

### 4.3 generation_records 表

```sql
CREATE TABLE generation_records (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    mode            ENUM('simple','pro') NOT NULL,
    prompt          TEXT           NOT NULL,
    negative_prompt TEXT,
    style_id        BIGINT UNSIGNED DEFAULT NULL,
    width           INT            NOT NULL DEFAULT 512,
    height          INT            NOT NULL DEFAULT 512,
    cfg_scale       DECIMAL(4,2)   NOT NULL DEFAULT 7.00,
    steps           INT            NOT NULL DEFAULT 20,
    sampler         VARCHAR(64)    NOT NULL DEFAULT 'Euler a',
    seed            BIGINT         NOT NULL DEFAULT -1,
    image_url       VARCHAR(512),
    thumbnail_url   VARCHAR(512),
    status          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
    error_message   TEXT,
    duration_ms     BIGINT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (style_id) REFERENCES image_styles(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

### 4.4 预设风格数据

| name | display_name | 描述 |
|------|-------------|------|
| anime | 动漫风格 | 日系动漫，色彩鲜艳 |
| realistic | 写实风格 | 照片级真实感 |
| watercolor | 水彩风格 | 柔和水彩画 |
| oil_painting | 油画风格 | 古典油画笔触 |
| pixel_art | 像素风格 | 复古像素艺术 |
| sketch | 素描风格 | 黑白线稿 |

---

## 5. API 设计

### 统一响应格式

```json
{"code": 0, "message": "success", "data": {...}}
```

### 错误码体系

| 范围 | 含义 |
|------|------|
| 0 | 成功 |
| 40000 | 参数错误 |
| 40100 | 未认证 / Token 过期 |
| 40300 | 无权限 |
| 40400 | 资源不存在 |
| 40900 | 资源冲突 (用户名已存在等) |
| 42000 | 图片生成失败 |
| 42001 | 生成超时 |
| 42002 | 并发繁忙 |
| 44000 | 历史记录不存在 |
| 50000 | 服务器内部错误 |

### 接口列表

#### 认证 (公开)

**POST /api/v1/auth/register**
```json
// Request
{"username": "alice", "phone": "13800138000", "password": "abc123"}
// Response 201
{"code": 0, "message": "success", "data": {"access_token": "...", "refresh_token": "...", "expires_in": 900}}
```

**POST /api/v1/auth/login**
```json
// Request
{"username": "alice", "password": "abc123"}
// Response 200
{"code": 0, "message": "success", "data": {"access_token": "...", "refresh_token": "...", "expires_in": 900}}
```

**POST /api/v1/auth/refresh**
```json
// Request
{"refresh_token": "..."}
// Response 200 (旧 Refresh Token 失效，返回新对)
{"code": 0, "message": "success", "data": {"access_token": "...", "refresh_token": "...", "expires_in": 900}}
```

**POST /api/v1/auth/logout** (需认证)
```
Authorization: Bearer <access_token>
Request: {"refresh_token": "..."}
Response: {"code": 0, "message": "success", "data": null}
```
Access Token 加入 Redis 黑名单，Refresh Token 删除。

#### 生成

**GET /api/v1/generate/styles** (公开)
```json
// Response
{"code": 0, "message": "success", "data": [
  {"id": 1, "name": "anime", "display_name": "动漫风格", "description": "...", "is_active": true},
  ...
]}
```

**POST /api/v1/generate/simple** (需认证)
```json
// Request
{"prompt": "一只柴犬在月球迷路", "style_id": 1}
// Response 202
{"code": 0, "message": "success", "data": {"record_id": 42, "status": "pending"}}
```

**POST /api/v1/generate/pro** (需认证)
```json
// Request
{"prompt": "...", "negative_prompt": "...", "width": 768, "height": 512,
 "cfg_scale": 7.5, "steps": 30, "sampler": "DPM++ 2M Karras", "seed": -1}
// Response 202
{"code": 0, "message": "success", "data": {"record_id": 43, "status": "pending"}}
```

**GET /api/v1/generate/status/:id** (需认证)
```json
// Response (processing)
{"code": 0, "message": "success", "data": {"record_id": 42, "status": "processing"}}
// Response (completed)
{"code": 0, "message": "success", "data": {
  "record_id": 42, "status": "completed",
  "image_url": "/api/v1/files/1/1719000000_abc12345.png",
  "seed": 87654321, "duration_ms": 15234,
  "prompt": "...", "width": 512, "height": 512, ...
}}
// Response (failed)
{"code": 0, "message": "success", "data": {
  "record_id": 42, "status": "failed", "error_message": "SD API timeout"
}}
```

#### 历史 (需认证)

**GET /api/v1/history?page=1&page_size=20**
```json
{"code": 0, "message": "success", "data": {
  "records": [...], "total": 100, "page": 1, "page_size": 20, "total_pages": 5
}}
```

**GET /api/v1/history/:id**

**DELETE /api/v1/history/:id** — 删除数据库记录 + 图片文件

#### 文件

**GET /api/v1/files/:filepath** — 静态文件服务 (公开)

---

## 6. 认证流程

```
注册: password → bcrypt(cost=12) → password_hash 存 DB
登录: password → bcrypt.CompareHashAndPassword → 匹配 → 签发 Token 对
     ↓
Access Token: JWT (HMAC-SHA256), 15 分钟过期
  Claims: { user_id, username, iat, exp }
  传递: Authorization: Bearer <token>

Refresh Token: 随机 32 字节 hex → SHA256 哈希 → Redis "refresh:{hash}" = user_id
  有效期: 7 天，每次使用时轮换 (旧 Token 删除)
  存储: Redis + 前端 localStorage

登出:
  - Access Token → Redis 黑名单 "blacklist:{token}", TTL=剩余有效期
  - Refresh Token → 从 Redis 删除

Token 刷新 (Axios 拦截器):
  请求 → 401 → 检查 refresh_token → POST /auth/refresh → 获取新 Token 对
  → 重放原始请求。并发刷新时排队等待。
```

---

## 7. SD 集成策略

### 后端抽象

```go
type SDProvider interface {
    Generate(ctx context.Context, params *GenerateParams) (*GenerateResult, error)
}
```

配置文件驱动选择:
- `sd.base_url` 非空 → A1111 provider
- `sd.api_key` 非空 → Replicate provider
- 都为空 → 生成时返回友好错误

### A1111 实现

```
POST {baseURL}/sdapi/v1/txt2img
Body: { prompt, negative_prompt, width, height, steps, cfg_scale, sampler_name, seed }
Response: { images: ["base64..."], info: "{\"seed\": 123}" }
→ 解码 base64 → 保存为 PNG → 从 info 提取实际 seed
```

### 异步生成流程

```
POST /generate/simple
  → 创建 record (status=pending)
  → 返回 202 { record_id, status }
  → go processGeneration(recordID)
     → 更新 status=processing
     → sem.Acquire (并发控制, 默认 2)
     → sdClient.Generate()
     → 保存图片到 uploads/generated/{userID}/{timestamp}_{uuid}.png
     → 更新 status=completed + image_url + seed + duration_ms
     或 status=failed + error_message

前端: 每 2 秒 GET /generate/status/:id
  → completed → 展示图片 + 下载按钮
  → failed → 展示错误信息
```

### 并发控制

semaphore channel `make(chan struct{}, maxConcurrent)`, 默认 2:

```go
s.sem <- struct{}{}
defer func() { <-s.sem }()
```

### 图片存储

路径格式: `uploads/generated/{userID}/{timestamp_ms}_{uuid8}.png`

---

## 8. 前端路由与组件

| 路径 | 视图组件 | 权限 |
|------|---------|------|
| `/` | → 重定向 `/generate/simple` | — |
| `/login` | LoginView | 游客 |
| `/register` | RegisterView | 游客 |
| `/generate/simple` | SimpleModeView | 需登录 |
| `/generate/pro` | ProModeView | 需登录 |
| `/history` | HistoryView | 需登录 |
| `/:pathMatch(.*)*` | NotFoundView | 公开 |

### 组件树

```
App.vue
├── AppHeader.vue (Logo, 模式切换, 历史, 登录/登出)
├── RouterView
│   ├── LoginView.vue (用户名 + 密码 → 登录)
│   ├── RegisterView.vue (用户名 + 手机 + 密码 → 注册)
│   ├── SimpleModeView.vue
│   │   ├── PromptInput.vue (文字输入)
│   │   ├── StyleSelector.vue (风格网格)
│   │   └── GenerationResult.vue (结果/状态/下载)
│   ├── ProModeView.vue
│   │   ├── PromptInput.vue
│   │   ├── 高级参数面板 (分辨率/CFG/Steps/Sampler/Seed)
│   │   └── GenerationResult.vue
│   ├── HistoryView.vue
│   │   └── ImageCard.vue × N (缩略图 + 信息)
│   └── NotFoundView.vue
```

### 导航守卫

```
beforeEach:
  需认证 + 未登录 → /login?redirect=from
  已登录 + 仅游客 → /generate/simple
```

### Token 刷新拦截器

```
Axios 响应拦截:
  401 → 尝试 POST /auth/refresh
    → 成功: 更新 token, 重试原请求
    → 失败: 清除 token, 跳转登录
  并发请求刷新: 排队共享同一刷新结果
```

---

## 9. Docker Compose

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root123}
      MYSQL_DATABASE: novel2comic
    ports: ["3306:3306"]
    volumes: [mysql_data:/var/lib/mysql]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    ports: ["8080:8080"]
    depends_on: [mysql, redis]
    environment:
      N2C_DATABASE_HOST: mysql
      N2C_REDIS_HOST: redis
```

---

## 10. 实现阶段

| Phase | 内容 | 关键产出 |
|-------|------|---------|
| 1 | 基础设施 | go mod, 目录, config, DB/Redis, Docker, 前端脚手架 |
| 2 | 认证系统 | register/login/refresh/logout API + 前端页面 + 中间件 |
| 3 | SD 集成 | SDClient(A1111), 两种生成模式, 图片保存/下载 |
| 4 | 历史记录 | 列表分页/详情/删除 |
| 5 | 完善 | CORS, 限流, 日志, 错误处理, README |

---

## 11. 安全设计

- [x] 密码: bcrypt(cost=12) 单向哈希，不可逆
- [x] JWT: HMAC-SHA256，15 分钟短期 Access Token
- [x] Refresh Token 轮换: 每次使用后替换，防重放
- [x] 登出黑名单: Redis 存储失效 Access Token
- [x] 输入校验: Gin binding tags + 前端表单验证
- [x] SQL 注入防护: GORM 参数化查询
- [x] 路径遍历防护: filepath.Clean + 白名单
- [x] CORS: 生产环境应限制具体域名
- [x] 限流: 令牌桶 100 req/s, burst 200
- [x] 敏感信息: .env 不入库，密钥可环境变量覆盖
- [x] 文件上传: 仅通过 SD 生成，不接受用户上传
