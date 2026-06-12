"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

type Region = "UK" | "ZA";

export type ClientSelection = Record<Region, string[]>;

interface ClientSelectionCardProps {
  selection: ClientSelection;
  onChange: (selection: ClientSelection) => void;
}

function ClientList({
  region,
  selected,
  onToggle,
}: {
  region: Region;
  selected: string[];
  onToggle: (name: string) => void;
}) {
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/clients?region=${region}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load clients");
      setClients(data.clients ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {region} clients...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const allSelected = selected.length === 0;

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onToggle("__ALL__")}
          className="h-4 w-4 rounded border-input"
        />
        <span className="font-medium">All clients</span>
        <span className="ml-auto text-xs text-muted-foreground">{clients.length} total</span>
      </label>

      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
        {clients.map((name) => {
          const checked = !allSelected && selected.includes(name);
          return (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(name)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="truncate">{name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ClientSelectionCard({ selection, onChange }: ClientSelectionCardProps) {
  function toggle(region: Region, name: string) {
    if (name === "__ALL__") {
      onChange({ ...selection, [region]: [] });
      return;
    }

    const current = selection[region];
    if (current.length === 0) {
      onChange({ ...selection, [region]: [name] });
      return;
    }

    const next = current.includes(name)
      ? current.filter((c) => c !== name)
      : [...current, name];

    onChange({ ...selection, [region]: next });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-secondary" />
          Client Selection
        </CardTitle>
        <CardDescription>
          Choose specific clients per region, or leave all selected for a full run
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="UK">
          <TabsList className="mb-3 grid w-full grid-cols-2">
            <TabsTrigger value="UK">UK</TabsTrigger>
            <TabsTrigger value="ZA">ZA</TabsTrigger>
          </TabsList>
          <TabsContent value="UK" className="mt-0">
            <Label className="sr-only">UK clients</Label>
            <ClientList
              region="UK"
              selected={selection.UK}
              onToggle={(name) => toggle("UK", name)}
            />
          </TabsContent>
          <TabsContent value="ZA" className="mt-0">
            <Label className="sr-only">ZA clients</Label>
            <ClientList
              region="ZA"
              selected={selection.ZA}
              onToggle={(name) => toggle("ZA", name)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
