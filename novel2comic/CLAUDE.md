# CLAUDE.md — novel2comic 项目初始化文档

> 最后更新: 2026-06-27 | 状态: 待开发

---

## 项目概述

**文本转图片 Web 应用**。用户输入文字描述，选择预设风格或自定义参数，调用 Stable Diffusion 生成图片。支持历史记录和下载。

## 技术栈

| 层面 | 技术 |
|------|:-----|
| 后端 | Go 1.25+ / Gin / GORM |
| 数据库 | MySQL 8.0 (用户/记录) + Redis 7 (Token/缓存) |
| 前端 | Vue 3 + TypeScript + Vite 5 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 认证 | JWT (Access + Refresh 轮换) |
| 密码 | bcrypt (cost=12) |
| 生图 | Stable Diffusion (A1111 API / Replicate API) |
| 容器 | Docker Compose (MySQL + Redis + 后端) |

## 目录结构

```
novel2comic/
├── backend/
│   ├── cmd/server/main.go             # 入口，依赖注入
│   ├── internal/
│   │   ├── config/config.go           # Viper 配置加载
│   │   ├── models/                    # 数据模型 (User, GenerationRecord, ImageStyle)
│   │   ├── repository/                # 数据访问层 (user/generation/style_repo)
│   │   ├── service/                   # 业务逻辑层 (auth/generation/history/sd_client)
│   │   ├── handlers/                  # HTTP 处理器 (auth/generation/history)
│   │   ├── middleware/                # 中间件 (auth/cors/ratelimit/logger)
│   │   └── router/router.go          # 路由注册
│   ├── pkg/jwt, pkg/redis, pkg/response/  # 工具包
│   ├── uploads/generated/             # 生成图片 (gitignored)
│   └── migrations/001_init.sql        # 建表脚本
├── frontend/
│   ├── src/
│   │   ├── api/                       # Axios 封装 (client, auth, generation, history)
│   │   ├── components/                # 公共组件 (AppHeader/PromptInput/StyleSelector/ImageCard)
│   │   ├── views/                     # 页面 (Login/Register/SimpleMode/ProMode/History)
│   │   ├── stores/auth.ts             # Pinia 认证状态
│   │   ├── router/index.ts            # Vue Router + 导航守卫
│   │   └── types/index.ts             # TS 类型定义
│   └── vite.config.ts
├── docker-compose.yml
├── DESIGN.md                          # 完整设计文档
└── README.md
```

## 分层架构

```
Handler (HTTP 适配: 参数解析/校验 → 调用 Service → 格式化响应)
   ↓
Service (业务逻辑: 编排/决策/外部调用)
   ↓
Repository (数据访问: GORM CRUD/查询)
   ↓
Database (MySQL)
```

**原则:**
- Handler 不包含业务逻辑
- Service 不直接操作数据库
- Repository 只做数据存取
- 跨模块调用通过 Service 层接口

## API 概览

所有响应统一格式: `{"code": 0, "message": "success", "data": {...}}`

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | /api/v1/auth/register | 公开 | 注册 |
| POST | /api/v1/auth/login | 公开 | 登录 |
| POST | /api/v1/auth/refresh | 公开 | 刷新 Token |
| POST | /api/v1/auth/logout | 需认证 | 登出 |
| GET | /api/v1/generate/styles | 公开 | 风格列表 |
| POST | /api/v1/generate/simple | 需认证 | 普通模式生成 |
| POST | /api/v1/generate/pro | 需认证 | 专业模式生成 |
| GET | /api/v1/generate/status/:id | 需认证 | 查询状态 |
| GET | /api/v1/history | 需认证 | 历史列表 (分页) |
| GET | /api/v1/history/:id | 需认证 | 历史详情 |
| DELETE | /api/v1/history/:id | 需认证 | 删除记录 |
| GET | /api/v1/files/:filename | 公开 | 静态文件 |

错误码: `40xxx` 认证, `42xxx` 生成, `44xxx` 历史, `50xxx` 服务器

## 数据库 (MySQL: novel2comic)

3 张表:
- **users** — id, username(UNIQUE), phone(UNIQUE), password_hash(bcrypt), timestamps
- **image_styles** — id, name(UNIQUE), display_name, preset_params(JSON), sort_order, is_active
- **generation_records** — id, user_id(FK), mode(ENUM simple/pro), prompt, negative_prompt, width/height/cfg_scale/steps/sampler/seed, image_url, status(ENUM pending/processing/completed/failed), error_message, duration_ms

