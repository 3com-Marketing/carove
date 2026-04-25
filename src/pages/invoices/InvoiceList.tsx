import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getInvoices, getInvoiceSeries } from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  borrador: { label: 'Borrador', variant: 'outline' },
  emitida: { label: 'Emitida', variant: 'default' },
  anulada: { label: 'Anulada', variant: 'destructive' },
  rectificada: { label: 'Rectificada', variant: 'secondary' },
};

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-muted text-muted-foreground' },
  parcial: { label: 'Parcial', className: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  cobrada: { label: 'Cobrada', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
};

export default function InvoiceList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => getInvoices() });
  const { data: series = [] } = useQuery({ queryKey: ['invoice-series'], queryFn: getInvoiceSeries });

  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(i => i.invoice_type === typeFilter);
    if (paymentFilter !== 'all') result = result.filter(i => i.payment_status === paymentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        (i.full_number || '').toLowerCase().includes(q) ||
        i.buyer_name.toLowerCase().includes(q) ||
        i.vehicle_plate.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, statusFilter, typeFilter, paymentFilter, search]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} facturas registradas</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/invoices/igic-book')}>
          <BookOpen className="h-4 w-4 mr-2" /> Libro IGIC
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm w-48" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="rectificada">Rectificada</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="rectificativa">Rectificativa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cobros</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="cobrada">Cobrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cobro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Sin facturas.
                  </TableCell>
                </TableRow>
              ) : filtered.map(inv => (
                <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <TableCell className="font-mono text-sm font-medium">{inv.full_number || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={inv.invoice_type === 'rectificativa' ? 'secondary' : 'outline'} className="text-[10px] capitalize">{inv.invoice_type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(inv.issue_date)}</TableCell>
                  <TableCell className="text-sm">{inv.buyer_name}</TableCell>
                  <TableCell className="text-xs font-mono">{inv.vehicle_plate}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{formatCurrency(inv.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[inv.status]?.variant || 'outline'} className="text-[10px]">{STATUS_LABELS[inv.status]?.label || inv.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {inv.status === 'emitida' && (
                      <Badge variant="outline" className={cn('text-[10px]', PAYMENT_BADGE[inv.payment_status]?.className)}>
                        {PAYMENT_BADGE[inv.payment_status]?.label || inv.payment_status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
