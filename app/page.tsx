"use client";

import { useCallback, useState } from "react";
import { AppShell, type AppTab } from "@/components/app-shell";
import { ReportActions } from "@/components/report-actions";
import { EmailManager } from "@/components/email-manager";
import { LogsView } from "@/components/logs-view";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<AppTab>("reports");
  const [mountedTabs, setMountedTabs] = useState<Record<AppTab, boolean>>({
    reports: true,
    emails: false,
    logs: false,
  });

  const handleTabChange = useCallback((tab: AppTab) => {
    setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
    setActiveTab(tab);
  }, []);

  return (
    <AppShell activeTab={activeTab} onTabChange={handleTabChange}>
      {/* Panels stay mounted once visited so report runs continue and data is preserved */}
      <div className={cn(activeTab !== "reports" && "hidden")}>
        <ReportActions />
      </div>
      {mountedTabs.emails && (
        <div className={cn(activeTab !== "emails" && "hidden")}>
          <EmailManager />
        </div>
      )}
      {mountedTabs.logs && (
        <div className={cn(activeTab !== "logs" && "hidden")}>
          <LogsView />
        </div>
      )}
    </AppShell>
  );
}
