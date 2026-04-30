type Role = "USER" | "ADMIN";

export function isAdminRole(role?: Role | null) {
  return role === "ADMIN";
}

export function canAccessAdminArea(params: { role?: Role | null }) {
  return isAdminRole(params.role);
}
