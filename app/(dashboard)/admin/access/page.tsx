import { StaffInviteForm } from "@/components/admin/staff-invite-form";
import { RevokeAccessButton } from "@/components/admin/revoke-access-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationStaff } from "@/lib/queries";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";

export default async function AdminAccessPage() {
  const profile = await getCurrentProfile();
  const isSuper = await isSuperAdmin();
  const staff = await getOrganizationStaff();
  const admins = staff.filter((member) => member.role === "admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Access Management</h1>
        <p className="text-sm text-muted-foreground">
          Invite additional administrator accounts for protected back-office access.
        </p>
      </div>

      <StaffInviteForm />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{admins.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inspectors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold">Registry</p>
            <p className="text-sm text-muted-foreground">
              Inspectors are managed separately in the inspector registry and assigned per inspection.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current admins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional admin accounts exist yet.</p>
          ) : (
            <div className="grid gap-3">
              {admins.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground">{member.id}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded-full bg-secondary px-3 py-1 capitalize text-secondary-foreground">
                      {member.role}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        member.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                    {isSuper && member.id !== profile.id && (
                      <RevokeAccessButton userId={member.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
