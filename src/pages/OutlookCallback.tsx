import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OutlookCallback = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to load, then redirect
    if (!authLoading) {
      if (user) {
        // User is authenticated, redirect to dashboard
        navigate("/");
      } else {
        // No user found, redirect back to auth
        navigate("/auth");
      }
    }
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing Authentication
          </CardTitle>
          <CardDescription>
            Please wait while we complete your sign-in...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground text-sm">
            Redirecting you to the dashboard...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutlookCallback;