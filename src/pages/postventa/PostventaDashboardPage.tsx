import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/constants';
import {
  HeartHandshake, AlertTriangle, ShieldCheck, Wrench, Phone, Clock,
  UserX, Calendar, Loader2, ArrowRight, MessageSquareWarning, Scale,
  TrendingUp, BarChart3,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { startOfWeek, startOfMonth, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

type QuickFilter = 'all' | 'urgente' | 'hoy' | 'semana' | 'garantia' | 'sin_respuesta' | 'mio';

export default function PostventaDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const userId = user?.id;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const monthStart = startOfMonth(now).toISOString().slice(0, 10);
  const [filter, setFilter] = useState<QuickFilter>('all');

  const { data: incidents = [], isLoading: li } = useQuery({
    queryKey: ['pv-dash-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_incidents')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .neq('status', 'cerrada')
        .order('opened_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: claims = [], isLoading: lc } = useQuery({
    queryKey: ['pv-dash-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_claims')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .in('status', ['abierta', 'en_revision'])
        .order('opened_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: warranties = [] } = useQuery({
    queryKey: ['pv-dash-warranties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_warranties')
        .select('id')
        .gte('end_date', today);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['pv-dash-repairs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_repairs')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .in('status', ['pendiente', 'en_curso', 'esperando_piezas'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: followups = [], isLoading: lf } = useQuery({
    queryKey: ['pv-dash-followups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_followups')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .eq('status', 'pendiente')
        .order('scheduled_date', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Admin analytics
  const { data: allRepairsCosts = [] } = useQuery({
    queryKey: ['pv-dash-costs'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_repairs')
        .select('final_cost, cost_company, vehicle_id, created_at')
        .eq('status', 'finalizada');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allClaimsCosts = [] } = useQuery({
    queryKey: ['pv-dash-claims-costs'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pv_claims')
        .select('compensation_amount, created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const kpis = useMemo(() => {
    const urgentIncidents = incidents.filter((i: any) => i.severity === 'urgente').length;
    const followupsToday = followups.filter((f: any) => f.scheduled_date <= today).length;
    const oldCases = incidents.filter((i: any) => differenceInDays(now, new Date(i.opened_at)) > 15).length;

    return {
      openIncidents: incidents.length,
      openClaims: claims.length,
      activeWarranties: warranties.length,
      activeRepairs: repairs.length,
      followupsToday,
      urgentCases: urgentIncidents,
      oldCases,
    };
  }, [incidents, claims, warranties, repairs, followups, today]);

  const adminKpis = useMemo(() => {
    if (!isAdmin) return null;
    const totalCost = allRepairsCosts.reduce((s: number, r: any) => s + (r.cost_company || 0), 0)
      + allClaimsCosts.reduce((s: number, c: any) => s + (c.compensation_amount || 0), 0);
    const monthlyCosts = allRepairsCosts
      .filter((r: any) => r.created_at >= monthStart)
      .reduce((s: number, r: any) => s + (r.cost_company || 0), 0);
    return { totalCost, monthlyCosts };
  }, [isAdmin, allRepairsCosts, allClaimsCosts, monthStart]);

  // Filter incidents for list
  const filteredIncidents = useMemo(() => {
    let list = incidents;
    if (filter === 'urgente') list = list.filter((i: any) => i.severity === 'urgente');
    if (filter === 'hoy') list = list.filter((i: any) => i.opened_at?.slice(0, 10) === today);
    if (filter === 'semana') list = list.filter((i: any) => i.opened_at?.slice(0, 10) >= weekStart);
    if (filter === 'garantia') list = list.filter((i: any) => i.warranty_covered === true);
    if (filter === 'mio') list = list.filter((i: any) => i.assigned_to === userId);
    return list.slice(0, 10);
  }, [incidents, filter, today, weekStart, userId]);

  const loading = li || lc || lf;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const kpiCards = [
    { label: 'Incidencias abiertas', value: kpis.openIncidents, icon: AlertTriangle, color: kpis.openIncidents > 0 ? 'text-amber-600' : 'text-muted-foreground', bg: kpis.openIncidents > 0 ? 'bg-amber-100' : 'bg-muted/40' },
    { label: 'Reclamaciones', value: kpis.openClaims, icon: MessageSquareWarning, color: kpis.openClaims > 0 ? 'text-destructive' : 'text-muted-foreground', bg: kpis.openClaims > 0 ? 'bg-destructive/10' : 'bg-muted/40' },
    { label: 'Garantías activas', value: kpis.activeWarranties, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Reparaciones en curso', value: kpis.activeRepairs, icon: Wrench, color: kpis.activeRepairs > 0 ? 'text-blue-600' : 'text-muted-foreground', bg: kpis.activeRepairs > 0 ? 'bg-blue-50' : 'bg-muted/40' },
    { label: 'Seguimientos hoy', value: kpis.followupsToday, icon: Phone, color: kpis.followupsToday > 0 ? 'text-violet-600' : 'text-muted-foreground', bg: kpis.followupsToday > 0 ? 'bg-violet-50' : 'bg-muted/40' },
    { label: 'Casos urgentes', value: kpis.urgentCases, icon: Clock, color: kpis.urgentCases > 0 ? 'text-destructive' : 'text-muted-foreground', bg: kpis.urgentCases > 0 ? 'bg-destructive/10' : 'bg-muted/40' },
  ];

  const filters: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'urgente', label: 'Urgente' },
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'garantia', label: 'En garantía' },
    { key: 'mio', label: 'Asignado a mí' },
  ];

  const severityColor: Record<string, string> = {
    leve: 'bg-emerald-100 text-emerald-700',
    media: 'bg-amber-100 text-amber-700',
    alta: 'bg-orange-100 text-orange-700',
    urgente: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-primary" /> Postventa
          </h1>
          <p className="text-sm text-muted-foreground">Panel de control del departamento</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/postventa/followups')}>
            <Phone className="h-4 w-4 mr-1" /> Seguimientos
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/postventa/incidents')}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Nueva incidencia
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', kpi.bg)}>
                  <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin analytics */}
      {isAdmin && adminKpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coste postventa total</p>
                <p className="text-2xl font-bold">{adminKpis.totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coste este mes</p>
                <p className="text-2xl font-bold">{adminKpis.monthlyCosts.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <Button key={f.key} size="sm" variant={filter === f.key ? 'default' : 'outline'}
            onClick={() => setFilter(f.key)} className="text-xs h-7">
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Incidencias abiertas
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/postventa/incidents')}>
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin incidencias con este filtro</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {filteredIncidents.map((i: any) => (
                  <div key={i.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm cursor-pointer"
                    onClick={() => navigate('/postventa/incidents')}>
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{i.description || 'Sin descripción'}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.vehicles?.brand} {i.vehicles?.model} ({i.vehicles?.plate}) · {i.buyers?.name} {i.buyers?.last_name || ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn('text-[10px] px-1.5 py-0', severityColor[i.severity])}>{i.severity}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{i.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDate(i.opened_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Followups today */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-violet-500" /> Seguimientos pendientes
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/postventa/followups')}>
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {followups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin seguimientos pendientes</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {followups.slice(0, 10).map((f: any) => {
                  const overdue = f.scheduled_date < today;
                  return (
                    <div key={f.id} className={cn(
                      'flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm cursor-pointer',
                      overdue && 'bg-destructive/5 border border-destructive/20',
                    )} onClick={() => navigate('/postventa/followups')}>
                      <Calendar className={cn('h-4 w-4 mt-0.5 shrink-0', overdue ? 'text-destructive' : 'text-violet-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{f.buyers?.name} {f.buyers?.last_name || ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.vehicles?.brand} {f.vehicles?.model} · {f.followup_type}
                        </p>
                        <p className={cn('text-xs mt-0.5', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          {formatDate(f.scheduled_date)} {overdue && '· Vencido'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-destructive" /> Reclamaciones abiertas
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/postventa/claims')}>
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin reclamaciones abiertas</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {claims.slice(0, 8).map((c: any) => (
                  <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm cursor-pointer"
                    onClick={() => navigate('/postventa/claims')}>
                    <MessageSquareWarning className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.buyers?.name} {c.buyers?.last_name || ''} · {c.claim_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repairs */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" /> Reparaciones activas
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/postventa/repairs')}>
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {repairs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin reparaciones activas</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {repairs.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm cursor-pointer"
                    onClick={() => navigate('/postventa/repairs')}>
                    <Wrench className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.diagnosis || 'Reparación'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.vehicles?.brand} {r.vehicles?.model} · {r.buyers?.name} {r.buyers?.last_name || ''}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">{r.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
