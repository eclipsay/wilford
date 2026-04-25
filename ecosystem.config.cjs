module.exports = {
  apps: [
    {
      name: "wilford-panel",
      cwd: "./apps/panel",
      script: "npm",
      args: "run start",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    },
    {
      name: "wilford-api",
      cwd: "./apps/api",
      script: "npm",
      args: "run start",
      env: {
        PORT: 4000,
        NODE_ENV: "production"
      }
    },
    {
      name: "wilford-discord-bot",
      cwd: "./apps/discord-bot",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
