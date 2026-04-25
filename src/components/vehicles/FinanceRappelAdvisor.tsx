import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Landmark, TrendingUp, Sparkles, Info } from 'lucide-react';

function getPeriodStart(periodType: string): string {
  const now = new Date();
  switch (periodType) {
    case 'trimestral': return format(startOfQuarter(now), 'yyyy-MM-dd');
    case 'anual': return format(startOfYear(now), 'yyyy-MM-dd');
    default: return format(startOfMonth(now), 'yyyy-MM-dd');
  }
}

const periodLabels: Record<string, string> = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };

interface Props {
  entityName: string | null;
  financedAmount: number;
}

interface EntityAnalysis {
  entityName: string;
  currentVolume: number;
  projectedVolume: number;
  currentTierPercent: number | null;
  nextTierThreshold: number | null;
  nextTierPercent: number | null;
  projectedTierPercent: number | null;
  triggersNextTier: boolean;
  remaining: number | null;
  progress: number;
  projectedProgress: number;
  periodType: string;
  ops: number;
}

export function FinanceRappelAdvisor({ entityName, financedAmount }: Props) {
  const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');

  const { data: rappels = [] } = useQuery({
    queryKey: ['finance-rappels-advisor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_rappels')
        .select('*')
        .order('entity_name')
        .order('threshold_volume');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: simulations = [] } = useQuery({
    queryKey: ['finance-simulations-advisor', yearStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_simulations')
        .select('entity_name_snapshot, financed_amount, created_at')
        .eq('status', 'aprobada')
        .gte('created_at', yearStart);
      if (error) throw error;
      return data || [];
    },
  });

  // Group rappels by entity
  const entitiesWithRappels = useMemo(() => {
    const map = new Map<string, { tiers: typeof rappels; periodType: string }>();
    rappels.forEach((r: any) => {
      if (!map.has(r.entity_name)) {
        map.set(r.entity_name, { tiers: [], periodType: r.period_type });
      }
      map.get(r.entity_name)!.tiers.push(r);
    });
    return map;
  }, [rappels]);

  const analyzeEntity = (name: string): EntityAnalysis | null => {
    const group = entitiesWithRappels.get(name);
    if (!group || group.tiers.length === 0) return null;

    const periodStart = getPeriodStart(group.periodType);
    let volume = 0;
    let ops = 0;
    simulations.forEach((s: any) => {
      if (s.entity_name_snapshot === name && s.created_at >= periodStart) {
        volume += Number(s.financed_amount || 0);
        ops++;
      }
    });

    const sortedTiers = [...group.tiers].sort((a: any, b: any) => a.threshold_volume - b.threshold_volume);
    const currentTier = sortedTiers.filter((t: any) => t.threshold_volume <= volume).pop();
    const nextTier = sortedTiers.find((t: any) => t.threshold_volume > volume);

    const projected = volume + financedAmount;
    const projectedTier = sortedTiers.filter((t: any) => t.threshold_volume <= projected).pop();
    const triggersNextTier = nextTier ? projected >= nextTier.threshold_volume : false;

    const currentBase = currentTier ? currentTier.threshold_volume : 0;
    const nextTarget = nextTier ? nextTier.threshold_volume : currentBase;
    const progress = nextTier && nextTarget > currentBase
      ? Math.min(((volume - currentBase) / (nextTarget - currentBase)) * 100, 100)
      : sortedTiers.length > 0 ? 100 : 0;
    const projectedProgress = nextTier && nextTarget > currentBase
      ? Math.min(((projected - currentBase) / (nextTarget - currentBase)) * 100, 100)
      : 100;

    return {
      entityName: name,
      currentVolume: volume,
      projectedVolume: projected,
      currentTierPercent: currentTier ? currentTier.rappel_percent : null,
      nextTierThreshold: nextTier ? nextTier.threshold_volume : null,
      nextTierPercent: nextTier ? nextTier.rappel_percent : null,
      projectedTierPercent: projectedTier ? projectedTier.rappel_percent : null,
      triggersNextTier,
      remaining: nextTier ? Math.max(0, nextTier.threshold_volume - volume) : null,
      progress,
      projectedProgress,
      periodType: group.periodType,
      ops,
    };
  };

  const selectedAnalysis = entityName ? analyzeEntity(entityName) : null;

  // Find best alternative entity
  const bestAlternative = useMemo(() => {
    if (!entityName || entitiesWithRappels.size <= 1) return null;

    let best: EntityAnalysis | null = null;
    let bestScore = -1;

    entitiesWithRappels.forEach((_, name) => {
      if (name === entityName) return;
      const analysis = analyzeEntity(name);
      if (!analysis) return;

      // Score: prefer entities close to next tier
      if (analysis.remaining !== null && analysis.remaining > 0 && analysis.remaining <= financedAmount * 2) {
        const score = analysis.triggersNextTier ? 100 : (1 / analysis.remaining) * 10000;
        if (score > bestScore) {
          bestScore = score;
          best = analysis;
        }
      }
    });

    return best;
  }, [entityName, entitiesWithRappels, simulations, financedAmount]);

  if (rappels.length === 0) return null;

  const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recomendación de financiación</span>
      </div>

      {!entityName ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Selecciona una opción de financiación para ver el impacto en rappels.
        </p>
      ) : !selectedAnalysis ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          No hay tramos de rappel configurados para {entityName}.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Current entity analysis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">{selectedAnalysis.entityName}</span>
                <Badge variant="secondary" className="text-[10px]">{periodLabels[selectedAnalysis.periodType]}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{selectedAnalysis.ops} ops</Badge>
                {selectedAnalysis.currentTierPercent !== null && (
                  <Badge variant="default" className="text-[10px]">{selectedAnalysis.currentTierPercent}% rappel</Badge>
                )}
              </div>
            </div>

            {/* Volume info */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-background p-2 border">
                <p className="text-[10px] text-muted-foreground">Volumen actual</p>
                <p className="text-sm font-semibold">{fmt(selectedAnalysis.currentVolume)}€</p>
              </div>
              <div className="rounded-md bg-background p-2 border">
                <p className="text-[10px] text-muted-foreground">Esta operación</p>
                <p className="text-sm font-semibold text-primary">+{fmt(financedAmount)}€</p>
              </div>
              <div className="rounded-md bg-background p-2 border">
                <p className="text-[10px] text-muted-foreground">Vol. proyectado</p>
                <p className="text-sm font-semibold">{fmt(selectedAnalysis.projectedVolume)}€</p>
              </div>
            </div>

            {/* Progress bar */}
            {selectedAnalysis.nextTierThreshold !== null ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Siguiente tramo: {fmt(selectedAnalysis.nextTierThreshold)}€ → {selectedAnalysis.nextTierPercent}%</span>
                  <span>Faltan {fmt(selectedAnalysis.remaining!)}€</span>
                </div>
                <div className="relative">
                  <Progress value={selectedAnalysis.progress} className="h-2" />
                  {selectedAnalysis.projectedProgress > selectedAnalysis.progress && (
                    <div
                      className="absolute top-0 h-2 rounded-full bg-primary/30"
                      style={{
                        left: `${selectedAnalysis.progress}%`,
                        width: `${Math.min(selectedAnalysis.projectedProgress - selectedAnalysis.progress, 100 - selectedAnalysis.progress)}%`,
                      }}
                    />
                  )}
                </div>

                {/* Impact message */}
                {selectedAnalysis.triggersNextTier ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    ¡Esta operación activará el siguiente tramo de rappel ({selectedAnalysis.nextTierPercent}%)!
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Con esta operación quedarían {fmt(Math.max(0, selectedAnalysis.nextTierThreshold - selectedAnalysis.projectedVolume))}€ para el siguiente tramo.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Máximo tramo de rappel alcanzado ({selectedAnalysis.currentTierPercent}%).
              </div>
            )}
          </div>

          {/* Alternative entity recommendation */}
          {bestAlternative && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Entidad recomendada: {bestAlternative.entityName}
              </p>
              {bestAlternative.triggersNextTier ? (
                <p className="text-[10px] text-muted-foreground">
                  Esta operación activaría el tramo de {bestAlternative.nextTierPercent}% en {bestAlternative.entityName}.
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Faltan {fmt(bestAlternative.remaining!)}€ para alcanzar el siguiente tramo ({bestAlternative.nextTierPercent}%) en {bestAlternative.entityName}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
