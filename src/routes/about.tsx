import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "@/components/layout/home";
import { baseOptions } from "@/lib/layout.shared";
import {
  SiX,
  SiGithub,
  SiForgejo,
  SiForgejoHex,
  SiDiscord,
  SiDiscordHex,
} from "@icons-pack/react-simple-icons";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="mt-4 text-foreground font-mono">
          <SiX
            className="inline-grid text-foreground"
            size={12}
            color={"#FFFFFF"}
          />{" "}
          <a href="https://x.com/zerocaulk">zerocaulk</a>{" "}
          <span className="inline-flex text-sm font-sans italic text-muted-foreground">
            {" "}
            ramblings
          </span>
          <br />
          <SiDiscord
            className="inline-grid text-foreground"
            size={12}
            color={SiDiscordHex}
          />{" "}
          <a href="http://discord.com/users/1358948307489132564">
            caulkenstein
          </a>{" "}
          <span className="inline-flex text-sm font-sans italic text-muted-foreground">
            {" "}
            inquiries
          </span>
          <br />
          <SiGithub
            className="inline-grid text-foreground"
            size={12}
            color={"#e7e8e8"}
          />{" "}
          <a href="https://github.com/cau1k">cau1k</a>{" "}
          <span className="inline-flex text-sm font-sans italic text-muted-foreground">
            {" "}
            contributions
          </span>
          <br />
          <SiForgejo
            className="inline-grid text-foreground"
            size={12}
            color={SiForgejoHex}
          />{" "}
          <a href="https://git.caulk.lol">git.caulk.lol</a>{" "}
          <span className="inline-flex text-sm font-sans italic text-muted-foreground">
            {" "}
            decoupling
          </span>
          <br />
        </p>
      </main>
    </HomeLayout>
  );
}
