# @o7z/zfrpc

[English](./README.md) · **简体中文**

基于 Web 的 frpc 进程与配置管理服务。通过浏览器管理 frpc 配置，无需手动编辑 TOML 文件。

- 表单化配置编辑器，实时 TOML 预览
- 一键启动 / 停止 / 重启 frpc 进程
- 通过 WebSocket 实时查看日志
- frpc 二进制路径文件浏览器
- 可选密码保护（HttpOnly Cookie 会话）
- 跨平台：Windows + Linux

## 快速开始

```bash
# 无需安装直接运行：
npx @o7z/zfrpc
# 或全局安装：
npm i -g @o7z/zfrpc
zfrpc
```

默认在 11111 端口启动，**无密码保护**。使用 `-w <密码>` 启用认证。

## 命令行

```
zfrpc [选项]

选项:
  -p, --port <端口号>     监听端口（默认: 11111）
  -w, --password <密码>   访问密码（默认: 无）
  --startup               设置开机自启
  --stop                  停止运行中的 zfrpc 服务
  -v, --version           显示版本
  -h, --help              显示帮助
```

示例：

```bash
zfrpc                      # 端口 11111，无密码
zfrpc -p 9000              # 自定义端口
zfrpc -w hunter2           # 启用密码保护
zfrpc --startup            # 配置开机自启
```

## Web 界面

### 仪表盘

- frpc 运行状态（运行中 / 已停止 / 异常）
- 当前配置概览
- 快速操作（启动 / 停止 / 重启）
- 最近日志条目

### 配置管理

- 左侧边栏：配置文件列表，显示活跃状态
- 主区域：表单编辑器，支持折叠板块（服务器、传输、日志、代理、访问者）
- 右侧面板：实时 TOML 预览，带复制按钮
- 删除操作需二次确认弹窗

### 设置

- frpc 程序路径（带文件浏览器和路径验证）
- 工作目录

## 配置存储

zfrpc 的设置存储在：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%/zfrpc/config.json` |
| Linux | `~/.config/zfrpc/config.json` |

## 开机自启

### Windows

```powershell
zfrpc --startup    # 创建计划任务
```

### Linux

```bash
zfrpc --startup    # 创建 systemd 服务（需要 sudo）
```

## 开发

```bash
bun install
bun run dev        # 开发服务器，热重载
bun run build      # 生产构建
node bin/cli.js    # 从源码运行
```

## 许可证

MIT © o7z