import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, Check, X } from "lucide-react";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password complexity validation
  const validatePassword = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    return requirements;
  };

  const passwordRequirements = validatePassword(password);
  const isPasswordValid = Object.values(passwordRequirements).every(req => req);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp && !isOtpMode) {
        // Validate password complexity
        if (!isPasswordValid) {
          setError("Password does not meet complexity requirements");
          setLoading(false);
          return;
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        // Send OTP for email verification
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            setError("An account with this email already exists. Try signing in instead.");
          } else {
            setError(error.message);
          }
        } else {
          setIsOtpMode(true);
          toast({
            title: "Verification Code Sent!",
            description: "Please check your email for the verification code.",
          });
        }
      } else if (isSignUp && isOtpMode) {
        // Verify OTP
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'signup'
        });

        if (error) {
          setError("Invalid verification code. Please try again.");
        } else {
          toast({
            title: "Account Created Successfully!",
            description: "Welcome to Mail Guard!",
          });
          setIsOtpMode(false);
          setIsSignUp(false);
        }
      } else {
        // Sign in
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please try again.");
          } else {
            setError(error.message);
          }
        } else {
          toast({
            title: "Access Granted!",
            description: "Welcome to the security command center.",
          });
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mail Guard</h1>
          <p className="text-muted-foreground mt-2">
            Secure your inbox with AI-powered threat detection
          </p>
        </div>

        <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">
              {isOtpMode 
                ? "Verify Your Email" 
                : isSignUp 
                  ? "Create Your Account" 
                  : "Sign In to Mail Guard"
              }
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isOtpMode 
                ? "Enter the verification code sent to your email" 
                : isSignUp 
                  ? "Set up your secure email protection" 
                  : "Access your email security dashboard"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-destructive/20">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {isOtpMode ? (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit verification code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    className="bg-background/50 border-border/20 text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Code sent to {email}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-border/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50 border-border/20"
                    />
                  </div>

                  {isSignUp && (
                    <>
                      <div className="space-y-2">
                        <Input
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="bg-background/50 border-border/20"
                        />
                      </div>

                      {password && (
                        <div className="space-y-2 text-xs">
                          <p className="text-muted-foreground">Password requirements:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className={`flex items-center gap-1 ${passwordRequirements.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {passwordRequirements.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              8+ characters
                            </div>
                            <div className={`flex items-center gap-1 ${passwordRequirements.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {passwordRequirements.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              Uppercase letter
                            </div>
                            <div className={`flex items-center gap-1 ${passwordRequirements.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {passwordRequirements.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              Lowercase letter
                            </div>
                            <div className={`flex items-center gap-1 ${passwordRequirements.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {passwordRequirements.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              Number
                            </div>
                            <div className={`flex items-center gap-1 ${passwordRequirements.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {passwordRequirements.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              Special character
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              
              <Button 
                type="submit" 
                className="w-full hover-button" 
                disabled={loading || (isSignUp && !isOtpMode && (!isPasswordValid || password !== confirmPassword))}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isOtpMode 
                  ? "Verify Email" 
                  : isSignUp 
                    ? "Create Account" 
                    : "Sign In"
                }
              </Button>
            </form>
            
            {!isOtpMode && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-background/50 border-border/20 hover-button"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </>
            )}
            
            <div className="mt-6 text-center">
              {isOtpMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpMode(false);
                    setOtp("");
                    setError("");
                  }}
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  ← Back to sign up
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Create it now"
                  }
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;