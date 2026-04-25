import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingUp, TrendingDown, BarChart3, FileText, CalendarCheck, Plus, Info, Pencil, BookOpen } from 'lucide-react';
import { getCashMovements, getCashBalance, getCashSummary, getInvoicesPendingPayment, getBankMovements, updateCashMovementNotes, getJournalEntryByOrigin } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { CashMovementDialog } from '@/components/treasury/CashMovementDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function TreasuryPage() {
  const { has } = useRole();
  const navigate = useNavigate();
  const now = new Date();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data: balance = 0, refetch: refetchBalance } = useQuery({ queryKey: ['cash-balance'], queryFn: getCashBalance });
  const { data: summary = { ingresos: 0, gastos: 0, resultado: 0 }, refetch: refetchSummary } = useQuery({
    queryKey: ['cash-summary', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => getCashSummary(now.getMonth() + 1, now.getFullYear()),
  });
  const { data: movements = [], refetch: refetchMovements } = useQuery({
    queryKey: ['cash-movements', filterType, filterOrigin, filterFrom, filterTo],
    queryFn: () => getCashMovements({
      movement_type: filterType !== 'all' ? filterType : undefined,
      origin_type: filterOrigin !== 'all' ? filterOrigin : undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
    }),
  });
  const { data: pendingInvoices = [] } = useQuery({ queryKey: ['invoices-pending'], queryFn: getInvoicesPendingPayment });
  const { data: unreconciledBank = [] } = useQuery({ queryKey: ['bank-unreconciled'], queryFn: () => getBankMovements(undefined, { reconciled: false }) });

  const pendingTotal = pendingInvoices.reduce((s, i) => s + i.total_amount, 0);

  const refetchAll = () => { refetchBalance(); refetchSummary(); refetchMovements(); };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');

  const handleSaveEdit = async (id: string) => {
    try {
      await updateCashMovementNotes(id, { description: editDesc });
      toast({ title: 'Actualizado' });
      setEditingId(null);
      refetchMovements();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const reasonLabel: Record<string, string> = { operativo: 'Operativo', ajuste: 'Ajuste', correccion: 'Corrección', regularizacion: 'Regularización' };
  const methodLabel: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transfer.', tarjeta: 'Tarjeta', financiado: 'Financiado', otro: 'Otro' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tesorería</h1>
        {has('manage:treasury') && (
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar movimiento</Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" />Saldo actual</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(balance)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" />Ingresos mes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{fmt(summary.ingresos)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4" />Gastos mes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{fmt(summary.gastos)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><BarChart3 className="h-4 w-4" />Resultado mes</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${summary.resultado >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(summary.resultado)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><FileText className="h-4 w-4" />Pend. cobro</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pendingInvoices.length}</p><p className="text-xs text-muted-foreground">{fmt(pendingTotal)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CalendarCheck className="h-4 w-4" />Conciliación</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{unreconciledBank.length}</p>
            <p className="text-xs text-muted-foreground">{unreconciledBank.length === 0 ? '✅ Todo conciliado' : '⚠️ Pendientes'}</p>
          </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div><label className="text-xs text-muted-foreground">Desde</label><Input type="date" className="w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Hasta</label><Input type="date" className="w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Tipo</label>
          <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="ingreso">Ingreso</SelectItem><SelectItem value="gasto">Gasto</SelectItem></SelectContent></Select></div>
        <div><label className="text-xs text-muted-foreground">Origen</label>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="operating_expense">Gasto op.</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent></Select></div>
      </div>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead></TableHead>
                <TableHead>Contab.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin movimientos</TableCell></TableRow>
              )}
              {movements.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{format(new Date(m.movement_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell><Badge variant={m.movement_type === 'ingreso' ? 'default' : 'destructive'}>{m.movement_type === 'ingreso' ? 'Ingreso' : 'Gasto'}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{reasonLabel[m.movement_reason] || m.movement_reason}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{m.is_system_generated ? 'Sistema' : 'Manual'}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {editingId === m.id ? (
                      <div className="flex gap-1">
                        <Input className="h-7 text-xs" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSaveEdit(m.id)}>✓</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>✕</Button>
                      </div>
                    ) : m.description}
                  </TableCell>
                  <TableCell className="text-xs">{methodLabel[m.payment_method] || m.payment_method}</TableCell>
                  <TableCell className={`text-right font-mono font-medium ${m.movement_type === 'ingreso' ? 'text-green-600' : 'text-destructive'}`}>
                    {m.movement_type === 'ingreso' ? '+' : '-'}{fmt(m.amount)}
                  </TableCell>
                  <TableCell>
                    {!m.is_system_generated && editingId !== m.id && (
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(m.id); setEditDesc(m.description); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {(m.origin_type === 'payment' || m.origin_type === 'operating_expense') ? (
                      <ViewEntryButton originType={m.origin_type} originId={m.origin_id} navigate={navigate} />
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 30-day projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4" />Proyección de caja (estimada)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Saldo actual</p>
              <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(balance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
              <p className="text-lg font-bold text-amber-600">+{fmt(pendingTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo proyectado</p>
              <p className={`text-lg font-bold ${(balance + pendingTotal) >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(balance + pendingTotal)}</p>
              <Badge variant="outline" className="text-xs mt-1">Estimado</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <CashMovementDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={refetchAll} />
    </div>
  );
}

function ViewEntryButton({ originType, originId, navigate }: { originType: string; originId: string | null; navigate: (path: string) => void }) {
  const { data: entry, isLoading } = useQuery({
    queryKey: ['journal-entry-by-origin', originType, originId],
    queryFn: () => getJournalEntryByOrigin(originType, originId!),
    enabled: !!originId,
  });

  if (!originId) return <span className="text-xs text-muted-foreground">—</span>;
  if (isLoading) return <span className="text-xs text-muted-foreground">...</span>;
  if (!entry) return <span className="text-xs text-muted-foreground">Sin asiento</span>;

  return (
    <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={e => { e.stopPropagation(); navigate(`/accounting/${entry.id}`); }}>
      <BookOpen className="h-3 w-3 mr-1" />Ver
    </Button>
  );
}
