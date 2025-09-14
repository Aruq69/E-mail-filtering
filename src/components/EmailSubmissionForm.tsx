import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EmailSubmissionFormProps {
  onEmailSubmitted: () => void;
}

const EmailSubmissionForm = ({ onEmailSubmitted }: EmailSubmissionFormProps) => {
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit emails for analysis.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !sender.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('classify-email', {
        body: {
          subject: subject.trim(),
          sender: sender.trim(),
          content: content.trim(),
          userId: user.id,
        },
      });

      if (error) {
        console.error('Classification error:', error);
        throw new Error(error.message || 'Failed to classify email');
      }

      console.log('Classification result:', data);

      // Clear form
      setSubject("");
      setSender("");
      setContent("");

      // Show success message with threat level
      const threatLevel = data.analysis?.threat_level || 'unknown';
      const classification = data.analysis?.classification || 'unknown';
      const confidence = data.analysis?.confidence || 0;
      
      toast({
        title: "Email analyzed successfully",
        description: `Classification: ${classification} | Threat Level: ${threatLevel} | Confidence: ${Math.round(confidence * 100)}%`,
        variant: threatLevel === 'high' ? 'destructive' : 'default',
      });

      // Refresh email list
      onEmailSubmitted();

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Submit Email for Analysis</span>
        </CardTitle>
        <CardDescription>
          Enter email details to analyze for spam and security threats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender">Sender Email</Label>
              <Input
                id="sender"
                type="email"
                placeholder="sender@example.com"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Email Content</Label>
            <Textarea
              id="content"
              placeholder="Paste the full email content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              rows={6}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !subject.trim() || !sender.trim() || !content.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Email...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Analyze Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmailSubmissionForm;