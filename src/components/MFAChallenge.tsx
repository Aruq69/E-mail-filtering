import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, AlertTriangle } from "lucide-react";

interface MFAChallengeProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const MFAChallenge = ({ onSuccess, onCancel }: MFAChallengeProps) => {
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    initializeChallenge();
  }, []);

  const initializeChallenge = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Getting user MFA factors...');
      
      // Get the user's MFA factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        throw factorsError;
      }
      
      const totpFactor = factors?.totp?.find(factor => factor.status === 'verified');
      
      if (!totpFactor) {
        throw new Error('No verified MFA factors found');
      }
      
      console.log('Creating MFA challenge...');
      
      // Create a challenge for the verified TOTP factor
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      
      if (challengeError) {
        throw challengeError;
      }
      
      console.log('MFA challenge created successfully');
      setChallengeId(challenge.id);
      setFactorId(totpFactor.id);
      
    } catch (error: any) {
      console.error('MFA challenge initialization error:', error);
      setError(error.message || 'Failed to initialize MFA challenge');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Verifying MFA code...');
      
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeId,
        code: verificationCode
      });
      
      if (error) {
        throw error;
      }
      
      console.log('MFA verification successful');
      toast({
        title: "Authentication Successful",
        description: "Welcome to Mail Guard!",
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error('MFA verification error:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    supabase.auth.signOut();
    onCancel?.();
  };

  return (
    <Card className="w-full max-w-md mx-auto border-border/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading && !challengeId ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Initializing verification...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={loading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              <p>Open your authenticator app and enter the current 6-digit code</p>
              <p>Codes refresh every 30 seconds</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={verifyCode} 
                disabled={loading || verificationCode.length !== 6}
                className="w-full hover-button"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify Code
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="w-full border-border/20"
              >
                Cancel & Sign Out
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MFAChallenge;