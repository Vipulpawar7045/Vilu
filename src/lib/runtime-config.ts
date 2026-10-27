import path from "node:path";

export type DeploymentMode = "local";

export type RuntimeConfig = {
  deploymentMode: DeploymentMode;
  databaseUrl: string;
  backupDirectory: string;
  localOnly: true;
};

export function getRuntimeConfig(env: Partial<NodeJS.ProcessEnv> = process.env): RuntimeConfig {
  const mode = env.VILU_DEPLOYMENT_MODE ?? "local";
  if (mode === "hosted") {
    throw new Error(
      "Vilu hosted mode is disabled until authentication, authorization, audit logging, and encrypted secret storage are configured.",
    );
  }
  if (mode !== "local") {
    throw new Error("VILU_DEPLOYMENT_MODE must be local.");
  }

  return {
    deploymentMode: "local",
    databaseUrl: env.DATABASE_URL ?? "file:./dev.db",
    backupDirectory: path.resolve(env.VILU_BACKUP_DIR ?? "backups"),
    localOnly: true,
  };
}

export function getLocalSecurityHeaders() {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
      key: "Content-Security-Policy",
      value:
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    },
  ];
}
