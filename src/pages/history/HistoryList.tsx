import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '@/lib/supabase-api';
import { formatCurrency, formatDate, formatKm } from '@/lib/constants';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Archive, Loader2 } from 'lucide-react';

export default function HistoryList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: allVehicles = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const history = useMemo(() =>
    allVehicles.filter(v => v.status === 'vendido' || v.status === 'entregado' || v.is_deregistered)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
  [allVehicles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(v => v.plate.toLowerCase().includes(q) || v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q));
  }, [history, search]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">Histórico</h1><p className="text-sm text-muted-foreground">Vehículos vendidos, entregados y dados de baja (solo lectura)</p></div>
      <div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Estado</TableHead><TableHead>Marca / Modelo</TableHead><TableHead>Matrícula</TableHead><TableHead>Centro</TableHead><TableHead>Motor</TableHead><TableHead className="text-right">KM</TableHead><TableHead>F. Compra</TableHead><TableHead>F. Venta</TableHead><TableHead className="text-right">Coste</TableHead><TableHead className="text-right">PVP</TableHead><TableHead className="text-right">Beneficio</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground"><Archive className="h-8 w-8 mx-auto mb-2 opacity-40" />No hay vehículos en el histórico aún.</TableCell></TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/vehicles/${v.id}`)}>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell className="font-medium">{v.brand} {v.model}</TableCell>
                  <TableCell className="font-mono text-xs">{v.plate}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.center}</TableCell>
                  <TableCell className="text-xs capitalize">{v.engine_type}</TableCell>
                  <TableCell className="text-right text-xs">{formatKm(v.km_entry)}</TableCell>
                  <TableCell className="text-xs">{formatDate(v.purchase_date)}</TableCell>
                  <TableCell className="text-xs">{formatDate(v.sale_date)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(v.total_cost)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(v.pvp_base)}</TableCell>
                  <TableCell className={`text-right font-semibold ${v.net_profit >= 0 ? 'text-status-disponible' : 'text-destructive'}`}>{formatCurrency(v.net_profit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
