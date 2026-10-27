import { describe, expect, it } from "vitest";

import { getLocalSecurityHeaders, getRuntimeConfig } from "@/lib/runtime-config";

describe("local privacy boundary", () => {
  it("defaults to local mode and keeps backups in a resolved private directory", () => {
    const config = getRuntimeConfig({
      DATABASE_URL: "file:./dev.db",
      VILU_BACKUP_DIR: "./backups",
    });
    expect(config.deploymentMode).toBe("local");
    expect(config.localOnly).toBe(true);
    expect(config.backupDirectory).toMatch(/backups$/);
  });

  it("fails closed when hosted mode is requested without hosted security controls", () => {
    expect(() => getRuntimeConfig({ VILU_DEPLOYMENT_MODE: "hosted" })).toThrow(
      /hosted mode is disabled/i,
    );
  });

  it("returns browser hardening headers", () => {
    const headers = getLocalSecurityHeaders();
    expect(headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ]),
    );
  });
});
