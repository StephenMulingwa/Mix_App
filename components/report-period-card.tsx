"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReportPeriod {
  label: string;
  from: string;
  to: string;
  fromDisplay: string;
  toDisplay: string;
  rollsDaily: boolean;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function formatLiveEAT(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "Africa/Nairobi",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function eatLocalToIso(localValue: string): string {
  const [datePart, timePart] = localValue.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 3, mi, 0)).toISOString();
}

export function ReportPeriodCard() {
  const [period, setPeriod] = useState<ReportPeriod | null>(null);
  const [fromValue, setFromValue] = useState("");
  const [liveTo, setLiveTo] = useState(formatLiveEAT());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const loadPeriod = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/period");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load period");
      setPeriod(data);
      setFromValue(toDatetimeLocalValue(data.from));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load period");
    }
  }, []);

  useEffect(() => {
    loadPeriod();
  }, [loadPeriod]);

  useEffect(() => {
    const id = setInterval(() => setLiveTo(formatLiveEAT()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/reports/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: eatLocalToIso(fromValue) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setPeriod(data);
      setFromValue(toDatetimeLocalValue(data.from));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-secondary" />
          Report period (Kenya Local)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="period-from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From (date &amp; time)
            </Label>
            {period ? (
              <Input
                id="period-from"
                type="datetime-local"
                value={fromValue}
                onChange={(e) => {
                  setFromValue(e.target.value);
                  setSaved(false);
                }}
              />
            ) : (
              <div className="flex h-10 items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Date rolls daily (last 14 days) · set time and click Save period
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To (live · EAT)
            </Label>
            <Input
              readOnly
              value={liveTo}
              className="border-amber-400/60 bg-muted/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {period && (
            <span className="text-xs text-muted-foreground">Label: {period.label}</span>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={saving || !period}
            onClick={handleSave}
            className="ml-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              "Saved"
            ) : (
              "Save period"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
