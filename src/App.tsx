
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { I18nProvider } from '@/components/I18nProvider';
import { Layout } from '@/components/layout/Layout';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { Toaster } from '@/components/ui/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { Login } from '@/pages/Login';
import { TourList } from '@/pages/tours/TourList';
import { TourDetails } from '@/pages/tours/TourDetails';
import { TourForm } from '@/pages/tours/TourForm';
import { WhatsApp } from '@/pages/whatsapp/WhatsApp';
import { Leads } from '@/pages/leads/Leads';
import { Pipeline } from '@/pages/pipeline/Pipeline';
import { Analytics } from '@/pages/analytics/Analytics';
import { Staff } from '@/pages/staff/Staff';

// ... inside Routes
// This comment seems to be a remnant from the original context, removing it as it's not relevant to the final code structure.

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <Router>
        <AuthProvider>
          <AnalyticsTracker />
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="leads" element={<Leads />} />
              <Route path="tours" element={<TourList />} />
              <Route path="tours/new" element={<TourForm />} />
              <Route path="tours/:id" element={<TourDetails />} />
              <Route path="tours/:id/edit" element={<TourForm />} />
              <Route path="whatsapp" element={<WhatsApp />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="staff" element={<Staff />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </I18nProvider>
  );
}

