import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileText, Search, User, Mail, AlertTriangle, Shield, Eye } from 'lucide-react';

export default function AdminAudit() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('7d');

  const { data: auditLog, isLoading } = useQuery({
    queryKey: ['admin-audit-log', actionFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_log')
        .select(`
          *,
          profiles (username)
        `)
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      // Date filtering
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter.replace('d', ''));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data;
    }
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'block_email': return <Shield className="h-4 w-4 text-red-500" />;
      case 'unblock_email': return <Shield className="h-4 w-4 text-green-500" />;
      case 'review_alert': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'classify_spam': return <Mail className="h-4 w-4 text-yellow-500" />;
      case 'view_user_data': return <Eye className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'block_email': return 'destructive';
      case 'unblock_email': return 'default';
      case 'review_alert': return 'secondary';
      default: return 'outline';
    }
  };

  const getTargetTypeIcon = (targetType: string) => {
    switch (targetType) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'user': return <User className="h-3 w-3" />;
      case 'alert': return <AlertTriangle className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const filteredAuditLog = auditLog?.filter(log => 
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target_type.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatActionDetails = (details: any) => {
    if (!details) return 'No details';
    if (typeof details === 'string') return details;
    
    const summary = [];
    if (details.block_reason) summary.push(`Reason: ${details.block_reason}`);
    if (details.status) summary.push(`Status: ${details.status}`);
    if (details.admin_action) summary.push(`Action: ${details.admin_action}`);
    
    return summary.join(' | ') || JSON.stringify(details);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">
          Complete trail of all administrative actions and system events
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLog?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Email Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLog?.filter(log => log.action_type === 'block_email').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Security actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alert Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLog?.filter(log => log.action_type === 'review_alert').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">User reports handled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLog?.filter(log => {
                const today = new Date();
                const logDate = new Date(log.created_at);
                return logDate.toDateString() === today.toDateString();
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="block_email">Block Email</SelectItem>
                <SelectItem value="unblock_email">Unblock Email</SelectItem>
                <SelectItem value="review_alert">Review Alert</SelectItem>
                <SelectItem value="classify_spam">Classify Spam</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1d">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground self-center">
              {filteredAuditLog.length} entries found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative Actions</CardTitle>
          <CardDescription>
            Detailed log of all administrative actions performed on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading audit log...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLog.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {log.profiles?.username || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          <Badge variant={getActionBadgeVariant(log.action_type)}>
                            {log.action_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTargetTypeIcon(log.target_type)}
                          <span className="capitalize">{log.target_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate text-sm text-muted-foreground" title={formatActionDetails(log.action_details)}>
                          {formatActionDetails(log.action_details)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(log.created_at).toLocaleDateString()}
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
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