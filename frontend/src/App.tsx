import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import SalesPOS from './pages/SalesPOS';
import Inventory from './pages/Inventory';
import Admin from './pages/Admin';
import Tables from './pages/Tables';
import Cash from './pages/Cash';
import Reports from './pages/Reports';
import Kitchen from './pages/Kitchen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Authorized } from './components/auth/Authorized';

function App() {

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tables" element={<Authorized resource="sales" action="read" fallback={<Navigate to="/dashboard" />}><Tables /></Authorized>} />
          <Route path="pos" element={<Authorized resource="sales" action="create" fallback={<Navigate to="/dashboard" />}><SalesPOS /></Authorized>} />
          <Route path="cash" element={<Authorized resource="cash" action="read" fallback={<Navigate to="/dashboard" />}><Cash /></Authorized>} />
          <Route path="inventory" element={<Authorized resource="inventory" action="read" fallback={<Navigate to="/dashboard" />}><Inventory /></Authorized>} />
          <Route path="reports" element={<Authorized resource="reports" action="read" fallback={<Navigate to="/dashboard" />}><Reports /></Authorized>} />
          <Route path="admin" element={<Authorized resource="users" action="read" fallback={<Navigate to="/dashboard" />}><Admin /></Authorized>} />
          <Route path="kitchen" element={<Kitchen />} />
          {/* Further protected routes go here */}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
