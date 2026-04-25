import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfitAndLoss, getAccount129Balance, getAccountingPeriods, requestReportHtml, type ProfitLossLine } from '@/lib/supabase-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';

const currentDate = new Date();
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function pct(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '—' : '∞';
  return ((current - previous) / Math.abs(previous) * 100).toFixed(1) + '%';
}

export default function ProfitLossPage() {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [compare, setCompare] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const html = await requestReportHtml('pyg', { year, month });
      setPdfHtml(html);
      setPdfOpen(true);
    } catch (e: any) {
      toast.error(e.message || 'Error al generar PDF');
    } finally {
      setExporting(false);
    }
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const { data: periods } = useQuery({ queryKey: ['accounting-periods'], queryFn: getAccountingPeriods });
  const isClosed = periods?.some(p => p.year === year && p.is_closed);

  const { data: currentData, isLoading } = useQuery({
    queryKey: ['pyg', year, month],
    queryFn: () => getProfitAndLoss(year, month),
  });

  const { data: prevData } = useQuery({
    queryKey: ['pyg', prevYear, prevMonth],
    queryFn: () => getProfitAndLoss(prevYear, prevMonth),
    enabled: compare,
  });

  const { data: cuenta129 } = useQuery({
    queryKey: ['cuenta129', year, month],
    queryFn: () => getAccount129Balance(year, month),
  });

  const { ingresos, gastos, totalIngresos, totalGastos, resultado, prevTotalIngresos, prevTotalGastos, prevResultado } = useMemo(() => {
    const lines = currentData || [];
    const prev = prevData || [];
    const prevMap = new Map(prev.map(l => [l.code, l.saldo]));

    const ingresos = lines.filter(l => l.account_type === 'ingreso');
    const gastos = lines.filter(l => l.account_type === 'gasto');
    const totalIngresos = ingresos.reduce((s, l) => s + l.saldo, 0);
    const totalGastos = gastos.reduce((s, l) => s + l.saldo, 0);
    const resultado = Math.round((totalIngresos - totalGastos) * 100) / 100;

    const prevIngresos = prev.filter(l => l.account_type === 'ingreso');
    const prevGastos = prev.filter(l => l.account_type === 'gasto');
    const prevTotalIngresos = prevIngresos.reduce((s, l) => s + l.saldo, 0);
    const prevTotalGastos = prevGastos.reduce((s, l) => s + l.saldo, 0);
    const prevResultado = Math.round((prevTotalIngresos - prevTotalGastos) * 100) / 100;

    return { ingresos, gastos, totalIngresos, totalGastos, resultado, prevTotalIngresos, prevTotalGastos, prevResultado, prevMap };
  }, [currentData, prevData]);

  const prevMap = useMemo(() => new Map((prevData || []).map(l => [l.code, l.saldo])), [prevData]);

  const coherencia = cuenta129 !== undefined ? Math.round((resultado - cuenta129) * 100) / 100 : null;

  const categorize = (lines: ProfitLossLine[], type: 'ingreso' | 'gasto') => {
    if (type === 'ingreso') {
      const ventas = lines.filter(l => l.code === '700');
      const otros = lines.filter(l => l.code !== '700');
      return [
        { label: 'Ventas', items: ventas },
        { label: 'Otros ingresos', items: otros },
      ].filter(g => g.items.length > 0);
    }
    const operativos = lines.filter(l => l.code === '620');
    const ajustes = lines.filter(l => l.code === '629');
    const otros = lines.filter(l => l.code !== '620' && l.code !== '629');
    return [
      { label: 'Gastos operativos', items: operativos },
      { label: 'Ajustes y correcciones', items: ajustes },
      { label: 'Otros gastos', items: otros },
    ].filter(g => g.items.length > 0);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cuenta de Pérdidas y Ganancias</h1>
          <p className="text-muted-foreground text-sm">Estado financiero acumulado (YTD)</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
          <FileText className="h-4 w-4 mr-2" /> {exporting ? 'Generando...' : 'Exportar PDF'}
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">Cuenta de Pérdidas y Ganancias</h1>
        <p className="text-sm">Acumulado Enero — {MONTHS[month - 1]} {year}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="compare" checked={compare} onCheckedChange={setCompare} />
          <Label htmlFor="compare" className="text-sm">Comparar con mes anterior</Label>
        </div>
        {isClosed && <Badge variant="secondary">Ejercicio cerrado</Badge>}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20">Cuenta</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right w-32">{MONTHS[month - 1]} {year}</TableHead>
                {compare && <TableHead className="text-right w-32">{MONTHS[prevMonth - 1]} {prevYear}</TableHead>}
                {compare && <TableHead className="text-right w-28">Variación</TableHead>}
                {compare && <TableHead className="text-right w-20">%</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* INGRESOS */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={compare ? 6 : 3} className="font-bold text-primary">INGRESOS</TableCell>
              </TableRow>
              {categorize(ingresos, 'ingreso').map(group => (
                <>
                  <TableRow key={group.label} className="bg-muted/10">
                    <TableCell colSpan={compare ? 6 : 3} className="font-semibold text-sm text-muted-foreground pl-6">{group.label}</TableCell>
                  </TableRow>
                  {group.items.map(line => {
                    const prev = prevMap.get(line.code) || 0;
                    return (
                      <TableRow key={line.code}>
                        <TableCell className="font-mono text-xs pl-10">{line.code}</TableCell>
                        <TableCell className="pl-10">{line.name}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(line.saldo)}</TableCell>
                        {compare && <TableCell className="text-right font-mono">{fmt(prev)}</TableCell>}
                        {compare && <TableCell className="text-right font-mono">{fmt(line.saldo - prev)}</TableCell>}
                        {compare && <TableCell className="text-right font-mono text-xs">{pct(line.saldo, prev)}</TableCell>}
                      </TableRow>
                    );
                  })}
                </>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell />
                <TableCell>Total Ingresos</TableCell>
                <TableCell className="text-right font-mono">{fmt(totalIngresos)}</TableCell>
                {compare && <TableCell className="text-right font-mono">{fmt(prevTotalIngresos)}</TableCell>}
                {compare && <TableCell className="text-right font-mono">{fmt(totalIngresos - prevTotalIngresos)}</TableCell>}
                {compare && <TableCell className="text-right font-mono text-xs">{pct(totalIngresos, prevTotalIngresos)}</TableCell>}
              </TableRow>

              {/* GASTOS */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={compare ? 6 : 3} className="font-bold text-destructive">GASTOS</TableCell>
              </TableRow>
              {categorize(gastos, 'gasto').map(group => (
                <>
                  <TableRow key={group.label} className="bg-muted/10">
                    <TableCell colSpan={compare ? 6 : 3} className="font-semibold text-sm text-muted-foreground pl-6">{group.label}</TableCell>
                  </TableRow>
                  {group.items.map(line => {
                    const prev = prevMap.get(line.code) || 0;
                    return (
                      <TableRow key={line.code}>
                        <TableCell className="font-mono text-xs pl-10">{line.code}</TableCell>
                        <TableCell className="pl-10">{line.name}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(line.saldo)}</TableCell>
                        {compare && <TableCell className="text-right font-mono">{fmt(prev)}</TableCell>}
                        {compare && <TableCell className="text-right font-mono">{fmt(line.saldo - prev)}</TableCell>}
                        {compare && <TableCell className="text-right font-mono text-xs">{pct(line.saldo, prev)}</TableCell>}
                      </TableRow>
                    );
                  })}
                </>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell />
                <TableCell>Total Gastos</TableCell>
                <TableCell className="text-right font-mono">{fmt(totalGastos)}</TableCell>
                {compare && <TableCell className="text-right font-mono">{fmt(prevTotalGastos)}</TableCell>}
                {compare && <TableCell className="text-right font-mono">{fmt(totalGastos - prevTotalGastos)}</TableCell>}
                {compare && <TableCell className="text-right font-mono text-xs">{pct(totalGastos, prevTotalGastos)}</TableCell>}
              </TableRow>

              {/* RESULTADO */}
              <TableRow className="bg-muted/50 border-t-4">
                <TableCell />
                <TableCell className="font-bold text-lg flex items-center gap-2">
                  {resultado >= 0 ? (
                    <><TrendingUp className="h-5 w-5 text-green-600" /> Beneficio</>
                  ) : (
                    <><TrendingDown className="h-5 w-5 text-red-600" /> Pérdida</>
                  )}
                </TableCell>
                <TableCell className={`text-right font-mono font-bold text-lg ${resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(resultado)}
                </TableCell>
                {compare && (
                  <TableCell className={`text-right font-mono font-bold ${prevResultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(prevResultado)}
                  </TableCell>
                )}
                {compare && <TableCell className="text-right font-mono font-bold">{fmt(resultado - prevResultado)}</TableCell>}
                {compare && <TableCell className="text-right font-mono text-xs font-bold">{pct(resultado, prevResultado)}</TableCell>}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Coherencia check */}
      {coherencia !== null && (
        <div className="print:mt-4">
          {coherencia === 0 ? (
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Coherente con Balance</AlertTitle>
              <AlertDescription className="text-green-700">
                El resultado de PyG ({fmt(resultado)}) coincide con el saldo de la cuenta 129.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Diferencia detectada</AlertTitle>
              <AlertDescription className="text-yellow-700">
                PyG: {fmt(resultado)} | Cuenta 129: {fmt(cuenta129!)} | Diferencia: {fmt(coherencia)}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        Este informe no incluye coste de adquisición de vehículos ni existencias contables; el margen por unidad se gestiona en el informe analítico de vehículos.
      </p>

      <DocumentPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`PyG — ${MONTHS[month - 1]} ${year}`}
        html={pdfHtml}
        actions={[
          {
            icon: 'printer',
            tooltip: 'Imprimir',
            onClick: () => {
              const iframe = document.querySelector<HTMLIFrameElement>('iframe[title*="PyG"]');
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
