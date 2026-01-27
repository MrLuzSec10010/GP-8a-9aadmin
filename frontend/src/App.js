import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import Namuna9Page from "./pages/Namuna9Page";
import Namuna8Page from "./pages/Namuna8Page";
import TaxEnginePage from "./pages/TaxEnginePage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UsersPage from "./pages/UsersPage";
import Layout from "./components/Layout";
import "./App.css";

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <DashboardPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/namuna-9" element={
        <PrivateRoute>
          <Layout>
            <Namuna9Page />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/namuna-8" element={
        <PrivateRoute>
          <Layout>
            <Namuna8Page />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/tax-engine" element={
        <PrivateRoute>
          <Layout>
            <TaxEnginePage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/audit-logs" element={
        <PrivateRoute>
          <Layout>
            <AuditLogsPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/users" element={
        <PrivateRoute>
          <Layout>
            <UsersPage />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
