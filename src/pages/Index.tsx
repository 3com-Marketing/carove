import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import SellerDashboard from '@/pages/dashboard/SellerDashboard';
import PostventaDashboard from '@/pages/dashboard/PostventaDashboard';
import AdminDashboardHome from '@/pages/dashboard/AdminDashboardHome';

export default function Dashboard() {
  const { role } = useRole();

  if (role === 'vendedor') return <SellerDashboard />;
  if (role === 'postventa') return <PostventaDashboard />;
  if (role === 'contabilidad') return <Navigate to="/accounting" replace />;

  return <AdminDashboardHome />;
}
