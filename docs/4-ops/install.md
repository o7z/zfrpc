# 安装指南

## 前置要求

- Node.js >= 18
- frpc 已安装（可通过 `frpc -v` 验证）

## 安装方式

### npm

```bash
npm install -g @o7z/zfrpc
```

### pnpm

```bash
pnpm add -g @o7z/zfrpc
```

### bun

```bash
bun add -g @o7z/zfrpc
```

## 验证安装

```bash
zfrpc -v
```

应输出版本号，如 `1.0.0`。

## 首次启动

```bash
zfrpc
```

默认端口 11111，无密码保护。访问 `http://localhost:11111`。
