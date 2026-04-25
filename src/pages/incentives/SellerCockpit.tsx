import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { format } from 'date-fns';
import { Loader2, Car, TrendingUp, Landmark } from 'lucide-react';
import { ProgressCard } from '@/components/incentives/ProgressCard';
import { BonusBreakdown } from '@/components/incentives/BonusBreakdown';
import { TeamRanking } from '@/components/incentives/TeamRanking';
import { LevelProgressCard } from '@/components/incentives/LevelProgressCard';
import { IncentiveSimulator } from '@/components/incentives/IncentiveSimulator';

export default function SellerCockpit() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const currentPeriod = format(new Date(), 'yyyy-MM');
  const userId = user?.id;

  // Trigger recalc on load
  useEffect(() => {
    if (!userId) return;
    supabase.rpc('fn_recalc_seller_monthly_stats', { p_user_id: userId, p_period: currentPeriod });
  }, [userId, currentPeriod]);

  // My stats
  const { data: myStats, isLoading } = useQuery({
    queryKey: ['seller-stats', userId, currentPeriod],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500));
      const { data, error } = await supabase
        .from('seller_monthly_stats')
        .select('*')
        .eq('user_id', userId!)
        .eq('period', currentPeriod)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // My objectives
  const { data: objectives = [] } = useQuery({
    queryKey: ['my-objectives', userId, currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_objectives')
        .select('*')
        .eq('period', currentPeriod);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const myObjective = useMemo(() => {
    const individual = objectives.find((o: any) => o.scope === 'individual' && o.target_user_id === userId);
    if (individual) return individual;
    const global = objectives.find((o: any) => o.scope === 'global');
    return global || { target_sales: 0, target_margin: 0, target_financed: 0 };
  }, [objectives, userId]);

  // All sellers stats for ranking
  const { data: allStats = [] } = useQuery({
    queryKey: ['all-seller-stats', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_monthly_stats')
        .select('*')
        .eq('period', currentPeriod);
      if (error) throw error;
      return data || [];
    },
  });

  // Profiles for names
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Commercial levels
  const { data: levels = [] } = useQuery({
    queryKey: ['commercial-levels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('commercial_levels').select('*').order('min_points');
      if (error) throw error;
      return data || [];
    },
  });

  // Incentive tiers for simulator
  const { data: tiers = [] } = useQuery({
    queryKey: ['incentive-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('incentive_tiers').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const rankingData = useMemo(() => {
    return allStats.map((s: any) => {
      const profile = profiles.find((p: any) => p.user_id === s.user_id);
      return {
        user_id: s.user_id,
        full_name: profile?.full_name || 'Vendedor',
        total_sales: s.total_sales || 0,
        total_margin: s.total_margin || 0,
      };
    });
  }, [allStats, profiles]);

  if (!userId) return null;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stats = myStats || { total_sales: 0, total_margin: 0, total_financed: 0, bonus_sales: 0, bonus_margin: 0, bonus_financed: 0, bonus_total: 0, total_points: 0, level_name: null };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cockpit Comercial</h1>
        <p className="text-sm text-muted-foreground">Tu rendimiento de {format(new Date(), 'MMMM yyyy')}</p>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ProgressCard label="Ventas del mes" current={stats.total_sales} target={myObjective.target_sales} icon={Car} />
        <ProgressCard label="Margen generado" current={stats.total_margin} target={myObjective.target_margin} icon={TrendingUp} format="currency" />
        <ProgressCard label="Financiaciones" current={stats.total_financed} target={myObjective.target_financed} icon={Landmark} />
      </div>

      {/* Level + Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LevelProgressCard
          currentPoints={stats.total_points || 0}
          currentLevel={stats.level_name || null}
          levels={levels.map((l: any) => ({ name: l.name, min_points: l.min_points }))}
        />
        <IncentiveSimulator
          currentSales={stats.total_sales || 0}
          currentMargin={stats.total_margin || 0}
          currentFinanced={stats.total_financed || 0}
          currentBonus={stats.bonus_total || 0}
          tiers={tiers.map((t: any) => ({ category: t.category, threshold: t.threshold, bonus_amount: t.bonus_amount }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BonusBreakdown
          bonusSales={stats.bonus_sales}
          bonusMargin={stats.bonus_margin}
          bonusFinanced={stats.bonus_financed}
          bonusTotal={stats.bonus_total}
        />
        <TeamRanking data={rankingData} />
      </div>
    </div>
  );
}
