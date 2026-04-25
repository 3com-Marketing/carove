import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const trendIcons = {
  ascendente: TrendingUp,
  estable: Minus,
  descendente: TrendingDown,
};

const statusColors: Record<string, string> = {
  en_camino: 'text-green-600',
  riesgo_moderado: 'text-yellow-600',
  riesgo_alto: 'text-destructive',
};

const statusLabels: Record<string, string> = {
  en_camino: 'En camino',
  riesgo_moderado: 'Riesgo moderado',
  riesgo_alto: 'Riesgo alto',
};

export function SalesPredictionPanel() {
  const [prediction, setPrediction] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-incentives', {
        body: { type: 'predictions' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPrediction(data?.result);
      toast({ title: 'Predicción generada' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const global = prediction?.global_prediction;
  const sellers = prediction?.seller_predictions || [];
  const TrendIcon = global ? trendIcons[global.trend as keyof typeof trendIcons] || Minus : Minus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Predicción Comercial</h3>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generar predicción
        </Button>
      </div>

      {global && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{global.projected_sales}</div>
                <p className="text-xs text-muted-foreground">Ventas proyectadas fin de mes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{Number(global.projected_margin).toLocaleString('es-ES')}€</div>
                <p className="text-xs text-muted-foreground">Margen proyectado</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{global.projected_financed}</div>
                <p className="text-xs text-muted-foreground">Financiaciones proyectadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{global.objective_probability}%</div>
                  <TrendIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Probabilidad cumplimiento</p>
                <Progress value={global.objective_probability} className="mt-2 h-2" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm">{global.summary}</p>
            </CardContent>
          </Card>
        </>
      )}

      {sellers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Proyección por vendedor</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Ventas proyectadas</TableHead>
                  <TableHead>Prob. cumplimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{s.seller_name}</TableCell>
                    <TableCell className="text-sm">{s.projected_sales}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{s.objective_probability}%</span>
                        <Progress value={s.objective_probability} className="h-1.5 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${statusColors[s.status] || ''}`}>
                        {statusLabels[s.status] || s.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
