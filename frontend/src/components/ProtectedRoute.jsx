import { Navigate, Outlet } from "react-router-dom";
import { useUserStore } from "../store/useUserStore.js";
import { Loader2 } from "lucide-react";
const ProtectedRoute = () => {
    const { isAuthenticated, isCheckingAuth } = useUserStore();

    if (isCheckingAuth) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;