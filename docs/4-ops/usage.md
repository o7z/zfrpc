# 使用指南

## 基本命令

```bash
# 启动服务（默认端口 11111）
zfrpc

# 指定端口
zfrpc -p 9000

# 设置访问密码
zfrpc -w mypassword

# 设置开机自启
zfrpc --startup

# 查看版本
zfrpc -v
```

## Web 界面操作

### 管理 frpc 进程

1. 进入「仪表盘」页面
2. 点击「启动」按钮启动 frpc
3. 查看实时状态和日志

### 编辑配置

1. 进入「配置管理」页面
2. 选择要编辑的配置
3. 使用表单模式或文本模式修改
4. 点击「保存」并「应用」

### 配置开机自启

1. 进入「设置」页面
2. 开启「zfrpc 开机自启」
3. 如需要，为特定 frpc 配置开启自启

## 配置文件位置

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%/zfrpc/config.json` |
| Linux | `~/.config/zfrpc/config.json` |
