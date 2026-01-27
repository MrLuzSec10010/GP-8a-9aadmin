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
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  Edit2, 
  Eye, 
  FileText,
  Building2,
  RefreshCw
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Namuna9Page() {
  const { t, language } = useLanguage();
  const { hasRole } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_name_mr: '',
    house_no: '',
    ward_no: '',
    survey_no: '',
    plot_area_sqm: '',
    built_up_area_sqm: '',
    usage_type: 'residential',
    floor_count: '1',
    construction_type: 'pucca',
    water_connection: false,
    electricity_connection: false,
    village: 'Shivane',
    taluka: 'Haveli',
    district: 'Pune',
    address: '',
    phone: '',
    update_reason: ''
  });
  const [saving, setSaving] = useState(false);

  const canEdit = hasRole(['super_admin', 'gramsevak', 'data_entry', 'talathi']);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (wardFilter) params.append('ward', wardFilter);
      
      const response = await axios.get(`${API}/properties?${params.toString()}`);
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      owner_name: '',
      owner_name_mr: '',
      house_no: '',
      ward_no: '',
      survey_no: '',
      plot_area_sqm: '',
      built_up_area_sqm: '',
      usage_type: 'residential',
      floor_count: '1',
      construction_type: 'pucca',
      water_connection: false,
      electricity_connection: false,
      village: 'Shivane',
      taluka: 'Haveli',
      district: 'Pune',
      address: '',
      phone: '',
      update_reason: ''
    });
    setSelectedProperty(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (property) => {
    setSelectedProperty(property);
    setFormData({
      owner_name: property.owner_name,
      owner_name_mr: property.owner_name_mr,
      house_no: property.house_no,
      ward_no: property.ward_no,
      survey_no: property.survey_no || '',
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
      update_reason: ''
    });
    setDialogOpen(true);
  };

  const openViewDialog = (property) => {
    setSelectedProperty(property);
    setViewDialogOpen(true);
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
        await axios.post(`${API}/properties`, payload);
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

  const getUsageLabel = (type) => {
    const labels = { residential: t('residential'), commercial: t('commercial'), mixed: t('mixed') };
    return labels[type] || type;
  };

  const getConstructionLabel = (type) => {
    const labels = { pucca: t('pucca'), semi_pucca: t('semiPucca'), kaccha: t('kaccha') };
    return labels[type] || type;
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProperties} data-testid="refresh-properties">
            <RefreshCw size={16} className="mr-2" />
            {language === 'mr' ? 'ताजे करा' : 'Refresh'}
          </Button>
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
                  <SelectItem value="">{language === 'mr' ? 'सर्व वॉर्ड' : 'All Wards'}</SelectItem>
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
                      <span>{t('houseNo')}</span>
                      <span className="mr">घर क्र.</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('ownerName')}</span>
                      <span className="mr">मालकाचे नाव</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('wardNo')}</span>
                      <span className="mr">वॉर्ड</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('usageType')}</span>
                      <span className="mr">वापर</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('builtUpArea')}</span>
                      <span className="mr">क्षेत्र (चौ.मी.)</span>
                    </div>
                  </th>
                  <th>
                    <div className="bilingual-header">
                      <span>{t('constructionType')}</span>
                      <span className="mr">बांधकाम</span>
                    </div>
                  </th>
                  <th className="text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <div className="spinner" />
                        {t('loading')}
                      </div>
                    </td>
                  </tr>
                ) : properties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">{t('noData')}</p>
                    </td>
                  </tr>
                ) : (
                  properties.map((property) => (
                    <tr key={property.id} className="gov-table-row" data-testid={`property-row-${property.id}`}>
                      <td className="sticky-col bg-white font-medium">{property.house_no}</td>
                      <td>
                        <div>
                          <p className="font-medium">{property.owner_name}</p>
                          <p className="text-xs text-slate-500 font-marathi">{property.owner_name_mr}</p>
                        </div>
                      </td>
                      <td className="text-center">{property.ward_no}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          property.usage_type === 'residential' ? 'bg-blue-100 text-blue-700' :
                          property.usage_type === 'commercial' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {getUsageLabel(property.usage_type)}
                        </span>
                      </td>
                      <td className="text-right font-mono">{property.built_up_area_sqm.toFixed(2)}</td>
                      <td>{getConstructionLabel(property.construction_type)}</td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openViewDialog(property)}
                            data-testid={`view-property-${property.id}`}
                          >
                            <Eye size={16} />
                          </Button>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditDialog(property)}
                              data-testid={`edit-property-${property.id}`}
                            >
                              <Edit2 size={16} />
                            </Button>
                          )}
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
                <Label>{t('ownerName')} (English) *</Label>
                <Input
                  value={formData.owner_name}
                  onChange={(e) => handleInputChange('owner_name', e.target.value)}
                  placeholder="Owner Name"
                  data-testid="input-owner-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('ownerName')} (मराठी) *</Label>
                <Input
                  value={formData.owner_name_mr}
                  onChange={(e) => handleInputChange('owner_name_mr', e.target.value)}
                  placeholder="मालकाचे नाव"
                  className="font-marathi"
                  data-testid="input-owner-name-mr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('houseNo')} *</Label>
                <Input
                  value={formData.house_no}
                  onChange={(e) => handleInputChange('house_no', e.target.value)}
                  placeholder="101"
                  data-testid="input-house-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('wardNo')} *</Label>
                <Input
                  value={formData.ward_no}
                  onChange={(e) => handleInputChange('ward_no', e.target.value)}
                  placeholder="1"
                  data-testid="input-ward-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('surveyNo')}</Label>
                <Input
                  value={formData.survey_no}
                  onChange={(e) => handleInputChange('survey_no', e.target.value)}
                  placeholder="S-101"
                  data-testid="input-survey-no"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('plotArea')}</Label>
                <Input
                  type="number"
                  value={formData.plot_area_sqm}
                  onChange={(e) => handleInputChange('plot_area_sqm', e.target.value)}
                  placeholder="200"
                  data-testid="input-plot-area"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('builtUpArea')} *</Label>
                <Input
                  type="number"
                  value={formData.built_up_area_sqm}
                  onChange={(e) => handleInputChange('built_up_area_sqm', e.target.value)}
                  placeholder="150"
                  data-testid="input-built-area"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('floorCount')}</Label>
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
                <Label>{t('usageType')}</Label>
                <Select value={formData.usage_type} onValueChange={(v) => handleInputChange('usage_type', v)}>
                  <SelectTrigger data-testid="select-usage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{t('residential')}</SelectItem>
                    <SelectItem value="commercial">{t('commercial')}</SelectItem>
                    <SelectItem value="mixed">{t('mixed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('constructionType')}</Label>
                <Select value={formData.construction_type} onValueChange={(v) => handleInputChange('construction_type', v)}>
                  <SelectTrigger data-testid="select-construction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pucca">{t('pucca')}</SelectItem>
                    <SelectItem value="semi_pucca">{t('semiPucca')}</SelectItem>
                    <SelectItem value="kaccha">{t('kaccha')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('village')}</Label>
                <Input
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  data-testid="input-village"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('taluka')}</Label>
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
                  <Label htmlFor="water">{t('waterConnection')}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="electricity"
                    checked={formData.electricity_connection}
                    onCheckedChange={(v) => handleInputChange('electricity_connection', v)}
                    data-testid="checkbox-electricity"
                  />
                  <Label htmlFor="electricity">{t('electricityConnection')}</Label>
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="text-[#003366]" size={20} />
              {language === 'mr' ? 'मालमत्ता तपशील' : 'Property Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">{t('houseNo')}</p>
                  <p className="font-semibold">{selectedProperty.house_no}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('wardNo')}</p>
                  <p className="font-semibold">{selectedProperty.ward_no}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">{t('ownerName')}</p>
                  <p className="font-semibold">{selectedProperty.owner_name}</p>
                  <p className="text-sm text-slate-600 font-marathi">{selectedProperty.owner_name_mr}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('usageType')}</p>
                  <p className="font-semibold">{getUsageLabel(selectedProperty.usage_type)}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('constructionType')}</p>
                  <p className="font-semibold">{getConstructionLabel(selectedProperty.construction_type)}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('plotArea')}</p>
                  <p className="font-semibold">{selectedProperty.plot_area_sqm} sq.m</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('builtUpArea')}</p>
                  <p className="font-semibold">{selectedProperty.built_up_area_sqm} sq.m</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('floorCount')}</p>
                  <p className="font-semibold">{selectedProperty.floor_count}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('waterConnection')}</p>
                  <p className="font-semibold">{selectedProperty.water_connection ? t('yes') : t('no')}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('electricityConnection')}</p>
                  <p className="font-semibold">{selectedProperty.electricity_connection ? t('yes') : t('no')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Property ID</p>
                  <p className="font-mono text-xs">{selectedProperty.property_id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
