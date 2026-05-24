export type ProjectId = "hyprwhspr-rs";

export type Project = {
  id: ProjectId;
  title: string;
  host: string;
  description: string;
  githubUrl: string;
};

export const projectRegistry = {
  "hyprwhspr-rs": {
    id: "hyprwhspr-rs",
    title: "hyprwhspr-rs",
    host: "hyprwhspr-rs.caulk.lol",
    description:
      "Native speech-to-text dictation for Hyprland and Omarchy, written in Rust.",
    githubUrl: "https://github.com/better-slop/hyprwhspr-rs",
  },
} satisfies Record<ProjectId, Project>;

export function getProject(id: string): Project | null {
  return id in projectRegistry ? projectRegistry[id as ProjectId] : null;
}

export function getProjectByHost(host: string): Project | null {
  const normalizedHost = host.split(":")[0]?.toLowerCase();
  return (
    Object.values(projectRegistry).find(
      (project) => project.host === normalizedHost,
    ) ?? null
  );
}
