# CLI 设计

## 命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `zfrpc -v` | 显示版本 | `zfrpc -v` → `1.0.0` |
| `zfrpc --startup` | 设置本服务开机自启 | Windows: 任务计划 / Linux: systemd |
| `zfrpc --stop` | 停止服务 | 清理进程和端口 |
| `zfrpc -p <port>` | 指定端口启动 | `zfrpc -p 9000` |
| `zfrpc -w <password>` | 设置访问密码 | `zfrpc -w mypass` |

## 执行流程

```
1. 解析 CLI 参数
2. 加载配置（CLI 参数 > config.json > 默认值）
3. 查找空闲端口
4. 设置环境变量（ZFRPC_PORT, ZFRPC_PASSWORD, ZFRPC_DIR）
5. 启动 SvelteKit 服务器（import build/index.js）
6. 输出访问地址
```

## 配置优先级

1. CLI 参数（最高）
2. 当前目录 `config.json`
3. 默认值（端口 11111，无密码）
