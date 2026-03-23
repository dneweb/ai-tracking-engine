"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { syncUser } from "@/lib/api";

export default function UserSync() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const syncedRef = useRef<string | null>(null);

    useEffect(() => {
        async function performSync() {
            if (isLoaded && user && syncedRef.current !== user.id) {
                try {
                    const token = await getToken();
                    const email = user.primaryEmailAddress?.emailAddress || "";
                    const fullName = user.fullName || "";
                    
                    if (email) {
                        await syncUser(user.id, email, fullName, token || undefined);
                        syncedRef.current = user.id;
                        console.log("✅ User synchronization complete");
                    }
                } catch (err) {
                    console.error("Failed to sync user with backend", err);
                }
            }
        }

        performSync();
    }, [isLoaded, user, getToken]);

    return null;
}
