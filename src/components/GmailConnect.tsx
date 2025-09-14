import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Shield, Loader2, ExternalLink } from "lucide-react";
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
      // Gmail OAuth2 scope for readonly access
      const scope = 'https://www.googleapis.com/auth/gmail.readonly';
      const redirectUri = `${window.location.origin}/auth`;
      
      // Google OAuth2 authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', 'YOUR_GOOGLE_CLIENT_ID'); // Will be set via environment
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', user.id); // Pass user ID in state

      // Redirect to Google OAuth
      window.location.href = authUrl.toString();

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
    <Card className="cyber-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary cyber-text-glow" />
          <span className="cyber-text-glow">Connect Gmail Account</span>
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to analyze real emails for security threats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2 text-primary">Security Notice:</h4>
            <p className="text-sm text-muted-foreground">
              We only request read-only access to your Gmail. Your emails are analyzed locally 
              and only classification results are stored - not the actual email content.
            </p>
          </div>
          
          <Button 
            onClick={connectGmail}
            disabled={isConnecting}
            className="w-full cyber-button"
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
          
          <div className="text-xs text-muted-foreground text-center">
            You'll be redirected to Google to authorize access
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GmailConnect;