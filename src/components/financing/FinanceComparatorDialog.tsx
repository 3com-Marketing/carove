import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveTermModels, createFinanceSimulation } from '@/lib/supabase-api';
import { formatCurrency } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import type { FinanceSimulation } from '@/lib/types';

interface FinanceComparatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  buyerId?: string;
  defaultAmount: number;
  onSimulationCreated?: (sim: FinanceSimulation) => void;
}

type SortCriteria = 'monthly_payment' | 'total_estimated' | 'diff_monthly' | 'diff_total';

export function FinanceComparatorDialog({
  open, onOpenChange, vehicleId, buyerId, defaultAmount, onSimulationCreated,
}: FinanceComparatorDialogProps) {
  const { user } = useAuth();
  const [financedAmount, setFinancedAmount] = useState(defaultAmount.toString());
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [sortBy, setSortBy] = useState<SortCriteria>('monthly_payment');
  const [selecting, setSelecting] = useState<string | null>(null);

  const { data: termModels = [], isLoading } = useQuery({
    queryKey: ['finance-term-models-active'],
    queryFn: getActiveTermModels,
    enabled: open,
  });

  const amount = parseFloat(financedAmount) || 0;

  const groupedData = useMemo(() => {
    if (!amount || amount <= 0) return [];

    // Calculate for each model
    const calculated = termModels.map((tm: any) => {
      const adjustedCapital = amount * (1 + (tm.additional_rate || 0));
      const monthlyPayment = Math.round(adjustedCapital * tm.coefficient * 100) / 100;
      const totalEstimated = Math.round(monthlyPayment * tm.term_months * 100) / 100;
      return {
        ...tm,
        adjustedCapital: Math.round(adjustedCapital * 100) / 100,
        monthlyPayment,
        totalEstimated,
        diffMonthly: 0,
        diffTotal: 0,
      };
    });

    // Group by term_months
    const groups: Record<number, typeof calculated> = {};
    calculated.forEach(item => {
      if (!groups[item.term_months]) groups[item.term_months] = [];
      groups[item.term_months].push(item);
    });

    // Sort each group and calculate differences
    return Object.entries(groups)
      .map(([months, items]) => {
        const sorted = [...items].sort((a, b) => {
          switch (sortBy) {
            case 'total_estimated': return a.totalEstimated - b.totalEstimated;
            case 'diff_monthly': return a.monthlyPayment - b.monthlyPayment;
            case 'diff_total': return a.totalEstimated - b.totalEstimated;
            default: return a.monthlyPayment - b.monthlyPayment;
          }
        });
        const best = sorted[0];
        sorted.forEach(item => {
          item.diffMonthly = Math.round((item.monthlyPayment - best.monthlyPayment) * 100) / 100;
          item.diffTotal = Math.round(item.diffMonthly * item.term_months * 100) / 100;
        });
        return { months: parseInt(months), items: sorted };
      })
      .sort((a, b) => a.months - b.months);
  }, [termModels, amount, sortBy]);

  const handleSelect = async (item: any) => {
    if (!user || selecting) return;
    setSelecting(item.id);
    try {
      const sim = await createFinanceSimulation({
        vehicle_id: vehicleId,
        buyer_id: buyerId || null,
        term_model_id: item.id,
        entity_name_snapshot: item.entity_name,
        product_name_snapshot: item.product_name,
        tin_used: item.tin,
        coefficient_used: item.coefficient,
        additional_rate_used: item.additional_rate || 0,
        financed_amount: amount,
        adjusted_capital: item.adjustedCapital,
        down_payment: 0,
        monthly_payment: item.monthlyPayment,
        total_estimated: item.totalEstimated,
        term_months_used: item.term_months,
        first_payment_date: firstPaymentDate,
        created_by: user.id,
      });
      onSimulationCreated?.(sim);
      onOpenChange(false);
    } catch (e: any) {
      console.error('Error creating simulation:', e);
    } finally {
      setSelecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comparador de Financiación</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="space-y-1.5">
            <Label>Importe a financiar</Label>
            <Input type="number" min="0" step="0.01" value={financedAmount} onChange={e => setFinancedAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha 1ª cuota</Label>
            <Input type="date" value={firstPaymentDate} onChange={e => setFirstPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ordenar por</Label>
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortCriteria)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly_payment">Cuota mensual</SelectItem>
                <SelectItem value="total_estimated">Total pagado</SelectItem>
                <SelectItem value="diff_monthly">Diferencia mensual</SelectItem>
                <SelectItem value="diff_total">Diferencia total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : groupedData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {amount <= 0 ? 'Introduce un importe a financiar' : 'No hay modelos de financiación configurados'}
          </p>
        ) : (
          <div className="space-y-6">
            {groupedData.map(group => (
              <Card key={group.months} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline">{group.months} meses</Badge>
                    <span className="text-muted-foreground font-normal">({group.items.length} opciones)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Entidad</TableHead>
                          <TableHead className="text-xs">Producto</TableHead>
                          <TableHead className="text-xs text-right">TIN%</TableHead>
                          <TableHead className="text-xs text-right">Cuota</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                          <TableHead className="text-xs text-right">Δ mensual</TableHead>
                          <TableHead className="text-xs text-right">Δ total</TableHead>
                          <TableHead className="text-xs w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item, idx) => (
                          <TableRow key={item.id} className={idx === 0 ? 'bg-primary/5' : ''}>
                            <TableCell className="text-xs font-medium">{item.entity_name}</TableCell>
                            <TableCell className="text-xs">{item.product_name}</TableCell>
                            <TableCell className="text-xs text-right">{item.tin}%</TableCell>
                            <TableCell className="text-xs text-right font-mono font-medium">{formatCurrency(item.monthlyPayment)}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{formatCurrency(item.totalEstimated)}</TableCell>
                            <TableCell className="text-xs text-right">
                              {idx === 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-primary inline" /> : <span className="text-destructive">+{formatCurrency(item.diffMonthly)}</span>}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {idx === 0 ? '—' : <span className="text-destructive">+{formatCurrency(item.diffTotal)}</span>}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={idx === 0 ? 'default' : 'outline'}
                                className="h-7 text-xs"
                                onClick={() => handleSelect(item)}
                                disabled={!!selecting}
                              >
                                {selecting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Seleccionar'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
