import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import SignInForm from "@/components/sign-in-form";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  return <SignInForm redirectTo={redirect} />;
}
