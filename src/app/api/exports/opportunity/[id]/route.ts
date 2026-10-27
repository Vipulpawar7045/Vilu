import { buildOpportunityMarkdown } from "@/lib/export-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const markdown = await buildOpportunityMarkdown(id);
  if (!markdown) return new Response("Opportunity not found.", { status: 404 });
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="vilu-opportunity-${id}.md"`,
    },
  });
}
