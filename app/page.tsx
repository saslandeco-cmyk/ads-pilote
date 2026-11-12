import Dashboard from "@/components/dashboard";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();
  return (
    <Dashboard
      initialCampaigns={data.campaigns}
      clients={data.clients}
      dailySeries={data.dailySeries}
      findings={data.findings}
      stats={data.stats}
    />
  );
}
