import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requestReportHtml } from '@/lib/supabase-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';

const currentYear = new Date().getFullYear();

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function VehicleMarginReport() {
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<'vendido' | 'todos'>('vendido');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicle-margin', dateFrom, dateTo, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('id, plate, brand, model, sale_date, real_sale_price, price_cash, total_cost, net_profit, status')
        .gte('sale_date', dateFrom)
        .lte('sale_date', dateTo + 'T23:59:59')
        .order('sale_date', { ascending: false });

      if (statusFilter === 'vendido') {
        query = query.in('status', ['vendido', 'entregado']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!vehicles) return [];
    if (!search.trim()) return vehicles;
    const s = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.brand?.toLowerCase().includes(s) ||
        v.model?.toLowerCase().includes(s) ||
        v.plate?.toLowerCase().includes(s),
    );
  }, [vehicles, search]);

  const totals = useMemo(() => {
    let ventas = 0, coste = 0, margen = 0;
    filtered.forEach((v) => {
      const pv = Number(v.real_sale_price) || Number(v.price_cash) || 0;
      ventas += pv;
      coste += Number(v.total_cost) || 0;
      margen += Number(v.net_profit) || 0;
    });
    const medioPct = ventas > 0 ? ((margen / ventas) * 100).toFixed(1) + '%' : '—';
    return { ventas, coste, margen, medioPct };
  }, [filtered]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const html = await requestReportHtml('vehicle-margin', {
        date_from: dateFrom,
        date_to: dateTo,
        status_filter: statusFilter,
      });
      setPdfHtml(html);
      setPdfOpen(true);
    } catch (e: any) {
      toast.error(e.message || 'Error al generar PDF');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Margen por Vehículo</h1>
          <p className="text-muted-foreground text-sm">Informe analítico de rentabilidad por unidad</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
          <FileText className="h-4 w-4 mr-2" />
          {exporting ? 'Generando...' : 'Exportar PDF'}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Estado</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'vendido' | 'todos')}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vendido">Vendidos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar marca, modelo, matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Vehículo</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Fecha venta</TableHead>
                <TableHead className="text-right">Precio venta</TableHead>
                <TableHead className="text-right">Coste total</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Margen %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const pv = Number(v.real_sale_price) || Number(v.price_cash) || 0;
                const margen = Number(v.net_profit) || 0;
                const pct = pv > 0 ? ((margen / pv) * 100).toFixed(1) + '%' : '—';
                return (
                  <TableRow key={v.id}>
                    <TableCell>{v.brand} {v.model}</TableCell>
                    <TableCell className="font-mono text-xs">{v.plate}</TableCell>
                    <TableCell>{v.sale_date ? new Date(v.sale_date).toLocaleDateString('es-ES') : '—'}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(pv)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(v.total_cost) || 0)}</TableCell>
                    <TableCell className={`text-right font-mono ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(margen)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{pct}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay vehículos en el periodo seleccionado
                  </TableCell>
                </TableRow>
              )}
              {filtered.length > 0 && (
                <TableRow className="bg-muted/50 border-t-2 font-bold">
                  <TableCell colSpan={3}>TOTALES ({filtered.length} vehículos)</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.ventas)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.coste)}</TableCell>
                  <TableCell className={`text-right font-mono ${totals.margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totals.margen)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{totals.medioPct}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        Informe analítico (no contable). Los datos proceden del módulo de vehículos y no del libro diario.
      </p>

      <DocumentPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title="Margen por Vehículo"
        html={pdfHtml}
        actions={[
          {
            icon: 'printer',
            tooltip: 'Imprimir',
            onClick: () => {
              const iframe = document.querySelector<HTMLIFrameElement>('iframe[title*="Margen"]');
              try { iframe?.contentWindow?.print(); } catch { window.print(); }
            },
          },
          {
            icon: 'eye',
            tooltip: 'Abrir en nueva pestaña',
            onClick: () => {
              const w = window.open('', '_blank');
              if (w) { w.document.write(pdfHtml); w.document.close(); }
            },
          },
        ]}
      />
    </div>
  );
}
