import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Landmark } from 'lucide-react';

interface RappelTier {
  threshold_volume: number;
  rappel_percent: number;
}

interface EntityRappelData {
  entity_name: string;
  current_volume: number;
  operations: number;
  tiers: RappelTier[];
}

interface RappelProgressCardProps {
  entities: EntityRappelData[];
}

export function RappelProgressCard({ entities }: RappelProgressCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          Rappels Financieros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin rappels configurados</p>
        ) : (
          entities.map((e, i) => {
            const sortedTiers = [...e.tiers].sort((a, b) => a.threshold_volume - b.threshold_volume);
            const currentTier = sortedTiers.filter(t => t.threshold_volume <= e.current_volume).pop();
            const nextTier = sortedTiers.find(t => t.threshold_volume > e.current_volume);
            const progress = nextTier
              ? Math.min((e.current_volume / nextTier.threshold_volume) * 100, 100)
              : 100;

            return (
              <div key={i} className="space-y-2 border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{e.entity_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{e.operations} ops</Badge>
                    {currentTier && (
                      <Badge variant="default">{currentTier.rappel_percent}%</Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Volumen: {e.current_volume.toLocaleString('es-ES')}€
                </div>
                {nextTier && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Siguiente tramo: {nextTier.threshold_volume.toLocaleString('es-ES')}€ → {nextTier.rappel_percent}%
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
