<p align="center">
  <a href="README.md">English</a> |
  <a href="README_KO.md">한국어</a> |
  <a href="README_JA.md">日本語</a> |
  <a href="README_ZH.md">中文</a> |
  <a href="README_FR.md">Français</a>
</p>

# Human-to-Human CAPTCHA (H2H-CAPTCHA)

> **"由真人进行、为真人设计的实时验证"**

H2H-CAPTCHA 是一种创新的安全解决方案，它将传统的自动化图灵测试（如识别红绿灯）替换为实时的真人互动。用户（"客户端"）与真人验证者（"验证者"）配对，完成互动任务。

---

## 🏗 系统架构

无需专用后端服务器，完全基于 **React + Supabase** 运行。

### 前端 (React + TypeScript + Vite)
- **Supabase Realtime Broadcast**: 无需写入数据库，以最高每秒 40 次的频率传输鼠标数据。
- **Supabase Presence**: 实时检测对方断线。
- **Postgres Changes**: 匹配创建的瞬间立即通知等待中的用户。

### 数据库 & 实时 (Supabase + PostgreSQL)
- **`queued_participants`** 表：管理客户端与验证者的等待队列。
- **`matches`** 表：存储进行中及已完成的匹配记录。
- **`client_states`** 表：跟踪每个客户端的失败次数和黑名单。
- **`try_match()`** RPC：使用 `FOR UPDATE SKIP LOCKED` 实现原子性 1:1 匹配。
- **`record_decision()`** RPC：处理批准/拒绝裁决并更新失败次数。
- **`handle_disconnect()`** RPC：断线时清理队列条目和进行中的匹配。

### 频道策略
```
queued_participants  → Postgres Changes  (等待匹配)
session:{match_id}   → Broadcast         (鼠标 / 游戏 / 结果事件)
session:{match_id}   → Presence          (断线检测)
```

---

## 🎮 互动挑战

系统支持由验证者控制的四种验证模式：

1. **🖱️ 鼠标追踪（被动验证）**
   - 验证者观察客户端自然的鼠标移动。
   - 目标：检测机器人特有的直线移动或瞬间移动。
   - 技术：Realtime Broadcast 30fps（无 DB 写入）。

2. **✏️ 绘画（主动验证）**
   - 验证者指定主题（如"苹果"），客户端在画布上绘画。
   - 目标：验证人类的创造力和精细动作控制能力。
   - 技术：全局坐标 + 画布坐标双重传输。

3. **👊 石头剪刀布（反应速度验证）**
   - 验证者先出拳（如"石头"），客户端必须出能赢的拳（"布"）。
   - 目标：测试对规则的理解和认知反应。

4. **💬 实时聊天（图灵测试）**
   - 带有实时"正在输入..."指示器的自由格式文本对话。
   - 目标：通过高级语言交互进行最终验证。

---

## 🚀 快速入门

### 环境要求
- **Node.js** 18+
- **Supabase** 项目 ([supabase.com](https://supabase.com))

### 1. 数据库设置

在 Supabase SQL 编辑器中执行迁移文件：

```bash
# 文件：supabase/migrations/001_h2h_captcha.sql
```

然后在 Supabase 控制台 → Database → Replication 中为 `matches` 表启用 Realtime。

### 2. 环境变量配置

```env
# .env.local
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

URL 和 anon key 可在 Supabase 控制台 → Project Settings → API 中找到。

### 3. 安装与启动

```bash
npm install
npm run dev
```

访问 `http://localhost:5173`。

### 使用说明
1. **标签页 1**：选择 **"我是用户 (Client)"**。
2. **标签页 2**：选择 **"我是验证者 (Validator)"**。
3. 系统将立即进行匹配。
4. 使用验证者控制台切换任务并验证客户端。

---

## 🛡️ 安全特性
- **基于 UUID 的路由**：使用 `localStorage` 中存储的 UUID，重新加载后仍能保持身份一致性。
- **隔离性**：客户端之间无法互相通信。
- **验证者黑名单**：防止与同一验证者重新匹配（在 `client_states` 中管理）。
- **失败次数追踪**：连续 3 次被拒绝后永久封禁。
- **行级安全**：所有表均启用 RLS，敏感操作仅通过 `SECURITY DEFINER` 函数执行。

---

## 🗂 项目结构

```
├── src/
│   ├── hooks/
│   │   └── useSupabase.ts     # 主钩子（匹配 + broadcast + presence）
│   ├── lib/
│   │   └── supabase.ts        # Supabase 客户端单例
│   ├── pages/
│   │   ├── ClientPage.tsx
│   │   └── ValidatorPage.tsx
│   ├── types/
│   │   └── index.ts           # MatchRow、SessionBroadcast 等
│   └── i18n/
│       └── translations.ts    # 5 种语言支持
├── supabase/
│   └── migrations/
│       └── 001_h2h_captcha.sql
├── .env.local                 # Supabase 凭据（已加入 gitignore）
└── vite.config.ts
```

---

© 2025 H2H Captcha Project.
