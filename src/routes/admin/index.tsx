import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSession, signOut } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  beforeLoad: async ({ context }) => {
    // This will be checked on the client
    const session = (context as any).session;
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }
  },
});

function AdminDashboard() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  // Check if user is authorized
  const allowedUsername = "cau1k"; // This should come from env in production
  const isAuthorized = session.user.name === allowedUsername;

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
          <p className="text-muted-foreground mb-4">
            You do not have permission to access this admin panel.
          </p>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {session.user.name}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <Link
            to="/admin/new-post"
            className="block rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
          >
            <h2 className="text-xl font-semibold mb-2">Create New Post</h2>
            <p className="text-sm text-muted-foreground">
              Write a new blog post with WYSIWYG editor
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
