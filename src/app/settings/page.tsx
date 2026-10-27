import { BackupSettings } from "@/components/backup-settings";
import { WorkspacePage } from "@/components/workspace-page";

export default function SettingsPage() {
  return (
    <WorkspacePage
      eyebrow="Workspace preferences"
      title="Settings"
      description="Configure research defaults, freshness behavior, exports, and private workspace preferences."
    >
      <BackupSettings />
    </WorkspacePage>
  );
}
