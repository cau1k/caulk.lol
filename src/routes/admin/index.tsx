import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSessionFromRequest, isAuthorizedUser } from "@/lib/auth";

type LoaderData = {
  user: {
    login: string;
    name: string;
    avatar_url: string;
  };
};

const checkAuth = createServerFn({ method: "GET" }).handler(
  async ({ request }): Promise<LoaderData> => {
    const session = getSessionFromRequest(request);

    if (!session || !isAuthorizedUser(session)) {
      return Response.redirect("/admin/login") as never;
    }

    return { user: session.user };
  }
);

export const Route = createFileRoute("/admin/")({
  loader: () => checkAuth(),
  component: AdminDashboard,
});

function AdminDashboard() {
  const data = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {data.user.name} (@{data.user.login})
            </div>
            <a
              href="/api/auth/logout"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Logout
            </a>
          </div>
        </header>

        <div className="space-y-4">
          <Link
            to="/admin/new-post"
            className="block rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
          >
            <h2 className="text-xl font-semibold mb-2">Create New Post</h2>
            <p className="text-sm text-muted-foreground">
              Write a new blog post and create a PR to merge it into main
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

