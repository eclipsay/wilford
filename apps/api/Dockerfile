FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@wilford/api"]
