import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Gmail authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');
          setMessage('Gmail authorization was denied or failed.');
          toast({
            title: "Authorization Failed",
            description: "Gmail access was denied. Please try again.",
            variant: "destructive",
          });
          
          // Redirect to home after 3 seconds
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from Gmail.');
          toast({
            title: "Authorization Failed",
            description: "No authorization code received. Please try again.",
            variant: "destructive",
          });
          
          // Redirect to home after 3 seconds
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!user) {
          setStatus('error');
          setMessage('User not authenticated. Please sign in first.');
          toast({
            title: "Authentication Required",
            description: "Please sign in to your account first.",
            variant: "destructive",
          });
          
          // Redirect to auth page
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        console.log('Exchanging authorization code for tokens...');
        setMessage('Exchanging authorization code for access tokens...');

        // Exchange the authorization code for tokens
        const { data, error: exchangeError } = await supabase.functions.invoke('gmail-auth', {
          body: { 
            action: 'exchange_token',
            code: code,
            user_id: user.id
          }
        });

        if (exchangeError) {
          console.error('Token exchange error:', exchangeError);
          throw new Error(exchangeError.message || 'Failed to exchange authorization code');
        }

        if (data.error) {
          console.error('Token exchange failed:', data.error);
          throw new Error(data.error);
        }

        console.log('Gmail authorization successful!');
        setStatus('success');
        setMessage('Gmail account connected successfully!');
        
        toast({
          title: "Gmail Connected",
          description: "Your Gmail account has been connected successfully. You can now sync your emails.",
        });

        // Redirect to home after 2 seconds
        setTimeout(() => navigate('/'), 2000);

      } catch (error) {
        console.error('Gmail callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        
        toast({
          title: "Connection Failed",
          description: "Failed to connect Gmail account. Please try again.",
          variant: "destructive",
        });

        // Redirect to home after 3 seconds
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, user, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-16 w-16 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-primary';
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-destructive';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-6">
        {/* Shield Background */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            {status === 'processing' && (
              <div className="absolute inset-0 p-6 rounded-full border border-primary/30 animate-ping" />
            )}
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>
        
        {/* Status Message */}
        <div>
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            {status === 'processing' && 'Connecting Gmail...'}
            {status === 'success' && 'Gmail Connected!'}
            {status === 'error' && 'Connection Failed'}
          </h1>
          <p className={`text-lg ${getStatusColor()}`}>{message}</p>
          
          {status !== 'processing' && (
            <p className="mt-4 text-sm text-muted-foreground">
              You will be redirected to the main page shortly...
            </p>
          )}
        </div>

        {/* Manual redirect button for errors */}
        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default GmailCallback;