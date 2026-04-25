import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];

export default function StatsPage() {
  const { data: incidents = [], isLoading: li } = useQuery({
    queryKey: ['pv-stats-incidents'],
    queryFn: async () => { const { data, error } = await supabase.from('pv_incidents').select('incident_type, severity, status, opened_at, closed_at, warranty_covered, vehicles(brand, model)'); if (error) throw error; return data || []; },
  });

  const { data: repairs = [], isLoading: lr } = useQuery({
    queryKey: ['pv-stats-repairs'],
    queryFn: async () => { const { data, error } = await supabase.from('pv_repairs').select('status, cost_company, cost_warranty, created_at, vehicles(brand, model)').eq('status', 'finalizada'); if (error) throw error; return data || []; },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['pv-stats-claims'],
    queryFn: async () => { const { data, error } = await supabase.from('pv_claims').select('claim_type, status, compensation_amount'); if (error) throw error; return data || []; },
  });

  const stats = useMemo(() => {
    // Incidents by type
    const byType: Record<string, number> = {};
    incidents.forEach((i: any) => { byType[i.incident_type] = (byType[i.incident_type] || 0) + 1; });
    const incidentsByType = Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Avg resolution time
    const closed = incidents.filter((i: any) => i.closed_at && i.opened_at);
    const avgDays = closed.length > 0 ? Math.round(closed.reduce((s: number, i: any) => s + differenceInDays(new Date(i.closed_at), new Date(i.opened_at)), 0) / closed.length) : 0;

    // Warranty covered vs not
    const covered = incidents.filter((i: any) => i.warranty_covered === true).length;
    const notCovered = incidents.filter((i: any) => i.warranty_covered === false).length;
    const warrantyCoverage = [
      { name: 'Cubierto', value: covered },
      { name: 'No cubierto', value: notCovered },
      { name: 'Sin determinar', value: incidents.length - covered - notCovered },
    ].filter(d => d.value > 0);

    // Problematic models
    const modelCount: Record<string, number> = {};
    incidents.forEach((i: any) => {
      const key = `${i.vehicles?.brand || '?'} ${i.vehicles?.model || '?'}`;
      modelCount[key] = (modelCount[key] || 0) + 1;
    });
    const problematicModels = Object.entries(modelCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Monthly costs
    const monthlyCosts: Record<string, number> = {};
    repairs.forEach((r: any) => {
      const month = (r.created_at || '').slice(0, 7);
      if (month) monthlyCosts[month] = (monthlyCosts[month] || 0) + (r.cost_company || 0);
    });
    const monthlyCostData = Object.entries(monthlyCosts).sort().slice(-12).map(([month, cost]) => ({ month, cost: Math.round(cost) }));

    return { incidentsByType, avgDays, warrantyCoverage, problematicModels, monthlyCostData, totalClaims: claims.length };
  }, [incidents, repairs, claims]);

  if (li || lr) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Estadísticas Postventa</h1>
        <p className="text-sm text-muted-foreground">Análisis del departamento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">Total incidencias</p><p className="text-3xl font-bold">{incidents.length}</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">Tiempo medio resolución</p><p className="text-3xl font-bold">{stats.avgDays} días</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">Reclamaciones totales</p><p className="text-3xl font-bold">{stats.totalClaims}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Incidencias por tipo</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.incidentsByType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cobertura de garantía</CardTitle></CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {stats.warrantyCoverage.length === 0 ? <p className="text-muted-foreground">Sin datos</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={stats.warrantyCoverage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {stats.warrantyCoverage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Modelos más problemáticos</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.problematicModels} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Coste mensual postventa</CardTitle></CardHeader>
          <CardContent className="h-72">
            {stats.monthlyCostData.length === 0 ? <p className="text-muted-foreground text-center py-8">Sin datos</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyCostData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={(v: any) => `${v} €`} /><Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
