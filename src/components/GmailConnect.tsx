import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Shield, Loader2, ExternalLink, Lock, Eye, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GmailConnectProps {
  onConnected: () => void;
}

const GmailConnect = ({ onConnected }: GmailConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const connectGmail = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect your Gmail account.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Check if we have the Google Client ID configured
      const { data: configCheck } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'get_auth_url', userId: user.id },
      });

      if (configCheck?.auth_url) {
        // Redirect to the properly configured Google OAuth URL
        window.location.href = configCheck.auth_url;
      } else {
        toast({
          title: "Configuration needed",
          description: "Google OAuth is not properly configured. Please contact support.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Gmail connection error:', error);
      toast({
        title: "Connection failed",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="border-border/20 bg-card/50 backdrop-blur-sm hover-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Connect Gmail Account</span>
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to analyze real emails for security threats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2 text-primary">Security Analysis Platform</h4>
            <p className="text-sm text-muted-foreground">
              Our AI-powered system will analyze your emails to detect phishing attempts, 
              spam, and other security threats. All analysis is performed securely and privately.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={isConnecting}
                className="w-full hover-button"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Connect Gmail Account
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border/20 bg-card/50 backdrop-blur-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Gmail Security Analysis Authorization</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        By connecting your Gmail account, you authorize Mail Guard to:
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 ml-8">
                    <div className="flex items-start space-x-2">
                      <Eye className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-sm">Analyze your emails for security threats and spam detection</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Lock className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-sm">Read email content to classify threat levels and suspicious patterns</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Mail className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-sm">Access recent inbox messages for comprehensive analysis</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-primary">Privacy Guarantee:</strong> We only read your emails to perform security analysis. 
                      No emails are stored permanently, and all analysis is done locally. Your data remains completely secure and private.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover-button">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={connectGmail}
                  className="hover-button"
                >
                  I Understand, Connect Gmail
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <div className="text-xs text-muted-foreground text-center">
            You'll be redirected to Google to authorize secure access
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GmailConnect;