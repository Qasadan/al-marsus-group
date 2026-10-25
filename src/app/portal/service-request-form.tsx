"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiClientError } from "@/lib/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ServiceRequestForm({ customerId }: { customerId: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [priority, setPriority] = useState("MEDIUM");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/service-requests", {
        method: "POST",
        json: {
          customerId,
          issue: String(form.get("issue") ?? ""),
          description: String(form.get("description") ?? ""),
          priority,
        },
      });
      setStatus("done");
    } catch (err) {
      toast({ title: "Could not submit", description: err instanceof ApiClientError ? err.message : "", variant: "destructive" });
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-[var(--brand-green)]" />
        <p className="text-sm font-medium">Request submitted</p>
        <p className="text-xs text-muted-foreground">Our service team will contact you shortly.</p>
        <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>Submit another</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sr-issue">Issue *</Label>
        <Input id="sr-issue" name="issue" required minLength={3} maxLength={300} placeholder="e.g. Inverter showing error code" />
      </div>
      <div className="space-y-1.5">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent — system down</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sr-desc">Details</Label>
        <Textarea id="sr-desc" name="description" rows={3} maxLength={3000} placeholder="What happened, when did it start…" />
      </div>
      <Button type="submit" disabled={status === "submitting"} className="w-full brand-gradient-green text-white">
        {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />} Submit request
      </Button>
    </form>
  );
}
