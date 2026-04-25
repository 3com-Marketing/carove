import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVehicles, getExpenses, getInvoicesPendingPayment } from '@/lib/supabase-api';
import { formatCurrency, daysInStock, formatDate } from '@/lib/constants';
import type { VehicleStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import { Car, PlusCircle, ShoppingCart, AlertTriangle, Clock, TrendingUp, ArrowRight, Loader2, Banknote, CalendarCheck, ListTodo } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function AdminDashboardHome() {
  const navigate = useNavigate();
  const now = new Date();
  const { data: vehicles = [], isLoading: loadingV } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => getExpenses() });
  const { data: pendingInvoices = [] } = useQuery({ queryKey: ['invoices-pending-payment'], queryFn: getInvoicesPendingPayment });

  const { data: activeReservations = [] } = useQuery({
    queryKey: ['dashboard-active-reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, reservation_status, created_at, vehicle_id, vehicles(brand, model, plate), buyers(name, last_name)')
        .in('reservation_status', ['pending_signature', 'signed'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['dashboard-pending-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date, status')
        .eq('status', 'pendiente')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const counts = useMemo(() => {
    const c: Record<VehicleStatus, number> = { no_disponible: 0, disponible: 0, reservado: 0, vendido: 0, entregado: 0 };
    vehicles.filter(v => !v.is_deregistered).forEach(v => c[v.status]++);
    return c;
  }, [vehicles]);

  const vendidosMes = useMemo(() => {
    const now = new Date();
    return vehicles.filter(v => {
      if (v.status !== 'vendido' || !v.sale_date) return false;
      const d = new Date(v.sale_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [vehicles]);

  const alerts = useMemo(() => {
    const items: { type: 'warning' | 'danger' | 'info'; icon: typeof AlertTriangle; text: string; vehicleId: string }[] = [];
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
        items.push({ type: 'warning', icon: TrendingUp, text: `${v.brand} ${v.model} (${v.plate}) — Gastos: ${formatCurrency(v.total_expenses)} (${Math.round(v.total_expenses / v.purchase_price * 100)}% del coste)`, vehicleId: v.id });
      }
    });
    return items;
  }, [vehicles]);

  const recentSales = useMemo(() =>
    vehicles
      .filter(v => v.sale_date)
      .sort((a, b) => new Date(b.sale_date!).getTime() - new Date(a.sale_date!).getTime())
      .slice(0, 5),
  [vehicles]);

  const totalPendingAmount = useMemo(() => pendingInvoices.reduce((s, i) => s + i.total_amount, 0), [pendingInvoices]);
  const recentPending = useMemo(() => pendingInvoices.filter(i => {
    const days = Math.floor((Date.now() - new Date(i.issue_date).getTime()) / (1000 * 60 * 60 * 24));
    return days <= 30;
  }), [pendingInvoices]);
  const overduePending = useMemo(() => pendingInvoices.filter(i => {
    const days = Math.floor((Date.now() - new Date(i.issue_date).getTime()) / (1000 * 60 * 60 * 24));
    return days > 30;
  }), [pendingInvoices]);

  if (loadingV) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  const kpis = [
    { label: 'No disponibles', value: counts.no_disponible, icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
    { label: 'Disponibles', value: counts.disponible, icon: Car, color: 'text-status-disponible', bg: 'bg-status-disponible/10' },
    { label: 'Reservados', value: counts.reservado, icon: ShoppingCart, color: 'text-status-reservado', bg: 'bg-status-reservado/10' },
    { label: 'Vendidos este mes', value: vendidosMes, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  function daysSinceIssue(date: string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }

  function daysColor(days: number): string {
    if (days > 30) return 'text-destructive';
    if (days > 7) return 'text-yellow-600';
    return 'text-emerald-600';
  }

  const statusLabel = (s: string) => s === 'pending_signature' ? 'Pdte. firma' : s === 'signed' ? 'Firmada' : s;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Panel Operativo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">¿Qué tengo que gestionar hoy?</p>
        </div>
        <Button onClick={() => navigate('/vehicles/new')} size="sm" className="gradient-brand border-0 text-white hover:opacity-90 shrink-0">
          <PlusCircle className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Nuevo vehículo</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" /> Alertas activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin alertas pendientes. ¡Todo en orden!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {alerts.map((alert, i) => (
                  <button key={i} onClick={() => navigate(`/vehicles/${alert.vehicleId}`)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <alert.icon className={`h-4 w-4 mt-0.5 shrink-0 ${alert.type === 'danger' ? 'text-destructive' : alert.type === 'warning' ? 'text-status-reparacion' : 'text-muted-foreground'}`} />
                    <span className="text-foreground/80">{alert.text}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-accent" /> Últimas ventas
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sales')} className="text-xs">
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aún no hay ventas registradas.</p>
            ) : (
              <div className="space-y-2">
                {recentSales.map(v => (
                  <button key={v.id} onClick={() => navigate(`/vehicles/${v.id}`)}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={v.status} />
                      <div>
                        <p className="text-sm font-medium">{v.brand} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.plate} · {formatDate(v.sale_date)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(v.pvp_base)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-accent" /> Reservas activas
                <span className="text-xs font-normal text-muted-foreground">({activeReservations.length})</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/reservations')} className="text-xs">
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin reservas activas.</p>
            ) : (
              <div className="space-y-2">
                {activeReservations.map((r: any) => (
                  <button key={r.id} onClick={() => navigate(`/reservations/${r.id}`)}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <div>
                      <p className="font-medium">{r.vehicles?.brand} {r.vehicles?.model} <span className="text-muted-foreground">({r.vehicles?.plate})</span></p>
                      <p className="text-xs text-muted-foreground">{r.buyers?.name} {r.buyers?.last_name || ''}</p>
                    </div>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      r.reservation_status === 'signed' ? 'bg-status-disponible/10 text-status-disponible' : 'bg-status-reservado/10 text-status-reservado'
                    )}>{statusLabel(r.reservation_status)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-accent" /> Tareas pendientes
                <span className="text-xs font-normal text-muted-foreground">({pendingTasks.length})</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')} className="text-xs">
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin tareas pendientes. ¡Buen trabajo!</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((t: any) => (
                  <button key={t.id} onClick={() => navigate('/tasks')}
                    className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      {t.due_date && <p className="text-xs text-muted-foreground">Vence: {formatDate(t.due_date)}</p>}
                    </div>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      t.priority === 'alta' || t.priority === 'urgente' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                    )}>{t.priority || 'normal'}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {pendingInvoices.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4 text-accent" /> Facturas pendientes de cobro
              </CardTitle>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total pendiente</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(totalPendingAmount)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {overduePending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-destructive">Vencidas (&gt;30 días)</p>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 space-y-1">
                  {overduePending.slice(0, 5).map(inv => {
                    const days = daysSinceIssue(inv.issue_date);
                    return (
                      <button key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-destructive/10 transition-colors text-sm">
                        <div>
                          <span className="font-mono font-medium text-xs">{inv.full_number}</span>
                          <span className="text-muted-foreground ml-2">{inv.buyer_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCurrency(inv.total_amount)}</span>
                          <span className={cn('text-xs font-medium', daysColor(days))}>{days}d</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {recentPending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recientes (≤30 días)</p>
                <div className="space-y-1">
                  {recentPending.slice(0, 5).map(inv => {
                    const days = daysSinceIssue(inv.issue_date);
                    return (
                      <button key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                        <div>
                          <span className="font-mono font-medium text-xs">{inv.full_number}</span>
                          <span className="text-muted-foreground ml-2">{inv.buyer_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCurrency(inv.total_amount)}</span>
                          <span className={cn('text-xs font-medium', daysColor(days))}>{days}d</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => navigate('/invoices')}>
              Ver todas las facturas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Total en stock: <strong className="text-foreground">{counts.disponible + counts.reservado}</strong></span>
            <span>·</span>
            <span>Total vehículos: <strong className="text-foreground">{vehicles.length}</strong></span>
            <span>·</span>
            <span>Gastos registrados: <strong className="text-foreground">{expenses.length}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
