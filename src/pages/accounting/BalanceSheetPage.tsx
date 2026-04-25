import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalanceSheet, getAccountingPeriods, requestReportHtml, type BalanceSheetLine } from '@/lib/supabase-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react';
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

type Category = 'activo_no_corriente' | 'activo_corriente' | 'pasivo_no_corriente' | 'pasivo_corriente' | 'patrimonio';

function classify(line: BalanceSheetLine): Category {
  if (line.account_type === 'activo') {
    return line.code.startsWith('2') ? 'activo_no_corriente' : 'activo_corriente';
  }
  if (line.account_type === 'pasivo') {
    return line.code.startsWith('1') ? 'pasivo_no_corriente' : 'pasivo_corriente';
  }
  return 'patrimonio';
}

export default function BalanceSheetPage() {
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [compare, setCompare] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const html = await requestReportHtml('balance', { year, month });
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
    queryKey: ['balance-sheet', year, month],
    queryFn: () => getBalanceSheet(year, month),
  });

  const { data: prevData } = useQuery({
    queryKey: ['balance-sheet', prevYear, prevMonth],
    queryFn: () => getBalanceSheet(prevYear, prevMonth),
    enabled: compare,
  });

  const analysis = useMemo(() => {
    const lines = currentData || [];
    const prev = prevData || [];
    const prevMap = new Map(prev.map(l => [l.code, l.saldo]));

    const groups: Record<Category, BalanceSheetLine[]> = {
      activo_no_corriente: [], activo_corriente: [],
      pasivo_no_corriente: [], pasivo_corriente: [],
      patrimonio: [],
    };
    lines.forEach(l => groups[classify(l)].push(l));

    // Internal saldos (debit - credit)
    const totalActivoReal = lines.filter(l => l.account_type === 'activo').reduce((s, l) => s + l.saldo, 0);
    const totalPasivoReal = lines.filter(l => l.account_type === 'pasivo').reduce((s, l) => s + l.saldo, 0);
    const totalPatrimonioReal = lines.filter(l => l.account_type === 'patrimonio').reduce((s, l) => s + l.saldo, 0);

    // Normalized for display (pasivo/patrimonio shown positive)
    const totalActivo = Math.round(totalActivoReal * 100) / 100;
    const totalPasivo = Math.round(Math.abs(totalPasivoReal) * 100) / 100;
    const totalPatrimonio = Math.round(Math.abs(totalPatrimonioReal) * 100) / 100;

    // Balance check with internal values
    const diff = Math.round((totalActivoReal + totalPasivoReal + totalPatrimonioReal) * 100) / 100;

    // Previous totals
    const prevActivoReal = prev.filter(l => l.account_type === 'activo').reduce((s, l) => s + l.saldo, 0);
    const prevPasivoReal = prev.filter(l => l.account_type === 'pasivo').reduce((s, l) => s + l.saldo, 0);
    const prevPatrimonioReal = prev.filter(l => l.account_type === 'patrimonio').reduce((s, l) => s + l.saldo, 0);
    const prevTotalActivo = Math.round(prevActivoReal * 100) / 100;
    const prevTotalPasivo = Math.round(Math.abs(prevPasivoReal) * 100) / 100;
    const prevTotalPatrimonio = Math.round(Math.abs(prevPatrimonioReal) * 100) / 100;

    const hasData = lines.length > 0;

    return { groups, prevMap, totalActivo, totalPasivo, totalPatrimonio, diff, prevTotalActivo, prevTotalPasivo, prevTotalPatrimonio, hasData };
  }, [currentData, prevData]);

  const { groups, prevMap, totalActivo, totalPasivo, totalPatrimonio, diff, prevTotalActivo, prevTotalPasivo, prevTotalPatrimonio, hasData } = analysis;

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const colSpan = compare ? 6 : 3;

  function renderLine(line: BalanceSheetLine, normalize: boolean) {
    const displaySaldo = normalize ? Math.abs(line.saldo) : line.saldo;
    const prevSaldo = prevMap.get(line.code) || 0;
    const displayPrev = normalize ? Math.abs(prevSaldo) : prevSaldo;
    const variation = displaySaldo - displayPrev;
    return (
      <TableRow key={line.code}>
        <TableCell className="font-mono text-xs pl-10">{line.code}</TableCell>
        <TableCell className="pl-10">{line.name}</TableCell>
        <TableCell className="text-right font-mono">{fmt(displaySaldo)}</TableCell>
        {compare && <TableCell className="text-right font-mono">{fmt(displayPrev)}</TableCell>}
        {compare && <TableCell className="text-right font-mono">{fmt(variation)}</TableCell>}
        {compare && <TableCell className="text-right font-mono text-xs">{pct(displaySaldo, displayPrev)}</TableCell>}
      </TableRow>
    );
  }

  function renderTotal(label: string, current: number, prev: number, bold = true) {
    return (
      <TableRow className={`border-t-2 ${bold ? 'font-bold' : ''}`}>
        <TableCell />
        <TableCell>{label}</TableCell>
        <TableCell className="text-right font-mono">{fmt(current)}</TableCell>
        {compare && <TableCell className="text-right font-mono">{fmt(prev)}</TableCell>}
        {compare && <TableCell className="text-right font-mono">{fmt(current - prev)}</TableCell>}
        {compare && <TableCell className="text-right font-mono text-xs">{pct(current, prev)}</TableCell>}
      </TableRow>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Balance de Situación</h1>
          <p className="text-muted-foreground text-sm">Estado patrimonial acumulado (YTD)</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
          <FileText className="h-4 w-4 mr-2" /> {exporting ? 'Generando...' : 'Exportar PDF'}
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">Balance de Situación</h1>
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
          <Switch id="bs-compare" checked={compare} onCheckedChange={setCompare} />
          <Label htmlFor="bs-compare" className="text-sm">Comparar con mes anterior</Label>
        </div>
        {isClosed && <Badge variant="secondary">Ejercicio cerrado</Badge>}
      </div>

      {!hasData && !isLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sin datos</AlertTitle>
          <AlertDescription>No hay movimientos contables en el periodo seleccionado.</AlertDescription>
        </Alert>
      )}

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
              {/* ACTIVO */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={colSpan} className="font-bold text-primary">ACTIVO</TableCell>
              </TableRow>
              {groups.activo_no_corriente.length > 0 && (
                <>
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={colSpan} className="font-semibold text-sm text-muted-foreground pl-6">Activo no corriente</TableCell>
                  </TableRow>
                  {groups.activo_no_corriente.map(l => renderLine(l, false))}
                </>
              )}
              {groups.activo_corriente.length > 0 && (
                <>
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={colSpan} className="font-semibold text-sm text-muted-foreground pl-6">Activo corriente</TableCell>
                  </TableRow>
                  {groups.activo_corriente.map(l => renderLine(l, false))}
                </>
              )}
              {renderTotal('Total Activo', totalActivo, prevTotalActivo)}

              {/* PASIVO */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={colSpan} className="font-bold text-destructive">PASIVO</TableCell>
              </TableRow>
              {groups.pasivo_no_corriente.length > 0 && (
                <>
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={colSpan} className="font-semibold text-sm text-muted-foreground pl-6">Pasivo no corriente</TableCell>
                  </TableRow>
                  {groups.pasivo_no_corriente.map(l => renderLine(l, true))}
                </>
              )}
              {groups.pasivo_corriente.length > 0 && (
                <>
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={colSpan} className="font-semibold text-sm text-muted-foreground pl-6">Pasivo corriente</TableCell>
                  </TableRow>
                  {groups.pasivo_corriente.map(l => renderLine(l, true))}
                </>
              )}
              {renderTotal('Total Pasivo', totalPasivo, prevTotalPasivo)}

              {/* PATRIMONIO */}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={colSpan} className="font-bold text-accent-foreground">PATRIMONIO NETO</TableCell>
              </TableRow>
              {groups.patrimonio.length > 0 && (
                <>
                  {groups.patrimonio.map(l => renderLine(l, true))}
                </>
              )}
              {renderTotal('Total Patrimonio', totalPatrimonio, prevTotalPatrimonio)}

              {/* TOTAL P+P */}
              <TableRow className="bg-muted/50 border-t-4">
                <TableCell />
                <TableCell className="font-bold text-lg">Total Pasivo + Patrimonio</TableCell>
                <TableCell className="text-right font-mono font-bold text-lg">{fmt(totalPasivo + totalPatrimonio)}</TableCell>
                {compare && <TableCell className="text-right font-mono font-bold">{fmt(prevTotalPasivo + prevTotalPatrimonio)}</TableCell>}
                {compare && <TableCell className="text-right font-mono font-bold">{fmt((totalPasivo + totalPatrimonio) - (prevTotalPasivo + prevTotalPatrimonio))}</TableCell>}
                {compare && <TableCell className="text-right font-mono text-xs font-bold">{pct(totalPasivo + totalPatrimonio, prevTotalPasivo + prevTotalPatrimonio)}</TableCell>}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Balance check */}
      <div className="print:mt-4">
        {Math.abs(diff) < 0.01 ? (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Balance cuadrado</AlertTitle>
            <AlertDescription className="text-green-700">
              Activo ({fmt(totalActivo)}) = Pasivo + Patrimonio ({fmt(totalPasivo + totalPatrimonio)})
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Balance descuadrado</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Activo: {fmt(totalActivo)} | Pasivo + Patrimonio: {fmt(totalPasivo + totalPatrimonio)} | Diferencia: {fmt(Math.abs(diff))}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Este informe no incluye coste de adquisición de vehículos ni existencias contables; el margen por unidad se gestiona en el informe analítico de vehículos.
      </p>

      <DocumentPreviewDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`Balance — ${MONTHS[month - 1]} ${year}`}
        html={pdfHtml}
        actions={[
          {
            icon: 'printer',
            tooltip: 'Imprimir',
            onClick: () => {
              const iframe = document.querySelector<HTMLIFrameElement>('iframe[title*="Balance"]');
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
