import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Calculator, 
  Users, 
  ClipboardList, 
  Settings,
  LogOut,
  Globe,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const EMBLEM_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png";

export default function Layout({ children }) {
  const { t, language, toggleLanguage } = useLanguage();
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'dashboard', roles: ['super_admin', 'talathi', 'gramsevak', 'data_entry', 'auditor', 'citizen'] },
    { path: '/namuna-9', icon: Building2, label: 'namuna9', roles: ['super_admin', 'talathi', 'gramsevak', 'data_entry', 'auditor', 'citizen'] },
    { path: '/namuna-8', icon: FileText, label: 'namuna8', roles: ['super_admin', 'talathi', 'gramsevak', 'data_entry', 'auditor', 'citizen'] },
    { path: '/tax-engine', icon: Calculator, label: 'taxEngine', roles: ['super_admin', 'gramsevak'] },
    { path: '/users', icon: Users, label: 'users', roles: ['super_admin', 'gramsevak'] },
    { path: '/audit-logs', icon: ClipboardList, label: 'auditLogs', roles: ['super_admin', 'auditor', 'gramsevak'] },
  ];

  const filteredNavItems = navItems.filter(item => hasRole(item.roles));

  const getRoleLabel = (role) => {
    const roleLabels = {
      super_admin: t('superAdmin'),
      talathi: t('talathi'),
      gramsevak: t('gramsevak'),
      data_entry: t('dataEntry'),
      auditor: t('auditor'),
      citizen: t('citizen')
    };
    return roleLabels[role] || role;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} data-testid="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <img 
            src={EMBLEM_URL} 
            alt="Emblem of India" 
            className="w-10 h-10 object-contain emblem-pulse rounded-full bg-white p-1"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">
              {language === 'mr' ? 'ग्राम पंचायत' : 'Gram Panchayat'}
            </h1>
            <p className="text-xs text-white/70 truncate">
              {language === 'mr' ? 'महाराष्ट्र शासन' : 'Maharashtra'}
            </p>
          </div>
          <button 
            className="md:hidden p-1 hover:bg-white/10 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${item.label}`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-sm">{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="sidebar-item w-full justify-center hover:bg-red-500/20"
            data-testid="logout-btn"
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span className="text-sm">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="main-header" data-testid="main-header">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
            data-testid="menu-toggle"
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-slate-800">
              {t('appTitle')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2"
            data-testid="language-toggle"
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{language === 'en' ? 'मराठी' : 'English'}</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2" data-testid="user-menu">
                <div className="w-7 h-7 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium truncate max-w-[100px]">{user?.name}</p>
                  <p className="text-[10px] text-slate-500">{getRoleLabel(user?.role)}</p>
                </div>
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="flex flex-col items-start gap-1">
                <span className="font-medium">{user?.name}</span>
                <span className="text-xs text-slate-500">{user?.phone}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut size={14} className="mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content p-6" data-testid="main-content">
        {children}
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
