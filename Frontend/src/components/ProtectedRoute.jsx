import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const AuthLoader = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "16px",
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "2.5px solid #e5e7eb",
        borderTopColor: "#6b7280",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <span
      style={{
        fontSize: 14,
        color: "#9ca3af",
        animation: "pulse 1.6s ease-in-out infinite",
      }}
    >
      Waiting for Backend Server to wake up.
    </span>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
    `}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const location = useLocation();

  if (isLoading) return <AuthLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
