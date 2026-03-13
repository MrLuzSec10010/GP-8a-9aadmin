import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Plus,
  Search,
  Edit2,
  FileText,
  Building2,
  RefreshCw,
  Download,
  Database,
  Printer,
  Trash2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EMBLEM_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png";

export default function Namuna9Page() {
  const { t, language } = useLanguage();
  const { hasRole } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [govViewOpen, setGovViewOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const printRef = useRef(null);

  const [formData, setFormData] = useState({
    owner_name: '',
    owner_name_mr: '',
    father_name: '',
    father_name_mr: '',
    house_no: '',
    ward_no: '',
    survey_no: '',
    gat_no: '',
    plot_area_sqm: '',
    built_up_area_sqm: '',
    usage_type: 'residential',
    floor_count: '1',
    construction_type: 'rcc',
    water_connection: false,
    electricity_connection: false,
    village: 'शिवणे',
    taluka: 'हवेली',
    district: 'पुणे',
    address: '',
    phone: '',
    assessment_year: '',
    update_reason: ''
  });
  const [saving, setSaving] = useState(false);

  const canEdit = hasRole(['super_admin', 'gramsevak', 'data_entry', 'talathi']);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (wardFilter && wardFilter !== 'all') params.append('ward', wardFilter);

      const response = await axios.get(`${API}/property/list?${params.toString()}`);
      setProperties(response.data);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [search, wardFilter]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API}/seed-demo-data`);
      toast.success(language === 'mr' ? 'नमुना डेटा तयार केला' : 'Demo data created');
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create demo data');
    } finally {
      setSeeding(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      owner_name: '',
      owner_name_mr: '',
      father_name: '',
      father_name_mr: '',
      house_no: '',
      ward_no: '',
      survey_no: '',
      gat_no: '',
      plot_area_sqm: '',
      built_up_area_sqm: '',
      usage_type: 'residential',
      floor_count: '1',
      construction_type: 'rcc',
      water_connection: false,
      electricity_connection: false,
      village: 'शिवणे',
      taluka: 'हवेली',
      district: 'पुणे',
      address: '',
      phone: '',
      assessment_year: '',
      update_reason: ''
    });
    setSelectedProperty(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (property, e) => {
    e.stopPropagation();
    setSelectedProperty(property);
    setFormData({
      owner_name: property.owner_name,
      owner_name_mr: property.owner_name_mr,
      father_name: property.father_name || '',
      father_name_mr: property.father_name_mr || '',
      house_no: property.house_no,
      ward_no: property.ward_no,
      survey_no: property.survey_no || '',
      gat_no: property.gat_no || '',
      plot_area_sqm: property.plot_area_sqm.toString(),
      built_up_area_sqm: property.built_up_area_sqm.toString(),
      usage_type: property.usage_type,
      floor_count: property.floor_count.toString(),
      construction_type: property.construction_type,
      water_connection: property.water_connection,
      electricity_connection: property.electricity_connection,
      village: property.village,
      taluka: property.taluka,
      district: property.district,
      address: property.address || '',
      phone: property.phone || '',
      assessment_year: property.assessment_year || '',
      update_reason: ''
    });
    setDialogOpen(true);
  };

  const openGovView = (property) => {
    setSelectedProperty(property);
    setGovViewOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.owner_name || !formData.owner_name_mr || !formData.house_no || !formData.ward_no) {
      toast.error(language === 'mr' ? 'कृपया सर्व आवश्यक फील्ड भरा' : 'Please fill all required fields');
      return;
    }

    if (selectedProperty && !formData.update_reason) {
      toast.error(language === 'mr' ? 'कृपया बदलाचे कारण द्या' : 'Please provide update reason');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        plot_area_sqm: parseFloat(formData.plot_area_sqm) || 0,
        built_up_area_sqm: parseFloat(formData.built_up_area_sqm) || 0,
        floor_count: parseInt(formData.floor_count) || 1
      };

      if (selectedProperty) {
        await axios.put(`${API}/properties/${selectedProperty.id}`, payload);
        toast.success(t('propertyUpdated'));
      } else {
        await axios.post(`${API}/property/add`, payload);
        toast.success(t('propertyCreated'));
      }

      setDialogOpen(false);
      resetForm();
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (property, e) => {
    e.stopPropagation();
    if (!window.confirm(language === 'mr' ? 'तुम्हाला खात्री आहे की तुम्ही ही मालमत्ता हटवू इच्छिता?' : 'Are you sure you want to delete this property?')) {
      return;
    }
    const reason = window.prompt(language === 'mr' ? 'हटवण्याचे कारण सांगा:' : 'Enter reason for deletion:');
    if (!reason) {
      toast.error(language === 'mr' ? 'कारण देणे आवश्यक आहे' : 'Reason is required');
      return;
    }

    try {
      await axios.delete(`${API}/properties/${property.id}`, { params: { reason } });
      toast.success(language === 'mr' ? 'मालमत्ता हटवली' : 'Property deleted successfully');
      fetchProperties();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete property');
    }
  };

  const getUsageLabel = (type) => {
    const labels = {
      residential: language === 'mr' ? 'निवासी' : 'Residential',
      commercial: language === 'mr' ? 'व्यापारी' : 'Commercial',
      mixed: language === 'mr' ? 'मिश्र' : 'Mixed'
    };
    return labels[type] || type;
  };

  const getConstructionLabel = (type) => {
    const labels = {
      rcc: 'RCC',
      load_bearing: language === 'mr' ? 'लोड बेअरिंग' : 'Load Bearing',
      pucca: language === 'mr' ? 'पक्का' : 'Pucca',
      semi_pucca: language === 'mr' ? 'अर्ध-पक्का' : 'Semi-Pucca',
      kaccha: language === 'mr' ? 'कच्चा' : 'Kaccha'
    };
    return labels[type] || type;
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>नमुना ९ - मालमत्ता नोंदणी</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Noto Sans Devanagari', sans-serif; 
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
          }
          .gov-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .emblem { width: 60px; height: auto; margin-bottom: 5px; }
          .gov-title { font-size: 14pt; font-weight: 700; }
          .gov-subtitle { font-size: 11pt; margin-top: 2px; }
          .form-title { text-align: center; font-size: 13pt; font-weight: 700; margin: 15px 0; border: 1px solid #000; padding: 8px; background: #f5f5f5; }
          .info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .info-table td { border: 1px solid #000; padding: 6px 10px; vertical-align: middle; text-align: center; }
          .info-table .label { font-weight: 600; background: #f9f9f9; width: 35%; text-align: left; }
          .info-table .value { width: 65%; text-align: left; }
          .section-title { font-weight: 700; background: #e5e5e5; padding: 6px 10px; border: 1px solid #000; margin-top: 15px; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-box { text-align: center; width: 25%; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          .bilingual { font-size: 9pt; color: #555; }
          .print-date { text-align: right; font-size: 9pt; margin-top: 20px; border-top: 1px dashed #999; padding-top: 5px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const uniqueWards = [...new Set(properties.map(p => p.ward_no))].sort();

  return (
    <div className="space-y-6" data-testid="namuna9-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('namuna9')}</h1>
          <p className="text-sm text-slate-500">
            {language === 'mr' ? 'मालमत्ता नोंदणी व तपशील' : 'Property Registration & Details'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchProperties} data-testid="refresh-properties">
            <RefreshCw size={16} className="mr-2" />
            {language === 'mr' ? 'ताजे करा' : 'Refresh'}
          </Button>
          {properties.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeedData}
              disabled={seeding}
              data-testid="seed-demo-btn"
            >
              <Database size={16} className="mr-2" />
              {seeding ? (language === 'mr' ? 'तयार होत आहे...' : 'Creating...') : (language === 'mr' ? 'नमुना डेटा' : 'Demo Data')}
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              onClick={openAddDialog}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="add-property-btn"
            >
              <Plus size={16} className="mr-2" />
              {t('addProperty')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder={language === 'mr' ? 'नाव, घर क्र., किंवा ID ने शोधा...' : 'Search by name, house no., or ID...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="property-search"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger data-testid="ward-filter">
                  <SelectValue placeholder={language === 'mr' ? 'वॉर्ड निवडा' : 'Select Ward'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'mr' ? 'सर्व वॉर्ड' : 'All Wards'}</SelectItem>
                  {uniqueWards.map(ward => (
                    <SelectItem key={ward} value={ward}>
                      {language === 'mr' ? `वॉर्ड ${ward}` : `Ward ${ward}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Table */}
      <Card className="card-shadow overflow-hidden">
        <CardHeader className="py-4 border-b bg-slate-50">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={18} className="text-[#003366]" />
            {t('propertyRegister')}
            <span className="text-sm font-normal text-slate-500">
              ({properties.length} {language === 'mr' ? 'नोंदी' : 'records'})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-container">
            <table className="gov-table" data-testid="property-table">
              <thead>
                <tr>
                  <th className="sticky-col bg-slate-100">
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'घर क्र.' : 'House No.'}</span>
                      {language === 'en' && <span className="mr text-xs">घर क्र.</span>}
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'मालकाचे नाव' : 'Owner Name'}</span>
                      {language === 'en' && <span className="mr text-xs">मालकाचे नाव</span>}
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'वॉर्ड' : 'Ward'}</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'वापर प्रकार' : 'Usage'}</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'बांधकाम क्षेत्र' : 'Built-up Area'}</span>
                      {language === 'en' && <span className="mr text-xs">(चौ.मी.)</span>}
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'बांधकाम प्रकार' : 'Construction'}</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'मजले' : 'Floors'}</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{language === 'mr' ? 'सर्वे/गट क्र.' : 'Survey/Gat'}</span>
                    </div>
                  </th>
                  {canEdit && <th className="text-center">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <div className="spinner" />
                        {t('loading')}
                      </div>
                    </td>
                  </tr>
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="text-center py-12">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">{t('noData')}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {language === 'mr' ? '"नमुना डेटा" बटण वापरून डेमो डेटा तयार करा' : 'Click "Demo Data" button to create sample records'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  properties.map((property) => (
                    <tr
                      key={property.id}
                      className="gov-table-row cursor-pointer hover:bg-blue-50"
                      onClick={() => openGovView(property)}
                      data-testid={`property-row-${property.id}`}
                    >
                      <td className="sticky-col bg-white font-medium">{property.house_no}</td>
                      <td>
                        <div>
                          <p className="font-medium">{language === 'mr' ? property.owner_name_mr : property.owner_name}</p>
                          <p className="text-xs text-slate-500">{language === 'mr' ? property.owner_name : property.owner_name_mr}</p>
                        </div>
                      </td>
                      <td className="text-center">{property.ward_no}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${property.usage_type === 'residential' ? 'bg-blue-100 text-blue-700' :
                          property.usage_type === 'commercial' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                          {getUsageLabel(property.usage_type)}
                        </span>
                      </td>
                      <td className="text-right font-mono">{property.built_up_area_sqm.toFixed(2)}</td>
                      <td>{getConstructionLabel(property.construction_type)}</td>
                      <td className="text-center">{property.floor_count}</td>
                      <td className="text-sm">{property.survey_no || property.gat_no || '-'}</td>
                      {canEdit && (
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => openEditDialog(property, e)}
                              data-testid={`edit-property-${property.id}`}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 size={16} className="text-blue-600" />
                            </Button>
                            {hasRole('super_admin') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDelete(property, e)}
                                data-testid={`delete-property-${property.id}`}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 size={16} className="text-red-500" />
                              </Button>
                            )}
                          </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedProperty ? t('editProperty') : t('addProperty')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'मालकाचे नाव (English)' : 'Owner Name (English)'} *</Label>
                <Input
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  placeholder="Owner Name"
                  data-testid="input-owner-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'मालकाचे नाव (मराठी)' : 'Owner Name (Marathi)'} *</Label>
                <Input
                  value={formData.owner_name_mr}
                  onChange={(e) => handleInputChange('owner_name_mr', e.target.value)}
                  placeholder="मालकाचे नाव"
                  className="font-marathi"
                  data-testid="input-owner-name-mr"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'वडिलांचे/पतीचे नाव' : 'Father/Husband Name'}</Label>
                <Input
                  value={formData.father_name}
                  onChange={(e) => handleInputChange('father_name', e.target.value)}
                  placeholder="Father's Name"
                  data-testid="input-father-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'वडिलांचे/पतीचे नाव (मराठी)' : 'Father Name (Marathi)'}</Label>
                <Input
                  value={formData.father_name_mr}
                  onChange={(e) => handleInputChange('father_name_mr', e.target.value)}
                  placeholder="वडिलांचे नाव"
                  className="font-marathi"
                  data-testid="input-father-name-mr"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'घर क्र.' : 'House No.'} *</Label>
                <Input
                  value={formData.house_no}
                  onChange={(e) => handleInputChange('house_no', e.target.value)}
                  placeholder="101"
                  data-testid="input-house-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'वॉर्ड क्र.' : 'Ward No.'} *</Label>
                <Input
                  value={formData.ward_no}
                  onChange={(e) => handleInputChange('ward_no', e.target.value)}
                  placeholder="1"
                  data-testid="input-ward-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'सर्वे क्र.' : 'Survey No.'}</Label>
                <Input
                  value={formData.survey_no}
                  onChange={(e) => handleInputChange('survey_no', e.target.value)}
                  placeholder="45/1"
                  data-testid="input-survey-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'गट क्र.' : 'Gat No.'}</Label>
                <Input
                  value={formData.gat_no}
                  onChange={(e) => handleInputChange('gat_no', e.target.value)}
                  placeholder="123"
                  data-testid="input-gat-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'प्लॉट क्षेत्र (चौ.मी.)' : 'Plot Area (sq.m)'}</Label>
                <Input
                  type="number"
                  value={formData.plot_area_sqm}
                  onChange={(e) => handleInputChange('plot_area_sqm', e.target.value)}
                  placeholder="200"
                  data-testid="input-plot-area"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'बांधकाम क्षेत्र (चौ.मी.)' : 'Built-up Area (sq.m)'} *</Label>
                <Input
                  type="number"
                  value={formData.built_up_area_sqm}
                  onChange={(e) => handleInputChange('built_up_area_sqm', e.target.value)}
                  placeholder="150"
                  data-testid="input-built-area"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'मजले' : 'Floors'}</Label>
                <Select value={formData.floor_count} onValueChange={(v) => handleInputChange('floor_count', v)}>
                  <SelectTrigger data-testid="select-floor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'वापर प्रकार' : 'Usage Type'}</Label>
                <Select value={formData.usage_type} onValueChange={(v) => handleInputChange('usage_type', v)}>
                  <SelectTrigger data-testid="select-usage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{language === 'mr' ? 'निवासी' : 'Residential'}</SelectItem>
                    <SelectItem value="commercial">{language === 'mr' ? 'व्यापारी' : 'Commercial'}</SelectItem>
                    <SelectItem value="mixed">{language === 'mr' ? 'मिश्र' : 'Mixed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'बांधकाम प्रकार' : 'Construction Type'}</Label>
                <Select value={formData.construction_type} onValueChange={(v) => handleInputChange('construction_type', v)}>
                  <SelectTrigger data-testid="select-construction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rcc">RCC</SelectItem>
                    <SelectItem value="load_bearing">{language === 'mr' ? 'लोड बेअरिंग' : 'Load Bearing'}</SelectItem>
                    <SelectItem value="pucca">{language === 'mr' ? 'पक्का' : 'Pucca'}</SelectItem>
                    <SelectItem value="semi_pucca">{language === 'mr' ? 'अर्ध-पक्का' : 'Semi-Pucca'}</SelectItem>
                    <SelectItem value="kaccha">{language === 'mr' ? 'कच्चा' : 'Kaccha'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'गाव' : 'Village'}</Label>
                <Input
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  data-testid="input-village"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'mr' ? 'तालुका' : 'Taluka'}</Label>
                <Input
                  value={formData.taluka}
                  onChange={(e) => handleInputChange('taluka', e.target.value)}
                  data-testid="input-taluka"
                />
              </div>
              <div className="col-span-2 flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="water"
                    checked={formData.water_connection}
                    onCheckedChange={(v) => handleInputChange('water_connection', v)}
                    data-testid="checkbox-water"
                  />
                  <Label htmlFor="water">{language === 'mr' ? 'पाणी जोडणी' : 'Water Connection'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="electricity"
                    checked={formData.electricity_connection}
                    onCheckedChange={(v) => handleInputChange('electricity_connection', v)}
                    data-testid="checkbox-electricity"
                  />
                  <Label htmlFor="electricity">{language === 'mr' ? 'वीज जोडणी' : 'Electricity Connection'}</Label>
                </div>
              </div>
              {selectedProperty && (
                <div className="col-span-2 space-y-2">
                  <Label className="text-amber-600">{t('updateReason')} *</Label>
                  <Input
                    value={formData.update_reason}
                    onChange={(e) => handleInputChange('update_reason', e.target.value)}
                    placeholder={language === 'mr' ? 'बदलाचे कारण लिहा...' : 'Enter reason for update...'}
                    data-testid="input-update-reason"
                  />
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="cancel-property-btn">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="save-property-btn"
            >
              {saving ? (language === 'mr' ? 'जतन होत आहे...' : 'Saving...') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Government Format View Dialog */}
      <Dialog open={govViewOpen} onOpenChange={setGovViewOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-[#003366]" size={20} />
              {language === 'mr' ? 'नमुना ९ - शासकीय स्वरूप' : 'Namuna 9 - Government Format'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {selectedProperty && (
              <div ref={printRef} className="p-8 bg-white" id="gov-format-content">
                {/* Government Header */}
                <div className="gov-header text-center border-b-2 border-black pb-4 mb-6">
                  <img
                    src={EMBLEM_URL}
                    alt="Emblem of India"
                    className="emblem w-16 h-16 mx-auto mb-2 object-contain"
                  />
                  <h1 className="gov-title text-lg font-bold">महाराष्ट्र शासन</h1>
                  <p className="text-sm">Government of Maharashtra</p>
                  <h2 className="gov-subtitle text-base font-semibold mt-2">ग्राम पंचायत {selectedProperty.village}</h2>
                  <p className="text-sm">तालुका: {selectedProperty.taluka}, जिल्हा: {selectedProperty.district}</p>
                </div>

                {/* Form Title */}
                <div className="form-title text-center border border-black p-3 bg-slate-100 mb-6">
                  <h3 className="text-lg font-bold">नमुना ९ - मालमत्ता नोंदणी पत्रक</h3>
                  <p className="text-sm text-slate-600">Namuna 9 - Property Registration Form</p>
                </div>

                {/* Property Details Table */}
                <table className="info-table w-full border-collapse mb-6">
                  <tbody>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold w-1/3">
                        मालमत्ता क्रमांक<br /><span className="bilingual text-xs text-slate-500">Property ID</span>
                      </td>
                      <td className="value border border-black p-2 font-mono">{selectedProperty.property_id}</td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        घर क्रमांक / वॉर्ड क्र.<br /><span className="bilingual text-xs text-slate-500">House No. / Ward No.</span>
                      </td>
                      <td className="value border border-black p-2">
                        <strong>{selectedProperty.house_no}</strong> / वॉर्ड {selectedProperty.ward_no}
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        मालकाचे नाव<br /><span className="bilingual text-xs text-slate-500">Owner Name</span>
                      </td>
                      <td className="value border border-black p-2">
                        <strong className="text-lg">{selectedProperty.owner_name_mr}</strong><br />
                        <span className="text-sm text-slate-600">{selectedProperty.owner_name}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        वडिलांचे / पतीचे नाव<br /><span className="bilingual text-xs text-slate-500">Father's / Husband's Name</span>
                      </td>
                      <td className="value border border-black p-2">
                        {selectedProperty.father_name_mr || '-'}<br />
                        <span className="text-sm text-slate-600">{selectedProperty.father_name || ''}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Land Details Section */}
                <div className="section-title font-bold bg-slate-200 p-2 border border-black">
                  जमीन व बांधकाम तपशील / Land & Construction Details
                </div>
                <table className="info-table w-full border-collapse mb-6">
                  <tbody>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold w-1/3">
                        सर्वे / गट क्रमांक<br /><span className="bilingual text-xs text-slate-500">Survey / Gat No.</span>
                      </td>
                      <td className="value border border-black p-2">
                        {selectedProperty.survey_no || '-'} {selectedProperty.gat_no ? `/ गट: ${selectedProperty.gat_no}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        प्लॉट क्षेत्रफळ<br /><span className="bilingual text-xs text-slate-500">Plot Area</span>
                      </td>
                      <td className="value border border-black p-2 font-mono">
                        <strong>{selectedProperty.plot_area_sqm.toFixed(2)}</strong> चौ.मी. (sq.m)
                        <span className="ml-2 text-green-600 text-xs">[Laser Measured]</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        बांधकाम क्षेत्रफळ<br /><span className="bilingual text-xs text-slate-500">Built-up Area</span>
                      </td>
                      <td className="value border border-black p-2 font-mono">
                        <strong>{selectedProperty.built_up_area_sqm.toFixed(2)}</strong> चौ.मी. (sq.m)
                        <span className="ml-2 text-green-600 text-xs">[Laser Measured]</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        मजले<br /><span className="bilingual text-xs text-slate-500">Number of Floors</span>
                      </td>
                      <td className="value border border-black p-2">{selectedProperty.floor_count}</td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        बांधकाम प्रकार<br /><span className="bilingual text-xs text-slate-500">Construction Type</span>
                      </td>
                      <td className="value border border-black p-2">{getConstructionLabel(selectedProperty.construction_type)}</td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        वापर प्रकार<br /><span className="bilingual text-xs text-slate-500">Usage Type</span>
                      </td>
                      <td className="value border border-black p-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${selectedProperty.usage_type === 'residential' ? 'bg-blue-100 text-blue-700' :
                          selectedProperty.usage_type === 'commercial' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                          {getUsageLabel(selectedProperty.usage_type)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Services Section */}
                <div className="section-title font-bold bg-slate-200 p-2 border border-black">
                  सुविधा तपशील / Services Details
                </div>
                <table className="info-table w-full border-collapse mb-6">
                  <tbody>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold w-1/3">
                        पाणी जोडणी<br /><span className="bilingual text-xs text-slate-500">Water Connection</span>
                      </td>
                      <td className="value border border-black p-2">
                        {selectedProperty.water_connection ?
                          <span className="text-green-600 font-semibold">होय / Yes ✓</span> :
                          <span className="text-red-600">नाही / No</span>
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        वीज जोडणी<br /><span className="bilingual text-xs text-slate-500">Electricity Connection</span>
                      </td>
                      <td className="value border border-black p-2">
                        {selectedProperty.electricity_connection ?
                          <span className="text-green-600 font-semibold">होय / Yes ✓</span> :
                          <span className="text-red-600">नाही / No</span>
                        }
                      </td>
                    </tr>
                    <tr>
                      <td className="label border border-black p-2 bg-slate-50 font-semibold">
                        मूल्यांकन वर्ष<br /><span className="bilingual text-xs text-slate-500">Assessment Year</span>
                      </td>
                      <td className="value border border-black p-2">{selectedProperty.assessment_year || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signature Section */}
                <div className="signature-section flex justify-between mt-12 pt-8">
                  <div className="signature-box text-center w-1/4">
                    <div className="signature-line border-t border-black mt-16 pt-2">
                      <p className="font-semibold">तलाठी</p>
                      <p className="text-xs text-slate-500">Talathi</p>
                    </div>
                  </div>
                  <div className="signature-box text-center w-1/4">
                    <div className="signature-line border-t border-black mt-16 pt-2">
                      <p className="font-semibold">ग्रामसेवक</p>
                      <p className="text-xs text-slate-500">Gramsevak</p>
                    </div>
                  </div>
                  <div className="signature-box text-center w-1/4">
                    <div className="signature-line border-t border-black mt-16 pt-2">
                      <p className="font-semibold">सरपंच</p>
                      <p className="text-xs text-slate-500">Sarpanch</p>
                    </div>
                  </div>
                </div>

                {/* Print Date */}
                <div className="print-date text-right text-xs text-slate-500 mt-8 pt-4 border-t border-dashed">
                  <p>छपाई दिनांक / Print Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  <p>System Generated Document - ग्राम पंचायत डिजिटल प्रणाली</p>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-4 border-t bg-slate-50 flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={(e) => { setGovViewOpen(false); openEditDialog(selectedProperty, e); }}
                data-testid="edit-from-gov-view"
              >
                <Edit2 size={16} className="mr-2" />
                {language === 'mr' ? 'संपादन करा' : 'Edit'}
              </Button>
            )}
            <Button
              onClick={handleDownloadPDF}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="download-pdf-btn"
            >
              <Download size={16} className="mr-2" />
              {language === 'mr' ? 'PDF डाउनलोड करा' : 'Download PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setGovViewOpen(false)}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
