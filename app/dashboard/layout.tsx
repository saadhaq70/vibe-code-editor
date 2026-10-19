import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import { DashboardSidebar } from "@/modules/dashboard/components/dashboard-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PlaygroundItem = {
  id: string;
  title: string;
  template: string;
  Starmark?: Array<{ isMarked: boolean }>;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    // 2. Cast the result directly here
    const playgroundData = await getAllPlaygroundForUser() as PlaygroundItem[];

    console.log("playgroundData", playgroundData);

    const technologyIconMap: Record<string, string> = {
      REACT: "Zap",
      NEXTJS: "Lightbulb",
      EXPRESS: "Database",
      VUE: "Compass",
      HONO: "FlameIcon",
      ANGULAR: "Terminal",
    }

    const formattedPlaygroundData = playgroundData?.map((item) => ({
      id: item.id,
      name: item.title,
      starred: item.Starmark?.[0]?.isMarked || false,
      icon: technologyIconMap[item.template] || "Code2"
    }))


  return (

  <SidebarProvider>
    
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Dashboard Sidebar */}
      <DashboardSidebar initialPlaygroundData={formattedPlaygroundData}/>
      <main className="dashboard-main min-w-0 flex-1">
        <div className="flex h-12 items-center border-b bg-background px-3 md:hidden">
          <SidebarTrigger aria-label="Open navigation" />
          <span className="ml-2 text-sm font-medium">Dashboard</span>
        </div>
        {children}
      </main>
    </div>
  </SidebarProvider>
  )

}
