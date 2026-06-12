"use client";

import { useEffect, useState } from "react";
import { BarChart3, ClipboardList, FileBarChart, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = "reports" | "emails" | "logs";

interface AppShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: React.ReactNode }[] = [
  { id: "reports", label: "Reports", icon: <FileBarChart className="h-4 w-4" /> },
  { id: "emails", label: "Emails", icon: <Mail className="h-4 w-4" /> },
  { id: "logs", label: "Logs", icon: <ClipboardList className="h-4 w-4" /> },
];

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleString("en-GB", {
          timeZone: "Africa/Nairobi",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono text-sm text-white/90">EAT {time}</span>;
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="flex w-56 shrink-0 flex-col"
        style={{ backgroundColor: "hsl(var(--sidebar))" }}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">MIX Reports</p>
            <p className="text-xs text-white/60">ControlTech</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "border-l-4 border-amber-400 bg-white/10 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-white/50">Powered by ControlTech</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-3"
          style={{ backgroundColor: "hsl(var(--header))" }}
        >
          <div>
            <h1 className="text-base font-semibold text-white">
              MIX Report Automation
            </h1>
            <p className="text-xs text-white/60">
              FLEET REPORTING · UK &amp; ZA OPERATIONS
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LiveClock />
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            <span className="hidden text-xs text-white/50 sm:block">
              Cron: 1st 00:00 EAT · Thu 14:00 EAT
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
