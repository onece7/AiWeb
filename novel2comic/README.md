# novel2comic - 文本转图片 Web 应用

输入文字描述，选择风格或自定义参数，AI 生成图片。支持历史记录和下载。

## 技术栈

| 后端 | 前端 | 数据库 | 生图 |
|------|------|--------|------|
| Go + Gin + GORM | Vue 3 + TypeScript + Vite | MySQL 8.0 + Redis 7 | Stable Diffusion |

## 快速开始

### 1. 环境要求

- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0 (或使用 Docker)
- Redis 7 (或使用 Docker)

### 2. 启动基础设施

```bash
# 启动 MySQL + Redis
docker-compose up -d mysql redis
```

### 3. 启动后端

```bash
cd backend
cp .env.example .env       # 编辑配置
go mod tidy
go run cmd/server/main.go  # http://localhost:8080
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

### 5. Docker 一键启动

```bash
docker-compose up -d       # 全部服务
```

## 功能

- 🔐 用户注册/登录 (bcrypt + JWT 双 Token)
- 🎨 普通模式：文字 + 风格 → 一键出图
- ⚙️ 专业模式：自定义所有 SD 参数
- 📋 生成历史：分页查看、删除
- 💾 图片下载

## 项目结构

```
novel2comic/
├── backend/          # Go 后端
├── frontend/         # Vue 前端
├── docker-compose.yml
├── DESIGN.md         # 完整设计文档
└── CLAUDE.md         # 开发操作手册
```

## API 概览

所有接口统一响应: `{"code": 0, "message": "success", "data": {...}}`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/register | 注册 |
| POST | /api/v1/auth/login | 登录 |
| POST | /api/v1/auth/refresh | 刷新 Token |
| POST | /api/v1/auth/logout | 登出 |
| GET | /api/v1/generate/styles | 风格列表 |
| POST | /api/v1/generate/simple | 普通生成 |
| POST | /api/v1/generate/pro | 专业生成 |
| GET | /api/v1/generate/status/:id | 查询状态 |
| GET | /api/v1/history | 历史列表 |
| DELETE | /api/v1/history/:id | 删除记录 |

详见 [DESIGN.md](./DESIGN.md)