## 认证机制

- 密码: bcrypt 单向哈希 (cost=12)，登录比对不解密
- Access Token: JWT 15 分钟，Authorization Header
- Refresh Token: 随机 32 字节 + SHA256，存 Redis 7 天，每次使用轮换
- 登出: Access Token 加入 Redis 黑名单 (TTL=剩余有效期)
- 前端: Pinia 内存存储 + Axios 拦截器自动刷新

## SD 集成

- 接口抽象 `SDProvider`，支持 A1111 和 Replicate 切换
- 配置驱动: `base_url` 非空 → A1111, `api_key` 非空 → Replicate
- 异步模式: POST 立即返回 202 + record_id，后台 goroutine 生成，前端轮询状态
- 并发控制: semaphore channel (默认 2)，用户级别排队限制
- 本地存储: `uploads/generated/{user_id}_{timestamp}_{uuid}.png`

## 前端路由

| 路径 | 视图 | 权限 |
|------|------|------|
| / → /generate/simple | — | — |
| /login | LoginView | 游客 |
| /register | RegisterView | 游客 |
| /generate/simple | SimpleModeView | 需登录 |
| /generate/pro | ProModeView | 需登录 |
| /history | HistoryView | 需登录 |

## 开发命令 (规划)

```bash
# 后端
cd backend
go mod tidy
go run cmd/server/main.go          # 启动后端 (端口 8080)

# 前端
cd frontend
npm install
npm run dev                        # 启动前端 (端口 5173)

# Docker (MySQL + Redis)
docker-compose up -d mysql redis

# 数据库迁移
mysql -u root -p < backend/migrations/001_init.sql
```

## 实现阶段

| Phase | 内容 | 预计产出 |
|-------|------|---------|
| 1 | 基础设施 | go mod, 目录, 配置, DB/Redis 连接, docker-compose, 前端脚手架 |
| 2 | 认证系统 | 注册/登录/刷新/登出 API + 前端页面 + 鉴权中间件 |
| 3 | SD 集成 + 生成 | SDClient, 两种生成模式, 图片保存/下载 |
| 4 | 历史记录 | 列表分页/详情/删除 |
| 5 | 完善 | CORS, 限流, 日志, 清理任务, 错误处理 |

## Git 操作

### 分支策略

- `main` — 主分支，保持稳定可部署
- `develop` — 开发分支，日常开发合并到此
- `feature/<功能名>` — 功能分支，从 develop 切出
- `fix/<问题描述>` — 修复分支

### 提交规范

- commit message 使用中文，格式: `<类型>: <简短描述>`
- 类型: `feat` 新功能, `fix` 修复, `refactor` 重构, `docs` 文档, `style` 格式, `chore` 杂项
- 示例: `feat: 添加用户注册接口`, `fix: 修复Token刷新失败问题`
- 提交前先 `git diff --stat` 展示变更摘要
- 不自动 `git commit` 或 `git push`，除非明确要求

### 红线操作 (必须先确认)

以下操作即使在 auto-accept 模式下也必须先问:
- `git push`、`git push --force`
- `git rebase`、`git reset --hard`
- 删除文件/目录
- 修改 .env、密钥、token、CI/CD 配置

### 常用命令

```bash
# 查看状态
git status

# 查看变更
git diff                    # 工作区 vs 暂存区
git diff --stat             # 变更摘要
git diff --cached           # 暂存区 vs HEAD

# 分支操作
git branch                  # 列出本地分支
git checkout -b feature/xxx # 创建并切换分支
git checkout main           # 切换分支

# 提交
git add .
git commit -m "feat: 描述"

# 同步
git pull origin main
git push origin feature/xxx

# 日志
git log --oneline -10       # 最近 10 条提交
git log --graph --oneline   # 分支图
```

## 开发规范

- Go: 遵循标准项目布局，包名小写，导出函数大写
- Vue: Composition API + `<script setup lang="ts">`
- 错误处理: Go 不忽略 error，前端 try-catch + 用户友好提示
- Git: 不自动提交，commit message 中文，提交前展示变更摘要
- 敏感信息: .env 不入库，密钥不硬编码
- 密码安全: 不可逆 bcrypt，不记录明文

## 参考文档

- [DESIGN.md](./DESIGN.md) — 完整设计文档，含 DDL、API 示例、时序图
- [docker-compose.yml](./docker-compose.yml) — 容器编排

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
