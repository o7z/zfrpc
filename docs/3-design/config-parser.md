# 配置解析设计

## 支持格式

| 格式 | 文件扩展名 | 解析库 |
|------|------------|--------|
| TOML | `.toml` | `fast-toml` 或 `@iarna/toml` |
| INI | `.ini`, `.conf` | 内置解析 |

## 解析流程

```
读取文件 → 识别格式 → 解析为 AST → 转换为统一结构 → 验证 → 返回
```

## 统一数据结构

```typescript
interface FrpcConfig {
  serverAddr: string;
  serverPort: number;
  auth: {
    method: 'token' | 'oidc';
    token?: string;
  };
  proxies: Proxy[];
  user?: string;
  meta?: Record<string, string>;
}

interface Proxy {
  name: string;
  type: 'tcp' | 'udp' | 'http' | 'https' | 'stcp' | 'sudp';
  localIP: string;
  localPort: number;
  remotePort?: number;
  customDomains?: string[];
  subdomain?: string;
}
```

## 编辑与保存

- Web 界面提供表单编辑和原始文本编辑两种模式
- 保存时格式化输出，保持原有注释（如可能）
- 提供配置验证，检测语法错误
