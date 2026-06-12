"use client";

import { useState } from "react";
import { Loader2, Mail, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportPeriodCard } from "@/components/report-period-card";
import {
  ClientSelectionCard,
  type ClientSelection,
} from "@/components/client-selection-card";

type Region = "UK" | "ZA";

interface ActionConfig {
  id: string;
  title: string;
  description: string;
  region: Region;
  mode: "execute" | "email";
  accent: string;
}

const ACTIONS: ActionConfig[] = [
  {
    id: "exec-uk",
    title: "Execute UK",
    description: "Pull data, generate UK reports, and download as ZIP",
    region: "UK",
    mode: "execute",
    accent: "border-t-blue-500",
  },
  {
    id: "exec-za",
    title: "Execute ZA",
    description: "Pull data, generate ZA reports, and download as ZIP",
    region: "ZA",
    mode: "execute",
    accent: "border-t-emerald-500",
  },
  {
    id: "email-uk",
    title: "Send UK Email",
    description: "Run UK pipeline and email results to all recipients",
    region: "UK",
    mode: "email",
    accent: "border-t-indigo-500",
  },
  {
    id: "email-za",
    title: "Send ZA Email",
    description: "Run ZA pipeline and email results to all recipients",
    region: "ZA",
    mode: "email",
    accent: "border-t-amber-500",
  },
];

export function ReportActions() {
  const [running, setRunning] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<Record<string, "success" | "error" | undefined>>({});
  const [lastMessage, setLastMessage] = useState<Record<string, string>>({});
  const [clientSelection, setClientSelection] = useState<ClientSelection>({
    UK: [],
    ZA: [],
  });

  async function runAction(action: ActionConfig) {
    setRunning(action.id);
    setLastStatus((s) => ({ ...s, [action.id]: undefined }));
    setLastMessage((m) => ({ ...m, [action.id]: "" }));

    const clients = clientSelection[action.region];

    try {
      const res = await fetch("/api/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: action.region,
          mode: action.mode,
          clients: clients.length > 0 ? clients : undefined,
        }),
      });

      if (action.mode === "execute") {
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/zip")) {
          const blob = await res.blob();
          const disposition = res.headers.get("content-disposition") ?? "";
          const match = disposition.match(/filename="(.+)"/);
          const filename = match?.[1] ?? `MIX_${action.region}_Reports.zip`;

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);

          const msg = decodeURIComponent(res.headers.get("X-Report-Message") ?? "");
          setLastStatus((s) => ({ ...s, [action.id]: "success" }));
          setLastMessage((m) => ({ ...m, [action.id]: msg || "Download started." }));
        } else {
          const data = await res.json();
          throw new Error(data.message ?? data.error ?? "Execute failed");
        }
      } else {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? data.error ?? "Email failed");
        setLastStatus((s) => ({ ...s, [action.id]: "success" }));
        setLastMessage((m) => ({ ...m, [action.id]: data.message ?? "Email sent." }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed";
      setLastStatus((s) => ({ ...s, [action.id]: "error" }));
      setLastMessage((m) => ({ ...m, [action.id]: msg }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Fleet Reports</h2>
        <p className="text-sm text-muted-foreground">
          Execute or email UK and ZA monthly fleet reports.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReportPeriodCard />
        <ClientSelectionCard selection={clientSelection} onChange={setClientSelection} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ACTIONS.map((action) => {
          const isRunning = running === action.id;
          const status = lastStatus[action.id];
          const message = lastMessage[action.id];
          const selectedCount = clientSelection[action.region].length;

          return (
            <Card
              key={action.id}
              className={`overflow-hidden border-t-4 shadow-sm ${action.accent}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  {status === "success" && <Badge variant="success">Success</Badge>}
                  {status === "error" && <Badge variant="destructive">Failed</Badge>}
                  {isRunning && <Badge variant="warning">Running</Badge>}
                </div>
                <CardDescription>{action.description}</CardDescription>
                {selectedCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCount} client{selectedCount !== 1 ? "s" : ""} selected
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {message && (
                  <p
                    className={`max-h-24 overflow-auto whitespace-pre-wrap text-xs ${
                      status === "error" ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {message}
                  </p>
                )}
                <Button
                  className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  disabled={isRunning || running !== null}
                  onClick={() => runAction(action)}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : action.mode === "execute" ? (
                    <>
                      <Play className="h-4 w-4" />
                      Run &amp; Download
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Run &amp; Send Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
