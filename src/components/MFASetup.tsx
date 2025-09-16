import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, QrCode, Key, CheckCircle, AlertTriangle } from "lucide-react";

interface MFASetupProps {
  onComplete?: () => void;
  onSkip?: () => void;
  showSkipOption?: boolean;
}

export const MFASetup = ({ onComplete, onSkip, showSkipOption = true }: MFASetupProps) => {
  const [step, setStep] = useState<'start' | 'enroll' | 'verify'>('start');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSecret, setShowSecret] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const startEnrollment = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Starting MFA enrollment...');
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `${user.email}'s authenticator`
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ MFA enrollment started successfully');
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep('enroll');
      
    } catch (error: any) {
      console.error('❌ MFA enrollment error:', error);
      setError(error.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🎯 Creating MFA challenge...');
      
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ MFA challenge created successfully');
      setChallengeId(data.id);
      setStep('verify');
      
    } catch (error: any) {
      console.error('❌ MFA challenge error:', error);
      setError(error.message || 'Failed to create verification challenge');
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
      console.log('🔍 Verifying MFA code...');
      
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeId,
        code: verificationCode
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ MFA verification successful');
      toast({
        title: "MFA Enabled!",
        description: "Your account is now protected with multi-factor authentication.",
      });
      
      onComplete?.();
      
    } catch (error: any) {
      console.error('❌ MFA verification error:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'start') {
    return (
      <Card className="w-full max-w-md mx-auto border-border/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Enhanced Security</CardTitle>
          <CardDescription>
            Add an extra layer of protection to your account with multi-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>✅ Protection against unauthorized access</p>
            <p>✅ Works with Google Authenticator, Authy, and more</p>
            <p>✅ Industry-standard TOTP security</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={startEnrollment} 
              disabled={loading}
              className="w-full hover-button"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Shield className="w-4 h-4 mr-2" />
              Enable MFA
            </Button>
            
            {showSkipOption && (
              <Button 
                variant="outline" 
                onClick={onSkip}
                className="w-full border-border/20"
              >
                Skip for now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'enroll') {
    return (
      <Card className="w-full max-w-md mx-auto border-border/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {qrCode && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border">
                <img 
                  src={qrCode} 
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
              
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="mb-2"
                >
                  <Key className="w-4 h-4 mr-2" />
                  {showSecret ? 'Hide' : 'Show'} Secret Key
                </Button>
                
                {showSecret && (
                  <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                    {secret}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                <p>• Download Google Authenticator, Authy, or similar app</p>
                <p>• Scan the QR code or enter the secret key manually</p>
                <p>• The app will generate 6-digit codes every 30 seconds</p>
              </div>
              
              <Button 
                onClick={createChallenge} 
                disabled={loading}
                className="w-full hover-button"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                I've Added the Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md mx-auto border-border/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verify Setup</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
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
            <p>Open your authenticator app and enter the 6-digit code</p>
            <p>Codes refresh every 30 seconds</p>
          </div>
          
          <Button 
            onClick={verifyCode} 
            disabled={loading || verificationCode.length !== 6}
            className="w-full hover-button"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <CheckCircle className="w-4 h-4 mr-2" />
            Verify & Enable MFA
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setStep('enroll')}
            className="w-full border-border/20"
          >
            Back to QR Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default MFASetup;