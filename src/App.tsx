import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnimauxListPage } from './pages/AnimauxListPage';
import { AnimalFormPage } from './pages/AnimalFormPage';
import { AnimalDetailPage } from './pages/AnimalDetailPage';
import { SignalementsPage } from './pages/SignalementsPage';
import { FamillesAccueilPage } from './pages/FamillesAccueilPage';
import { AdoptionsPage } from './pages/AdoptionsPage';
import { VeterinairesPage } from './pages/VeterinairesPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { SearchPage } from './pages/SearchPage';
import { GoogleDriveTest } from './components/GoogleDriveTest';
import { LoadingSpinner } from './components/ui';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingSpinner size={32} />;

  if (!session) return <Navigate to="/login" replace />;

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
        path="/recherche"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux"
        element={
          <ProtectedRoute>
            <AnimauxListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux/nouveau"
        element={
          <ProtectedRoute>
            <AnimalFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux/:id"
        element={
          <ProtectedRoute>
            <AnimalDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animaux/:id/edit"
        element={
          <ProtectedRoute>
            <AnimalFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/signalements"
        element={
          <ProtectedRoute>
            <SignalementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/familles-accueil"
        element={
          <ProtectedRoute>
            <FamillesAccueilPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adoptions"
        element={
          <ProtectedRoute>
            <AdoptionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/veterinaires"
        element={
          <ProtectedRoute>
            <VeterinairesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-google-drive"
        element={
          <ProtectedRoute>
            <GoogleDriveTest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/justice"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Justice" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pensions"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Pensions / Fourrières" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transports"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Transports" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Documents" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/enqueteurs"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Enquêteurs" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/registre"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Registre légal" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <ComingSoonPage featureName="Import Excel" />
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
