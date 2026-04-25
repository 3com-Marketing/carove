import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign } from 'lucide-react';
import { useMemo } from 'react';

export default function CostsPage() {
  const { data: repairs = [], isLoading: lr } = useQuery({
    queryKey: ['pv-costs-repairs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pv_repairs').select('vehicle_id, buyer_id, final_cost, cost_company, cost_warranty, cost_client, vehicles(brand, model, plate), buyers(name, last_name)').eq('status', 'finalizada');
      if (error) throw error; return data || [];
    },
  });

  const { data: reviews = [], isLoading: lv } = useQuery({
    queryKey: ['pv-costs-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pv_reviews').select('vehicle_id, buyer_id, cost, company_assumed');
      if (error) throw error; return data || [];
    },
  });

  const { data: claims = [], isLoading: lc } = useQuery({
    queryKey: ['pv-costs-claims'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pv_claims').select('vehicle_id, buyer_id, compensation_amount').in('status', ['resuelta']);
      if (error) throw error; return data || [];
    },
  });

  const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const vehicleCosts = useMemo(() => {
    const map = new Map<string, { vehicle: any; repairCost: number; reviewCost: number; claimCost: number }>();
    repairs.forEach((r: any) => {
      const key = r.vehicle_id;
      if (!map.has(key)) map.set(key, { vehicle: r.vehicles, repairCost: 0, reviewCost: 0, claimCost: 0 });
      map.get(key)!.repairCost += (r.cost_company || 0);
    });
    reviews.filter((r: any) => r.company_assumed).forEach((r: any) => {
      const key = r.vehicle_id;
      if (!map.has(key)) map.set(key, { vehicle: null, repairCost: 0, reviewCost: 0, claimCost: 0 });
      map.get(key)!.reviewCost += (r.cost || 0);
    });
    claims.forEach((c: any) => {
      const key = c.vehicle_id;
      if (!map.has(key)) map.set(key, { vehicle: null, repairCost: 0, reviewCost: 0, claimCost: 0 });
      map.get(key)!.claimCost += (c.compensation_amount || 0);
    });
    return Array.from(map.entries()).map(([id, d]) => ({
      id, vehicle: d.vehicle, total: d.repairCost + d.reviewCost + d.claimCost,
      repairCost: d.repairCost, reviewCost: d.reviewCost, claimCost: d.claimCost,
    })).sort((a, b) => b.total - a.total);
  }, [repairs, reviews, claims]);

  const globalTotal = vehicleCosts.reduce((s, v) => s + v.total, 0);
  const loading = lr || lv || lc;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Costes Postventa</h1>
        <p className="text-sm text-muted-foreground">Desglose de costes asumidos por la empresa</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="h-6 w-6 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">Coste total postventa</p><p className="text-3xl font-bold">{fmt(globalTotal)}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Por vehículo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Vehículo</TableHead><TableHead className="text-right">Reparaciones</TableHead><TableHead className="text-right">Revisiones</TableHead><TableHead className="text-right">Compensaciones</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {vehicleCosts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin costes registrados</TableCell></TableRow>
              : vehicleCosts.map(v => (
                <TableRow key={v.id}>
                  <TableCell>{v.vehicle ? `${v.vehicle.brand} ${v.vehicle.model} (${v.vehicle.plate})` : v.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-right">{fmt(v.repairCost)}</TableCell>
                  <TableCell className="text-right">{fmt(v.reviewCost)}</TableCell>
                  <TableCell className="text-right">{fmt(v.claimCost)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(v.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
