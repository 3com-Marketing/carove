import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, Landmark } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function FinanceOptimizationPanel() {
  const [result, setResult] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-incentives', {
        body: { type: 'finance_optimization' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResult(data?.result);
      toast({ title: 'Análisis financiero generado' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const entities = result?.entity_recommendations || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Optimización Financiera IA</h3>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Analizar entidades
        </Button>
      </div>

      {result?.summary && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">{result.summary}</p>
          </CardContent>
        </Card>
      )}

      {entities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.map((e: any, i: number) => {
            const progress = e.next_threshold > 0 ? Math.min((e.current_volume / e.next_threshold) * 100, 100) : 0;
            return (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{e.entity_name}</CardTitle>
                    <Badge variant={e.priority === 'alta' ? 'default' : e.priority === 'media' ? 'secondary' : 'outline'}>
                      {e.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Vol. actual</span>
                      <div className="font-semibold">{Number(e.current_volume).toLocaleString('es-ES')}€</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sig. tramo</span>
                      <div className="font-semibold">{Number(e.next_threshold).toLocaleString('es-ES')}€</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Faltante</span>
                      <div className="font-semibold">{Number(e.remaining).toLocaleString('es-ES')}€</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rappel potencial</span>
                      <div className="font-semibold">{e.potential_rappel}%</div>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{e.recommendation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
