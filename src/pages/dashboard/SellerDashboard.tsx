import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/constants';
import {
  Phone, Clock, Target, PlusCircle, ArrowRight, Loader2, Search,
  CalendarClock, MessageSquare, Car, Trophy,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useMemo, useState, useEffect } from 'react';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ActivityDialog } from '@/components/commercial/ActivityDialog';
import { ACTIVITY_CHANNEL_LABELS, ACTIVITY_RESULT_LABELS } from '@/lib/types';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const now = new Date();
  const userId = user?.id;

  // Activities for this seller
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ['seller-dashboard-activities', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_activities')
        .select('*')
        .eq('status', 'activa')
        .eq('user_id', userId!)
        .order('activity_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Demands for this seller
  const { data: demands = [] } = useQuery({
    queryKey: ['seller-dashboard-demands', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demands')
        .select('*, buyers(name, last_name)')
        .eq('user_id', userId!)
        .eq('status', 'activa')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Recent sales by this seller
  const { data: sales = [] } = useQuery({
    queryKey: ['seller-dashboard-sales', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, vehicles(brand, model, plate, status)')
        .eq('seller_id', userId!)
        .order('sale_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Recent demand match notifications
  const { data: matchNotifications = [] } = useQuery({
    queryKey: ['seller-dashboard-matches', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .eq('type', 'demand_match')
        .eq('seen', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Incentives mini widget
  const currentPeriod = format(now, 'yyyy-MM');

  useEffect(() => {
    if (userId) {
      supabase.rpc('fn_recalc_seller_monthly_stats', { p_user_id: userId, p_period: currentPeriod });
    }
  }, [userId, currentPeriod]);

  const { data: myStats } = useQuery({
    queryKey: ['seller-dash-stats', userId, currentPeriod],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500));
      const { data } = await supabase
        .from('seller_monthly_stats')
        .select('*')
        .eq('user_id', userId!)
        .eq('period', currentPeriod)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: myObjective } = useQuery({
    queryKey: ['seller-dash-objective', userId, currentPeriod],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales_objectives')
        .select('*')
        .eq('period', currentPeriod)
        .eq('scope', 'global')
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // KPIs
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const kpis = useMemo(() => {
    const today = activities.filter((a: any) => a.activity_date >= todayStart && a.activity_date <= todayEnd).length;
    const week = activities.filter((a: any) => a.activity_date >= weekStart).length;
    const month = activities.filter((a: any) => a.activity_date >= monthStart).length;
    const pendingFollowUps = activities.filter(
      (a: any) => a.follow_up_date && new Date(a.follow_up_date) <= now
    ).length;
    return { today, week, month, pendingFollowUps, activeDemands: demands.length };
  }, [activities, demands, todayStart, todayEnd, weekStart, monthStart]);

  // Pending follow-ups
  const pendingFollowUps = useMemo(() => {
    return activities
      .filter((a: any) => a.follow_up_date && new Date(a.follow_up_date) <= now)
      .sort((a: any, b: any) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
      .slice(0, 8);
  }, [activities]);

  // Overdue follow-ups (more than 2 days overdue)
  const isOverdue = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diff > 2;
  };

  if (!userId) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  const kpiCards = [
    { label: 'Actividades hoy', value: kpis.today, icon: Phone, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Esta semana', value: kpis.week, icon: CalendarClock, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Seguimientos pend.', value: kpis.pendingFollowUps, icon: Clock, color: kpis.pendingFollowUps > 0 ? 'text-destructive' : 'text-muted-foreground', bg: kpis.pendingFollowUps > 0 ? 'bg-destructive/10' : 'bg-muted/50' },
    { label: 'Demandas activas', value: kpis.activeDemands, icon: Target, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mi Panel</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Tu actividad comercial del día</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={() => setActivityDialogOpen(true)} size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Nueva actividad</span>
          </Button>
          <Button onClick={() => navigate('/vehicles/new')} size="sm" className="gradient-brand border-0 text-white hover:opacity-90">
            <PlusCircle className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Nuevo vehículo</span>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending follow-ups */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Seguimientos pendientes
              </CardTitle>
              <Badge variant={kpis.pendingFollowUps > 0 ? 'destructive' : 'secondary'}>
                {kpis.pendingFollowUps}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin seguimientos pendientes. ¡Todo al día!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {pendingFollowUps.map((a: any) => (
                  <button key={a.id} onClick={() => navigate(`/clients/${a.buyer_id}`)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm',
                      isOverdue(a.follow_up_date) && 'bg-destructive/5 border border-destructive/20',
                    )}>
                    <Clock className={cn('h-4 w-4 mt-0.5 shrink-0', isOverdue(a.follow_up_date) ? 'text-destructive' : 'text-amber-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.follow_up_date), 'dd/MM/yyyy', { locale: es })}
                        {isOverdue(a.follow_up_date) && <span className="text-destructive ml-1 font-medium">· Vencido</span>}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active demands */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-accent" /> Demandas activas
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/demands')} className="text-xs">
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {demands.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Sin demandas activas</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/demands')}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Crear demanda
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {demands.slice(0, 6).map((d: any) => {
                  const buyerName = d.buyers ? `${d.buyers.name} ${d.buyers.last_name || ''}`.trim() : 'Cliente';
                  return (
                    <button key={d.id} onClick={() => navigate(`/demands/${d.id}`)}
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{buyerName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.brand_preferences?.join(', ') || 'Sin marca'} · {d.intention_level}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{d.intention_level}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match notifications */}
      {matchNotifications.length > 0 && (
        <Card className="border shadow-sm border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" /> Coincidencias recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchNotifications.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-background text-sm">
                  <Car className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                  <span className="text-foreground/80">{n.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent sales */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-accent" /> Mis últimas ventas
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')} className="text-xs">
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aún no tienes ventas registradas.</p>
          ) : (
            <div className="space-y-2">
              {sales.map((s: any) => (
                <button key={s.id} onClick={() => navigate(`/vehicles/${s.vehicle_id}`)}
                  className="w-full text-left flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {s.vehicles && <StatusBadge status={s.vehicles.status} />}
                    <div>
                      <p className="text-sm font-medium">{s.vehicles?.brand} {s.vehicles?.model}</p>
                      <p className="text-xs text-muted-foreground">{s.vehicles?.plate} · {formatDate(s.sale_date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(s.sale_price)}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incentives mini widget */}
      {myStats && (
        <Card className="border shadow-sm border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Mi Cockpit</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/incentives')} className="text-xs">
                Ver completo <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Ventas del mes</p>
                <p className="text-lg font-bold">{myStats.total_sales} <span className="text-sm font-normal text-muted-foreground">/ {(myObjective as any)?.target_sales || '—'}</span></p>
                {(myObjective as any)?.target_sales > 0 && (
                  <Progress value={Math.min(Math.round(((myStats.total_sales || 0) / (myObjective as any).target_sales) * 100), 100)} className="h-1.5 mt-1" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bonus estimado</p>
                <p className="text-lg font-bold text-primary">{(myStats.bonus_total || 0).toLocaleString('es-ES')}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ActivityDialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen} onSaved={() => refetchActivities()} />
    </div>
  );
}
