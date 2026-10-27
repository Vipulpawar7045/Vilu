import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("npm run db:migrate", { cwd: process.cwd(), stdio: "pipe" });
  execSync("npm run db:seed", { cwd: process.cwd(), stdio: "pipe" });
}
