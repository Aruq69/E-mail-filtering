import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, Settings, User, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import MFASetup from "@/components/MFASetup";

const SettingsPage = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      checkMfaStatus();
    }
  }, [user, authLoading, navigate]);

  const checkMfaStatus = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error fetching MFA factors:', error);
        return;
      }
      
      const verifiedFactors = data?.totp?.filter(factor => factor.status === 'verified') || [];
      setFactors(verifiedFactors);
      setMfaEnabled(verifiedFactors.length > 0);
      
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled for your account.",
      });
      
      await checkMfaStatus();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable MFA. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (showMfaSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button
            variant="outline"
            onClick={() => setShowMfaSetup(false)}
            className="mb-4 border-border/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
          
          <MFASetup 
            onComplete={() => {
              setShowMfaSetup(false);
              checkMfaStatus();
            }}
            onSkip={() => setShowMfaSetup(false)}
            showSkipOption={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="border-border/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Account Settings</h1>
          </div>
        </div>

        {/* User Info */}
        <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Account Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Created</label>
              <p className="text-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* MFA Settings */}
        <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Multi-Factor Authentication</span>
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account with TOTP-based authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking MFA status...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  {mfaEnabled ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">MFA Enabled</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-500 font-medium">MFA Disabled</span>
                    </>
                  )}
                </div>

                {mfaEnabled ? (
                  <div className="space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Your account is protected with multi-factor authentication.
                        You have {factors.length} authenticator(s) configured.
                      </AlertDescription>
                    </Alert>
                    
                    {factors.map((factor, index) => (
                      <div key={factor.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{factor.friendly_name || `Authenticator ${index + 1}`}</p>
                          <p className="text-sm text-muted-foreground">TOTP Authenticator</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisableMfa(factor.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Disable
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        Your account is not protected with MFA. Enable it now for enhanced security.
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={() => setShowMfaSetup(true)}
                      className="hover-button"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Enable MFA
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;