import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIgicBook } from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, BookOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function IgicBook() {
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(`${now.getFullYear()}-12-31`);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['igic-book', from, to],
    queryFn: () => getIgicBook(from + 'T00:00:00', to + 'T23:59:59'),
  });

  const totals = useMemo(() => {
    return invoices.reduce((acc, inv) => ({
      base: acc.base + inv.base_amount,
      tax: acc.tax + inv.tax_amount,
      total: acc.total + inv.total_amount,
    }), { base: 0, tax: 0, total: 0 });
  }, [invoices]);

  const exportCsv = () => {
    const headers = 'Número;Fecha;Cliente;DNI;Base Imponible;% IGIC;Cuota IGIC;Total\n';
    const rows = invoices.map(i =>
      `${i.full_number};${formatDate(i.issue_date)};${i.buyer_name};${i.buyer_dni || ''};${i.base_amount.toFixed(2)};${i.tax_rate};${i.tax_amount.toFixed(2)};${i.total_amount.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `libro-igic-${from}-${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro IGIC Repercutido</h1>
          <p className="text-sm text-muted-foreground">Facturas emitidas en el periodo seleccionado</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={invoices.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40 h-9 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>DNI/NIF</TableHead>
                  <TableHead className="text-right">Base Imponible</TableHead>
                  <TableHead className="text-right">% IGIC</TableHead>
                  <TableHead className="text-right">Cuota IGIC</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Sin facturas en este periodo.
                    </TableCell>
                  </TableRow>
                ) : invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.full_number}</TableCell>
                    <TableCell className="text-xs">{formatDate(inv.issue_date)}</TableCell>
                    <TableCell className="text-sm">{inv.buyer_name}</TableCell>
                    <TableCell className="text-xs">{inv.buyer_dni || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(inv.base_amount)}</TableCell>
                    <TableCell className="text-right text-sm">{inv.tax_rate}%</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(inv.tax_amount)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(inv.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {invoices.length > 0 && (
                <tfoot>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4} className="text-right text-sm">TOTALES</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(totals.base)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right text-sm">{formatCurrency(totals.tax)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(totals.total)}</TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
