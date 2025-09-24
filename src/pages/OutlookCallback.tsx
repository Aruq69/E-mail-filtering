import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OutlookCallback = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    console.log('OutlookCallback: Auth state:', { user: !!user, authLoading });
    
    // Wait for auth to load, then redirect
    if (!authLoading) {
      if (user) {
        console.log('OutlookCallback: User authenticated, redirecting to dashboard');
        // User is authenticated, redirect to dashboard
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        console.log('OutlookCallback: No user found, redirecting to auth');
        // No user found, redirect back to auth
        setTimeout(() => {
          navigate("/auth");
        }, 2000);
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