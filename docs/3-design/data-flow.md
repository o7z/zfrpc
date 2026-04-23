# 数据流设计

## 配置读写

```
Web 界面 ──▶ API Route ──▶ Config Parser ──▶ 文件系统
                │                                  │
                ◀──────────────────────────────────┘
                         返回解析结果/错误
```

## 进程状态同步

```
frpc 进程 ──▶ Process Manager ──▶ SvelteKit Store ──▶ WebSocket ──▶ 前端
     │              │                    │
     └── exit ──────┘                    │
     └── stdout ────────────────────────┘
     └── stderr ────────────────────────┘
```

## 状态持久化

服务配置存储在本地：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%/zfrpc/config.json` |
| Linux | `~/.config/zfrpc/config.json` |

存储内容：
- 服务端口
- 访问密码（hash）
- frpc 可执行文件路径
- 已知配置列表
- 自启状态
