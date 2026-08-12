import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReactNode } from "react";

export type TeamsMemberRow = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  approval_status: "pending" | "approved" | "rejected";
  sponsor_username: string | null;
  avatar_url: string | null;
  role: string;
  submissionsThisWeek: number;
};

type TeamsMembersListProps = {
  members: TeamsMemberRow[];
  roleColors: Record<string, string>;
  statusIcons: Record<string, ReactNode>;
  selectedUserIds: Set<string>;
  headerCheckboxState: boolean | "indeterminate";
  filteredSelectableCount: number;
  bulkSaving: boolean;
  canBulkEditTarget: (member: TeamsMemberRow) => boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectOne: (userId: string, checked: boolean) => void;
  renderActions: (member: TeamsMemberRow) => ReactNode;
};

export function TeamsMembersList({
  members,
  roleColors,
  statusIcons,
  selectedUserIds,
  headerCheckboxState,
  filteredSelectableCount,
  bulkSaving,
  canBulkEditTarget,
  onToggleSelectAll,
  onToggleSelectOne,
  renderActions,
}: TeamsMembersListProps) {
  if (members.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No team members found.</p>;
  }

  return (
    <>
      <div className="lg:hidden space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-border/60 bg-accent/20 p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedUserIds.has(member.user_id)}
                onCheckedChange={(c) => onToggleSelectOne(member.user_id, !!c)}
                aria-label={`Select ${member.username}`}
                disabled={!canBulkEditTarget(member) || bulkSaving}
                className="mt-1"
              />
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground text-sm">
                  {member.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{member.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">@{member.username}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className={roleColors[member.role]}>{member.role.replace("_", " ")}</Badge>
                  <div className="flex items-center gap-1 text-xs capitalize">
                    {statusIcons[member.approval_status]}
                    {member.approval_status}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sponsor: {member.sponsor_username ? `@${member.sponsor_username}` : "—"} ·{" "}
                  {member.submissionsThisWeek}/7 this week
                </p>
              </div>
            </div>
            <div className="border-t border-border/40 pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Actions</p>
              <div className="w-full [&_button]:w-full">
                {renderActions(member)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0 pb-2">
        <div className="inline-block min-w-full align-middle">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={headerCheckboxState}
                    onCheckedChange={(c) => onToggleSelectAll(!!c)}
                    aria-label="Select all"
                    disabled={filteredSelectableCount === 0}
                  />
                </TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Sponsor</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Submissions</TableHead>
                <TableHead className="w-[72px] sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.has(member.user_id)}
                      onCheckedChange={(c) => onToggleSelectOne(member.user_id, !!c)}
                      aria-label={`Select ${member.username}`}
                      disabled={!canBulkEditTarget(member) || bulkSaving}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground text-sm">
                          {member.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">@{member.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[member.role]}>{member.role.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusIcons[member.approval_status]}
                      <span className="capitalize text-sm">{member.approval_status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {member.sponsor_username ? `@${member.sponsor_username}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium hidden lg:table-cell">
                    {member.submissionsThisWeek}/7
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)]">
                    {renderActions(member)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
