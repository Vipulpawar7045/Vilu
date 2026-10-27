import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseDatabaseUrl = "file:./release-check.db";
const releaseDatabasePath = path.join(root, "prisma", "release-check.db");

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const npmExecPath = command === "npm" ? process.env.npm_execpath : undefined;
  const executable = npmExecPath ? process.execPath : command;
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  execFileSync(executable, commandArgs, {
    cwd: root,
    env,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function assertReleaseFiles() {
  const envExamplePath = path.join(root, ".env.example");
  const gitignorePath = path.join(root, ".gitignore");
  const envExample = readFileSync(envExamplePath, "utf8");
  const gitignore = readFileSync(gitignorePath, "utf8");
  for (const key of ["DATABASE_URL", "VILU_DEPLOYMENT_MODE", "VILU_BACKUP_DIR"]) {
    if (!new RegExp(`^${key}=`, "m").test(envExample)) {
      throw new Error(`.env.example is missing ${key}.`);
    }
  }
  if (
    /BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}/.test(envExample)
  ) {
    throw new Error(".env.example contains a credential-shaped value.");
  }
  for (const ignoredPath of [".env*", "*.db", "/backups"]) {
    if (!gitignore.includes(ignoredPath)) throw new Error(`.gitignore is missing ${ignoredPath}.`);
  }
  const migrationDirectory = path.join(root, "prisma", "migrations");
  if (!existsSync(migrationDirectory)) throw new Error("Prisma migrations directory is missing.");
}

function main() {
  assertReleaseFiles();
  const env = { ...process.env, DATABASE_URL: releaseDatabaseUrl };
  try {
    run("npm", ["ci", "--ignore-scripts", "--dry-run"], process.env);
    run("npm", ["run", "db:migrate"], env);
    run("npm", ["run", "db:seed"], env);
    console.log(
      JSON.stringify(
        {
          cleanInstallLock: "passed",
          emptyDatabaseMigration: "passed",
          fictionalSeed: "passed",
          database: "prisma/release-check.db",
        },
        null,
        2,
      ),
    );
  } finally {
    rmSync(releaseDatabasePath, { force: true });
    rmSync(`${releaseDatabasePath}-journal`, { force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Release verification failed.");
  process.exitCode = 1;
}
