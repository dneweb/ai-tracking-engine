import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function useOrgId() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  const [activeOrgId, setActiveOrgId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem("nexus_active_org_id") || undefined;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedId = localStorage.getItem("nexus_active_org_id");
    if (storedId) {
      setActiveOrgId(storedId);
    } else if (user?.publicMetadata?.org_id) {
      setActiveOrgId(user.publicMetadata.org_id as string);
    }
  }, [user]);

  return {
    orgId: activeOrgId,
    isLoaded,
    isSignedIn,
  };
}