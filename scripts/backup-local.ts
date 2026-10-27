import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildBackup } from "@/lib/export-service";
import { getRuntimeConfig } from "@/lib/runtime-config";

async function main() {
  const config = getRuntimeConfig();
  await mkdir(config.backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(config.backupDirectory, `vilu-backup-${stamp}.json`);
  const backup = await buildBackup();
  await writeFile(outputPath, `${JSON.stringify(backup, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(`Vilu backup written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Vilu backup failed.");
  process.exitCode = 1;
});
