import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, ArrowRight } from 'lucide-react';

interface IncentiveSimulatorProps {
  currentSales: number;
  currentMargin: number;
  currentFinanced: number;
  currentBonus: number;
  tiers: { category: string; threshold: number; bonus_amount: number }[];
}

export function IncentiveSimulator({ currentSales, currentMargin, currentFinanced, currentBonus, tiers }: IncentiveSimulatorProps) {
  const [extraSales, setExtraSales] = useState(1);
  const [extraMargin, setExtraMargin] = useState(1500);
  const [isFinanced, setIsFinanced] = useState(false);

  const simulation = useMemo(() => {
    const newSales = currentSales + extraSales;
    const newMargin = currentMargin + extraMargin;
    const newFinanced = currentFinanced + (isFinanced ? 1 : 0);

    const getBestTier = (cat: string, value: number) => {
      const catTiers = tiers.filter(t => t.category === cat && t.threshold <= value);
      return catTiers.length > 0 ? Math.max(...catTiers.map(t => t.bonus_amount)) : 0;
    };

    const bonusSales = getBestTier('ventas', newSales);
    const bonusMargin = getBestTier('margen', newMargin);
    const bonusFinanced = getBestTier('financiacion', newFinanced);
    const newBonus = bonusSales + bonusMargin + bonusFinanced;

    return { newSales, newMargin, newFinanced, newBonus, diff: newBonus - currentBonus };
  }, [currentSales, currentMargin, currentFinanced, currentBonus, extraSales, extraMargin, isFinanced, tiers]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Simulador de Incentivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">¿Qué pasa si cierro una operación más?</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Ventas extra</Label>
            <Input type="number" min={0} value={extraSales} onChange={e => setExtraSales(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Margen estimado (€)</Label>
            <Input type="number" min={0} value={extraMargin} onChange={e => setExtraMargin(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isFinanced} onCheckedChange={setIsFinanced} />
          <Label className="text-xs">¿Operación financiada?</Label>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Ventas del mes</span>
            <span className="font-medium">{currentSales} <ArrowRight className="h-3 w-3 inline" /> {simulation.newSales}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Margen acumulado</span>
            <span className="font-medium">{currentMargin.toLocaleString('es-ES')}€ <ArrowRight className="h-3 w-3 inline" /> {simulation.newMargin.toLocaleString('es-ES')}€</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t">
            <span>Bonus estimado</span>
            <div className="flex items-center gap-2">
              <span>{currentBonus.toLocaleString('es-ES')}€ <ArrowRight className="h-3 w-3 inline" /> {simulation.newBonus.toLocaleString('es-ES')}€</span>
              {simulation.diff > 0 && (
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />+{simulation.diff.toLocaleString('es-ES')}€
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
