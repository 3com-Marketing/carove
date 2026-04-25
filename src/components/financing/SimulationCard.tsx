import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronDown, ChevronUp, FileText, RefreshCw, Link2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/constants';
import { updateSimulationStatus, generateInstallments, getInstallments } from '@/lib/supabase-api';
import { InstallmentCalendar } from './InstallmentCalendar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import type { FinanceSimulation, FinanceSimulationStatus } from '@/lib/types';

const STATUS_LABELS: Record<FinanceSimulationStatus, string> = {
  simulacion_interna: 'Simulación interna',
  enviada_banco: 'Enviada al banco',
  pendiente_aprobacion: 'Pendiente aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<FinanceSimulationStatus, string> = {
  simulacion_interna: 'bg-muted text-muted-foreground',
  enviada_banco: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  pendiente_aprobacion: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  aprobada: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  rechazada: 'bg-destructive/15 text-destructive',
  cancelada: 'bg-muted text-muted-foreground line-through',
};

const ALL_STATUSES: FinanceSimulationStatus[] = [
  'simulacion_interna', 'enviada_banco', 'pendiente_aprobacion', 'aprobada', 'rechazada', 'cancelada',
];

interface SimulationCardProps {
  simulation: FinanceSimulation;
  onUpdated?: () => void;
  onLinkToSale?: (simId: string) => void;
  onGeneratePdf?: (simId: string) => void;
}

export function SimulationCard({ simulation, onUpdated, onLinkToSale, onGeneratePdf }: SimulationCardProps) {
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const { data: installments = [] } = useQuery({
    queryKey: ['finance-installments', simulation.id],
    queryFn: () => getInstallments(simulation.id),
    enabled: expanded,
  });

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(true);
    try {
      await updateSimulationStatus(simulation.id, newStatus as FinanceSimulationStatus);
      qc.invalidateQueries({ queryKey: ['finance-simulations'] });
      onUpdated?.();
      toast({ title: '✅ Estado actualizado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      await generateInstallments(simulation.id);
      qc.invalidateQueries({ queryKey: ['finance-installments', simulation.id] });
      toast({ title: '✅ Cuotas regeneradas' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const status = simulation.status as FinanceSimulationStatus;
  const availableStatuses = isAdmin ? ALL_STATUSES : ALL_STATUSES.filter(s => s !== 'aprobada');

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-medium text-sm">{simulation.entity_name_snapshot}</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-sm">{simulation.product_name_snapshot}</span>
              <Badge className={`text-[10px] ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>TIN: <strong className="text-foreground">{simulation.tin_used}%</strong></span>
              <span>Plazo: <strong className="text-foreground">{simulation.term_months_used} meses</strong></span>
              <span>Cuota: <strong className="text-foreground">{formatCurrency(simulation.monthly_payment)}</strong></span>
              <span>Total: <strong className="text-foreground">{formatCurrency(simulation.total_estimated)}</strong></span>
              <span>Financiado: {formatCurrency(simulation.financed_amount)}</span>
              <span>Capital ajust.: {formatCurrency(simulation.adjusted_capital)}</span>
              {simulation.first_payment_date && <span>1ª cuota: {formatDate(simulation.first_payment_date)}</span>}
              <span>Creada: {formatDate(simulation.created_at)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <Select value={status} onValueChange={handleStatusChange} disabled={changingStatus}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableStatuses.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {simulation.first_payment_date && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRegenerate} title="Regenerar cuotas">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              {onGeneratePdf && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onGeneratePdf(simulation.id)} title="Generar PDF">
                  <FileText className="h-3 w-3" />
                </Button>
              )}
              {onLinkToSale && !simulation.sale_id && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onLinkToSale(simulation.id)} title="Vincular a venta">
                  <Link2 className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t">
            {installments.length > 0 ? (
              <InstallmentCalendar installments={installments} />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">
                {simulation.first_payment_date ? 'Pulsa ↻ para generar el calendario de cuotas' : 'Establece una fecha de primera cuota para generar el calendario'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
