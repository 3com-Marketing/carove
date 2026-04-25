import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/constants';
import type { FinanceInstallment } from '@/lib/types';

interface InstallmentCalendarProps {
  installments: FinanceInstallment[];
}

export function InstallmentCalendar({ installments }: InstallmentCalendarProps) {
  const total = installments.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Calendario de cuotas ({installments.length})</p>
      <div className="max-h-60 overflow-y-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-16">#</TableHead>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs text-right">Importe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map(inst => (
              <TableRow key={inst.id}>
                <TableCell className="text-xs font-mono">{inst.installment_number}</TableCell>
                <TableCell className="text-xs">{formatDate(inst.due_date)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{formatCurrency(inst.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-right text-muted-foreground">Total: <strong>{formatCurrency(total)}</strong></p>
    </div>
  );
}
