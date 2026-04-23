# 开机自启设计

## 平台适配

### Windows

使用 Windows 任务计划程序：

```powershell
# 创建任务
schtasks /Create /TN "zfrpc" /TR "zfrpc --hidden" /SC ONLOGON /RL HIGHEST

# 删除任务
schtasks /Delete /TN "zfrpc" /F

# 查询状态
schtasks /Query /TN "zfrpc" /FO LIST
```

### Linux

使用 systemd 服务：

```ini
# /etc/systemd/system/zfrpc.service
[Unit]
Description=zfrpc - frpc management service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/zfrpc --hidden
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# 启用
sudo systemctl enable zfrpc

# 禁用
sudo systemctl disable zfrpc

# 状态
sudo systemctl status zfrpc
```

## 自启配置分离

- **zfrpc 服务自启**：通过 `zfrpc --startup` 配置
- **frpc 进程自启**：在 Web 界面中为每个配置单独设置开关

## 实现要点

- 需要管理员权限（Windows UAC / Linux sudo）
- 首次配置时提示提权
- 状态同步：启动时检查自启状态并显示
