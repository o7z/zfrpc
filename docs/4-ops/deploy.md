# 部署指南

## 部署到测试环境（Linux）

### 1. 安装

```bash
npm install -g @o7z/zfrpc
```

### 2. 配置防火墙

```bash
# 开放 zfrpc Web 界面端口
sudo ufw allow 11111

# 或使用 firewalld
sudo firewall-cmd --add-port=11111/tcp --permanent
sudo firewall-cmd --reload
```

### 3. 设置开机自启

```bash
zfrpc --startup
```

需要 sudo 权限创建 systemd 服务。

### 4. 远程访问

通过浏览器访问 `http://<服务器IP>:11111`。

建议设置访问密码：

```bash
zfrpc -w yourpassword
```

### 5. 使用 frp 隧道（可选）

如果测试环境本身需要穿透，可以用另一个 frpc 实例暴露 zfrpc：

```ini
[zfrpc-web]
type = tcp
local_port = 11111
remote_port = 9000
```

## 安全建议

- 生产环境务必设置访问密码
- 考虑使用反向代理（nginx）添加 HTTPS
- 定期更新 zfrpc 获取最新功能和安全修复
