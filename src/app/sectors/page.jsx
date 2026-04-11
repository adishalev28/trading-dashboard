import PageShell from "@/components/PageShell";
import SectorHeatmap from "@/components/SectorHeatmap";
import mockData from "@/lib/mockData.json";

export default function SectorsPage() {
  return (
    <PageShell
      title="Sector Analysis"
      subtitle="11 SPDR sector ETFs — momentum heatmap"
    >
      <SectorHeatmap sectors={mockData.sectors} />
    </PageShell>
  );
}
