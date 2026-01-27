import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  ClipboardList,
  RefreshCw,
  User,
  Building2,
  IndianRupee,
  FileText
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuditLogsPage() {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.append('entity_type', entityFilter);
      
      const response = await axios.get(`${API}/audit-logs?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (type) => {
    const icons = {
      property: Building2,
      demand: IndianRupee,
      tax_rate: FileText,
      user: User
    };
    const Icon = icons[type] || ClipboardList;
    return <Icon size={16} className="text-slate-500" />;
  };

  const getActionBadge = (action) => {
    const styles = {
      create: 'bg-green-100 text-green-700',
      update: 'bg-blue-100 text-blue-700',
      delete: 'bg-red-100 text-red-700',
      payment: 'bg-purple-100 text-purple-700',
      lock: 'bg-amber-100 text-amber-700',
      role_change: 'bg-pink-100 text-pink-700'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[action] || 'bg-slate-100 text-slate-700'}`}>
        {action}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('auditLogs')}</h1>
          <p className="text-sm text-slate-500">
            {language === 'mr' ? 'सर्व बदलांची नोंद' : 'Record of all system changes'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} data-testid="refresh-logs">
            <RefreshCw size={16} className="mr-2" />
            {language === 'mr' ? 'ताजे करा' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger data-testid="entity-filter">
                  <SelectValue placeholder={t('entityType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'mr' ? 'सर्व प्रकार' : 'All Types'}</SelectItem>
                  <SelectItem value="property">{language === 'mr' ? 'मालमत्ता' : 'Property'}</SelectItem>
                  <SelectItem value="demand">{language === 'mr' ? 'मागणी' : 'Demand'}</SelectItem>
                  <SelectItem value="tax_rate">{language === 'mr' ? 'कर दर' : 'Tax Rate'}</SelectItem>
                  <SelectItem value="user">{language === 'mr' ? 'वापरकर्ता' : 'User'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="card-shadow overflow-hidden">
        <CardHeader className="py-4 border-b bg-slate-50">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList size={18} className="text-[#003366]" />
            {t('auditTrail')}
            <span className="text-sm font-normal text-slate-500">
              ({logs.length} {language === 'mr' ? 'नोंदी' : 'records'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-container">
            <table className="gov-table" data-testid="audit-table">
              <thead>
                <tr>
                  <th>{t('timestamp')}</th>
                  <th>{t('entityType')}</th>
                  <th>{t('action')}</th>
                  <th>{t('user')}</th>
                  <th>{t('reason')}</th>
                  <th>{language === 'mr' ? 'तपशील' : 'Details'}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <div className="spinner" />
                        {t('loading')}
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">{t('noData')}</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="gov-table-row" data-testid={`log-row-${log.id}`}>
                      <td className="whitespace-nowrap text-sm">
                        {formatDate(log.timestamp)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getEntityIcon(log.entity_type)}
                          <span className="capitalize">{log.entity_type}</span>
                        </div>
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td className="text-sm">
                        <p className="font-medium">{log.user_name}</p>
                      </td>
                      <td className="text-sm text-slate-600 max-w-xs truncate">
                        {log.reason || '-'}
                      </td>
                      <td className="text-xs">
                        {log.new_value && (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:underline">
                              {language === 'mr' ? 'पहा' : 'View'}
                            </summary>
                            <pre className="mt-2 p-2 bg-slate-50 rounded text-xs overflow-auto max-w-xs max-h-32">
                              {JSON.stringify(log.new_value, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
