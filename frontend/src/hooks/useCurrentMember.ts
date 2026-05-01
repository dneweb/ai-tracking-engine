import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function useCurrentMember() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  // Initialize synchronously from localStorage if in browser
  const [activeOrg, setActiveOrg] = useState<{ org_id: string; org_name?: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const storedId = localStorage.getItem("nexus_active_org_id");
    const storedName = localStorage.getItem("nexus_active_org_name");
    return storedId ? { org_id: storedId, org_name: storedName || undefined } : null;
  });
  
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Keep state in sync with localStorage if it changes (e.g. after sign-in)
    const storedId = localStorage.getItem("nexus_active_org_id");
    const storedName = localStorage.getItem("nexus_active_org_name");

    if (storedId) {
      setActiveOrg({ org_id: storedId, org_name: storedName || undefined });
    } 
    // 2. Fallback to Clerk metadata if nothing in storage
    else if (user?.publicMetadata?.org_id) {
      setActiveOrg({ org_id: user.publicMetadata.org_id as string });
    }
  }, [user]);

  return {
    member: activeOrg,
    isLoaded,
    isSignedIn,
  };
}
