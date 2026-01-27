import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Plus, 
  FileText,
  IndianRupee,
  RefreshCw,
  CreditCard,
  Receipt
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Namuna8Page() {
  const { t, language } = useLanguage();
  const { hasRole } = useAuth();
  const [demands, setDemands] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [saving, setSaving] = useState(false);

  const canEdit = hasRole(['super_admin', 'gramsevak', 'data_entry', 'talathi']);

  const currentYear = new Date().getFullYear();
  const financialYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`
  ];

  useEffect(() => {
    fetchData();
  }, [yearFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.append('financial_year', yearFilter);
      if (statusFilter) params.append('status', statusFilter);
      
      const [demandsRes, propertiesRes] = await Promise.all([
        axios.get(`${API}/demands?${params.toString()}`),
        axios.get(`${API}/properties`)
      ]);
      
      setDemands(demandsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDemand = async () => {
    if (!selectedPropertyId || !selectedYear) {
      toast.error(language === 'mr' ? 'कृपया मालमत्ता आणि वर्ष निवडा' : 'Please select property and year');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/demands`, {
        property_id: selectedPropertyId,
        financial_year: selectedYear
      });
      toast.success(t('demandGenerated'));
      setGenerateDialogOpen(false);
      setSelectedPropertyId('');
      setSelectedYear('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate demand');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentDialog = (demand) => {
    setSelectedDemand(demand);
    setPaymentAmount('');
    setPaymentMode('cash');
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error(language === 'mr' ? 'कृपया वैध रक्कम टाका' : 'Please enter valid amount');
      return;
    }

    if (amount > selectedDemand.balance) {
      toast.error(language === 'mr' ? 'रक्कम शिल्लकपेक्षा जास्त आहे' : 'Amount exceeds balance');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API}/demands/${selectedDemand.id}/payment?amount=${amount}&payment_mode=${paymentMode}`);
      toast.success(`${t('paymentRecorded')} - Receipt: ${response.data.receipt_no}`);
      setPaymentDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: 'status-badge-paid',
      pending: 'status-badge-pending',
      partial: 'status-badge-partial'
    };
    const labels = {
      paid: t('paid'),
      pending: t('pending'),
      partial: t('partial')
    };
    return (
      <span className={`status-badge ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Get properties without demand for selected year
  const availableProperties = properties.filter(p => 
    !demands.some(d => d.property_id === p.id && d.financial_year === selectedYear)
  );

  return (
    <div className="space-y-6" data-testid="namuna8-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('namuna8')}</h1>
          <p className="text-sm text-slate-500">
            {language === 'mr' ? 'कर मागणी व वसुली नोंदवही' : 'Tax Demand & Collection Register'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-demands">
            <RefreshCw size={16} className="mr-2" />
            {language === 'mr' ? 'ताजे करा' : 'Refresh'}
          </Button>
          {canEdit && (
            <Button 
              size="sm" 
              onClick={() => setGenerateDialogOpen(true)}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="generate-demand-btn"
            >
              <Plus size={16} className="mr-2" />
              {t('generateDemand')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger data-testid="year-filter">
                  <SelectValue placeholder={t('selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'mr' ? 'सर्व वर्षे' : 'All Years'}</SelectItem>
                  {financialYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="status-filter">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'mr' ? 'सर्व स्थिती' : 'All Status'}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="partial">{t('partial')}</SelectItem>
                  <SelectItem value="paid">{t('paid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="card-shadow bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">{t('totalDemand')}</p>
            <p className="text-xl font-bold text-blue-800 currency-display">
              {formatCurrency(demands.reduce((sum, d) => sum + d.net_demand, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">{t('totalCollection')}</p>
            <p className="text-xl font-bold text-green-800 currency-display">
              {formatCurrency(demands.reduce((sum, d) => sum + d.amount_paid, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{t('totalArrears')}</p>
            <p className="text-xl font-bold text-red-800 currency-display">
              {formatCurrency(demands.reduce((sum, d) => sum + d.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow bg-slate-50">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">{language === 'mr' ? 'एकूण नोंदी' : 'Total Records'}</p>
            <p className="text-xl font-bold text-slate-800">{demands.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Demand Table */}
      <Card className="card-shadow overflow-hidden">
        <CardHeader className="py-4 border-b bg-slate-50">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={18} className="text-[#003366]" />
            {t('demandRegister')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-container">
            <table className="gov-table" data-testid="demand-table">
              <thead>
                <tr>
                  <th className="sticky-col bg-slate-100">
                    <div className="bilingual-header">
                      <span>{t('houseNo')}</span>
                      <span className="mr">घर क्र.</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('ownerName')}</span>
                      <span className="mr">मालक</span>
                    </div>
                  </th>
                  <th>{t('financialYear')}</th>
                  <th className="text-right">{t('houseTax')}</th>
                  <th className="text-right">{t('waterTax')}</th>
                  <th className="text-right">{t('totalTax')}</th>
                  <th className="text-right">{t('arrears')}</th>
                  <th className="text-right">{t('netDemand')}</th>
                  <th className="text-right">{t('amountPaid')}</th>
                  <th className="text-right">{t('balance')}</th>
                  <th className="text-center">{t('status')}</th>
                  <th className="text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <div className="spinner" />
                        {t('loading')}
                      </div>
                    </td>
                  </tr>
                ) : demands.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12">
                      <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">{t('noData')}</p>
                    </td>
                  </tr>
                ) : (
                  demands.map((demand) => (
                    <tr key={demand.id} className="gov-table-row" data-testid={`demand-row-${demand.id}`}>
                      <td className="sticky-col bg-white font-medium">
                        {demand.property_details?.house_no || '-'}
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-sm">{demand.property_details?.owner_name || '-'}</p>
                          <p className="text-xs text-slate-500 font-marathi">
                            {demand.property_details?.owner_name_mr || ''}
                          </p>
                        </div>
                      </td>
                      <td className="text-center">{demand.financial_year}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(demand.house_tax)}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(demand.water_tax)}</td>
                      <td className="text-right font-mono text-sm font-medium">{formatCurrency(demand.total_tax)}</td>
                      <td className="text-right font-mono text-sm text-amber-600">{formatCurrency(demand.arrears)}</td>
                      <td className="text-right font-mono text-sm font-bold text-[#003366]">{formatCurrency(demand.net_demand)}</td>
                      <td className="text-right font-mono text-sm text-green-600">{formatCurrency(demand.amount_paid)}</td>
                      <td className="text-right font-mono text-sm font-bold text-red-600">{formatCurrency(demand.balance)}</td>
                      <td className="text-center">{getStatusBadge(demand.status)}</td>
                      <td className="text-center">
                        {canEdit && demand.balance > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openPaymentDialog(demand)}
                            className="text-xs"
                            data-testid={`pay-btn-${demand.id}`}
                          >
                            <CreditCard size={14} className="mr-1" />
                            {language === 'mr' ? 'भरणा' : 'Pay'}
                          </Button>
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

      {/* Generate Demand Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('generateDemand')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('financialYear')} *</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-demand-year">
                  <SelectValue placeholder={t('selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  {financialYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'mr' ? 'मालमत्ता निवडा' : 'Select Property'} *</Label>
              <Select 
                value={selectedPropertyId} 
                onValueChange={setSelectedPropertyId}
                disabled={!selectedYear}
              >
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder={language === 'mr' ? 'मालमत्ता निवडा' : 'Select Property'} />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.house_no} - {p.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedYear && availableProperties.length === 0 && (
                <p className="text-sm text-amber-600">
                  {language === 'mr' ? 'या वर्षासाठी सर्व मालमत्तांची मागणी तयार आहे' : 'All properties have demands for this year'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleGenerateDemand} 
              disabled={saving || !selectedPropertyId}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="confirm-generate-demand"
            >
              {saving ? (language === 'mr' ? 'तयार होत आहे...' : 'Generating...') : t('generateDemand')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="text-green-600" size={20} />
              {t('recordPayment')}
            </DialogTitle>
          </DialogHeader>
          {selectedDemand && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('ownerName')}:</span>
                  <span className="font-medium">{selectedDemand.property_details?.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('netDemand')}:</span>
                  <span className="font-bold">{formatCurrency(selectedDemand.net_demand)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('amountPaid')}:</span>
                  <span className="text-green-600">{formatCurrency(selectedDemand.amount_paid)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600 font-medium">{t('balance')}:</span>
                  <span className="font-bold text-red-600">{formatCurrency(selectedDemand.balance)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('paymentAmount')} *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max: ${selectedDemand.balance}`}
                  max={selectedDemand.balance}
                  data-testid="payment-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('paymentMode')}</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger data-testid="payment-mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('cash')}</SelectItem>
                    <SelectItem value="bank">{t('bank')}</SelectItem>
                    <SelectItem value="online">{t('online')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
              data-testid="confirm-payment-btn"
            >
              {saving ? (language === 'mr' ? 'नोंदवत आहे...' : 'Recording...') : t('recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
