import { useUser } from "@clerk/nextjs";

export function useRole() {
  const { user, isLoaded, isSignedIn } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;

  return {
    role,
    isAdmin: role === "admin",
    isLoaded,
    isSignedIn,
  };
}
