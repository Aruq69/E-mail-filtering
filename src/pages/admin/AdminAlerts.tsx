import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Eye, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminAlerts() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [adminAction, setAdminAction] = useState('');
  const { toast } = useToast();

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['admin-alerts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_alerts')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: alerts, error } = await query;
      if (error) throw error;

      // Get related data separately
      const userIds = [...new Set(alerts?.map(alert => alert.user_id) || [])];
      const emailIds = [...new Set(alerts?.map(alert => alert.email_id) || [])];

      const [profiles, emails] = await Promise.all([
        supabase.from('profiles').select('user_id, username').in('user_id', userIds),
        supabase.from('emails').select('id, subject, sender, threat_level').in('id', emailIds)
      ]);

      // Map related data to alerts
      const alertsWithData = alerts?.map(alert => ({
        ...alert,
        profiles: profiles.data?.find(p => p.user_id === alert.user_id),
        emails: emails.data?.find(e => e.id === alert.email_id)
      })) || [];

      return alertsWithData;
    }
  });

  const handleUpdateAlert = async (alertId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('email_alerts')
        .update({
          status,
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          admin_action: adminAction,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'review_alert',
          target_type: 'alert',
          target_id: alertId,
          action_details: { 
            status, 
            admin_action: adminAction, 
            admin_notes: adminNotes 
          }
        });

      toast({
        title: 'Alert Updated',
        description: `Alert status changed to ${status}`,
      });
      
      setSelectedAlert(null);
      setAdminNotes('');
      setAdminAction('');
      refetch();
    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'reviewed': return 'outline';
      case 'resolved': return 'default';
      default: return 'outline';
    }
  };

  const getAlertTypeBadgeVariant = (alertType: string) => {
    switch (alertType) {
      case 'suspicious': return 'destructive';
      case 'phishing': return 'destructive';
      case 'malware': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredAlerts = alerts?.filter(alert => 
    statusFilter === 'all' || alert.status === statusFilter
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Alert Management</h1>
        <p className="text-muted-foreground">
          Review and respond to user-reported suspicious emails
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filteredAlerts.length} alerts found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>
            User-reported suspicious emails requiring SOC review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alerts found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email Subject</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Alert Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="truncate" title={alert.emails?.subject}>
                            {alert.emails?.subject}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{alert.profiles?.username}</TableCell>
                      <TableCell>
                        <Badge variant={getAlertTypeBadgeVariant(alert.alert_type)}>
                          {alert.alert_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(alert.status)}>
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(alert.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Review Security Alert</DialogTitle>
                                <DialogDescription>
                                  Review and respond to this user-reported security alert
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedAlert && (
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Email Details</h4>
                                    <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                                      <div><strong>Subject:</strong> {selectedAlert.emails?.subject}</div>
                                      <div><strong>Sender:</strong> {selectedAlert.emails?.sender}</div>
                                      <div><strong>Threat Level:</strong> {selectedAlert.emails?.threat_level}</div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium mb-2">User Message</h4>
                                    <div className="bg-muted p-3 rounded-md text-sm">
                                      {selectedAlert.alert_message || 'No additional message provided'}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Admin Action</label>
                                    <Select value={adminAction} onValueChange={setAdminAction}>
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select action taken" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="email_blocked">Email Blocked</SelectItem>
                                        <SelectItem value="false_positive">False Positive</SelectItem>
                                        <SelectItem value="under_investigation">Under Investigation</SelectItem>
                                        <SelectItem value="no_action_needed">No Action Needed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Admin Notes</label>
                                    <Textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add notes about your investigation and actions taken..."
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => handleUpdateAlert(selectedAlert?.id, 'reviewed')}
                                  disabled={!adminAction}
                                >
                                  Mark as Reviewed
                                </Button>
                                <Button
                                  onClick={() => handleUpdateAlert(selectedAlert?.id, 'resolved')}
                                  disabled={!adminAction}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Resolve Alert
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}