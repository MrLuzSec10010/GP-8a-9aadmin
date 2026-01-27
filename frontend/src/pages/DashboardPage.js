import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Building2, 
  Ruler, 
  Clock, 
  IndianRupee, 
  Wallet, 
  AlertTriangle,
  RefreshCw,
  Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState(null);
  const [wardSummary, setWardSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, wardRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/ward-summary`)
      ]);
      setStats(statsRes.data);
      setWardSummary(wardRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API}/seed-data`);
      toast.success(t('seedSuccess'));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards = [
    { 
      key: 'totalProperties', 
      value: stats?.total_properties || 0, 
      icon: Building2, 
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    { 
      key: 'measuredProperties', 
      value: stats?.measured_properties || 0, 
      icon: Ruler, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    { 
      key: 'pendingMeasurement', 
      value: stats?.pending_measurement || 0, 
      icon: Clock, 
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50'
    },
    { 
      key: 'totalDemand', 
      value: formatCurrency(stats?.total_demand || 0), 
      icon: IndianRupee, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      isCurrency: true
    },
    { 
      key: 'totalCollection', 
      value: formatCurrency(stats?.total_collection || 0), 
      icon: Wallet, 
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      isCurrency: true
    },
    { 
      key: 'totalArrears', 
      value: formatCurrency(stats?.total_arrears || 0), 
      icon: AlertTriangle, 
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      isCurrency: true
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('dashboard')}</h1>
          <p className="text-sm text-slate-500">
            {t('financialYear')}: <span className="font-semibold text-[#003366]">{stats?.current_fy}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw size={16} className="mr-2" />
            {language === 'mr' ? 'ताजे करा' : 'Refresh'}
          </Button>
          {hasRole(['super_admin', 'gramsevak']) && stats?.total_properties === 0 && (
            <Button 
              size="sm" 
              onClick={handleSeedData}
              disabled={seeding}
              className="bg-[#003366] hover:bg-[#002244]"
              data-testid="seed-data-btn"
            >
              <Database size={16} className="mr-2" />
              {seeding ? (language === 'mr' ? 'तयार होत आहे...' : 'Creating...') : (language === 'mr' ? 'नमुना डेटा तयार करा' : 'Create Sample Data')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="card-shadow card-shadow-hover" data-testid={`stat-${card.key}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t(card.key)}</p>
                    <p className={`text-2xl font-bold mt-2 ${card.isCurrency ? 'currency-display' : ''} text-slate-800`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ward Summary Chart */}
      {wardSummary.length > 0 && (
        <Card className="card-shadow" data-testid="ward-summary-chart">
          <CardHeader>
            <CardTitle className="text-lg">{t('wardWiseSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardSummary} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="ward" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${language === 'mr' ? 'वॉर्ड' : 'Ward'} ${value}`}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => `${language === 'mr' ? 'वॉर्ड' : 'Ward'} ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="demand" 
                    name={t('totalDemand')} 
                    fill="#003366" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="collection" 
                    name={t('totalCollection')} 
                    fill="#15803d" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="arrears" 
                    name={t('totalArrears')} 
                    fill="#dc2626" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats?.total_properties === 0 && (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              {language === 'mr' ? 'डेटा उपलब्ध नाही' : 'No Data Available'}
            </h3>
            <p className="text-slate-500 mb-4">
              {language === 'mr' 
                ? 'सुरू करण्यासाठी नमुना डेटा तयार करा किंवा मालमत्ता जोडा.'
                : 'Create sample data or add properties to get started.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
