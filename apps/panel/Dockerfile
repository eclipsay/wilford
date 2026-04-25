FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/panel/package.json ./apps/panel/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install
COPY . .
RUN npm run build --workspace @wilford/panel
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "@wilford/panel"]
