# 架构概览

## 整体架构

```
┌─────────────────────────────────────────────┐
│                  zfrpc 服务                   │
│                                             │
│  ┌───────────┐    ┌───────────────────────┐  │
│  │   CLI     │───▶│   SvelteKit Server    │  │
│  │  (bin/)   │    │   (build/)            │  │
│  └───────────┘    └───────────────────────┘  │
│                          │                  │
│          ┌───────────────┼───────────────┐  │
│          ▼               ▼               ▼  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│  │ frpc Manager │ │ Config Parser│ │Startup ││
│  │ (进程管理)    │ │ (配置解析)    │ │(自启)  ││
│  └──────────────┘ └──────────────┘ └────────┘│
└─────────────────────────────────────────────┘
          │               │
          ▼               ▼
    ┌──────────┐    ┌──────────┐
    │  frpc    │    │ .toml    │
    │  进程    │    │  .ini    │
    └──────────┘    └──────────┘
```

## 技术栈

| 层级 | 技术 | 版本/包 | 说明 |
|------|------|---------|------|
| 运行时 | Node.js | >= 20 | LTS，支持现代 API |
| 包管理 | bun | latest | 开发/构建/测试 |
| 框架 | SvelteKit | 2.x | 全栈框架 |
| UI | Svelte | 5.x | runes 响应式 |
| 样式 | 原生 CSS + CSS Variables | - | 零依赖，轻量 |
| 服务器 | @sveltejs/adapter-node | - | 输出 Node.js 服务 |
| 构建 | Vite | 6.x | SvelteKit 内置 |
| 语言 | TypeScript | 5.x | 严格模式 |
| TOML 解析 | @iarna/toml | - | Node 生态最成熟 |
| INI 解析 | ini | - | 轻量内置级 |
| 进程管理 | node:child_process | - | 内置模块 |
| 开机自启 | 平台原生命令 | - | Windows schtasks / Linux systemd |
| 认证 | HttpOnly Cookie | - | SHA256 session，7天 TTL |
| CLI | Node.js 内置模块 | - | 零外部依赖 |

## 目录结构

```
zfrpc/
├── bin/                    # CLI 入口（TypeScript → 编译为 JS）
│   └── cli.ts
├── src/                    # SvelteKit 应用
│   ├── app.html            # HTML shell
│   ├── app.css             # 全局样式（CSS Variables）
│   ├── hooks.server.ts     # 认证中间件
│   ├── routes/             # 页面路由
│   └── lib/                # 共享逻辑
│       └── components/     # 公共组件（Modal, Switch）
├── build/                  # SvelteKit 构建输出（发布时包含）
├── docs/                   # 项目文档（zdoc 服务）
├── scripts/                # 构建/发布脚本
├── package.json
├── svelte.config.js
├── vite.config.js
├── tsconfig.json
└── bun.lock
```
