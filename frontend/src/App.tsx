
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Companies from './pages/Companies';
import Sites from './pages/Sites';
import Godowns from './pages/Godowns';
import PurchaseBills from './pages/PurchaseBills';
import MaterialIssues from './pages/MaterialIssues';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Login from './pages/Login';

// Context
import { AuthProvider } from './contexts/AuthContext';

function App() {
  // Get base path from environment
  // Default to empty string for localhost development, or '/stock-management' for production
  const basePath = import.meta.env.VITE_BASE_PATH || (import.meta.env.DEV ? '' : '/stock-management');
  
  return (
    <AuthProvider>
      <Router basename={basePath}>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="materials" element={<Materials />} />
              <Route path="companies" element={<Companies />} />
              <Route path="sites" element={<Sites />} />
              <Route path="godowns" element={<Godowns />} />
              <Route path="purchase-bills" element={<PurchaseBills />} />
              <Route path="material-issues" element={<MaterialIssues />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={
                <ProtectedRoute requireAdmin={true}>
                  <Reports />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;