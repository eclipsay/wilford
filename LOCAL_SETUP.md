# Local Setup

This checkout is the proper Wilford repository:

```text
https://github.com/eclipsay/wilford
```

## Installed Location

```text
C:\Users\Ian Boarman\Documents\wilford
```

## Requirements

- Node.js 20+
- npm 10+
- OpenSSH for remote deploy commands

On this Windows machine, use `npm.cmd` instead of `npm` in PowerShell.

## Environment Files

The local environment files were created from the examples:

```text
apps/website/.env.local
apps/panel/.env.local
apps/api/.env
apps/discord-bot/.env
```

Before running real services, replace placeholder secrets such as:

```text
PANEL_SESSION_SECRET
PANEL_OWNER_PASSWORD
ADMIN_API_KEY
GITHUB_TOKEN
DISCORD_TOKEN
DISCORD_CLIENT_ID
```

Keep these files private.

## Local Development

Install dependencies:

```powershell
npm.cmd install
```

Run services:

```powershell
npm.cmd run dev:website
npm.cmd run dev:panel
npm.cmd run dev:api
npm.cmd run dev:bot
```

Build everything:

```powershell
npm.cmd run build
```

## Remote Server Helpers

Open an SSH shell:

```powershell
npm.cmd run remote:shell
```

Restart/deploy the panel with the server shortcut:

```powershell
npm.cmd run remote:panel
```

Run the full panel update flow:

```powershell
npm.cmd run remote:panel:full
```

Pull latest code and restart every PM2 process:

```powershell
npm.cmd run remote:all
```

Pull latest code, restart API and panel, then save PM2:

```powershell
npm.cmd run remote:services
```

The helper defaults to:

```text
SSH target: ubuntu@15.204.118.151
App path: /var/www/wilford
```

It does not store the SSH password. Type it when SSH prompts.
