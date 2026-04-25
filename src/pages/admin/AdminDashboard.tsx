import { useState, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, Activity, Phone, MessageSquare, Mail, Users as UsersIcon,
  AlertTriangle, Clock, ShieldAlert, TrendingUp, History, ExternalLink,
} from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

type CommercialActivity = {
  id: string;
  user_id: string;
  user_name: string;
  buyer_id: string;
  activity_date: string;
  channel: string;
  subject: string;
  result: string;
  follow_up_date: string | null;
  observations: string;
  status: string;
};

type Buyer = {
  id: string;
  name: string;
  last_name: string | null;
  active: boolean;
};

// ── Helpers ──────────────────────────────────────────────

const now = new Date();
const todayStart = startOfDay(now).toISOString();
const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
const monthStart = startOfMonth(now).toISOString();
const sevenDaysAgo = subDays(now, 7).toISOString();
const fifteenDaysAgo = subDays(now, 15).toISOString();
const threeDaysAgo = subDays(now, 3).toISOString();

function kpiColor(value: number, yellow: number, red: number) {
  if (value >= red) return 'text-destructive';
  if (value >= yellow) return 'text-amber-600';
  return 'text-emerald-600';
}

function kpiBg(value: number, yellow: number, red: number) {
  if (value >= red) return 'bg-destructive/10 border-destructive/30';
  if (value >= yellow) return 'bg-amber-50 border-amber-200';
  return 'bg-emerald-50 border-emerald-200';
}

function cellBg(value: number, threshold: number) {
  return value > threshold ? 'bg-destructive/10 text-destructive font-semibold' : '';
}

const CHANNEL_LABELS: Record<string, string> = {
  llamada_saliente: 'Llamadas sal.',
  llamada_entrante: 'Llamadas ent.',
  whatsapp: 'WhatsApp',
  email: 'Email',
  reunion_presencial: 'Reuniones',
  videollamada: 'Videollamada',
  gestion_postventa: 'Postventa',
  incidencia: 'Incidencia',
  seguimiento_interno: 'Seg. interno',
};

// ── Section wrapper ─────────────────────────────────────

