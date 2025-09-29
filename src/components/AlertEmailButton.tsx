import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface AlertEmailButtonProps {
  emailId: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const AlertEmailButton = ({ 
  emailId, 
  size = 'sm', 
  variant = 'destructive' 
}: AlertEmailButtonProps) => {
  const [open, setOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmitAlert = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('email_alerts')
        .insert({
          user_id: user.id,
          email_id: emailId,
          alert_type: 'suspicious',
          alert_message: alertMessage,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Alert Submitted',
        description: 'Your security alert has been sent to the SOC team for review.',
      });

      setOpen(false);
      setAlertMessage('');
    } catch (error) {
      console.error('Error submitting alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Alert SOC
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Suspicious Email</DialogTitle>
          <DialogDescription>
            Report this email to the Security Operations Center (SOC) team for investigation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="alert-message">Additional Details (Optional)</Label>
            <Textarea
              id="alert-message"
              placeholder="Describe why you think this email is suspicious..."
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitAlert}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Alert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};