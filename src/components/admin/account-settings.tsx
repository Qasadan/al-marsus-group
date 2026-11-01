"use client";

// "Your Account" panel for the admin — change login email and password.
// Changing the login email re-issues the session server-side, so the admin
// stays signed in with the new email without re-logging in.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiClientError } from "@/lib/client";
import { Loader2, KeyRound, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AccountSettings() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Password change state
  const [curPassword, setCurPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    api<{ user: { email: string; name: string } | null }>("/api/auth/me")
      .then((d) => {
        if (d.user) {
          setCurrentEmail(d.user.email);
          setDisplayName(d.user.name);
        }
      })
      .catch(() => undefined);
  }, []);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await api<{ email: string }>("/api/auth/change-email", {
        method: "POST",
        json: { currentPassword: emailPassword, newEmail },
      });
      setCurrentEmail(res.email);
      setNewEmail("");
      setEmailPassword("");
      toast({ title: "Login email changed", description: `You now sign in as ${res.email}.` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not change email",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingEmail(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        json: { currentPassword: curPassword, newPassword },
      });
      setCurPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Use your new password next time you sign in." });
    } catch (err) {
      toast({
        title: "Could not change password",
        description: err instanceof ApiClientError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-5 space-y-4" data-testid="account-settings">
      <div>
        <h3 className="font-semibold">Your account</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Signed in as <span className="font-medium text-foreground">{displayName || "—"}</span>{" "}
          (<span className="font-medium text-foreground">{currentEmail || "—"}</span>). Your login email and password
          can be changed here at any time.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* ---- Change login email ---- */}
        <form onSubmit={submitEmail} className="space-y-3 rounded-md border border-dashed border-border p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h4 className="text-sm font-medium">Change login email</h4>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-new-email">New email</Label>
            <Input
              id="acc-new-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-email-pwd">Current password (to confirm)</Label>
            <Input
              id="acc-email-pwd"
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={savingEmail || !newEmail || !emailPassword} variant="outline" size="sm">
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Update email
          </Button>
        </form>

        {/* ---- Change password ---- */}
        <form onSubmit={submitPassword} className="space-y-3 rounded-md border border-dashed border-border p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h4 className="text-sm font-medium">Change password</h4>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-cur-pwd">Current password</Label>
            <Input
              id="acc-cur-pwd"
              type="password"
              autoComplete="current-password"
              value={curPassword}
              onChange={(e) => setCurPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-new-pwd">New password</Label>
              <Input
                id="acc-new-pwd"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-confirm-pwd">Confirm new</Label>
              <Input
                id="acc-confirm-pwd"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={savingPassword || !curPassword || !newPassword} variant="outline" size="sm">
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
