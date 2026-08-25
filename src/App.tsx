import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnimauxListPage } from './pages/AnimauxListPage';
import { AnimalFormPage } from './pages/AnimalFormPage';
import { AnimalDetailPage } from './pages/AnimalDetailPage';
import { SignalementsPage } from './pages/SignalementsPage';
import { SignalementDetailPage } from './pages/SignalementDetailPage';
import { FamillesAccueilPage } from './pages/FamillesAccueilPage';
import { FamilleDetailPage } from './pages/FamilleDetailPage';
import { AdoptionsPage } from './pages/AdoptionsPage';
import { VeterinairesPage } from './pages/VeterinairesPage';
import { JusticePage } from './pages/JusticePage';
import { PensionsPage } from './pages/PensionsPage';
import { TransportsPage } from './pages/TransportsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EnqueteursPage } from './pages/EnqueteursPage';
import { RegistrePage } from './pages/RegistrePage';
import { ImportPage } from './pages/ImportPage';
import { AdministrationPage } from './pages/AdministrationPage';
import { LoadingSpinner } from './components/ui';
import type { Permission } from './types';

function ProtectedRoute({ children, requiredPermission }: { children: React.ReactNode; requiredPermission?: Permission }) {
  const { session, loading, hasPermission } = useAuth();

  if (loading) return <LoadingSpinner size={32} />;

  if (!session) return <Navigate to="/login" replace />;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-error-500">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="font-heading text-lg font-semibold text-neutral-900">Accès restreint</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-500">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingSpinner size={32} />;

  if (session) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux"
        element={
          <ProtectedRoute requiredPermission="animaux_lecture">
            <AnimauxListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux/nouveau"
        element={
          <ProtectedRoute requiredPermission="animaux_gestion">
            <AnimalFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux/:id"
        element={
          <ProtectedRoute requiredPermission="animaux_lecture">
            <AnimalDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux/:id/edit"
        element={
          <ProtectedRoute requiredPermission="animaux_gestion">
            <AnimalFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/signalements"
        element={
          <ProtectedRoute requiredPermission="signalements">
            <SignalementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/signalements/:id"
        element={
          <ProtectedRoute requiredPermission="signalements">
            <SignalementDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/familles-accueil"
        element={
          <ProtectedRoute requiredPermission="familles_accueil">
            <FamillesAccueilPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/familles-accueil/:id"
        element={
          <ProtectedRoute requiredPermission="familles_accueil">
            <FamilleDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adoptions"
        element={
          <ProtectedRoute requiredPermission="animaux_lecture">
            <AdoptionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/veterinaires"
        element={
          <ProtectedRoute requiredPermission="sante">
            <VeterinairesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/justice"
        element={
          <ProtectedRoute requiredPermission="justice">
            <JusticePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pensions"
        element={
          <ProtectedRoute requiredPermission="animaux_lecture">
            <PensionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transports"
        element={
          <ProtectedRoute requiredPermission="transports">
            <TransportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute requiredPermission="animaux_lecture">
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enqueteurs"
        element={
          <ProtectedRoute requiredPermission="signalements">
            <EnqueteursPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/registre"
        element={
          <ProtectedRoute requiredPermission="animaux_lecture">
            <RegistrePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute requiredPermission="animaux_gestion">
            <ImportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administration"
        element={
          <ProtectedRoute requiredPermission="administration">
            <AdministrationPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
