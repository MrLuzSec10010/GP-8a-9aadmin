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
  Calculator,
  Lock,
  RefreshCw,
  IndianRupee
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TaxEnginePage() {
  const { t, language } = useLanguage();
  const { hasRole } = useAuth();
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const financialYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`
  ];

  const [formData, setFormData] = useState({
    financial_year: `${currentYear}-${currentYear + 1}`,
    usage_type: 'residential',
    rate_per_sqm: '',
    water_tax_rate: '',
    light_tax_rate: '',
    cleaning_tax_rate: '',
    rebate_percent: '5',
    penalty_percent: '12',
    floor_factor: { "1": 1.0, "2": 1.1, "3": 1.2 },
    construction_factor: { "pucca": 1.0, "semi_pucca": 0.8, "kaccha": 0.6 }
  });

  const canEdit = hasRole(['super_admin', 'gramsevak']);

  useEffect(() => {
    fetchTaxRates();
  }, []);

  const fetchTaxRates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tax-rates`);
      setTaxRates(response.data);
    } catch (error) {
      toast.error('Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.rate_per_sqm) {
      toast.error(language === 'mr' ? 'कृपया दर टाका' : 'Please enter rate');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/tax-rates`, {
        ...formData,
        rate_per_sqm: parseFloat(formData.rate_per_sqm) || 0,
        water_tax_rate: parseFloat(formData.water_tax_rate) || 0,
        light_tax_rate: parseFloat(formData.light_tax_rate) || 0,
        cleaning_tax_rate: parseFloat(formData.cleaning_tax_rate) || 0,
        rebate_percent: parseFloat(formData.rebate_percent) || 0,
        penalty_percent: parseFloat(formData.penalty_percent) || 0
      });
      toast.success(language === 'mr' ? 'कर दर जोडला' : 'Tax rate added');
      setDialogOpen(false);
      fetchTaxRates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save tax rate');
    } finally {
      setSaving(false);
    }
  };

  const handleLockRate = async (rateId) => {
    if (!window.confirm(language === 'mr' ? 'हे लॉक केल्यानंतर बदलता येणार नाही. पुष्टी करा?' : 'This cannot be undone. Confirm lock?')) {
      return;
    }

    try {
      await axios.put(`${API}/tax-rates/${rateId}/lock`);
      toast.success(language === 'mr' ? 'वर्ष लॉक केले' : 'Year locked');
      fetchTaxRates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to lock');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getUsageLabel = (type) => {
    const labels = { residential: t('residential'), commercial: t('commercial'), mixed: t('mixed') };
    return labels[type] || type;
  };

  // Group tax rates by financial year
  const groupedRates = taxRates.reduce((acc, rate) => {
    if (!acc[rate.financial_year]) {
      acc[rate.financial_year] = [];
    }
    acc[rate.financial_year].push(rate);
    return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="tax-engine-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('taxEngine')}</h1>
          <p className="text-sm text-slate-500">
            {language === 'mr' ? 'कर दर संरचना व गणना' : 'Tax Rate Configuration & Calculation'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTaxRates} data-testid="refresh-rates">
            <RefreshCw size={16} className="mr-2" />
            {language === 'mr' ? 'ताजे करा' : 'Refresh'}
          </Button>
          {canEdit && (
            <Button 
              size="sm" 
              onClick={() => setDialogOpen(true)}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="add-rate-btn"
            >
              <Plus size={16} className="mr-2" />
              {t('addTaxRate')}
            </Button>
          )}
        </div>
      </div>

      {/* Tax Calculation Info */}
      <Card className="card-shadow bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calculator className="text-blue-600 mt-1" size={20} />
            <div>
              <p className="font-medium text-blue-800 mb-1">
                {language === 'mr' ? 'कर गणना सूत्र' : 'Tax Calculation Formula'}
              </p>
              <p className="text-sm text-blue-700">
                {language === 'mr' 
                  ? 'घरपट्टी = (बांधकाम क्षेत्र × दर × मजला गुणक × बांधकाम गुणक) + पाणीपट्टी + दिवाबत्ती कर + स्वच्छता कर'
                  : 'House Tax = (Built-up Area × Rate × Floor Factor × Construction Factor) + Water + Light + Cleaning Tax'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Rates by Year */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-500">{t('loading')}</p>
          </div>
        </div>
      ) : Object.keys(groupedRates).length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <IndianRupee className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {language === 'mr' ? 'कर दर उपलब्ध नाहीत' : 'No Tax Rates Available'}
            </h3>
            <p className="text-slate-500 mb-4">
              {language === 'mr' 
                ? 'कर गणनासाठी कर दर जोडा.'
                : 'Add tax rates to enable tax calculation.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedRates).sort((a, b) => b[0].localeCompare(a[0])).map(([year, rates]) => (
          <Card key={year} className="card-shadow" data-testid={`rate-card-${year}`}>
            <CardHeader className="py-4 border-b bg-slate-50">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <IndianRupee size={18} className="text-[#003366]" />
                  {language === 'mr' ? 'आर्थिक वर्ष' : 'Financial Year'}: {year}
                </span>
                {rates.some(r => r.is_locked) && (
                  <span className="flex items-center gap-1 text-sm text-amber-600">
                    <Lock size={14} />
                    {t('locked')}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="table-container">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>{t('usageType')}</th>
                      <th className="text-right">{t('ratePerSqm')}</th>
                      <th className="text-right">{t('waterTax')}</th>
                      <th className="text-right">{t('lightTax')}</th>
                      <th className="text-right">{t('cleaningTax')}</th>
                      <th className="text-right">{t('rebatePercent')}</th>
                      <th className="text-right">{t('penaltyPercent')}</th>
                      <th className="text-center">{t('status')}</th>
                      {canEdit && <th className="text-center">{t('actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map(rate => (
                      <tr key={rate.id} className="gov-table-row" data-testid={`rate-row-${rate.id}`}>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rate.usage_type === 'residential' ? 'bg-blue-100 text-blue-700' :
                            rate.usage_type === 'commercial' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {getUsageLabel(rate.usage_type)}
                          </span>
                        </td>
                        <td className="text-right font-mono">{formatCurrency(rate.rate_per_sqm)}</td>
                        <td className="text-right font-mono">{formatCurrency(rate.water_tax_rate)}</td>
                        <td className="text-right font-mono">{formatCurrency(rate.light_tax_rate)}</td>
                        <td className="text-right font-mono">{formatCurrency(rate.cleaning_tax_rate)}</td>
                        <td className="text-right font-mono text-green-600">{rate.rebate_percent}%</td>
                        <td className="text-right font-mono text-red-600">{rate.penalty_percent}%</td>
                        <td className="text-center">
                          {rate.is_locked ? (
                            <span className="text-amber-600 flex items-center justify-center gap-1">
                              <Lock size={14} />
                              {t('locked')}
                            </span>
                          ) : (
                            <span className="text-green-600">{language === 'mr' ? 'सक्रिय' : 'Active'}</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="text-center">
                            {!rate.is_locked && hasRole('super_admin') && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleLockRate(rate.id)}
                                className="text-amber-600 hover:text-amber-700"
                                data-testid={`lock-rate-${rate.id}`}
                              >
                                <Lock size={14} className="mr-1" />
                                {t('lockYear')}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Tax Rate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addTaxRate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('financialYear')}</Label>
                <Select value={formData.financial_year} onValueChange={(v) => handleInputChange('financial_year', v)}>
                  <SelectTrigger data-testid="select-fy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {financialYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('usageType')}</Label>
                <Select value={formData.usage_type} onValueChange={(v) => handleInputChange('usage_type', v)}>
                  <SelectTrigger data-testid="select-usage-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{t('residential')}</SelectItem>
                    <SelectItem value="commercial">{t('commercial')}</SelectItem>
                    <SelectItem value="mixed">{t('mixed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('ratePerSqm')} (₹) *</Label>
              <Input
                type="number"
                value={formData.rate_per_sqm}
                onChange={(e) => handleInputChange('rate_per_sqm', e.target.value)}
                placeholder="2.50"
                data-testid="input-rate"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('waterTax')} (₹)</Label>
                <Input
                  type="number"
                  value={formData.water_tax_rate}
                  onChange={(e) => handleInputChange('water_tax_rate', e.target.value)}
                  placeholder="500"
                  data-testid="input-water-rate"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('lightTax')} (₹)</Label>
                <Input
                  type="number"
                  value={formData.light_tax_rate}
                  onChange={(e) => handleInputChange('light_tax_rate', e.target.value)}
                  placeholder="300"
                  data-testid="input-light-rate"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('cleaningTax')} (₹)</Label>
                <Input
                  type="number"
                  value={formData.cleaning_tax_rate}
                  onChange={(e) => handleInputChange('cleaning_tax_rate', e.target.value)}
                  placeholder="200"
                  data-testid="input-cleaning-rate"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('rebatePercent')}</Label>
                <Input
                  type="number"
                  value={formData.rebate_percent}
                  onChange={(e) => handleInputChange('rebate_percent', e.target.value)}
                  placeholder="5"
                  data-testid="input-rebate"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('penaltyPercent')}</Label>
                <Input
                  type="number"
                  value={formData.penalty_percent}
                  onChange={(e) => handleInputChange('penalty_percent', e.target.value)}
                  placeholder="12"
                  data-testid="input-penalty"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="save-rate-btn"
            >
              {saving ? (language === 'mr' ? 'जतन होत आहे...' : 'Saving...') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
