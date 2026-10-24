"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiClientError } from "@/lib/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

export function QuoteForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [propertyType, setPropertyType] = useState("RESIDENTIAL");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      propertyType,
      monthlyBill: String(form.get("monthlyBill") ?? ""),
      message: String(form.get("message") ?? ""),
      website: String(form.get("website") ?? ""), // honeypot
    };
    try {
      await api("/api/quote-requests", { method: "POST", json: payload });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center py-10 gap-3">
        <CheckCircle2 className="h-14 w-14 text-[var(--brand-green)]" />
        <h3 className="text-lg font-semibold">Request received</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Thank you — your quotation request has been saved. Our team will contact you to schedule a site survey.
        </p>
        <Button variant="outline" onClick={() => setStatus("idle")}>
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      {status === "error" && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name *</Label>
          <Input id="name" name="name" required minLength={2} maxLength={120} placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" name="phone" required minLength={7} maxLength={30} placeholder="+254 7XX XXX XXX" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" required maxLength={200} placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="propertyType">Property type *</Label>
          <Select name="propertyType" value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger id="propertyType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESIDENTIAL">Residential</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="address">Location / address</Label>
          <Input id="address" name="address" maxLength={300} placeholder="City, area" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyBill">Average monthly electricity bill</Label>
          <Input id="monthlyBill" name="monthlyBill" maxLength={50} placeholder="e.g. 12,000" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Tell us about your energy needs</Label>
        <Textarea id="message" name="message" rows={4} maxLength={3000} placeholder="Roof type, number of appliances, backup needs…" />
      </div>
      {/* Honeypot — hidden from humans, catches bots */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={status === "submitting"} className="w-full brand-gradient-green text-white">
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit Request"
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        By submitting, you agree to be contacted about your request. We handle your data per our{" "}
        <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
