import { runMonitoring } from "@/lib/monitoring-service";

const result = await runMonitoring();
console.log(
  JSON.stringify(
    {
      checkedAt: result.checkedAt.toISOString(),
      checkedCount: result.checkedCount,
      alertCount: result.alertCount,
      downgradedCount: result.downgradedCount,
    },
    null,
    2,
  ),
);
