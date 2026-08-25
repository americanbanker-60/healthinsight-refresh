import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useUserRole } from "@/components/auth/RoleGuard";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ROLES = ["admin", "power", "user"];

const roleBadge = {
  admin: "bg-red-100 text-red-700 border-red-200",
  power: "bg-indigo-100 text-indigo-700 border-indigo-200",
  user: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function TeamManagement() {
  const { user: currentUser } = useUserRole();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["team-users"],
    queryFn: () => base44.entities.User.list("created_date"),
    initialData: [],
  });

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(email, inviteRole);
      toast.success(`Invitation sent to ${email} as ${inviteRole}`);
      setInviteEmail("");
      setInviteRole("user");
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
    } catch (err) {
      toast.error("Invite failed: " + (err?.message || "Unknown error"));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser?.id) {
      toast.error("You can't change your own role");
      return;
    }
    setUpdatingId(userId);
    try {
      await base44.entities.User.update(userId, { role: newRole });
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["team-users"] });
    } catch (err) {
      toast.error("Role change failed: " + (err?.message || "Unknown error"));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
            <p className="text-slate-500 text-sm">Invite teammates and control access to HealthInsight</p>
          </div>
        </div>

        {/* Invite */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Invite a teammate
            </CardTitle>
            <CardDescription>
              They'll receive an email invitation to join this private workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="pl-9"
                />
              </div>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="sm:w-40">
                  <Shield className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={inviting} className="bg-indigo-600 hover:bg-indigo-700">
                {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {inviting ? "Sending…" : "Send Invite"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              <strong>admin</strong> — full access &amp; team management · <strong>power</strong> — all research features · <strong>user</strong> — standard library &amp; dashboard access
            </p>
          </CardContent>
        </Card>

        {/* Members */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            Members ({users.length})
          </h2>
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No members yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const joined = u.created_date && !isNaN(new Date(u.created_date).getTime())
                      ? new Date(u.created_date) : null;
                    return (
                      <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/60 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0">
                          <span className="text-slate-600 font-semibold">
                            {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 truncate">{u.full_name || u.email?.split("@")[0]}</p>
                            {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          {joined && (
                            <p className="text-xs text-slate-400 mt-0.5">Joined {format(joined, "MMM d, yyyy")}</p>
                          )}
                        </div>
                        {isSelf ? (
                          <Badge className={`capitalize border ${roleBadge[u.role] || roleBadge.user}`}>{u.role || "user"}</Badge>
                        ) : (
                          <Select
                            value={u.role || "user"}
                            onValueChange={(r) => handleRoleChange(u.id, r)}
                            disabled={updatingId === u.id}
                          >
                            <SelectTrigger className="w-32 capitalize">
                              {updatingId === u.id && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-slate-400 mt-3">
            Only admins can invite users and change roles. Removing a user is done from the Base44 workspace Users settings.
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}