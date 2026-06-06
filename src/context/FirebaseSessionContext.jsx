import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { getProtectedProfile } from "@/lib/backendTest";
import { firebaseAuth } from "@/lib/firebase";


const FirebaseSessionContext = createContext(null);

export const firebaseAuthFeatureEnabled =
  import.meta.env.VITE_USE_FIREBASE_AUTH !== "false";

export function FirebaseSessionProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoading, setIsLoading] = useState(firebaseAuthFeatureEnabled);
  const [protectedProfile, setProtectedProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    if (!firebaseAuthFeatureEnabled || !firebaseAuth) {
      setIsLoading(false);
      setFirebaseUser(null);
      setProtectedProfile(null);
      setProfileError("");
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);

      if (!user) {
        setProtectedProfile(null);
        setProfileError("");
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseAuthFeatureEnabled || !firebaseUser) {
      return;
    }

    let isCurrent = true;
    setIsProfileLoading(true);
    setProfileError("");

    getProtectedProfile()
      .then((profile) => {
        if (isCurrent) {
          setProtectedProfile(profile);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setProtectedProfile(null);
          setProfileError(error?.message || "Unable to fetch protected profile");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsProfileLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [firebaseUser]);

  const value = useMemo(() => {
    const appProfile = protectedProfile?.app_user || null;

    return {
      enabled: firebaseAuthFeatureEnabled,
      firebaseUser,
      isLoading,
      isAuthenticated: Boolean(firebaseUser),
      isProfileLoading,
      protectedProfile,
      appProfile,
      profileStatus: protectedProfile?.profile_status || "not_loaded",
      profileError,
    };
  }, [
    firebaseUser,
    isLoading,
    isProfileLoading,
    protectedProfile,
    profileError,
  ]);

  return (
    <FirebaseSessionContext.Provider value={value}>
      {children}
    </FirebaseSessionContext.Provider>
  );
}

export function useFirebaseSession() {
  const context = useContext(FirebaseSessionContext);

  if (!context) {
    throw new Error("useFirebaseSession must be used within FirebaseSessionProvider");
  }

  return context;
}
