import * as React from "react";
import { Navigate } from "@tanstack/react-router";
import { useAdmin } from "@/useAdmin";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { ready, user, admin } = useAdmin();

  if (!ready) return null;               // show a spinner if you like
  if (!user) return <Navigate to="/login" replace />;
  if (!admin) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
        <h2>Access denied</h2>
        <p>This Web Admin is restricted to authorized administrators.</p>
        <a href="/login">Return to Sign In</a>
      </div>
    );
  }
  return <>{children}</>;
}
