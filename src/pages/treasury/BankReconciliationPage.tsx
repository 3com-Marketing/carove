import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Link2, AlertTriangle } from 'lucide-react';
import { getBankMovements, getCashMovements, getBankAccounts, reconcileMovements } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { BankAccountDialog } from '@/components/treasury/BankAccountDialog';
import { BankMovementDialog } from '@/components/treasury/BankMovementDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function BankReconciliationPage() {
  const { has } = useRole();
  const [accountDialog, setAccountDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedCash, setSelectedCash] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({ queryKey: ['bank-accounts'], queryFn: getBankAccounts });
  const { data: bankMovements = [], refetch: refetchBank } = useQuery({
    queryKey: ['bank-movements-unreconciled'],
    queryFn: () => getBankMovements(undefined, { reconciled: false }),
  });
  const { data: cashMovements = [], refetch: refetchCash } = useQuery({
    queryKey: ['cash-movements-all'],
    queryFn: () => getCashMovements(),
  });

  // Cash movements not yet reconciled (no bank_movement points to them)
  const reconciledCashIds = new Set(bankMovements.filter(b => b.reconciled_cash_movement_id).map(b => b.reconciled_cash_movement_id));
  const unreconciledCash = cashMovements.filter(c => !reconciledCashIds.has(c.id));

  const selectedBankM = bankMovements.find(b => b.id === selectedBank);
  const selectedCashM = unreconciledCash.find(c => c.id === selectedCash);
  const amountMismatch = selectedBankM && selectedCashM && Math.abs(selectedBankM.amount - selectedCashM.amount) > 0.01;

  const handleReconcile = async () => {
    if (!selectedBank || !selectedCash) return;
    if (amountMismatch && !confirmDialog) {
      setConfirmDialog(true);
      return;
    }
    try {
      await reconcileMovements(selectedBank, selectedCash);
      toast({ title: 'Movimientos conciliados' });
      setSelectedBank(null); setSelectedCash(null); setConfirmDialog(false);
      refetchBank(); refetchCash();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Conciliación Bancaria</h1>
        <div className="flex gap-2">
          {has('manage:treasury') && (
            <>
              <Button variant="outline" onClick={() => setAccountDialog(true)}><Plus className="h-4 w-4 mr-2" />Cuenta</Button>
              <Button onClick={() => setMovementDialog(true)}><Plus className="h-4 w-4 mr-2" />Mov. bancario</Button>
            </>
          )}
        </div>
      </div>

      {/* Reconcile action */}
      {selectedBank && selectedCash && (
        <Card className="border-primary">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Conciliar:</span> Banco ({fmt(selectedBankM!.amount)}) ↔ Caja ({fmt(selectedCashM!.amount)})
              {amountMismatch && <Badge variant="destructive" className="ml-2">Importes distintos</Badge>}
            </div>
            <Button size="sm" onClick={handleReconcile}><Link2 className="h-4 w-4 mr-1" />Conciliar</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bank movements */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Movimientos bancarios sin conciliar</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Fecha</TableHead><TableHead>Descripción</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Importe</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {bankMovements.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sin movimientos pendientes</TableCell></TableRow>}
                {bankMovements.map(b => (
                  <TableRow key={b.id} className={`cursor-pointer ${selectedBank === b.id ? 'bg-primary/10' : ''}`} onClick={() => setSelectedBank(selectedBank === b.id ? null : b.id)}>
                    <TableCell className="text-xs">{format(new Date(b.movement_date), 'dd/MM/yy', { locale: es })}</TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]">{b.description}</TableCell>
                    <TableCell><Badge variant={b.movement_type === 'ingreso' ? 'default' : 'destructive'}>{b.movement_type === 'ingreso' ? '+' : '-'}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(b.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cash movements */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Movimientos de caja</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Fecha</TableHead><TableHead>Descripción</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Importe</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {unreconciledCash.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sin movimientos</TableCell></TableRow>}
                {unreconciledCash.slice(0, 50).map(c => (
                  <TableRow key={c.id} className={`cursor-pointer ${selectedCash === c.id ? 'bg-primary/10' : ''}`} onClick={() => setSelectedCash(selectedCash === c.id ? null : c.id)}>
                    <TableCell className="text-xs">{format(new Date(c.movement_date), 'dd/MM/yy', { locale: es })}</TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]">{c.description}</TableCell>
                    <TableCell><Badge variant={c.movement_type === 'ingreso' ? 'default' : 'destructive'}>{c.movement_type === 'ingreso' ? '+' : '-'}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(c.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mismatch confirm dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importes no coinciden</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Banco: {selectedBankM && fmt(selectedBankM.amount)} vs Caja: {selectedCashM && fmt(selectedCashM.amount)}. ¿Conciliar de todos modos?</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={handleReconcile}>Confirmar conciliación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BankAccountDialog open={accountDialog} onClose={() => setAccountDialog(false)} onSuccess={refetchAccounts} />
      <BankMovementDialog open={movementDialog} onClose={() => setMovementDialog(false)} onSuccess={refetchBank} accounts={accounts} />
    </div>
  );
}
