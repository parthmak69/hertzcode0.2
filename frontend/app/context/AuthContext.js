"use client";
"use strict";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "./ToastContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("user");
  const [currentUserName, setCurrentUserName] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      if (pathname !== "/" && pathname !== "/forgot-password") {
        router.push("/");
      }
    } else {
      setAuthorized(true);
      setCurrentUser(user);
      setCurrentUserRole(localStorage.getItem("currentUserRole") || "user");
      setCurrentUserName(localStorage.getItem("currentUserName") || "");
    }
  }, [router, pathname]);

  const signOut = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentUserName");
    localStorage.removeItem("currentUserRole");
    localStorage.removeItem("rememberedEmail");
    localStorage.removeItem("rememberMe");
    
    setAuthorized(false);
    setCurrentUser("");
    setCurrentUserRole("user");
    setCurrentUserName("");
    
    showToast("Logged out successfully", "success");
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentUserRole,
        currentUserName,
        authorized,
        signOut,
        setCurrentUser,
        setCurrentUserRole,
        setCurrentUserName,
        setAuthorized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
