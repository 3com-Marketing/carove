import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Plus } from 'lucide-react';
import { getJournalEntries } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { ManualEntryDialog } from '@/components/accounting/ManualEntryDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const originLabels: Record<string, string> = {
  invoice: 'Factura',
  payment: 'Pago',
  operating_expense: 'Gasto op.',
  manual: 'Manual',
  closing: 'Cierre',
  opening: 'Apertura',
};

const originColors: Record<string, string> = {
  invoice: 'default',
  payment: 'secondary',
  operating_expense: 'destructive',
  manual: 'outline',
  closing: 'destructive',
  opening: 'default',
};

export default function AccountingPage() {
  const navigate = useNavigate();
  const { has } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data: entries = [], refetch } = useQuery({
    queryKey: ['journal-entries', filterOrigin, filterFrom, filterTo],
    queryFn: () => getJournalEntries({
      origin_type: filterOrigin !== 'all' ? filterOrigin : undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-accent" /> Libro Diario
          </h1>
          <p className="text-sm text-muted-foreground">Asientos contables generados automáticamente</p>
        </div>
        {has('manage:accounting') && (
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Asiento de ajuste</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div><label className="text-xs text-muted-foreground">Desde</label><Input type="date" className="w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Hasta</label><Input type="date" className="w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Origen</label>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="invoice">Factura</SelectItem>
              <SelectItem value="payment">Pago</SelectItem>
              <SelectItem value="operating_expense">Gasto op.</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="closing">Cierre</SelectItem>
              <SelectItem value="opening">Apertura</SelectItem>
            </SelectContent></Select></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin asientos contables</TableCell></TableRow>
              )}
              {entries.map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/accounting/${e.id}`)}>
                  <TableCell className="font-mono text-sm font-medium">{e.entry_number}</TableCell>
                  <TableCell className="text-sm">{format(new Date(e.entry_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell className="text-sm max-w-[250px] truncate">{e.description}</TableCell>
                  <TableCell><Badge variant={originColors[e.origin_type] as any || 'outline'}>{originLabels[e.origin_type] || e.origin_type}</Badge></TableCell>
                  <TableCell><Badge variant={e.status === 'posted' ? 'default' : 'outline'}>{e.status === 'posted' ? 'Automático' : 'Ajuste'}</Badge></TableCell>
                  <TableCell className="text-right font-mono font-medium">{fmt(e.total_debit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ManualEntryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={refetch} />
    </div>
  );
}
