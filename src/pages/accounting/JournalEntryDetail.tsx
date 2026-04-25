import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getJournalEntryById, getJournalEntryLines, getAccountChart } from '@/lib/supabase-api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const originLabels: Record<string, string> = { invoice: 'Factura', payment: 'Pago', operating_expense: 'Gasto operativo', manual: 'Manual', closing: 'Cierre de ejercicio', opening: 'Apertura de ejercicio' };

export default function JournalEntryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: entry, isLoading } = useQuery({ queryKey: ['journal-entry', id], queryFn: () => getJournalEntryById(id!) });
  const { data: lines = [] } = useQuery({ queryKey: ['journal-entry-lines', id], queryFn: () => getJournalEntryLines(id!), enabled: !!id });
  const { data: accounts = [] } = useQuery({ queryKey: ['account-chart'], queryFn: getAccountChart });

  const accountMap = new Map(accounts.map(a => [a.code, a.name]));

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  if (!entry) return <div className="text-center py-20 text-muted-foreground">Asiento no encontrado</div>;

  const originLink = entry.origin_type === 'invoice' && entry.origin_id ? `/invoices/${entry.origin_id}` : null;
  const isSpecialEntry = entry.origin_type === 'closing' || entry.origin_type === 'opening';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounting')}><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
        <h1 className="text-2xl font-bold tracking-tight">Asiento {entry.entry_number}</h1>
        <Badge variant={entry.status === 'posted' ? 'default' : 'outline'}>
          {isSpecialEntry ? originLabels[entry.origin_type] : (entry.status === 'posted' ? 'Automático' : 'Ajuste manual')}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del asiento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">Número</span><p className="font-mono font-medium">{entry.entry_number}</p></div>
          <div><span className="text-muted-foreground">Fecha</span><p>{format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: es })}</p></div>
          <div><span className="text-muted-foreground">Origen</span>
            <p>
              <Badge variant={isSpecialEntry ? 'destructive' : 'outline'} className="mr-1">{originLabels[entry.origin_type] || entry.origin_type}</Badge>
              {!isSpecialEntry && originLink && <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate(originLink)}>Ver →</Button>}
            </p>
          </div>
          <div><span className="text-muted-foreground">Descripción</span><p>{entry.description}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Haber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-sm">
                    {l.account_code} <span className="text-muted-foreground ml-1">{accountMap.get(l.account_code) || ''}</span>
                  </TableCell>
                  <TableCell className="text-sm">{l.description}</TableCell>
                  <TableCell className="text-right font-mono">{l.debit > 0 ? fmt(l.debit) : ''}</TableCell>
                  <TableCell className="text-right font-mono">{l.credit > 0 ? fmt(l.credit) : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="text-right font-semibold">Totales</TableCell>
                <TableCell className="text-right font-mono font-bold">{fmt(entry.total_debit)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{fmt(entry.total_credit)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
