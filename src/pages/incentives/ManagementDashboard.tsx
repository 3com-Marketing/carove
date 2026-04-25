import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Car, TrendingUp, Landmark, BarChart3 } from 'lucide-react';
import { SellerPerformanceTable } from '@/components/incentives/SellerPerformanceTable';
import { FinanceVolumeTable } from '@/components/incentives/FinanceVolumeTable';
import { CommercialRadar } from '@/components/incentives/CommercialRadar';
import { RappelProgressCard } from '@/components/incentives/RappelProgressCard';

export default function ManagementDashboard() {
  const { isAdmin } = useRole();
  const currentPeriod = format(new Date(), 'yyyy-MM');

  // Get all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-incentives-mgmt'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Recalc all sellers
  useEffect(() => {
    if (!isAdmin || profiles.length === 0) return;
    profiles.forEach((p: any) => {
      supabase.rpc('fn_recalc_seller_monthly_stats', { p_user_id: p.user_id, p_period: currentPeriod });
    });
  }, [profiles, currentPeriod, isAdmin]);

  // All stats
  const { data: allStats = [], isLoading } = useQuery({
    queryKey: ['mgmt-all-stats', currentPeriod, profiles.length],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 800));
      const { data, error } = await supabase
        .from('seller_monthly_stats')
        .select('*')
        .eq('period', currentPeriod);
      if (error) throw error;
      return data || [];
    },
    enabled: profiles.length > 0,
  });

  // Objectives
  const { data: globalObj } = useQuery({
    queryKey: ['mgmt-objectives', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_objectives')
        .select('*')
        .eq('period', currentPeriod)
        .eq('scope', 'global')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Finance simulations (approved) for volume table
  const { data: simulationsData = [] } = useQuery({
    queryKey: ['mgmt-finance-volume', currentPeriod],
    queryFn: async () => {
      const monthStart = `${currentPeriod}-01`;
      const { data, error } = await supabase
        .from('finance_simulations')
        .select('id, entity_name_snapshot, financed_amount')
        .eq('status', 'aprobada')
        .gte('created_at', monthStart);
      if (error) throw error;
      return data || [];
    },
  });

  // Finance rappels
  const { data: rappels = [] } = useQuery({
    queryKey: ['finance-rappels-mgmt'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finance_rappels').select('*').order('entity_name').order('threshold_volume');
      if (error) throw error;
      return data || [];
    },
  });

  const performanceData = useMemo(() => {
    return allStats.map((s: any) => {
      const profile = profiles.find((p: any) => p.user_id === s.user_id);
      return {
        full_name: profile?.full_name || 'Vendedor',
        total_sales: s.total_sales || 0,
        total_margin: s.total_margin || 0,
        total_financed: s.total_financed || 0,
        bonus_total: s.bonus_total || 0,
      };
    });
  }, [allStats, profiles]);

  const financeVolumeData = useMemo(() => {
    const map = new Map<string, { operations: number; volume: number }>();
    simulationsData.forEach((s: any) => {
      const entity = s.entity_name_snapshot;
      const existing = map.get(entity) || { operations: 0, volume: 0 };
      existing.operations += 1;
      existing.volume += Number(s.financed_amount) || 0;
      map.set(entity, existing);
    });
    return Array.from(map.entries()).map(([entity, data]) => ({ entity, ...data }));
  }, [simulationsData]);

  // Radar data
  const radarData = useMemo(() => {
    const target = globalObj || { target_sales: 0, target_margin: 0, target_financed: 0 };
    return allStats.map((s: any) => {
      const profile = profiles.find((p: any) => p.user_id === s.user_id);
      return {
        full_name: profile?.full_name || 'Vendedor',
        total_sales: s.total_sales || 0,
        total_margin: s.total_margin || 0,
        total_financed: s.total_financed || 0,
        target_sales: (target as any).target_sales || 0,
        target_margin: (target as any).target_margin || 0,
        target_financed: (target as any).target_financed || 0,
      };
    });
  }, [allStats, profiles, globalObj]);

  // Rappel progress data
  const rappelEntities = useMemo(() => {
    const entityNames = Array.from(new Set(rappels.map((r: any) => r.entity_name)));
    return entityNames.map(name => {
      const entityTiers = rappels.filter((r: any) => r.entity_name === name).map((r: any) => ({
        threshold_volume: r.threshold_volume,
        rappel_percent: r.rappel_percent,
      }));
      const volumeData = financeVolumeData.find(v => v.entity === name);
      return {
        entity_name: name,
        current_volume: volumeData?.volume || 0,
        operations: volumeData?.operations || 0,
        tiers: entityTiers,
      };
    });
  }, [rappels, financeVolumeData]);

  if (!isAdmin) return <Navigate to="/incentives" replace />;

  const totalSales = allStats.reduce((sum: number, s: any) => sum + (s.total_sales || 0), 0);
  const totalMargin = allStats.reduce((sum: number, s: any) => sum + (s.total_margin || 0), 0);
  const totalFinanced = allStats.reduce((sum: number, s: any) => sum + (s.total_financed || 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const summaryCards = [
    { label: 'Ventas totales', value: totalSales, target: (globalObj as any)?.target_sales, icon: Car },
    { label: 'Margen total', value: `${totalMargin.toLocaleString('es-ES')}€`, icon: TrendingUp },
    { label: 'Financiaciones', value: totalFinanced, icon: Landmark },
    { label: 'Vendedores activos', value: allStats.length, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Panel de Gerencia</h1>
        <p className="text-sm text-muted-foreground">Rendimiento comercial — {format(new Date(), 'MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  {card.target && <p className="text-xs text-muted-foreground">Obj: {card.target}</p>}
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CommercialRadar sellers={radarData} />

      <SellerPerformanceTable data={performanceData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinanceVolumeTable data={financeVolumeData} />
        <RappelProgressCard entities={rappelEntities} />
      </div>
    </div>
  );
}
