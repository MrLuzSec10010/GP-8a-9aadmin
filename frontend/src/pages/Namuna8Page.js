import React, { useState, useEffect, useCallback } from 'react';
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
  Receipt,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Namuna8Page() {
  const { t, language } = useLanguage();
  const { hasRole } = useAuth();
  const [demands, setDemands] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [saving, setSaving] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDemand, setPreviewDemand] = useState(null);

  const canEdit = hasRole(['super_admin', 'gramsevak', 'data_entry', 'talathi']);

  const currentYear = new Date().getFullYear();
  const financialYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter && yearFilter !== 'all') params.append('financial_year', yearFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const [demandsRes, propertiesRes] = await Promise.all([
        axios.get(`${API}/demand/list?${params.toString()}`),
        axios.get(`${API}/property/list`)
      ]);

      setDemands(demandsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [yearFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateDemand = async () => {
    if (!selectedYear) {
      toast.error(language === 'mr' ? 'कृपया वर्ष निवडा' : 'Please select a year');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API}/demand/generate`, {
        financial_year: selectedYear
      });
      toast.success(
        language === 'mr'
          ? `${response.data.generated_count} नवीन मागण्या तयार केल्या (वगळलेल्या: ${response.data.skipped_count})`
          : `Generated ${response.data.generated_count} demands (Skipped: ${response.data.skipped_count})`
      );
      setGenerateDialogOpen(false);
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
      const response = await axios.post(`${API}/payment/pay`, {
        demand_id: selectedDemand.id, // Use demand ID
        amount_paid: amount,
        payment_mode: paymentMode
      });
      toast.success(`${t('paymentRecorded')} - Receipt: ${response.data.receipt_no}`);
      setPaymentDialogOpen(false);

      const receiptToSave = {
        ...response.data.receipt_details,
        receipt_no: response.data.receipt_no
      };
      setGeneratedReceipt(receiptToSave);
      setShowReceiptDialog(true);

      // Auto-generate PDF download as requested
      downloadReceiptPDF(receiptToSave);

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
    const s = status === 'unpaid' ? 'pending' : status;
    const styles = {
      paid: 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium',
      pending: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium',
      partial: 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium'
    };
    return (
      <span className={styles[s] || styles.pending}>
        {t(s)}
      </span>
    );
  };

  // Get properties without demand for selected year
  const availableProperties = properties.filter(p => {
    const pId = p._id || p.id;
    return !demands.some(d => {
      const dpId = d.property?._id || d.property;
      return dpId === pId && d.financial_year === selectedYear;
    });
  });

  const exportToPDF = (singleDemand = null) => {
    try {
      const doc = new jsPDF('landscape');
      const dataSource = singleDemand ? [singleDemand] : demands;
      const fy = singleDemand ? singleDemand.financial_year : (yearFilter !== 'all' ? yearFilter : financialYears[0]);

      // Header Section
      doc.setFontSize(10);
      doc.text("नमुना ८", 148, 10, { align: "center" });
      doc.text("नियम ३३ (१)", 148, 15, { align: "center" });

      doc.setFontSize(14);
      doc.text(`सन ${fy} या वर्षासाठी कर आकारणी नोंदवही`, 148, 25, { align: "center" });
      doc.text("(Tax Assessment & Demand Register)", 148, 32, { align: "center" });

      doc.setFontSize(11);
      const village = properties[0]?.village || "शिवणे";
      const taluka = properties[0]?.taluka || "हवेली";
      const district = properties[0]?.district || "पुणे";
      doc.text(`गाव: ${village} ग्रामपंचायत: ${village} ता: ${taluka} जि: ${district}`, 148, 40, { align: "center" });

      const tableColumnEn = [
        "Sr.No", "Prop ID", "Owner", "Occupier", "Desc.", "Year", "Area", "Rate", "Area", "Ded.", "Cap.Val", "Ann.Val", "Tax%", "House", "Light", "Health", "Water", "Total", "Rem."
      ];

      const tableRows = dataSource.map((demand, index) => {
        const prop = demand.property || demand.property_details || {};
        return [
          index + 1,
          prop.house_no || '-',
          prop.owner_name_mr || prop.owner_name || '-',
          prop.occupier_name || '-',
          `${prop.construction_type || ''} ${prop.usage_type || ''}`,
          prop.construction_year || '-',
          prop.built_up_area_sqm || 0,
          "2.00",
          prop.built_up_area_sqm || 0,
          "10%",
          (demand.house_tax * 12.5).toFixed(0), // Mocked Cap Val
          (demand.house_tax).toFixed(2),
          "0.5%",
          (demand.house_tax || 0).toFixed(2),
          "0.00",
          "0.00",
          (demand.water_tax || 0).toFixed(2),
          (demand.total_tax || 0).toFixed(2),
          ""
        ];
      });

      // Mapping numbers row (1-19) as shown in image
      const numbersRow = Array.from({ length: 19 }, (_, i) => (i + 1).toString());

      autoTable(doc, {
        head: [tableColumnEn, numbersRow],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 1, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, lineWidth: 0.1 },
        columnStyles: {
          2: { halign: 'left', cellWidth: 35 },
          3: { halign: 'left', cellWidth: 25 },
        },
        margin: { left: 10, right: 10 }
      });

      const finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(10);
      doc.text("शिक्का (Stamp)", 40, finalY);
      doc.text("ग्राम सेवक (Gram Sevak)", 140, finalY);
      doc.text("तारीख (Date): ________", 240, finalY);

      const fileName = singleDemand ? `Namuna8_${singleDemand.property?.property_id || singleDemand.property_id}.pdf` : `Namuna_8_Register_${Date.now()}.pdf`;
      doc.save(fileName);
      toast.success(language === 'mr' ? 'पीडीएफ डाउनलोड झाले' : "PDF Downloaded!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const openPreviewDialog = (demand) => {
    setPreviewDemand(demand);
    setPreviewDialogOpen(true);
  };

  const downloadReceiptPDF = (receipt) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`${receipt.village} ग्रामपंचायत (Receipt)`, 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`ता: ${receipt.taluka}, जि: ${receipt.district}`, 105, 28, { align: "center" });
      doc.text("नमुना नंबर १० - कर पावती", 105, 38, { align: "center" });

      doc.line(20, 42, 190, 42);

      doc.text(`पावती क्र: ${receipt.receipt_no}`, 20, 52);
      doc.text(`दिनांक: ${receipt.date}`, 150, 52);
      doc.text(`मालमत्ता क्र: ${receipt.property_id}`, 20, 62);
      doc.text(`आर्थिक वर्ष: ${receipt.financial_year}`, 150, 62);

      doc.text(`श्री/श्रीमती: ${receipt.owner_name_mr || receipt.owner_name}`, 20, 75);

      autoTable(doc, {
        startY: 85,
        head: [['तपशील (Description)', 'रक्कम (Amount ₹)']],
        body: [
          ['एकूण मागणी (Total Demand)', (receipt.total_demand || 0).toFixed(2)],
          ['भरलेली रक्कम (Current Paid)', (receipt.amount_paid || 0).toFixed(2)],
          ['शिल्लक (Balance)', (receipt.balance || 0).toFixed(2)],
          ['भरणा पद्धत (Mode)', (receipt.payment_mode || '').toUpperCase()]
        ],
        theme: 'plain',
        styles: { fontSize: 11 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0 }
      });

      const finalY = doc.lastAutoTable.finalY || 120;
      doc.text("शिक्का व स्वाक्षरी", 150, finalY + 30);
      doc.setFontSize(8);
      doc.text("Generated via Digital Gram Panchayat System", 105, 280, { align: "center" });

      doc.save(`Receipt_${receipt.receipt_no}.pdf`);
      toast.success("Receipt PDF Downloaded!");
    } catch (error) {
      toast.error("Failed to generate Receipt PDF");
    }
  };

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
          <Button variant="outline" size="sm" onClick={exportToPDF} className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
            <Download size={16} className="mr-2" />
            {language === 'mr' ? 'पीडीएफ डाउनलोड' : 'Download PDF'}
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
                  <SelectItem value="all">{language === 'mr' ? 'सर्व वर्षे' : 'All Years'}</SelectItem>
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
                  <SelectItem value="all">{language === 'mr' ? 'सर्व स्थिती' : 'All Status'}</SelectItem>
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
                  <th>Property ID</th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('ownerName')}</span>
                      <span className="mr">मालक</span>
                    </div>
                  </th>
                  <th>{t('financialYear')}</th>
                  <th className="text-center">{t('usageType')}</th>
                  <th className="text-center">Area (sq.m)</th>
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
                        {demand.property?.house_no || demand.property_details?.house_no || '-'}
                      </td>
                      <td className="text-xs text-slate-500">{demand.property?.property_id || demand.property_id}</td>
                      <td>
                        <div>
                          <p className="font-medium text-sm">{demand.property?.owner_name || demand.property_details?.owner_name || '-'}</p>
                          <p className="text-xs text-slate-500 font-marathi">
                            {demand.property?.owner_name_mr || demand.property_details?.owner_name_mr || ''}
                          </p>
                        </div>
                      </td>
                      <td className="text-center">{demand.financial_year}</td>
                      <td className="text-center capitalize text-sm">{demand.property?.usage_type || demand.property_details?.usage_type || '-'}</td>
                      <td className="text-center font-mono text-sm">{demand.property?.built_up_area_sqm || demand.property_details?.area || '-'}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(demand.house_tax)}</td>
                      <td className="text-right font-mono text-sm">{formatCurrency(demand.water_tax)}</td>
                      <td className="text-right font-mono text-sm font-medium">{formatCurrency(demand.total_tax)}</td>
                      <td className="text-right font-mono text-sm text-amber-600">{formatCurrency(demand.arrears)}</td>
                      <td className="text-right font-mono text-sm font-bold text-[#003366]">{formatCurrency(demand.net_demand)}</td>
                      <td className="text-right font-mono text-sm text-green-600">{formatCurrency(demand.paid_amount || demand.amount_paid)}</td>
                      <td className="text-right font-mono text-sm font-bold text-red-600">{formatCurrency(demand.balance)}</td>
                      <td className="text-center">{getStatusBadge(demand.status)}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreviewDialog(demand)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title={language === 'mr' ? 'पहा' : 'Preview'}
                          >
                            <FileText size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => exportToPDF(demand)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title={language === 'mr' ? 'डाउनलोड' : 'Download'}
                          >
                            <Download size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(demand)}
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 text-xs h-8 px-2"
                            data-testid={`pay-btn-${demand.id}`}
                          >
                            <CreditCard size={14} className="mr-1" />
                            {language === 'mr' ? 'भरणा' : 'Pay'}
                          </Button>
                        </div>
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
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
              {language === 'mr'
                ? 'सिस्टम निवडलेल्या आर्थिक वर्षासाठी सर्व मालमत्तांसाठी कर मागणी स्वयंचलितपणे तयार करेल. (जी आधीपासून अस्तित्वात आहे ती वगळली जाईल).'
                : 'The system will automatically generate tax demands for all properties for the selected financial year. Existing demands will be skipped.'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleGenerateDemand}
              disabled={saving || !selectedYear}
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

      {/* Receipt Dialog (Namuna 10) */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white print-dialog-content">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * { visibility: hidden; }
              .print-receipt-section, .print-receipt-section * { visibility: visible; }
              .print-receipt-section { position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 20px; box-sizing: border-box; }
              .no-print { display: none !important; }
              .print-dialog-content { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; }
            }
          `}} />
          <div className="print-receipt-section p-8 bg-white text-black font-serif border-[4px] border-double border-slate-800 m-4 shadow-sm">
            <div className="text-center mb-8 border-b border-dashed border-gray-400 pb-4">
              <h1 className="text-3xl font-bold bg-slate-100 py-2 mb-2 inline-block px-8 rounded-full border border-slate-300 shadow-sm">{generatedReceipt?.village} ग्रामपंचायत</h1>
              <h2 className="text-xl text-slate-700">ता. {generatedReceipt?.taluka}, जि. {generatedReceipt?.district}</h2>
              <div className="mt-4 text-2xl font-bold border-b-2 border-slate-800 inline-block pb-1 tracking-wider text-green-900">
                नमुना नंबर १० (कर पावती)
              </div>
            </div>

            <div className="flex justify-between mb-8 text-base bg-slate-50 p-4 border border-slate-200 shadow-inner">
              <div className="space-y-2">
                <p><strong>पावती क्र.:</strong> <span className="text-red-600 font-mono font-bold tracking-widest">{generatedReceipt?.receipt_no}</span></p>
                <p><strong>मालमत्ता क्र.:</strong> <span className="font-bold">{generatedReceipt?.property_id}</span></p>
              </div>
              <div className="text-right space-y-2">
                <p><strong>दिनांक:</strong> <span className="font-bold">{new Date().toLocaleDateString('en-IN')}</span></p>
                <p><strong>आर्थिक वर्ष:</strong> <span className="font-bold">{generatedReceipt?.financial_year}</span></p>
              </div>
            </div>

            <div className="mb-8 leading-relaxed text-lg border-l-4 border-slate-600 pl-4 py-2 bg-slate-50">
              श्री/श्रीमती <strong>{generatedReceipt?.owner_name_mr || generatedReceipt?.owner_name}</strong> यांजकडून ग्रामपंचायत करापोटी खालीलप्रमाणे रक्कम मिळाली:
            </div>

            <table className="w-full border-collapse border-2 border-slate-800 mb-10 text-base">
              <thead>
                <tr className="bg-slate-200">
                  <th className="border-2 border-slate-800 p-3 text-left w-2/3">तपशील</th>
                  <th className="border-2 border-slate-800 p-3 text-right">रक्कम (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-2 border-slate-800 p-3">एकूण मागणी (Total Demand)</td>
                  <td className="border-2 border-slate-800 p-3 text-right font-medium">{generatedReceipt?.total_demand?.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border-2 border-slate-800 p-3 text-slate-600">भरण्याची पद्धत (Payment Mode)</td>
                  <td className="border-2 border-slate-800 p-3 text-right uppercase">{generatedReceipt?.payment_mode}</td>
                </tr>
                <tr>
                  <td className="border-2 border-slate-800 p-4 bg-green-50 font-bold text-lg text-green-900 border-t-4 border-t-slate-800">प्राप्त रक्कम (Amount Paid)</td>
                  <td className="border-2 border-slate-800 p-4 bg-green-50 text-right font-bold text-xl text-green-700 border-t-4 border-t-slate-800">{generatedReceipt?.amount_paid?.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between mt-16 text-base pb-4">
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-black border-dashed mb-2"></div>
                <p className="mt-1 font-bold">कर भरणाऱ्याची स्वाक्षरी</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-black border-dashed mb-2"></div>
                <p className="mt-1 font-bold">ग्रामसेवक / सरपंच स्वाक्षरी</p>
                <p className="text-sm mt-1 mb-8 text-slate-500">({generatedReceipt?.village} ग्रामपंचायत)</p>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-400 border-t pt-2">
              डिजिटल ग्रामपंचायत प्रणाली द्वारे व्युत्पन्न
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-100 no-print border-t items-center justify-between">
            <div className="text-sm text-slate-500 ml-4">After printing, click Close.</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
                Close
              </Button>
              <Button onClick={() => downloadReceiptPDF(generatedReceipt)} className="bg-red-600 hover:bg-red-700 shadow-lg">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={() => window.print()} className="bg-[#003366] hover:bg-[#002244] shadow-lg">
                <FileText className="mr-2 h-4 w-4" />
                Print Namuna 10
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Individual Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>{language === 'mr' ? 'नमुना ८ - पूर्वदृश्य' : 'Namuna 8 - Individual Preview'}</span>
              <Button size="sm" onClick={() => exportToPDF(previewDemand)} className="bg-red-600 hover:bg-red-700">
                <Download size={16} className="mr-2" />
                {language === 'mr' ? 'पीडीएफ डाउनलोड' : 'Download PDF'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {previewDemand && (
            <div className="border border-slate-300 p-6 bg-white shadow-inner font-serif text-slate-900">
              <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
                <h3 className="text-lg font-bold">नमुना ८</h3>
                <p className="text-sm">नियम ३३ (१)</p>
                <h2 className="text-xl font-bold mt-2">सन {previewDemand.financial_year} या वर्षासाठी कर आकारणी नोंदवही</h2>
                <p className="text-md mt-1">
                  गाव: {previewDemand.property?.village || "शिवणे"} |
                  तालुका: {previewDemand.property?.taluka || "हवेली"} |
                  जिल्हा: {previewDemand.property?.district || "पुणे"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <p className="text-sm text-slate-500">मालमत्ता क्र. / House No</p>
                  <p className="font-bold text-lg">{previewDemand.property?.house_no || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">मालकाचे नाव / Owner Name</p>
                  <p className="font-bold text-lg">{previewDemand.property?.owner_name_mr || previewDemand.property?.owner_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">उपयोग / Usage Type</p>
                  <p className="font-medium capitalize">{previewDemand.property?.usage_type || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">बांधकाम क्षेत्र / Built-up Area</p>
                  <p className="font-medium">{previewDemand.property?.built_up_area_sqm || "0"} sq.m</p>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 p-2">तपशील (Description)</th>
                    <th className="border border-slate-400 p-2 text-right">रक्कम (Amount ₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2">इमारत कर (House Tax)</td>
                    <td className="border border-slate-400 p-2 text-right font-mono">{previewDemand.house_tax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2">पाणी कर (Water Tax)</td>
                    <td className="border border-slate-400 p-2 text-right font-mono">{previewDemand.water_tax.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-blue-50 font-bold">
                    <td className="border border-slate-400 p-2">चालू वर्षाची मागणी (Current Year Demand)</td>
                    <td className="border border-slate-400 p-2 text-right font-mono">{previewDemand.total_tax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2">थकीत रक्कम (Arrears)</td>
                    <td className="border border-slate-400 p-2 text-right font-mono">{previewDemand.arrears.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-lg">
                    <td className="border border-slate-400 p-2">एकूण देय (Net Demand)</td>
                    <td className="border border-slate-400 p-2 text-right font-mono">{previewDemand.net_demand.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-12 flex justify-between px-8 italic text-slate-500">
                <div className="text-center">
                  <div className="w-32 border-b border-dashed border-slate-400 mb-2 mx-auto"></div>
                  <p>शिक्का (Stamp)</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-dashed border-slate-400 mb-2 mx-auto"></div>
                  <p>ग्राम सेवक (Gram Sevak)</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              {language === 'mr' ? 'बंद करा' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
