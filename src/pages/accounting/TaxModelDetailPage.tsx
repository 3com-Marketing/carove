import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Send, FileText, ExternalLink, Download, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  getTaxModels,
  getTaxModelPeriods,
  upsertTaxModelPeriod,
  getTaxCalculationData,
  getCompanySettings,
} from '@/lib/supabase-api';
import { AEAT_URLS, getFilingDeadline, generateTaxFileTXT, downloadTxtFile } from '@/lib/tax-export';
import type { TaxPeriodStatus } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  verificado: 'bg-blue-100 text-blue-800',
  presentado: 'bg-emerald-100 text-emerald-800',
};

function fmt(val: number): string {
  return val.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export default function TaxModelDetailPage() {
  const { modelCode } = useParams<{ modelCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [notes, setNotes] = useState('');
  const [checkedSections, setCheckedSections] = useState<Record<string, boolean>>({});

  const { data: models = [] } = useQuery({ queryKey: ['tax-models'], queryFn: getTaxModels });
  const model = models.find(m => m.model_code === modelCode);

  const { data: periods = [] } = useQuery({
    queryKey: ['tax-model-periods'],
    queryFn: () => getTaxModelPeriods(),
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
  });

  const period = useMemo(() => {
    if (!model) return undefined;
    return periods.find(p =>
      p.tax_model_id === model.id &&
      p.year === year &&
      (model.period_type === 'anual' ? p.quarter === null : p.quarter === quarter)
    );
  }, [periods, model, year, quarter]);

  const currentStatus: TaxPeriodStatus = period?.status || 'pendiente';

  const { data: calcData, isLoading: calcLoading } = useQuery({
    queryKey: ['tax-calc', modelCode, year, quarter],
    queryFn: () => getTaxCalculationData(modelCode!, year, model?.period_type === 'anual' ? null : quarter),
    enabled: !!model,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: TaxPeriodStatus) => {
      if (!model || !user) return;
      await upsertTaxModelPeriod({
        tax_model_id: model.id,
        year,
        quarter: model.period_type === 'anual' ? null : quarter,
        status: newStatus,
        verified_by: newStatus === 'verificado' ? user.id : period?.verified_by || null,
        verified_at: newStatus === 'verificado' ? new Date().toISOString() : period?.verified_at || null,
        presented_at: newStatus === 'presentado' ? new Date().toISOString() : period?.presented_at || null,
        notes: notes || period?.notes || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-model-periods'] });
      toast({ title: 'Estado actualizado' });
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      if (!model || !user) return;
      await upsertTaxModelPeriod({
        tax_model_id: model.id,
        year,
        quarter: model.period_type === 'anual' ? null : quarter,
        status: currentStatus,
        notes,
        verified_by: period?.verified_by || null,
        verified_at: period?.verified_at || null,
        presented_at: period?.presented_at || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-model-periods'] });
      toast({ title: 'Notas guardadas' });
    },
  });

  useMemo(() => {
    if (period?.notes) setNotes(period.notes);
    else setNotes('');
  }, [period]);

  if (!model) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Modelo no encontrado</p>
        <Button variant="link" onClick={() => navigate('/accounting/taxes')}>Volver</Button>
      </div>
    );
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const aeatInfo = AEAT_URLS[modelCode!];
  const deadline = getFilingDeadline(model.period_type, year, model.period_type === 'anual' ? null : quarter);

  const handleExportTxt = () => {
    if (!calcData) return;
    const nif = companySettings?.tax_id || 'XXXXXXXXX';
    const companyName = companySettings?.company_name || 'Empresa';
    const content = generateTaxFileTXT(modelCode!, calcData, nif, year, model.period_type === 'anual' ? null : quarter, companyName);
    const periodLabel = model.period_type === 'anual' ? `${year}` : `T${quarter}_${year}`;
    downloadTxtFile(content, `Modelo_${modelCode}_${periodLabel}.txt`);
    toast({ title: 'Fichero TXT descargado' });
  };

  // Deadline status
  const deadlineStatus = (() => {
    if (!deadline) return null;
    const today = new Date();
    if (today > deadline.end) return 'expired';
    if (today >= deadline.start) return 'active';
    return 'upcoming';
  })();

  // ── Calculation rendering ──
  const renderCalculation = () => {
    if (calcLoading) return <p className="text-sm text-muted-foreground animate-pulse">Calculando datos...</p>;
    if (!calcData) return <p className="text-sm text-muted-foreground">Sin datos para este periodo</p>;

    const sections: { title: string; rows: { label: string; value: number }[] }[] = [];

    if (['303', '420'].includes(modelCode!)) {
      const taxLabel = modelCode === '420' ? 'IGIC' : 'IVA';
      sections.push(
        {
          title: `${taxLabel} Repercutido (Ventas)`,
          rows: [
            { label: 'Base imponible', value: calcData.salesBase || 0 },
            { label: 'Cuota repercutida', value: calcData.salesTax || 0 },
          ],
        },
        {
          title: `${taxLabel} Soportado (Gastos)`,
          rows: [
            { label: 'Base imponible', value: calcData.expensesBase || 0 },
            { label: 'Cuota soportada', value: calcData.expensesTax || 0 },
          ],
        },
        {
          title: 'Resultado',
          rows: [
            { label: 'A ingresar / A compensar', value: (calcData.salesTax || 0) - (calcData.expensesTax || 0) },
          ],
        }
      );
    } else if (modelCode === '130') {
      const income = calcData.income || 0;
      const expenses = calcData.expenses || 0;
      const profit = income - expenses;
      sections.push(
        {
          title: 'Ingresos y Gastos',
          rows: [
            { label: 'Ingresos del periodo', value: income },
            { label: 'Gastos del periodo', value: expenses },
            { label: 'Beneficio', value: profit },
          ],
        },
        {
          title: 'Resultado',
          rows: [
            { label: 'Pago fraccionado (20%)', value: profit > 0 ? profit * 0.2 : 0 },
          ],
        }
      );
    } else if (modelCode === '111') {
      sections.push({
        title: 'Retenciones IRPF practicadas',
        rows: [
          { label: 'Nº perceptores', value: calcData.retentionCount || 0 },
          { label: 'Base retenciones', value: calcData.retentionBase || 0 },
          { label: 'Retenciones', value: calcData.retentionAmount || 0 },
        ],
      });
    } else if (modelCode === '349') {
      sections.push({
        title: 'Operaciones Intracomunitarias',
        rows: [
          { label: 'Nº operaciones', value: calcData.intraOpsCount || 0 },
          { label: 'Base imponible total', value: calcData.intraOpsBase || 0 },
        ],
      });
    } else if (modelCode === '369') {
      sections.push({
        title: 'IVA Régimen OSS',
        rows: [
          { label: 'Nº operaciones', value: calcData.ossOpsCount || 0 },
          { label: 'Base imponible', value: calcData.ossBase || 0 },
          { label: 'Cuota IVA', value: calcData.ossTax || 0 },
        ],
      });
    } else if (modelCode === '115') {
      sections.push({
        title: 'Retenciones Capital Inmobiliario',
        rows: [
          { label: 'Nº arrendadores', value: calcData.rentalCount || 0 },
          { label: 'Base retenciones', value: calcData.rentalBase || 0 },
          { label: 'Retenciones (19%)', value: calcData.rentalRetention || 0 },
        ],
      });
    } else if (modelCode === '190') {
      const quarterRows: { title: string; rows: { label: string; value: number }[] }[] = [];
      for (let q = 1; q <= 4; q++) {
        quarterRows.push({
          title: `Trimestre ${q}`,
          rows: [
            { label: 'Base retenciones', value: calcData[`q${q}Base`] || 0 },
            { label: 'Retenciones', value: calcData[`q${q}Retention`] || 0 },
          ],
        });
      }
      quarterRows.push({
        title: 'Total Anual',
        rows: [
          { label: 'Total base', value: calcData.totalAnnualBase || 0 },
          { label: 'Total retenciones', value: calcData.totalAnnualRetention || 0 },
        ],
      });
      sections.push(...quarterRows);
    } else if (modelCode === '200') {
      const profit = (calcData.annualIncome || 0) - (calcData.annualExpenses || 0);
      const taxBase = Math.max(profit, 0);
      sections.push(
        {
          title: 'Resultado del Ejercicio',
          rows: [
            { label: 'Ingresos', value: calcData.annualIncome || 0 },
            { label: 'Gastos', value: calcData.annualExpenses || 0 },
            { label: 'Resultado', value: profit },
          ],
        },
        {
          title: 'Liquidación',
          rows: [
            { label: 'Base imponible', value: taxBase },
            { label: 'Cuota íntegra (25%)', value: taxBase * 0.25 },
          ],
        }
      );
    } else {
      sections.push({
        title: 'Datos del periodo',
        rows: [
          { label: 'Total base', value: calcData.totalBase || 0 },
          { label: 'Total impuesto', value: calcData.totalTax || 0 },
        ],
      });
    }

    return (
      <div className="space-y-4">
        {sections.map((sec, si) => {
          const key = `section-${si}`;
          return (
            <Card key={key}>
              <CardHeader className="py-3 px-4 flex-row items-center gap-3">
                <Checkbox
                  id={key}
                  checked={checkedSections[key] || false}
                  onCheckedChange={(v) => setCheckedSections(prev => ({ ...prev, [key]: !!v }))}
                />
                <Label htmlFor={key} className="text-sm font-semibold cursor-pointer">{sec.title}</Label>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {sec.rows.map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell className="text-sm">{row.label}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {fmt(row.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/accounting/taxes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">Modelo {modelCode}</h1>
            <Badge variant="outline" className={STATUS_STYLES[currentStatus]}>
              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </Badge>
            {deadline && (
              <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full ${
                deadlineStatus === 'expired' ? 'bg-destructive/10 text-destructive' :
                deadlineStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                'bg-muted text-muted-foreground'
              }`}>
                {deadlineStatus === 'expired' ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                Plazo: {deadline.label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{model.description}</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-3 items-center">
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {model.period_type === 'trimestral' && (
          <Select value={String(quarter)} onValueChange={v => setQuarter(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map(q => <SelectItem key={q} value={String(q)}>T{q}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Calculated data */}
      {renderCalculation()}

      {/* Notes */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Notas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre este periodo..." rows={3} />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
            Guardar notas
          </Button>
        </CardContent>
      </Card>

      {/* Actions bar */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Acciones del periodo</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExportTxt} disabled={!calcData || calcLoading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar TXT
            </Button>

            {aeatInfo && (
              <Button variant="outline" asChild>
                <a href={aeatInfo.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {aeatInfo.label}
                </a>
              </Button>
            )}

            {currentStatus === 'pendiente' && (
              <Button onClick={() => statusMutation.mutate('verificado')} disabled={statusMutation.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como verificado
              </Button>
            )}

            {(currentStatus === 'pendiente' || currentStatus === 'verificado') && (
              <Button
                variant={currentStatus === 'verificado' ? 'default' : 'outline'}
                onClick={() => statusMutation.mutate('presentado')}
                disabled={statusMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Marcar como presentado
              </Button>
            )}
          </div>

          {/* Status history */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            {period?.verified_at && (
              <p className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                Verificado el {new Date(period.verified_at).toLocaleDateString('es-ES')}
              </p>
            )}
            {period?.presented_at && (
              <p className="flex items-center gap-1">
                <Send className="h-3 w-3 text-emerald-500" />
                Presentado el {new Date(period.presented_at).toLocaleDateString('es-ES')}
              </p>
            )}
            {currentStatus === 'presentado' && (
              <p className="text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Este modelo ha sido presentado
              </p>
            )}
            {!period?.verified_at && !period?.presented_at && (
              <p>Sin actividad registrada para este periodo</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
