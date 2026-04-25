import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookText } from 'lucide-react';
import { getAccountChart, getLedger } from '@/lib/supabase-api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function LedgerPage() {
  const navigate = useNavigate();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const { data: accounts = [] } = useQuery({ queryKey: ['account-chart'], queryFn: getAccountChart });
  const { data: lines = [] } = useQuery({
    queryKey: ['ledger', selectedAccount, filterFrom, filterTo],
    queryFn: () => getLedger(selectedAccount, { from: filterFrom || undefined, to: filterTo || undefined }),
    enabled: !!selectedAccount,
  });

  const linesWithBalance = useMemo(() => {
    let balance = 0;
    return lines.map(l => {
      balance += l.debit - l.credit;
      return { ...l, balance: Math.round(balance * 100) / 100 };
    });
  }, [lines]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookText className="h-6 w-6 text-accent" /> Libro Mayor
        </h1>
        <p className="text-sm text-muted-foreground">Movimientos agrupados por cuenta contable</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Cuenta</label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><label className="text-xs text-muted-foreground">Desde</label><Input type="date" className="w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Hasta</label><Input type="date" className="w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
      </div>

      {!selectedAccount ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Selecciona una cuenta para ver sus movimientos</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Asiento</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linesWithBalance.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin movimientos</TableCell></TableRow>
                )}
                {linesWithBalance.map(l => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/accounting/${l.entry_id}`)}>
                    <TableCell className="text-sm">{l.entry_date ? format(new Date(l.entry_date), 'dd/MM/yyyy', { locale: es }) : ''}</TableCell>
                    <TableCell className="font-mono text-xs">{l.entry_number}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.description}</TableCell>
                    <TableCell className="text-right font-mono">{l.debit > 0 ? fmt(l.debit) : ''}</TableCell>
                    <TableCell className="text-right font-mono">{l.credit > 0 ? fmt(l.credit) : ''}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${l.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{fmt(l.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
