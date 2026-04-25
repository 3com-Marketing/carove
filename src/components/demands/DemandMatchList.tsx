import { useQuery } from '@tanstack/react-query';
import { getMatchingVehicles } from '@/lib/supabase-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/constants';
import { Eye, Target } from 'lucide-react';
import type { Demand } from '@/lib/types';

interface Props {
  demand: Demand;
}

export function DemandMatchList({ demand }: Props) {
  const navigate = useNavigate();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['demand-matches', demand.id],
    queryFn: () => getMatchingVehicles(demand),
    enabled: demand.status !== 'convertida' && demand.status !== 'cancelada',
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Buscando coincidencias...</p>;
  if (matches.length === 0) return <p className="text-sm text-muted-foreground py-4">Sin coincidencias en stock actual</p>;

  return (
    <div className="space-y-2">
      {matches.map((v: any) => (
        <Card key={v.id} className="border-l-4" style={{ borderLeftColor: v.matchLevel === 'alta' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-4))' }}>
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{v.brand} {v.model}</span>
                <span className="text-xs text-muted-foreground font-mono">{v.plate}</span>
                <Badge variant={v.matchLevel === 'alta' ? 'default' : 'secondary'} className="text-xs">
                  {v.matchLevel === 'alta' ? '🟢 Alta' : '🟡 Media'}
                </Badge>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{formatCurrency(v.price_cash)}</span>
                <span>{v.engine_type}</span>
                <span>{v.km_entry?.toLocaleString()} km</span>
                <span>{v.color}</span>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {v.matchCriteria.map((c: string) => (
                  <Badge key={c} variant="outline" className="text-[10px] py-0">{c}</Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/vehicles/${v.id}`)}>
              <Eye className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
