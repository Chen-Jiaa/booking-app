export type Role = "admin" | "event_manager" | "superUser" | "user";

export const roleConfig: Record<Role, { bg: string; label: string; text: string }> = {
  admin: { bg: "bg-red-100 dark:bg-red-950/40", label: "Admin", text: "text-red-700 dark:text-red-400" },
  event_manager: { bg: "bg-purple-100 dark:bg-purple-950/40", label: "Event Manager", text: "text-purple-700 dark:text-purple-400" },
  superUser: { bg: "bg-blue-100 dark:bg-blue-950/40", label: "Super User", text: "text-blue-700 dark:text-blue-400" },
  user: { bg: "bg-muted", label: "User", text: "text-muted-foreground" },
};

export const roles: Role[] = ["admin", "superUser", "event_manager", "user"];

export function avatarColor(role: null | string): string {
  const colors: Record<string, string> = {
    admin: "bg-red-500 text-white",
    event_manager: "bg-purple-500 text-white",
    superUser: "bg-blue-500 text-white",
    user: "bg-muted-foreground/20 text-muted-foreground",
  };
  return colors[role ?? "user"] ?? colors.user;
}
