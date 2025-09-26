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
      case 'suspicious': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'malware': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'phishing': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'investigating': return <Eye className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
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
      case 'malware': return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'phishing': return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'suspicious': return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      default: return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
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
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Security Alerts</h1>
                  <p className="text-slate-600 text-sm">
                    Monitor and review your email security notifications
                  </p>
                </div>
              </div>
            </div>
            
            {alerts && alerts.length > 0 && (
              <div className="text-right">
                <div className="text-sm text-slate-600">Total Alerts</div>
                <div className="text-2xl font-bold text-slate-900">{alerts.length}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {alerts && alerts.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-16 px-8">
              <div className="p-4 rounded-full bg-emerald-100 mb-6">
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">All Clear!</h3>
              <p className="text-slate-600 text-center max-w-md leading-relaxed">
                No security alerts detected. Mail Guard is actively monitoring your emails 
                and will notify you of any potential threats.
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
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
                className={`border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] animate-fade-in bg-white/90 backdrop-blur-sm ${getAlertSeverityColor(alert.alert_type)}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-white shadow-sm">
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg font-semibold text-slate-900">
                            Security Alert Detected
                          </CardTitle>
                          <Badge variant={getAlertTypeBadgeVariant(alert.alert_type)} className="capitalize">
                            {alert.alert_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
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
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Alert Details
                      </h4>
                      <p className="text-slate-700 leading-relaxed">
                        {alert.alert_message}
                      </p>
                    </div>
                  )}

                  {alert.admin_action && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <h4 className="font-medium text-emerald-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Actions Taken
                      </h4>
                      <p className="text-emerald-800 leading-relaxed">
                        {alert.admin_action}
                      </p>
                    </div>
                  )}

                  {alert.admin_notes && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        Admin Notes
                      </h4>
                      <p className="text-blue-800 leading-relaxed">
                        {alert.admin_notes}
                      </p>
                    </div>
                  )}

                  {alert.status === 'resolved' && (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">This alert has been resolved and no further action is required.</span>
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