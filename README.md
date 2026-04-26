# Wilford Industries Monorepo

This repository is organized as a small npm workspace monorepo so each service can run independently while still sharing utilities and config.

## Structure

```text
apps/
  website/      Next.js frontend for Vercel
  panel/        Next.js dashboard for VPS hosting
  api/          Node.js + Express backend
  discord-bot/  Node.js Discord bot

packages/
  shared/       Shared helpers, constants, and types
```

## Requirements

- Node.js 20+
- npm 10+

## Install

```bash
npm install
```

## Environment Setup

Each app includes its own `.env.example`.

Copy the example file in each app before running:

```bash
cp apps/website/.env.example apps/website/.env.local
cp apps/panel/.env.example apps/panel/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/discord-bot/.env.example apps/discord-bot/.env
```

## Run Services

```bash
npm run dev:website
npm run dev:panel
npm run dev:api
npm run dev:bot
```

Each service can also be run directly from its own workspace.

## Build

```bash
npm run build
```

## Production Notes

- `apps/website` is ready to deploy to Vercel as a standard Next.js app.
- `apps/panel`, `apps/api`, and `apps/discord-bot` are structured to run on a VPS.
- A root `ecosystem.config.cjs` file is included for PM2.
- Simple Dockerfiles are included for `panel`, `api`, and `discord-bot`.

## Discord Bot Notes

- The bot supports both `-` prefix commands and `/` slash commands.
- Public applications can be started with `-apply` or `/apply`.
- Staff review thread actions use `-r`, `-accept`, and `-deny`.
- For the application review flow, configure these environment variables in `apps/discord-bot/.env`:
  `DISCORD_APPLICATIONS_CHANNEL_ID`, `DISCORD_APPLICATION_REVIEW_ROLE_ID`,
  `DISCORD_APPLICATION_ROLE_ID`, and optionally `DISCORD_APPLICATION_GUILD_ID`.

## PM2

```bash
pm2 start ecosystem.config.cjs
```

## Workspaces

- `@wilford/website`
- `@wilford/panel`
- `@wilford/api`
- `@wilford/discord-bot`
- `@wilford/shared`
