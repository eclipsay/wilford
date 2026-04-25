import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  githubOwner: process.env.GITHUB_OWNER || "eclipsay",
  githubRepo: process.env.GITHUB_REPO || "wilford",
  githubToken: process.env.GITHUB_TOKEN || ""
};