function Section({ title, icon: Icon, defaultOpen = true, children }: {
  title: string; icon: React.ElementType; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-left text-sm font-semibold hover:bg-muted transition-colors">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{title}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ── Main component ──────────────────────────────────────

export default function AdminDashboard() {
  const { isAdmin } = useRole();
  const [filterUser, setFilterUser] = useState<string>('all');

  // Fetch all active activities
  const { data: activities = [] } = useQuery({
    queryKey: ['admin-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_activities')
        .select('id, user_id, user_name, buyer_id, activity_date, channel, subject, result, follow_up_date, observations, status')
        .eq('status', 'activa')
        .order('activity_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommercialActivity[];
    },
    enabled: isAdmin,
  });

  // Fetch buyers for cross-referencing
  const { data: buyers = [] } = useQuery({
    queryKey: ['admin-buyers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyers')
        .select('id, name, last_name, active')
        .eq('active', true);
      if (error) throw error;
      return (data ?? []) as Buyer[];
    },
    enabled: isAdmin,
  });

  // Fetch profiles list for the user filter
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('active', true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  // ── Derived data ────────────────────────────────────

  const buyerMap = useMemo(() => {
    const m = new Map<string, Buyer>();
    buyers.forEach(b => m.set(b.id, b));
    return m;
  }, [buyers]);

  const filtered = useMemo(
    () => filterUser === 'all' ? activities : activities.filter(a => a.user_id === filterUser),
    [activities, filterUser],
  );

  // KPIs
  const kpis = useMemo(() => {
    const today = filtered.filter(a => a.activity_date >= todayStart).length;
    const week = filtered.filter(a => a.activity_date >= weekStart).length;
    const demands = filtered.filter(a => ['interesado', 'pendiente_decision'].includes(a.result)).length;
    const pendingFollowUps = filtered.filter(
      a => a.follow_up_date && a.follow_up_date <= now.toISOString() && a.result === 'seguimiento_x_dias',
    ).length;
    const postventaOpen = filtered.filter(a => a.channel === 'gestion_postventa').length;
    const incidentsOpen = filtered.filter(a => a.result === 'incidencia_detectada').length;
    const overdue = filtered.filter(
      a => a.follow_up_date && a.follow_up_date < threeDaysAgo,
    ).length;
    return { today, week, demands, pendingFollowUps, postventaOpen, incidentsOpen, overdue };
  }, [filtered]);

  // Per-commercial aggregation
  const commercialRows = useMemo(() => {
    const map = new Map<string, {
      user_name: string; today: number; week: number; followUps: number; incidents: number; postventa: number;
    }>();
    activities.forEach(a => {
      if (!map.has(a.user_id)) {
        map.set(a.user_id, { user_name: a.user_name, today: 0, week: 0, followUps: 0, incidents: 0, postventa: 0 });
      }
      const r = map.get(a.user_id)!;
      if (a.activity_date >= todayStart) r.today++;
      if (a.activity_date >= weekStart) r.week++;
      if (a.follow_up_date && a.follow_up_date <= now.toISOString() && a.result === 'seguimiento_x_dias') r.followUps++;
      if (a.result === 'incidencia_detectada') r.incidents++;
      if (a.channel === 'gestion_postventa') r.postventa++;
    });
    return Array.from(map.entries()).map(([id, v]) => ({ user_id: id, ...v }));
  }, [activities]);

  // Alerts
  const alerts = useMemo(() => {
    const items: { type: string; label: string; link: string }[] = [];

    // Clients without contact in 7+ days
    const buyerLastContact = new Map<string, { date: string; user_name: string }>();
    activities.forEach(a => {
      const prev = buyerLastContact.get(a.buyer_id);
      if (!prev || a.activity_date > prev.date) buyerLastContact.set(a.buyer_id, { date: a.activity_date, user_name: a.user_name });
    });
    buyerLastContact.forEach((v, buyerId) => {
      if (v.date < sevenDaysAgo) {
        const b = buyerMap.get(buyerId);
        if (b) items.push({ type: 'sin_contacto', label: `${b.name} ${b.last_name || ''} — sin contacto 7+ días (${v.user_name})`, link: `/clients/${buyerId}` });
      }
    });

    // Overdue follow-ups
    filtered.filter(a => a.follow_up_date && a.follow_up_date < now.toISOString() && a.result === 'seguimiento_x_dias').forEach(a => {
      const b = buyerMap.get(a.buyer_id);
      items.push({ type: 'seguimiento', label: `Seguimiento vencido: ${b?.name || 'Cliente'} — ${a.subject} (${a.user_name})`, link: `/clients/${a.buyer_id}` });
    });

    // Open incidents > 3 days
    filtered.filter(a => a.result === 'incidencia_detectada' && a.activity_date < threeDaysAgo).forEach(a => {
      const b = buyerMap.get(a.buyer_id);
      items.push({ type: 'incidencia', label: `Incidencia abierta >3d: ${b?.name || 'Cliente'} — ${a.subject} (${a.user_name})`, link: `/clients/${a.buyer_id}` });
    });

    return items;
  }, [filtered, buyerMap, activities]);

  // Postventa table
  const postventaRows = useMemo(() => {
    const map = new Map<string, { user_name: string; followUps: number; incOpen: number; incResolved: number }>();
    activities.filter(a => a.channel === 'gestion_postventa' || a.channel === 'incidencia' || a.result === 'incidencia_detectada' || a.result === 'incidencia_resuelta').forEach(a => {
      if (!map.has(a.user_id)) map.set(a.user_id, { user_name: a.user_name, followUps: 0, incOpen: 0, incResolved: 0 });
      const r = map.get(a.user_id)!;
      if (a.follow_up_date && a.follow_up_date <= now.toISOString() && a.result === 'seguimiento_x_dias') r.followUps++;
      if (a.result === 'incidencia_detectada') r.incOpen++;
      if (a.result === 'incidencia_resuelta') r.incResolved++;
    });
    return Array.from(map.entries()).map(([id, v]) => ({ user_id: id, ...v }));
  }, [activities]);

  // Inactive clients (15+ days)
  const inactiveClients = useMemo(() => {
    const buyerLastContact = new Map<string, { date: string; user_name: string }>();
    activities.forEach(a => {
      const prev = buyerLastContact.get(a.buyer_id);
      if (!prev || a.activity_date > prev.date) buyerLastContact.set(a.buyer_id, { date: a.activity_date, user_name: a.user_name });
    });
    const result: { buyer: Buyer; lastDate: string; userName: string }[] = [];
    buyerLastContact.forEach((v, buyerId) => {
      if (v.date < fifteenDaysAgo) {
        const b = buyerMap.get(buyerId);
        if (b) result.push({ buyer: b, lastDate: v.date, userName: v.user_name });
      }
    });
    return result.sort((a, b) => a.lastDate.localeCompare(b.lastDate));
  }, [activities, buyerMap]);

  // Performance metrics (month)
  const performanceRows = useMemo(() => {
    const monthActivities = activities.filter(a => a.activity_date >= monthStart);
    const map = new Map<string, { user_name: string; total: number; channels: Record<string, number> }>();
    monthActivities.forEach(a => {
      if (!map.has(a.user_id)) map.set(a.user_id, { user_name: a.user_name, total: 0, channels: {} });
      const r = map.get(a.user_id)!;
      r.total++;
      r.channels[a.channel] = (r.channels[a.channel] || 0) + 1;
    });
    return Array.from(map.entries()).map(([id, v]) => ({ user_id: id, ...v }));
  }, [activities]);

  const channelKeys = useMemo(() => {
    const set = new Set<string>();
    performanceRows.forEach(r => Object.keys(r.channels).forEach(c => set.add(c)));
    return Array.from(set);
  }, [performanceRows]);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control Operativo</h1>
          <p className="text-sm text-muted-foreground">Radar de riesgo operativo — visibilidad total</p>
        </div>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos los comerciales" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los comerciales</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* BLOQUE 1 — KPIs */}
      <Section title="Resumen Global" icon={Activity} defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {([
            { label: 'Act. Hoy', value: kpis.today, y: 5, r: 0 },
            { label: 'Act. Semana', value: kpis.week, y: 15, r: 0 },
            { label: 'Demandas activas', value: kpis.demands, y: 3, r: 8 },
            { label: 'Seguim. pendientes', value: kpis.pendingFollowUps, y: 3, r: 6 },
            { label: 'Postventa abierta', value: kpis.postventaOpen, y: 2, r: 5 },
            { label: 'Incidencias', value: kpis.incidentsOpen, y: 2, r: 5 },
            { label: 'Tareas vencidas', value: kpis.overdue, y: 3, r: 10 },
          ] as const).map(k => (
            <Card key={k.label} className={`border ${kpiBg(k.value, k.y, k.r)}`}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpiColor(k.value, k.y, k.r)}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* BLOQUE 2 — Actividad por Comercial */}
      <Section title="Actividad por Comercial" icon={UsersIcon}>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comercial</TableHead>
                <TableHead className="text-right">Act. Hoy</TableHead>
                <TableHead className="text-right">Act. Semana</TableHead>
                <TableHead className="text-right">Seguim. pend.</TableHead>
                <TableHead className="text-right">Incidencias</TableHead>
                <TableHead className="text-right">Postventa pend.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commercialRows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>
              )}
              {commercialRows.map(r => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell className="text-right">{r.today}</TableCell>
                  <TableCell className="text-right">{r.week}</TableCell>
                  <TableCell className={`text-right ${cellBg(r.followUps, 3)}`}>{r.followUps}</TableCell>
                  <TableCell className={`text-right ${cellBg(r.incidents, 2)}`}>{r.incidents}</TableCell>
                  <TableCell className={`text-right ${cellBg(r.postventa, 3)}`}>{r.postventa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* BLOQUE 3 — Alertas Críticas */}
      <Section title="Alertas Críticas" icon={AlertTriangle}>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Sin alertas activas ✓</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="flex-1">{a.label}</span>
                <Link to={a.link}><Button variant="ghost" size="sm" className="h-7 px-2"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* BLOQUE 4 — Postventa */}
      <Section title="Postventa" icon={Clock}>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comercial</TableHead>
                <TableHead className="text-right">Seguim. pend.</TableHead>
                <TableHead className="text-right">Incid. abiertas</TableHead>
                <TableHead className="text-right">Incid. resueltas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postventaRows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin datos de postventa</TableCell></TableRow>
              )}
              {postventaRows.map(r => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell className={`text-right ${cellBg(r.followUps, 2)}`}>{r.followUps}</TableCell>
                  <TableCell className={`text-right ${cellBg(r.incOpen, 2)}`}>{r.incOpen}</TableCell>
                  <TableCell className="text-right text-emerald-600">{r.incResolved}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* BLOQUE 5 — Clientes sin Actividad */}
      <Section title="Clientes sin Actividad (15+ días)" icon={UsersIcon}>
        {inactiveClients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Todos los clientes tienen actividad reciente ✓</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Último contacto</TableHead>
                  <TableHead>Comercial</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveClients.slice(0, 20).map(c => (
                  <TableRow key={c.buyer.id}>
                    <TableCell className="font-medium">{c.buyer.name} {c.buyer.last_name || ''}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.lastDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>{c.userName}</TableCell>
                    <TableCell>
                      <Link to={`/clients/${c.buyer.id}`}><Button variant="ghost" size="sm" className="h-7 px-2"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* BLOQUE 6 — Métricas de Rendimiento */}
      <Section title="Métricas de Rendimiento (Mes)" icon={TrendingUp}>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comercial</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {channelKeys.map(c => (
                  <TableHead key={c} className="text-right">{CHANNEL_LABELS[c] || c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceRows.length === 0 && (
                <TableRow><TableCell colSpan={2 + channelKeys.length} className="text-center text-muted-foreground py-8">Sin datos este mes</TableCell></TableRow>
              )}
              {performanceRows.map(r => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell className="text-right font-semibold">{r.total}</TableCell>
                  {channelKeys.map(c => (
                    <TableCell key={c} className="text-right">{r.channels[c] || 0}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      {/* BLOQUE 7 — Historial Auditable */}
      <Section title="Historial Auditable" icon={History}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Últimas 20 actividades registradas. Para historial completo →{' '}
            <Link to="/commercial/activities" className="text-primary underline underline-offset-2">Ver registro completo</Link>
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comercial</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 20).map(a => {
                  const b = buyerMap.get(a.buyer_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(a.activity_date), 'dd/MM/yy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>{a.user_name}</TableCell>
                      <TableCell>
                        <Link to={`/clients/${a.buyer_id}`} className="text-primary hover:underline">
                          {b ? `${b.name} ${b.last_name || ''}` : 'Cliente'}
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{CHANNEL_LABELS[a.channel] || a.channel}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{a.subject}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{a.result.replace(/_/g, ' ')}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </Section>
    </div>
  );
}
