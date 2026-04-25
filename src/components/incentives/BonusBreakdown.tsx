import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Car, TrendingUp, Landmark } from 'lucide-react';

interface BonusBreakdownProps {
  bonusSales: number;
  bonusMargin: number;
  bonusFinanced: number;
  bonusTotal: number;
}

export function BonusBreakdown({ bonusSales, bonusMargin, bonusFinanced, bonusTotal }: BonusBreakdownProps) {
  const items = [
    { label: 'Bonus por ventas', value: bonusSales, icon: Car },
    { label: 'Bonus por margen', value: bonusMargin, icon: TrendingUp },
    { label: 'Bonus por financiación', value: bonusFinanced, icon: Landmark },
  ];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" /> Bonus estimado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              <span className="font-medium">{item.value.toLocaleString('es-ES')}€</span>
            </div>
          ))}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Total estimado</span>
            <span className="text-xl font-bold text-primary">{bonusTotal.toLocaleString('es-ES')}€</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
