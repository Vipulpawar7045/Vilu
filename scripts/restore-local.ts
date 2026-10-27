import { readFile } from "node:fs/promises";

import { importBackup, validateBackup } from "@/lib/backup-service";
import { getRuntimeConfig } from "@/lib/runtime-config";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  getRuntimeConfig();
  const filePath = argument("--file");
  if (!filePath || !process.argv.includes("--confirm")) {
    throw new Error("Restore requires: npm run restore -- --file <backup.json> --confirm");
  }
  const backup = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  const validation = validateBackup(backup);
  if (!validation.valid)
    throw new Error(`Backup validation failed: ${validation.errors.join(" ")}`);
  const imported = await importBackup(backup);
  console.log(
    `Vilu restore completed for ${Object.values(imported).reduce((sum, count) => sum + count, 0)} records.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Vilu restore failed.");
  process.exitCode = 1;
});
