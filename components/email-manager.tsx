"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface EmailRecipient {
  id: number;
  email: string;
  enabled: boolean;
  created_at: string;
}

export function EmailManager() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/emails");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRecipients(data.recipients ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setNewEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add email");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(id: number, enabled: boolean) {
    const res = await fetch("/api/emails", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    if (res.ok) await load();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/emails?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Email Recipients</h2>
        <p className="text-sm text-muted-foreground">
          All recipients receive UK and ZA reports when emailed or via scheduled cron.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-secondary" />
            Add Recipient
          </CardTitle>
          <CardDescription>
            Recipients receive both UK and ZA report ZIPs on email actions and scheduled cron (1st 00:00 EAT and Thursday 14:00 EAT).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="recipient@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Recipients</CardTitle>
            <Badge variant="secondary">{recipients.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">Loading...</p>
          ) : recipients.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No recipients yet. Add an email above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "hsl(var(--table-header))" }}
                  >
                    <th className="px-6 py-3 text-foreground/70">Email</th>
                    <th className="px-4 py-3 text-foreground/70">Status</th>
                    <th className="px-4 py-3 text-foreground/70">Added</th>
                    <th className="px-6 py-3 text-foreground/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-muted/30"} ${
                        !r.enabled ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-6 py-3 font-medium">{r.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.enabled}
                            onCheckedChange={(checked) => toggleEnabled(r.id, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {r.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
