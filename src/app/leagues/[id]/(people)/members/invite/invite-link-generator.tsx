"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlaceholderMember } from "@/db/schema";
import { LeagueMemberRole } from "@/lib/shared/constants";
import { ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Copy, Link, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { generateInviteLinkAction } from "./actions";

interface InviteLinkGeneratorProps {
  leagueId: string;
  availableRoles: LeagueMemberRole[];
  placeholders: PlaceholderMember[];
}

export function InviteLinkGenerator({
  leagueId,
  availableRoles,
  placeholders,
}: InviteLinkGeneratorProps) {
  const [role, setRole] = useState<LeagueMemberRole>(LeagueMemberRole.MEMBER);
  const [expiresInDays, setExpiresInDays] = useState<string>("7");
  const [maxUses, setMaxUses] = useState<string>("");
  const [placeholderId, setPlaceholderId] = useState<string>("none");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasPlaceholder = placeholderId !== "none";

  const handleGenerate = () => {
    setError(null);
    setGeneratedLink(null);
    startTransition(async () => {
      const result = await generateInviteLinkAction({
        leagueId,
        role,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        maxUses: hasPlaceholder ? 1 : maxUses ? parseInt(maxUses) : undefined,
        placeholderId: placeholderId !== "none" ? placeholderId : undefined,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const baseUrl = window.location.origin;
        setGeneratedLink(`${baseUrl}/invite/${result.data.token}`);
      }
    });
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="link-role">Role</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as LeagueMemberRole)}
          >
            <SelectTrigger id="link-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires">Expires In (days)</Label>
          <Input
            id="expires"
            type="number"
            min="1"
            max="30"
            placeholder="7"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-uses">Max Uses (optional)</Label>
          <Input
            id="max-uses"
            type="number"
            min="1"
            max="100"
            placeholder="Unlimited"
            value={hasPlaceholder ? "1" : maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            disabled={hasPlaceholder}
          />
          {hasPlaceholder && (
            <p className="text-muted-foreground text-xs">
              Max uses is locked to 1 when a placeholder is selected
            </p>
          )}
        </div>
      </div>

      {placeholders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="link-placeholder">
            Link to Placeholder (optional)
          </Label>
          <Select value={placeholderId} onValueChange={setPlaceholderId}>
            <SelectTrigger id="link-placeholder">
              <SelectValue placeholder="No placeholder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No placeholder</SelectItem>
              {placeholders.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            If selected, anyone who uses this link will inherit this
            placeholder&apos;s match history and stats.
          </p>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={isPending} className="w-full">
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link className="mr-2 h-4 w-4" />
        )}
        Generate Link
      </Button>

      {generatedLink && (
        <div className="space-y-2">
          <Label>Generated Link</Label>
          <div className="flex gap-2">
            <Input
              value={generatedLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Share this link with anyone you want to invite to the league.
          </p>
        </div>
      )}
    </div>
  );
}
