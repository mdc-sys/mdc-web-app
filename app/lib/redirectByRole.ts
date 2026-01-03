import { fetchUserAttributes } from "aws-amplify/auth";

export async function redirectByRole(router: any) {
  try {
    const attrs = await fetchUserAttributes();
    const role = attrs["custom:role"];

    if (role === "student") {
      router.replace("/student");
    } else if (role === "instructor") {
      router.replace("/instructor");
    } else {
      router.replace("/");
    }
  } catch {
    router.replace("/login");
  }
}
