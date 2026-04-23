# @o7z/zfrpc

**English** · [简体中文](./README.zh-CN.md)

A web-based frpc process and configuration management service. Manage your frpc configs through a browser instead of editing TOML files by hand.

- Form-based config editor with live TOML preview
- One-click start / stop / restart frpc processes
- Real-time log streaming via WebSocket
- File browser for frpc binary path selection
- Optional password protection (HttpOnly cookie session)
- Cross-platform: Windows + Linux

## Quick start

```bash
# Run without installing:
npx @o7z/zfrpc
# Or install globally:
npm i -g @o7z/zfrpc
zfrpc
```

By default `zfrpc` serves on port 11111 with **no password**. Pass `-w <pwd>` to enable auth.

## CLI

```
zfrpc [options]

Options:
  -p, --port <number>    Port to listen on (default: 11111)
  -w, --password <pwd>   Access password (default: none)
  --startup              Set up auto-start on boot
  --stop                 Stop a running zfrpc service
  -v, --version          Show version
  -h, --help             Show help
```

Examples:

```bash
zfrpc                      # port 11111, no password
zfrpc -p 9000              # custom port
zfrpc -w hunter2           # enable password protection
zfrpc --startup            # configure auto-start
```

## Web UI

### Dashboard

- frpc running status (running / stopped / error)
- Current config overview
- Quick actions (start / stop / restart)
- Recent log entries

### Config management

- Left sidebar: config file list with active status
- Main area: form editor with collapsible sections (server, transport, logging, proxies, visitors)
- Right panel: live TOML preview with copy button
- Delete with confirmation dialog

### Settings

- frpc binary path (with file browser and validation)
- Working directory

## Configuration

zfrpc stores its settings in:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%/zfrpc/config.json` |
| Linux | `~/.config/zfrpc/config.json` |

## Auto-start

### Windows

```powershell
zfrpc --startup    # creates a scheduled task
```

### Linux

```bash
zfrpc --startup    # creates a systemd service (requires sudo)
```

## Development

```bash
bun install
bun run dev        # dev server with hot reload
bun run build      # production build
node bin/cli.js    # run from source
```

## License

MIT © o7z
