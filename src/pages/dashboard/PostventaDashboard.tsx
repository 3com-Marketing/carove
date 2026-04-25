import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/constants';
import {
  Wrench, CheckCircle2, Clock, AlertTriangle, ArrowRight, Loader2, ClipboardList,
} from 'lucide-react';
import { useMemo } from 'react';
import { startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PostventaDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();

  // All after-sale tickets
  const { data: tickets = [], isLoading: loadingT } = useQuery({
    queryKey: ['postventa-dashboard-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('after_sale_tickets')
        .select('*, vehicles(brand, model, plate)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // All repair orders
  const { data: repairOrders = [], isLoading: loadingR } = useQuery({
    queryKey: ['postventa-dashboard-repairs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_orders')
        .select('*, vehicles(brand, model, plate)')
        .in('status', ['pendiente', 'en_curso'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // KPIs
  const kpis = useMemo(() => {
    const pending = tickets.filter((t: any) => t.validation_status === 'pendiente').length;
    const resolvedThisWeek = tickets.filter(
      (t: any) => t.validation_status === 'validado' && t.validation_date && t.validation_date >= weekStart
    ).length;
    const openRepairs = repairOrders.length;
    return { pending, resolvedThisWeek, openRepairs };
  }, [tickets, repairOrders, weekStart]);

  // Pending tickets
  const pendingTickets = useMemo(() =>
    tickets.filter((t: any) => t.validation_status === 'pendiente')
      .slice(0, 10),
  [tickets]);

  // Pending repair orders
  const pendingRepairs = useMemo(() =>
    repairOrders.slice(0, 10),
  [repairOrders]);

  if (loadingT || loadingR) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  const kpiCards = [
    { label: 'Tickets pendientes', value: kpis.pending, icon: ClipboardList, color: kpis.pending > 0 ? 'text-amber-600' : 'text-muted-foreground', bg: kpis.pending > 0 ? 'bg-amber-100' : 'bg-muted/50' },
    { label: 'Órdenes abiertas', value: kpis.openRepairs, icon: Wrench, color: kpis.openRepairs > 0 ? 'text-destructive' : 'text-muted-foreground', bg: kpis.openRepairs > 0 ? 'bg-destructive/10' : 'bg-muted/50' },
    { label: 'Resueltos esta semana', value: kpis.resolvedThisWeek, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Panel Postventa</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Tickets y órdenes de reparación</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map(kpi => (
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
        {/* Pending tickets */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Tickets pendientes de validar
              </CardTitle>
              <Badge variant={kpis.pending > 0 ? 'destructive' : 'secondary'}>{kpis.pending}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin tickets pendientes. ¡Todo validado!</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto">
                {pendingTickets.map((t: any) => (
                  <button key={t.id} onClick={() => navigate(`/vehicles/${t.vehicle_id}`)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                    <ClipboardList className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.task_description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.vehicles?.brand} {t.vehicles?.model} ({t.vehicles?.plate}) · {formatDate(t.request_date)}
                      </p>
                      <p className="text-xs text-muted-foreground">Solicitado por: {t.requested_by_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open repair orders */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent" /> Órdenes de reparación activas
              </CardTitle>
              <Badge variant={kpis.openRepairs > 0 ? 'destructive' : 'secondary'}>{kpis.openRepairs}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingRepairs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin órdenes activas.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto">
                {pendingRepairs.map((r: any) => {
                  const isOverdue = r.estimated_end_date && new Date(r.estimated_end_date) < now;
                  return (
                    <button key={r.id} onClick={() => navigate(`/vehicles/${r.vehicle_id}`)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm',
                        isOverdue && 'bg-destructive/5 border border-destructive/20',
                      )}>
                      <Wrench className={cn('h-4 w-4 mt-0.5 shrink-0', isOverdue ? 'text-destructive' : 'text-accent')} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.observations || 'Orden de reparación'}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.vehicles?.brand} {r.vehicles?.model} ({r.vehicles?.plate})
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{r.status}</Badge>
                          {r.estimated_end_date && (
                            <span className={cn('text-xs', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                              Est: {formatDate(r.estimated_end_date)}
                              {isOverdue && ' · Vencida'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
