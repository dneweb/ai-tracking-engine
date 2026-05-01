"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { syncUser } from "@/lib/api";
import { useOrgId } from "@/hooks/useOrgId";

export default function UserSync() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken, isLoaded: authLoaded } = useAuth();
    const { orgId } = useOrgId();
    const syncedRef = useRef<string | null>(null);

    useEffect(() => {
        async function performSync() {
            // Only sync if both user and auth (org context) are loaded
            // and we have both an authenticated user and an active organization.
            if (userLoaded && authLoaded && user && orgId) {
                const syncKey = `${user.id}:${orgId}`;
                
                if (syncedRef.current !== syncKey) {
                    try {
                        const token = await getToken();
                        const email = user.primaryEmailAddress?.emailAddress || "";
                        const fullName = user.fullName || "";
                        
                        if (email) {
                            await syncUser(user.id, email, fullName, token || undefined, orgId);
                            syncedRef.current = syncKey;
                            console.log("✅ User synchronization complete for org:", orgId);
                        }
                    } catch (err) {
                        console.error("Failed to sync user with backend", err);
                    }
                }
            }
        }

        performSync();
    }, [userLoaded, authLoaded, user, orgId, getToken]);

    return null;
}
