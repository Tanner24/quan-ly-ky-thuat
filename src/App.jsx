import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './components/PlaceholderPage';
import ErrorCodeAnalysis from './pages/ErrorCodeAnalysis';
import PartAnalysis from './pages/PartAnalysis';
import DriverLogs from './pages/DriverLogs';
import DriverLogUpdate from './pages/DriverLogUpdate';
import Vehicles from './pages/Vehicles';
import VehicleDetails from './pages/VehicleDetails';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Reports from './pages/Reports';
import VinconsSync from './pages/VinconsSync';
import { features } from './data/features';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />

            <Route path="/error-code" element={<ErrorCodeAnalysis />} />
            <Route path="/part-analysis" element={<PartAnalysis />} />
            <Route path="/driver-logs" element={<DriverLogs />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/vehicles/:id" element={<VehicleDetails />} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/vincons-sync" element={<ProtectedRoute><VinconsSync /></ProtectedRoute>} />

            {/* Admin Only */}
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />

            {features
              .filter(feature => !['/error-code', '/part-analysis', '/driver-logs', '/vehicles', '/settings', '/reports', '/vincons-sync'].includes(feature.link))
              .map(feature => (
                <Route
                  key={feature.id}
                  path={feature.link}
                  element={<PlaceholderPage title={feature.title} />}
                />
              ))}

          </Route>

          <Route path="/driver-logs/update" element={<ProtectedRoute><DriverLogUpdate /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

