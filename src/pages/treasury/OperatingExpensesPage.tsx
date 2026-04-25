import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { getOperatingExpenses } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { OperatingExpenseDialog } from '@/components/treasury/OperatingExpenseDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const catLabel: Record<string, string> = { alquiler: 'Alquiler', nominas: 'Nóminas', suministros: 'Suministros', gestoria: 'Gestoría', marketing: 'Marketing', otros: 'Otros' };
const methodLabel: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transfer.', tarjeta: 'Tarjeta', financiado: 'Financiado', otro: 'Otro' };

export default function OperatingExpensesPage() {
  const { has } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data: expenses = [], refetch } = useQuery({
    queryKey: ['operating-expenses', filterCat, filterFrom, filterTo],
    queryFn: () => getOperatingExpenses({
      category: filterCat !== 'all' ? filterCat : undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gastos Operativos</h1>
        {has('manage:treasury') && (
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo gasto</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div><label className="text-xs text-muted-foreground">Desde</label><Input type="date" className="w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Hasta</label><Input type="date" className="w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Categoría</label>
          <Select value={filterCat} onValueChange={setFilterCat}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem>{Object.entries(catLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin gastos operativos</TableCell></TableRow>
              )}
              {expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{format(new Date(e.expense_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell><Badge variant="outline">{catLabel[e.category] || e.category}</Badge></TableCell>
                  <TableCell className="text-sm">{e.description}</TableCell>
                  <TableCell className="text-xs">{methodLabel[e.payment_method] || e.payment_method}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-destructive">{fmt(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OperatingExpenseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={refetch} />
    </div>
  );
}
