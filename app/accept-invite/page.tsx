import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(30,44,74,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,164,28,0.18),transparent_26%)] p-4 md:p-8">
      <AcceptInviteForm />
    </main>
  );
}
