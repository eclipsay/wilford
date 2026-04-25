FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/discord-bot/package.json ./apps/discord-bot/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install
COPY . .
CMD ["npm", "run", "start", "--workspace", "@wilford/discord-bot"]
