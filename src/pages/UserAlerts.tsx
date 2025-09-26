import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Clock, XCircle, ArrowLeft, Shield, Mail, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface EmailAlert {
  id: string;
  alert_type: string;
  alert_message: string;
  status: string;
  created_at: string;
  admin_notes?: string;
  admin_action?: string;
}

const UserAlerts = () => {
  const navigate = useNavigate();
  
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['user-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailAlert[];
    },
  });

  const getAlertIcon = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'suspicious': return <AlertTriangle className="h-5 w-5 text-secondary" />;
      case 'malware': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'phishing': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-accent" />;
      case 'pending': return <Clock className="h-4 w-4 text-secondary" />;
      case 'investigating': return <Eye className="h-4 w-4 text-primary" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return 'default';
      case 'pending': return 'secondary';
      case 'investigating': return 'outline';
      default: return 'secondary';
    }
  };

  const getAlertTypeBadgeVariant = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'malware': return 'destructive';
      case 'phishing': return 'destructive';
      case 'suspicious': return 'secondary';
      default: return 'outline';
    }
  };

  const getAlertSeverityColor = (alertType: string) => {
    switch (alertType.toLowerCase()) {
      case 'malware': return 'threat-high hover-card';
      case 'phishing': return 'threat-high hover-card';
      case 'suspicious': return 'threat-medium hover-card';
      default: return 'hover-card';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Alert variant="destructive" className="animate-fade-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load security alerts. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="hover-scale"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Security Alerts</h1>
                <p className="text-muted-foreground">
                  Monitor and review your email security notifications
                </p>
              </div>
            </div>
          </div>
          
          {alerts && alerts.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Alerts</div>
              <div className="text-2xl font-bold">{alerts.length}</div>
            </div>
          )}
        </div>

        {/* Content Section */}
        {alerts && alerts.length === 0 ? (
          <Card className="hover-card">
            <CardContent className="flex flex-col items-center justify-center py-16 px-8">
              <div className="p-4 rounded-full bg-accent/10 mb-6">
                <CheckCircle className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">All Clear!</h3>
              <p className="text-muted-foreground text-center max-w-md leading-relaxed">
                No security alerts detected. Mail Guard is actively monitoring your emails 
                and will notify you of any potential threats.
              </p>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-primary text-sm">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Protected by ML&AI-powered security</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {alerts?.map((alert, index) => (
              <Card 
                key={alert.id} 
                className={`${getAlertSeverityColor(alert.alert_type)}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-background shadow-sm border">
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg font-semibold">
                            Security Alert Detected
                          </CardTitle>
                          <Badge variant={getAlertTypeBadgeVariant(alert.alert_type)} className="capitalize">
                            {alert.alert_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(alert.created_at), 'PPp')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Email Security
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getStatusBadgeVariant(alert.status)} 
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {getStatusIcon(alert.status)}
                        <span className="capitalize">{alert.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-5">
                  {alert.alert_message && (
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-secondary" />
                        Alert Details
                      </h4>
                      <p className="text-sm leading-relaxed">
                        {alert.alert_message}
                      </p>
                    </div>
                  )}

                  {alert.admin_action && (
                    <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-accent" />
                        Actions Taken
                      </h4>
                      <p className="text-sm leading-relaxed">
                        {alert.admin_action}
                      </p>
                    </div>
                  )}

                  {alert.admin_notes && (
                    <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Admin Notes
                      </h4>
                      <p className="text-sm leading-relaxed">
                        {alert.admin_notes}
                      </p>
                    </div>
                  )}

                  {alert.status === 'resolved' && (
                    <div className="flex items-center gap-2 bg-accent/10 px-3 py-2 rounded-lg border border-accent/20">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-accent">This alert has been resolved and no further action is required.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAlerts;