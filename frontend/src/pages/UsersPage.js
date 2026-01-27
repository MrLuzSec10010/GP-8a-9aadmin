import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Users,
  RefreshCw,
  Shield,
  Phone
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', labelMr: 'सुपर अॅडमिन' },
  { value: 'talathi', label: 'Talathi', labelMr: 'तलाठी' },
  { value: 'gramsevak', label: 'Gramsevak', labelMr: 'ग्रामसेवक' },
  { value: 'data_entry', label: 'Data Entry Operator', labelMr: 'डेटा एंट्री ऑपरेटर' },
  { value: 'auditor', label: 'Auditor', labelMr: 'लेखापरीक्षक' },
  { value: 'citizen', label: 'Citizen', labelMr: 'नागरिक' }
];

export default function UsersPage() {
  const { t, language } = useLanguage();
  const { hasRole, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  const canChangeRole = hasRole('super_admin');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedRole) return;

    try {
      await axios.put(`${API}/users/${selectedUser.id}/role?role=${selectedRole}`);
      toast.success(language === 'mr' ? 'भूमिका बदलली' : 'Role updated');
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const getRoleLabel = (role) => {
    const roleObj = ROLES.find(r => r.value === role);
    return language === 'mr' ? roleObj?.labelMr : roleObj?.label || role;
  };

  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-red-100 text-red-700',
      talathi: 'bg-purple-100 text-purple-700',
      gramsevak: 'bg-blue-100 text-blue-700',
      data_entry: 'bg-green-100 text-green-700',
      auditor: 'bg-amber-100 text-amber-700',
      citizen: 'bg-slate-100 text-slate-700'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[role] || styles.citizen}`}>
        {getRoleLabel(role)}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('users')}</h1>
          <p className="text-sm text-slate-500">
            {language === 'mr' ? 'वापरकर्ता व्यवस्थापन' : 'User Management'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} data-testid="refresh-users">
          <RefreshCw size={16} className="mr-2" />
          {language === 'mr' ? 'ताजे करा' : 'Refresh'}
        </Button>
      </div>

      {/* Role Info */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="text-[#003366] mt-1" size={20} />
            <div>
              <p className="font-medium text-slate-800 mb-1">
                {language === 'mr' ? 'भूमिका व अधिकार' : 'Roles & Permissions'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLES.map(role => (
                  <span key={role.value} className={`px-2 py-1 rounded text-xs font-medium ${
                    role.value === 'super_admin' ? 'bg-red-100 text-red-700' :
                    role.value === 'gramsevak' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {language === 'mr' ? role.labelMr : role.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="card-shadow overflow-hidden">
        <CardHeader className="py-4 border-b bg-slate-50">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={18} className="text-[#003366]" />
            {language === 'mr' ? 'वापरकर्ते' : 'Users'}
            <span className="text-sm font-normal text-slate-500">
              ({users.length} {language === 'mr' ? 'नोंदी' : 'records'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-container">
            <table className="gov-table" data-testid="users-table">
              <thead>
                <tr>
                  <th>{language === 'mr' ? 'नाव' : 'Name'}</th>
                  <th>{t('phoneNumber')}</th>
                  <th>{language === 'mr' ? 'भूमिका' : 'Role'}</th>
                  <th>{language === 'mr' ? 'गाव' : 'Village'}</th>
                  <th>{language === 'mr' ? 'नोंदणी तारीख' : 'Registered'}</th>
                  {canChangeRole && <th className="text-center">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canChangeRole ? 6 : 5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <div className="spinner" />
                        {t('loading')}
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={canChangeRole ? 6 : 5} className="text-center py-12">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">{t('noData')}</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="gov-table-row" data-testid={`user-row-${user.id}`}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="text-xs text-green-600">(You)</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={14} className="text-slate-400" />
                          {user.phone}
                        </div>
                      </td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td className="text-sm">{user.village || '-'}</td>
                      <td className="text-sm">{formatDate(user.created_at)}</td>
                      {canChangeRole && (
                        <td className="text-center">
                          {user.id !== currentUser?.id && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openRoleDialog(user)}
                              data-testid={`change-role-${user.id}`}
                            >
                              <Shield size={14} className="mr-1" />
                              {language === 'mr' ? 'भूमिका बदला' : 'Change Role'}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'mr' ? 'भूमिका बदला' : 'Change Role'}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">{language === 'mr' ? 'वापरकर्ता' : 'User'}</p>
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-slate-500">{selectedUser.phone}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'mr' ? 'नवीन भूमिका' : 'New Role'}
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {language === 'mr' ? role.labelMr : role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleRoleChange}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="confirm-role-change"
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
