import PageShell from "@/components/PageShell";
import RiskCalculator from "@/components/RiskCalculator";

export default function RiskPage() {
  return (
    <PageShell
      title="Risk Calculator"
      subtitle="Meitav Trade · Position sizing with commission awareness"
    >
      <RiskCalculator />
    </PageShell>
  );
}
