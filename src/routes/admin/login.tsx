import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
});

function LoginPage() {
  const handleGitHubLogin = () => {
    window.location.href = "/api/auth/github";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your GitHub account to access the admin panel
          </p>
        </div>

        <button
          onClick={handleGitHubLogin}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in with GitHub
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Only authorized users can access the admin panel
        </p>
      </div>
    </div>
  );
}
