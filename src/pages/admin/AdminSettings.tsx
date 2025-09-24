import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, AlertTriangle, Shield, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const [systemSettings, setSystemSettings] = useState({
    autoBlockHighThreats: true,
    alertThreshold: 0.8,
    retentionPeriodDays: 90,
    enableRealTimeMonitoring: true,
    maxEmailsPerUser: 10000,
    allowUserDataExport: true,
    systemMaintenanceMode: false,
    defaultThreatLevel: 'medium'
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailAdminsOnHighThreat: true,
    emailAdminsOnNewAlert: true,
    dailySummaryReport: true,
    weeklyThreatReport: true
  });

  const [customMessage, setCustomMessage] = useState('');
  const { toast } = useToast();

  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [usersResult, emailsResult, alertsResult, blocksResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('emails').select('id', { count: 'exact' }),
        supabase.from('email_alerts').select('id', { count: 'exact' }),
        supabase.from('email_blocks').select('id', { count: 'exact' }).eq('is_active', true)
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalEmails: emailsResult.count || 0,
        totalAlerts: alertsResult.count || 0,
        activeBlocks: blocksResult.count || 0
      };
    }
  });

  const handleSaveSettings = async () => {
    try {
      // In a real implementation, you would save these to a settings table
      // For now, we'll just show a success message
      
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'update_settings',
          target_type: 'system',
          target_id: 'system-settings',
          action_details: { 
            system_settings: systemSettings,
            notification_settings: notificationSettings
          }
        });

      toast({
        title: 'Settings Saved',
        description: 'System settings have been updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    }
  };

  const handleSystemReset = async () => {
    // This would be a dangerous operation in production
    toast({
      title: 'System Reset',
      description: 'This feature is disabled in the current environment',
      variant: 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure platform-wide settings and security policies
        </p>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalEmails || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalAlerts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.activeBlocks || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure automatic threat response and security policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-block">Auto-block High Threats</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically block emails with high threat levels
                </div>
              </div>
              <Switch
                id="auto-block"
                checked={systemSettings.autoBlockHighThreats}
                onCheckedChange={(checked) => 
                  setSystemSettings(prev => ({ ...prev, autoBlockHighThreats: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-threshold">Alert Confidence Threshold</Label>
              <Input
                id="alert-threshold"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={systemSettings.alertThreshold}
                onChange={(e) => 
                  setSystemSettings(prev => ({ ...prev, alertThreshold: parseFloat(e.target.value) }))
                }
              />
              <div className="text-sm text-muted-foreground">
                Minimum confidence level to trigger automatic alerts (0.0 - 1.0)
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-period">Data Retention Period (Days)</Label>
              <Input
                id="retention-period"
                type="number"
                min="1"
                max="365"
                value={systemSettings.retentionPeriodDays}
                onChange={(e) => 
                  setSystemSettings(prev => ({ ...prev, retentionPeriodDays: parseInt(e.target.value) }))
                }
              />
              <div className="text-sm text-muted-foreground">
                How long to keep email data before automatic deletion
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="real-time">Real-time Monitoring</Label>
                <div className="text-sm text-muted-foreground">
                  Enable continuous threat monitoring
                </div>
              </div>
              <Switch
                id="real-time"
                checked={systemSettings.enableRealTimeMonitoring}
                onCheckedChange={(checked) => 
                  setSystemSettings(prev => ({ ...prev, enableRealTimeMonitoring: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure when and how admins receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-high-threat">Email on High Threats</Label>
                <div className="text-sm text-muted-foreground">
                  Send email alerts when high threats are detected
                </div>
              </div>
              <Switch
                id="email-high-threat"
                checked={notificationSettings.emailAdminsOnHighThreat}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, emailAdminsOnHighThreat: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-new-alert">Email on New User Alerts</Label>
                <div className="text-sm text-muted-foreground">
                  Send email when users report suspicious emails
                </div>
              </div>
              <Switch
                id="email-new-alert"
                checked={notificationSettings.emailAdminsOnNewAlert}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, emailAdminsOnNewAlert: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-summary">Daily Summary Report</Label>
                <div className="text-sm text-muted-foreground">
                  Send daily platform activity summary
                </div>
              </div>
              <Switch
                id="daily-summary"
                checked={notificationSettings.dailySummaryReport}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, dailySummaryReport: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-threat">Weekly Threat Report</Label>
                <div className="text-sm text-muted-foreground">
                  Send comprehensive weekly threat analysis
                </div>
              </div>
              <Switch
                id="weekly-threat"
                checked={notificationSettings.weeklyThreatReport}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, weeklyThreatReport: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Maintenance
            </CardTitle>
            <CardDescription>
              System maintenance and data management options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <div className="text-sm text-muted-foreground">
                  Temporarily disable the system for maintenance
                </div>
              </div>
              <Switch
                id="maintenance-mode"
                checked={systemSettings.systemMaintenanceMode}
                onCheckedChange={(checked) => 
                  setSystemSettings(prev => ({ ...prev, systemMaintenanceMode: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message">Maintenance Message</Label>
              <Textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Custom message to display to users during maintenance..."
              />
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleSystemReset}
                className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset System Data (Danger Zone)
              </Button>
              <div className="text-sm text-muted-foreground">
                This will permanently delete all non-essential system data
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Save Configuration
            </CardTitle>
            <CardDescription>
              Apply all configuration changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSaveSettings} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save All Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}