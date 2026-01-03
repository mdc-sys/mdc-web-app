export type UserRole = "student" | "instructor" | null;

let role: UserRole = null;

export function loginAs(selectedRole: UserRole) {
  role = selectedRole;
}

export function getRole() {
  return role;
}

export function logout() {
  role = null;
}
