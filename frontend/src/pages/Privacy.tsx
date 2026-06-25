import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Trash2,
  Check,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSkeleton } from "@/components/Skeletons";
import { ErrorState } from "@/components/ErrorState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConsentStatus } from "@/types";

export function Privacy() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: consent, isLoading, isError, error, refetch, isFetching } =
    useQuery({
    queryKey: ["consent"],
    queryFn: async () => {
      const { data } = await api.get<ConsentStatus>("/users/me/consent");
      return data;
    },
  });

  const giveConsent = useMutation({
    mutationFn: async () => {
      await api.post("/users/me/consent");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      await api.delete("/users/me", {
        data: { confirmation: deleteConfirmText },
      });
    },
    onSuccess: () => {
      logout();
    },
  });

  const exportPdf = useMutation({
    mutationFn: async () => {
      const { data } = await api.get("/users/me/export/pdf", {
        responseType: "blob",
      });
      return data;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vortex-data-export.pdf";
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const exportJson = async () => {
    const { data } = await api.get("/users/me/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vortex-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isError)
    return <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} />;
  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="animate-rise space-y-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Privacy & Data</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your data, consent, and account under GDPR / RGPD.
        </p>
      </header>

      {/* ── Consent ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brass" />
            Data Processing Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">
            We collect and process your personal data (email, portfolio holdings, alerts)
            to provide the Vortex service. Your data is never sold to third parties.
          </p>
          {consent?.consent_given ? (
            <div className="flex items-center gap-2 rounded-lg bg-gain-soft px-4 py-3 text-sm text-gain">
              <Check className="size-5" />
              Consent given
              {consent.consent_given_at && (
                <span className="ml-1 text-muted-foreground">
                  on {new Date(consent.consent_given_at).toLocaleDateString("en-NG")}
                </span>
              )}
            </div>
          ) : (
            <Button onClick={() => giveConsent.mutate()} loading={giveConsent.isPending}>
              <ShieldCheck className="size-4" />
              Give consent
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Export ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5 text-brass" />
            Export My Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">
            Download all personal data Vortex holds about you, as required by GDPR
            Article 20 (right to data portability).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson}>
              <FileText className="size-4" />
              Export as JSON
            </Button>
            <Button variant="outline" onClick={() => exportPdf.mutate()} loading={exportPdf.isPending}>
              <Download className="size-4" />
              Export as PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Delete Account ── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">
            Permanently delete your account and all associated data. This action
            cannot be undone (GDPR Article 17 — right to erasure).
          </p>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="size-4" />
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Confirm account deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted">
              This will permanently erase all your portfolios, alerts, and personal
              data. This action cannot be undone.
            </p>
            <p className="text-sm text-muted">
              Type your email address to confirm:
            </p>
            <input
              type="email"
              placeholder="your@email.com"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                loading={deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
              >
                Permanently delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
