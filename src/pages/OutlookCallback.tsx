import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OutlookCallback = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your Outlook connection...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('OutlookCallback: Starting OAuth callback handling');
      
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setMessage('Failed to connect to Outlook. Please try again.');
        setTimeout(() => navigate("/settings"), 3000);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setStatus('error');
        setMessage('No authorization code received. Please try again.');
        setTimeout(() => navigate("/settings"), 3000);
        return;
      }

      // Wait for user to be loaded
      if (authLoading) {
        return;
      }

      if (!user) {
        console.log('OutlookCallback: No user found, redirecting to auth');
        setStatus('error');
        setMessage('User not authenticated. Redirecting to login...');
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }

      try {
        console.log('OutlookCallback: Calling outlook-auth function with code');
        setMessage('Exchanging authorization code for tokens...');

        const { data, error: functionError } = await supabase.functions.invoke('outlook-auth', {
          body: { 
            action: 'handle_callback',
            code: code 
          }
        });

        if (functionError) {
          console.error('Function error:', functionError);
          setStatus('error');
          setMessage('Failed to connect to Outlook. Please try again.');
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        if (data?.success) {
          console.log('OutlookCallback: Connection successful');
          setStatus('success');
          setMessage('Outlook connected successfully! Fetching your emails...');
          setTimeout(() => navigate("/"), 2000);
        } else {
          console.error('Connection failed:', data);
          setStatus('error');
          setMessage('Failed to connect to Outlook. Please try again.');
          setTimeout(() => navigate("/settings"), 3000);
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate("/settings"), 3000);
      }
    };

    handleOAuthCallback();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {status === 'processing' && 'Connecting Outlook...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Please wait while we connect your Outlook account...'}
            {status === 'success' && 'Your Outlook account has been connected successfully!'}
            {status === 'error' && 'There was a problem connecting your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground text-sm">
            {message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutlookCallback;