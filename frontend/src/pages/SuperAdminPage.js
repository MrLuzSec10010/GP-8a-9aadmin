import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Building, Plus, RefreshCw, Users, Home, MapPin, Copy, Check,
  Eye, EyeOff, Key, Trash2, UserPlus, Shield, ChevronDown, ChevronUp,
  BarChart3, IndianRupee, AlertTriangle, Power, Settings, Mail,
  Phone, User, Edit, X, ToggleLeft, ToggleRight, CheckCircle2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ALL_MODULES = [
  { key: 'dashboard', label: 'Dashboard', labelMr: 'नियंत्रण कक्ष' },
  { key: 'namuna_9', label: 'Namuna 9 (Property Register)', labelMr: 'नमुना ९' },
  { key: 'namuna_8', label: 'Namuna 8 (Tax Demand)', labelMr: 'नमुना ८' },
  { key: 'tax_collection', label: 'Tax Collection', labelMr: 'कर वसुली' },
  { key: 'receipts', label: 'Receipts', labelMr: 'पावत्या' },
  { key: 'reports', label: 'Reports', labelMr: 'अहवाल' }
];

const ROLES = [
  { value: 'admin', label: 'Admin', color: '#dc2626' },
  { value: 'gramsevak', label: 'Gram Sevak', color: '#1d4ed8' },
  { value: 'accountant', label: 'Accountant', color: '#7c3aed' },
  { value: 'talathi', label: 'Talathi', color: '#0891b2' },
  { value: 'data_entry', label: 'Data Entry', color: '#15803d' },
  { value: 'auditor', label: 'Auditor', color: '#b45309' },
  { value: 'citizen', label: 'Citizen', color: '#64748b' }
];

// =============================================
// TAB: Super Admin Dashboard
// =============================================
function DashboardTab({ dashboardData, loading, language }) {
  const fmtCurrency = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;
  const stats = [
    { label: 'Total Gram Panchayats', labelMr: 'एकूण ग्रामपंचायती', value: dashboardData.total_gram_panchayats || 0, icon: Building, color: '#1d4ed8', bg: '#eff6ff' },
    { label: 'Active GPs', labelMr: 'सक्रिय ग्रापं', value: dashboardData.active_gram_panchayats || 0, icon: CheckCircle2, color: '#15803d', bg: '#f0fdf4' },
    { label: 'Total Users', labelMr: 'एकूण वापरकर्ते', value: dashboardData.total_users || 0, icon: Users, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Total Properties', labelMr: 'एकूण मालमत्ता', value: dashboardData.total_properties || 0, icon: Home, color: '#0891b2', bg: '#ecfeff' },
    { label: 'Total Tax Demand', labelMr: 'एकूण कर मागणी', value: fmtCurrency(dashboardData.total_demand), icon: IndianRupee, color: '#1e40af', bg: '#eff6ff', isCurrency: true },
    { label: 'Total Collection', labelMr: 'एकूण वसुली', value: fmtCurrency(dashboardData.total_collection), icon: BarChart3, color: '#15803d', bg: '#f0fdf4', isCurrency: true },
    { label: 'Pending Tax', labelMr: 'थकबाकी', value: fmtCurrency(dashboardData.pending_tax), icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', isCurrency: true }
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}><p style={{ color: '#94a3b8' }}>Loading dashboard...</p></div>;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="card-shadow" style={{ overflow: 'hidden' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div style={{ background: s.bg, padding: '10px', borderRadius: '10px', flexShrink: 0 }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                      {language === 'mr' ? s.labelMr : s.label}
                    </p>
                    <p style={{ fontSize: s.isCurrency ? '18px' : '22px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-GP Overview Table */}
      {(dashboardData.gram_panchayats || []).length > 0 && (
        <Card className="card-shadow">
          <CardHeader className="py-3 border-b bg-slate-50">
            <CardTitle className="text-sm">{language === 'mr' ? 'ग्रामपंचायतनिहाय सारांश' : 'Per Gram Panchayat Summary'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={thStyle}>GP Name</th>
                    <th style={thStyle}>Village</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Users</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Properties</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Demand</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Collection</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboardData.gram_panchayats || []).map((gp) => (
                    <tr key={gp._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{gp.name}</td>
                      <td style={tdStyle}>{gp.village}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                          background: gp.is_active ? '#dcfce7' : '#fee2e2', color: gp.is_active ? '#166534' : '#991b1b'
                        }}>
                          {gp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{gp.user_count || 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{gp.property_count || 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCurrency(gp.total_demand)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#15803d' }}>{fmtCurrency(gp.total_collection)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{fmtCurrency(gp.pending_tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const thStyle = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', color: '#334155', whiteSpace: 'nowrap' };

// =============================================
// TAB: GP Management
// =============================================
function GPManagementTab({ gramPanchayats, loading, language, onRefresh,
  onCreateGP, onEditGP, onToggleStatus, onDeleteGP, onManageModules, onViewDetails,
  onResetPassword
}) {
  const [expandedGP, setExpandedGP] = useState(null);
  const [gpUsers, setGpUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const toggleExpand = async (gpId) => {
    if (expandedGP === gpId) { setExpandedGP(null); return; }
    setExpandedGP(gpId);
    setLoadingUsers(true);
    try {
      const res = await axios.get(`${API}/gram-panchayats/${gpId}/users`);
      setGpUsers(res.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoadingUsers(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-sm text-slate-500">
          {gramPanchayats.length} {language === 'mr' ? 'ग्रामपंचायती नोंदणीकृत' : 'Gram Panchayats registered'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw size={14} className="mr-1" /> Refresh</Button>
          <Button size="sm" onClick={onCreateGP} className="bg-[#003366] hover:bg-[#002244]">
            <Plus size={14} className="mr-1" /> {language === 'mr' ? 'नवी ग्रामपंचायत' : 'Add Gram Panchayat'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}><p style={{ color: '#94a3b8' }}>Loading...</p></div>
      ) : gramPanchayats.length === 0 ? (
        <Card className="card-shadow"><CardContent className="py-16 text-center">
          <Building size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: '#475569' }}>No Gram Panchayats yet</p>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Click "Add Gram Panchayat" to onboard the first one.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {gramPanchayats.map((gp) => (
            <Card key={gp._id} className="card-shadow overflow-hidden" style={{ border: !gp.is_active ? '1px solid #fecaca' : undefined, opacity: !gp.is_active ? 0.75 : 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Main Row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: gp.is_active ? 'linear-gradient(135deg,#003366,#0055a5)' : '#94a3b8',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18
                  }}>
                    {gp.name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{gp.name}</p>
                      <span style={{
                        padding: '1px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                        background: gp.is_active ? '#dcfce7' : '#fee2e2', color: gp.is_active ? '#166534' : '#991b1b'
                      }}>
                        {gp.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>
                      <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                      {gp.village}, {gp.taluka}, {gp.district}{gp.state ? `, ${gp.state}` : ''}
                    </p>
                    {(gp.contact_person || gp.mobile || gp.email) && (
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>
                        {gp.contact_person && <><User size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {gp.contact_person} &nbsp;</>}
                        {gp.mobile && <><Phone size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {gp.mobile} &nbsp;</>}
                        {gp.email && <><Mail size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {gp.email}</>}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                    {[
                      { v: gp.user_count || 0, l: 'Users', c: '#1d4ed8' },
                      { v: gp.property_count || 0, l: 'Properties', c: '#15803d' },
                      { v: `₹${(gp.total_collection || 0).toLocaleString('en-IN')}`, l: 'Collected', c: '#15803d' },
                      { v: `₹${(gp.pending_tax || 0).toLocaleString('en-IN')}`, l: 'Pending', c: '#dc2626' }
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center', minWidth: 60 }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</p>
                        <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <ActionBtn icon={Edit} title="Edit" onClick={() => onEditGP(gp)} color="#475569" />
                    <ActionBtn icon={Settings} title="Modules" onClick={() => onManageModules(gp)} color="#7c3aed" />
                    <ActionBtn
                      icon={gp.is_active ? ToggleRight : ToggleLeft}
                      title={gp.is_active ? 'Deactivate' : 'Activate'}
                      onClick={() => onToggleStatus(gp._id, !gp.is_active)}
                      color={gp.is_active ? '#15803d' : '#dc2626'}
                    />
                    <ActionBtn icon={Trash2} title="Delete" onClick={() => onDeleteGP(gp._id, gp.name)} color="#dc2626" borderColor="#fecaca" />
                    <button
                      onClick={() => toggleExpand(gp._id)}
                      style={{ padding: 6, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {expandedGP === gp._id ? <ChevronUp size={14} style={{ color: '#94a3b8' }} /> : <ChevronDown size={14} style={{ color: '#94a3b8' }} />}
                    </button>
                  </div>
                </div>

                {/* Expanded: Users */}
                {expandedGP === gp._id && (
                  <div style={{ background: '#f8fafc', padding: '12px 20px 16px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                      <Users size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> Users in this GP
                    </p>
                    {loadingUsers ? <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</p> : gpUsers.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: 13 }}>No users assigned.</p>
                    ) : (
                      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={thStyle}>Name</th><th style={thStyle}>Username</th><th style={thStyle}>Phone</th><th style={thStyle}>Role</th><th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gpUsers.map(u => (
                              <tr key={u._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ ...tdStyle, fontWeight: 500 }}>{u.name}</td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#6366f1' }}>{u.username || '—'}</td>
                                <td style={tdStyle}>{u.phone || '—'}</td>
                                <td style={tdStyle}><RoleBadge role={u.role} /></td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                  {u.username && (
                                    <button onClick={() => onResetPassword(u._id, u.name)} style={miniBtn}>
                                      <Key size={11} /> Reset Password
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// Small Reusable UI Components
// =============================================
function ActionBtn({ icon: Icon, title, onClick, color, borderColor }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: 6, borderRadius: 6, border: `1px solid ${borderColor || '#e2e8f0'}`,
      background: '#fff', cursor: 'pointer', color, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon size={14} />
    </button>
  );
}

function RoleBadge({ role }) {
  const r = ROLES.find(r => r.value === role) || { label: role, color: '#64748b' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${r.color}15`, color: r.color }}>
      {r.label}
    </span>
  );
}

const miniBtn = {
  padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', fontSize: 11, color: '#b45309',
  fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4
};

// =============================================
// MAIN COMPONENT
// =============================================
export default function SuperAdminPage() {
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data
  const [dashboardData, setDashboardData] = useState({});
  const [gramPanchayats, setGramPanchayats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Form states
  const emptyForm = { name: '', village: '', taluka: '', district: '', state: 'Maharashtra', contact_person: '', mobile: '', email: '', admin_name: '', admin_phone: '' };
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editFormData, setEditFormData] = useState({});
  const [selectedGP, setSelectedGP] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [resetCredentials, setResetCredentials] = useState(null);
  const [moduleGP, setModuleGP] = useState(null);
  const [moduleSelection, setModuleSelection] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // ==================== Data Fetching ====================
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/super-admin/dashboard`);
      setDashboardData(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchGPs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/gram-panchayats`);
      setGramPanchayats(res.data);
    } catch { toast.error('Failed to load Gram Panchayats'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!hasRole('super_admin')) return;
    fetchDashboard();
    fetchGPs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = () => { fetchDashboard(); fetchGPs(); };

  // ==================== Handlers ====================
  const handleCreateGP = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.village || !formData.taluka || !formData.district) return toast.error('Fill all required fields');
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/gram-panchayats`, formData);
      setCredentials({
        gp_name: res.data.gram_panchayat.name,
        admin_name: res.data.admin_user.name,
        username: res.data.credentials.username,
        password: res.data.credentials.password
      });
      setCredentialsDialogOpen(true);
      setAddDialogOpen(false);
      setFormData({ ...emptyForm });
      toast.success('Gram Panchayat created!');
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create'); }
    finally { setSubmitting(false); }
  };

  const openEditDialog = (gp) => {
    setEditFormData({
      _id: gp._id, name: gp.name, village: gp.village, taluka: gp.taluka,
      district: gp.district, state: gp.state || 'Maharashtra',
      contact_person: gp.contact_person || '', mobile: gp.mobile || '', email: gp.email || ''
    });
    setEditDialogOpen(true);
  };

  const handleEditGP = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.put(`${API}/gram-panchayats/${editFormData._id}`, editFormData);
      setEditDialogOpen(false);
      toast.success('Gram Panchayat updated!');
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update'); }
    finally { setSubmitting(false); }
  };

  const handleToggleStatus = async (gpId, newStatus) => {
    try {
      await axios.patch(`${API}/gram-panchayats/${gpId}/status`, { is_active: newStatus });
      toast.success(newStatus ? 'Gram Panchayat Activated' : 'Gram Panchayat Deactivated');
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDeleteGP = async (gpId, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/gram-panchayats/${gpId}`);
      toast.success('Deleted');
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
  };

  const openModulesDialog = (gp) => {
    setModuleGP(gp);
    setModuleSelection(gp.enabled_modules || ALL_MODULES.map(m => m.key));
    setModulesDialogOpen(true);
  };

  const toggleModule = (key) => {
    setModuleSelection(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSaveModules = async () => {
    setSubmitting(true);
    try {
      await axios.patch(`${API}/gram-panchayats/${moduleGP._id}/modules`, { enabled_modules: moduleSelection });
      setModulesDialogOpen(false);
      toast.success('Module permissions updated');
      refreshAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleResetPassword = async (userId, userName) => {
    if (!window.confirm(`Reset password for "${userName}"?`)) return;
    try {
      const res = await axios.post(`${API}/auth/reset-password/${userId}`);
      setResetCredentials(res.data.credentials);
      setResetDialogOpen(true);
      toast.success('Password reset!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied!');
  };

  // ==================== Access Guard ====================
  if (!hasRole('super_admin')) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <Shield size={48} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Access Denied</h2>
        <p style={{ color: '#64748b', marginTop: 8 }}>Only Super Admin can access this page.</p>
      </div>
    );
  }

  // ==================== Tab Definitions ====================
  const tabs = [
    { key: 'dashboard', label: language === 'mr' ? 'डॅशबोर्ड' : 'Dashboard', icon: BarChart3 },
    { key: 'gram_panchayats', label: language === 'mr' ? 'ग्रामपंचायती' : 'Gram Panchayats', icon: Building }
  ];

  // ==================== Render ====================
  return (
    <div className="space-y-5" data-testid="super-admin-page">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {language === 'mr' ? 'सुपर अॅडमिन पॅनल' : 'Super Admin Panel'}
        </h1>
        <p className="text-sm text-slate-500">
          {language === 'mr' ? 'सर्व ग्रामपंचायती व्यवस्थापित करा' : 'Manage all Gram Panchayats across the platform'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 10, padding: 3, width: 'fit-content' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                background: isActive ? '#003366' : 'transparent',
                color: isActive ? '#fff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardTab dashboardData={dashboardData} loading={loading} language={language} />
      )}

      {activeTab === 'gram_panchayats' && (
        <GPManagementTab
          gramPanchayats={gramPanchayats}
          loading={loading}
          language={language}
          onRefresh={refreshAll}
          onCreateGP={() => setAddDialogOpen(true)}
          onEditGP={openEditDialog}
          onToggleStatus={handleToggleStatus}
          onDeleteGP={handleDeleteGP}
          onManageModules={openModulesDialog}
          onViewDetails={() => {}}
          onResetPassword={handleResetPassword}
        />
      )}

      {/* ===== ADD GP DIALOG ===== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building size={20} className="text-[#003366]" />
              {language === 'mr' ? 'नवी ग्रामपंचायत जोडा' : 'Add New Gram Panchayat'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGP}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
              <FormField label="Gram Panchayat Name" required value={formData.name} onChange={v => setFormData(p => ({ ...p, name: v }))} placeholder="e.g. ग्रामपंचायत शिवणे" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Village" required value={formData.village} onChange={v => setFormData(p => ({ ...p, village: v }))} placeholder="e.g. शिवणे" />
                <FormField label="Taluka" required value={formData.taluka} onChange={v => setFormData(p => ({ ...p, taluka: v }))} placeholder="e.g. हवेली" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="District" required value={formData.district} onChange={v => setFormData(p => ({ ...p, district: v }))} placeholder="e.g. पुणे" />
                <FormField label="State" value={formData.state} onChange={v => setFormData(p => ({ ...p, state: v }))} placeholder="Maharashtra" />
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} /> Contact Information
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Contact Person" value={formData.contact_person} onChange={v => setFormData(p => ({ ...p, contact_person: v }))} placeholder="Name" />
                  <FormField label="Mobile" value={formData.mobile} onChange={v => setFormData(p => ({ ...p, mobile: v }))} placeholder="10-digit mobile" />
                </div>
                <FormField label="Email" value={formData.email} onChange={v => setFormData(p => ({ ...p, email: v }))} placeholder="email@example.com" style={{ marginTop: 12 }} />
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={14} /> Admin Login Details (Optional Override)
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Admin Name" value={formData.admin_name} onChange={v => setFormData(p => ({ ...p, admin_name: v }))} placeholder="Admin name" />
                  <FormField label="Admin Phone" value={formData.admin_phone} onChange={v => setFormData(p => ({ ...p, admin_phone: v }))} placeholder="Phone" />
                </div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, fontSize: 12, color: '#1e40af' }}>
                <strong>Note:</strong> Login credentials (username &amp; password) will be auto-generated. The GP Admin role will be created automatically.
              </div>
            </div>
            <DialogFooter style={{ marginTop: 16 }}>
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-[#003366] hover:bg-[#002244]">
                {submitting ? 'Creating...' : 'Create & Generate Credentials'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT GP DIALOG ===== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit size={18} className="text-[#003366]" /> Edit Gram Panchayat
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditGP}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
              <FormField label="Gram Panchayat Name" required value={editFormData.name || ''} onChange={v => setEditFormData(p => ({ ...p, name: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Village" required value={editFormData.village || ''} onChange={v => setEditFormData(p => ({ ...p, village: v }))} />
                <FormField label="Taluka" required value={editFormData.taluka || ''} onChange={v => setEditFormData(p => ({ ...p, taluka: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="District" required value={editFormData.district || ''} onChange={v => setEditFormData(p => ({ ...p, district: v }))} />
                <FormField label="State" value={editFormData.state || ''} onChange={v => setEditFormData(p => ({ ...p, state: v }))} />
              </div>
              <FormField label="Contact Person" value={editFormData.contact_person || ''} onChange={v => setEditFormData(p => ({ ...p, contact_person: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Mobile" value={editFormData.mobile || ''} onChange={v => setEditFormData(p => ({ ...p, mobile: v }))} />
                <FormField label="Email" value={editFormData.email || ''} onChange={v => setEditFormData(p => ({ ...p, email: v }))} />
              </div>
            </div>
            <DialogFooter style={{ marginTop: 16 }}>
              <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-[#003366] hover:bg-[#002244]">
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== CREDENTIALS DIALOG ===== */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d' }}>
              <Check size={20} /> Gram Panchayat Created!
            </DialogTitle>
          </DialogHeader>
          {credentials && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>🏛️ {credentials.gp_name}</p>
                <p style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>Admin: {credentials.admin_name}</p>
              </div>
              <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, color: '#fff' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, fontWeight: 600 }}>🔐 Login Credentials</p>
                <CredentialRow label="Username" value={credentials.username} field="u" copiedField={copiedField} onCopy={copyToClipboard} color="#38bdf8" />
                <CredentialRow label="Password" value={credentials.password} field="p" copiedField={copiedField} onCopy={copyToClipboard} color="#fbbf24" showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, fontSize: 12, color: '#92400e', marginTop: 14 }}>
                ⚠️ <strong>Important:</strong> Save these credentials now! The password will not be shown again.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => credentials && copyToClipboard(`Username: ${credentials.username}\nPassword: ${credentials.password}`, 'all')}>
              <Copy size={14} className="mr-2" /> Copy All
            </Button>
            <Button onClick={() => { setCredentialsDialogOpen(false); setShowPassword(false); }} className="bg-[#003366] hover:bg-[#002244]">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MODULE PERMISSIONS DIALOG ===== */}
      <Dialog open={modulesDialogOpen} onOpenChange={setModulesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} className="text-[#003366]" />
              Module Permissions
              {moduleGP && <span style={{ fontWeight: 400, fontSize: 13, color: '#64748b' }}>— {moduleGP.name}</span>}
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Enable or disable modules for this Gram Panchayat:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALL_MODULES.map(mod => {
                const isOn = moduleSelection.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${isOn ? '#a5d8ff' : '#e2e8f0'}`,
                      background: isOn ? '#eff6ff' : '#fff'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: isOn ? '#1e40af' : '#475569' }}>{mod.label}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8' }}>{mod.labelMr}</p>
                    </div>
                    <div style={{
                      width: 40, height: 22, borderRadius: 12, padding: 2, cursor: 'pointer', transition: 'all 0.2s',
                      background: isOn ? '#003366' : '#d1d5db',
                      display: 'flex', alignItems: 'center', justifyContent: isOn ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModulesDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveModules} disabled={submitting} className="bg-[#003366] hover:bg-[#002244]">
              {submitting ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== RESET PASSWORD DIALOG ===== */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={18} className="text-[#003366]" /> Password Reset
            </DialogTitle>
          </DialogHeader>
          {resetCredentials && (
            <div>
              <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, color: '#fff' }}>
                <CredentialRow label="Username" value={resetCredentials.username} field="ru" copiedField={copiedField} onCopy={copyToClipboard} color="#38bdf8" />
                <CredentialRow label="New Password" value={resetCredentials.password} field="rp" copiedField={copiedField} onCopy={copyToClipboard} color="#fbbf24" />
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 12, color: '#92400e', marginTop: 12 }}>
                ⚠️ Share this new password securely with the user.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetDialogOpen(false)} className="bg-[#003366] hover:bg-[#002244]">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================
// Form Field Component
// =============================================
function FormField({ label, required, value, onChange, placeholder, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        required={required}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none' }}
      />
    </div>
  );
}

// =============================================
// Credential Row Component
// =============================================
function CredentialRow({ label, value, field, copiedField, onCopy, color, showPassword, onTogglePassword }) {
  const display = onTogglePassword !== undefined ? (showPassword ? value : '••••••••••') : value;
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#334155', borderRadius: 6, padding: '10px 12px' }}>
        <code style={{ flex: 1, fontSize: 15, fontWeight: 600, color, letterSpacing: '0.5px' }}>{display}</code>
        {onTogglePassword && (
          <button onClick={onTogglePassword} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        <button onClick={() => onCopy(value, field)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedField === field ? '#4ade80' : '#94a3b8', padding: 2 }}>
          {copiedField === field ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
