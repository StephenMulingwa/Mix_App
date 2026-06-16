"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "mix-sidebar-collapsed";

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col self-start overflow-x-hidden overflow-y-auto transition-[width] duration-300 ease-in-out",
          collapsed ? "w-16" : "w-56"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar))" }}
      >
        <div
          className={cn(
            "flex items-center border-b border-white/10 py-5",
            collapsed ? "justify-center px-2" : "gap-2 px-4"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm font-bold text-white">MIX Reports</p>
              <p className="truncate text-xs text-white/60">ControlTech</p>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 py-4", collapsed ? "px-2" : "px-3")}>
          <div
            className={cn(
              "mb-3 flex items-center",
              collapsed ? "justify-center" : "justify-end"
            )}
          >
            <button
              type="button"
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/25 text-white/80 transition-colors hover:bg-black/35 hover:text-white"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  title={collapsed ? item.label : undefined}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex w-full items-center transition-colors",
                    collapsed ? "justify-center rounded-xl p-2" : "gap-3 rounded-xl px-3 py-2",
                    isActive
                      ? "border border-amber-400/70 bg-white/5"
                      : "border border-transparent hover:bg-white/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-white/20 text-amber-400"
                        : "bg-white/10 text-white"
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span
                      className={cn(
                        "truncate text-sm font-semibold",
                        isActive ? "text-amber-400" : "text-white"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className={cn("border-t border-white/10 py-4", collapsed ? "px-2" : "px-4")}>
          {!collapsed && (
            <p className="text-xs text-white/50">Powered by ControlTech</p>
          )}
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
