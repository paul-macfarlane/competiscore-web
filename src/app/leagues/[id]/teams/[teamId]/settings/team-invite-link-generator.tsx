"use client";

import { generateTeamInviteLinkAction } from "@/app/leagues/[id]/teams/actions";
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
import { TeamMemberRole } from "@/lib/shared/constants";
import { TEAM_ROLE_LABELS } from "@/lib/shared/roles";
import { Check, Copy, Link, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

interface TeamInviteLinkGeneratorProps {
  teamId: string;
}

export function TeamInviteLinkGenerator({
  teamId,
}: TeamInviteLinkGeneratorProps) {
  const [role, setRole] = useState<TeamMemberRole>(TeamMemberRole.MEMBER);
  const [expiresInDays, setExpiresInDays] = useState<string>("7");
  const [maxUses, setMaxUses] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    setGeneratedLink(null);
    startTransition(async () => {
      const result = await generateTeamInviteLinkAction(teamId, {
        role,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const baseUrl = window.location.origin;
        setGeneratedLink(`${baseUrl}/team-invite/${result.data.token}`);
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
            onValueChange={(v) => setRole(v as TeamMemberRole)}
          >
            <SelectTrigger id="link-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TeamMemberRole).map((r) => (
                <SelectItem key={r} value={r}>
                  {TEAM_ROLE_LABELS[r]}
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
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
      </div>

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
            Share this link to invite people to this team. If they&apos;re not
            in the league, they&apos;ll be added to both the league and team.
          </p>
        </div>
      )}
    </div>
  );
}
