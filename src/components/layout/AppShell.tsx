import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AiAssistant } from '@/components/AiAssistant';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LogOut, Loader2, Bell, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '@/lib/supabase-api';
import { useMemo } from 'react';
import { daysInStock, formatCurrency } from '@/lib/constants';

export function AppShell() {
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
    enabled: !!user,
  });

  const alerts = useMemo(() => {
    const items: { type: 'danger' | 'warning' | 'info'; icon: typeof AlertTriangle; text: string; vehicleId: string }[] = [];
    vehicles.forEach(v => {
      if (v.status === 'entregado' || v.is_deregistered) return;
      if (v.itv_date) {
        const days = Math.floor((new Date(v.itv_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days < 30) items.push({ type: days < 0 ? 'danger' : 'warning', icon: AlertTriangle, text: `${v.brand} ${v.model} (${v.plate}) — ITV ${days < 0 ? 'caducada' : `en ${days} días`}`, vehicleId: v.id });
      }
      const dias = daysInStock(v.expo_date);
      if (dias > 90 && (v.status === 'disponible' || v.status === 'reservado')) {
        items.push({ type: 'info', icon: Clock, text: `${v.brand} ${v.model} (${v.plate}) — ${dias} días en stock`, vehicleId: v.id });
      }
      if (v.total_expenses > v.purchase_price * 0.3 && v.purchase_price > 0) {
        items.push({ type: 'warning', icon: TrendingUp, text: `${v.brand} ${v.model} (${v.plate}) — Gastos elevados (${Math.round(v.total_expenses / v.purchase_price * 100)}%)`, vehicleId: v.id });
      }
    });
    return items;
  }, [vehicles]);

  const dangerCount = alerts.filter(a => a.type === 'danger').length;
  const totalCount = alerts.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 border-b flex items-center px-4 gap-3 bg-card shrink-0">
            <SidebarTrigger />
            <div className="flex-1" />

            {/* Notification Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Alertas">
                  <Bell className="h-4 w-4" />
                  {totalCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${dangerCount > 0 ? 'bg-destructive' : 'bg-status-reparacion'}`}>
                      {totalCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <h4 className="text-sm font-semibold">Alertas activas ({totalCount})</h4>
                </div>
                {totalCount === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sin alertas. ¡Todo en orden!</p>
                ) : (
                  <div className="max-h-72 overflow-auto divide-y">
                    {alerts.slice(0, 15).map((alert, i) => (
                      <button key={i} onClick={() => navigate(`/vehicles/${alert.vehicleId}`)}
                        className="w-full text-left flex items-start gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-xs">
                        <alert.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${alert.type === 'danger' ? 'text-destructive' : alert.type === 'warning' ? 'text-status-reparacion' : 'text-muted-foreground'}`} />
                        <span className="text-foreground/80">{alert.text}</span>
                      </button>
                    ))}
                  </div>
                )}
                {totalCount > 0 && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/')}>
                      Ver todas en el Dashboard
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name}</span>
            <Badge variant="outline" className="text-xs capitalize">{profile?.role || 'usuario'}</Badge>
            <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
        <AiAssistant />
      </div>
    </SidebarProvider>
  );
}
