import { SearchWorkspace } from "@/components/search-workspace";
import { WorkspacePage } from "@/components/workspace-page";

export default function SearchPage() {
  return (
    <WorkspacePage
      eyebrow="Global workspace search"
      title="Search"
      description="Find companies, sources, evidence, opportunity hypotheses, and contacts without opening each queue separately."
    >
      <SearchWorkspace />
    </WorkspacePage>
  );
}
