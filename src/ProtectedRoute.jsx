// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

/**
 * Protects routes so only authenticated users (and optionally admins) can access them.
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  // Retrieve user info from localStorage (set it when logging in)
  const user = JSON.parse(localStorage.getItem("user"));

  // Not logged in → redirect to login page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If adminOnly route and user isn't admin → deny access
  if (adminOnly && user.role !== "admin") {
    alert("Access denied! Only admins can view this page.");
    return <Navigate to="/home" replace />;
  }

  // ✅ Access allowed
  return children;
};

export default ProtectedRoute;
