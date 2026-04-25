import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveTermModelsWithCommission } from '@/lib/supabase-api';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, Building2, Scale, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';
import { FinanceRappelAdvisor } from './FinanceRappelAdvisor';

export interface FinanceSelection {
  term_model_id: string;
  down_payment: number;
  financed_amount: number;
  monthly_payment: number;
  total_financed: number;
  commission_estimated: number;
  internal_flag: 'cliente' | 'empresa' | 'equilibrio';
  entity_name: string;
  product_name: string;
  tin: number;
  term_months: number;
}

interface ComparatorResult {
  id: string;
  entity_name: string;
  product_name: string;
  tin: number;
  term_months: number;
  coefficient: number;
  commission_percent: number;
  monthly_payment: number;
  total_payment: number;
  commission: number;
  internal_flag: 'cliente' | 'empresa' | 'equilibrio' | null;
  rank_cuota: number;
  rank_comision: number;
  score: number;
}

interface Props {
  totalPrice: number;
  onSelectionChange: (selection: FinanceSelection | null) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

type SortBy = 'cuota' | 'total' | 'comision';
type ShowCount = '1' | '3' | '5' | '10' | 'all';

const YEAR_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const QUICK_RANGES: { label: string; from: number; to: number }[] = [
  { label: '3–4 años', from: 3, to: 4 },
  { label: '4–5 años', from: 4, to: 5 },
  { label: '5–6 años', from: 5, to: 6 },
  { label: '6–8 años', from: 6, to: 8 },
];

export function FinanceComparatorSection({ totalPrice, onSelectionChange, enabled, onEnabledChange }: Props) {
  const [downPayment, setDownPayment] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('cuota');
  const [showCount, setShowCount] = useState<ShowCount>('5');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);

  const { data: termModels = [], isLoading } = useQuery({
    queryKey: ['active-term-models-commission'],
    queryFn: getActiveTermModelsWithCommission,
    enabled,
  });

  const financedAmount = Math.max(0, totalPrice - downPayment);

  const results: ComparatorResult[] = useMemo(() => {
    if (!financedAmount || financedAmount <= 0 || termModels.length === 0) return [];

    const calculated = termModels.map((m: any) => ({
      id: m.id,
      entity_name: m.entity_name,
      product_name: m.product_name,
      tin: m.tin,
      term_months: m.term_months,
      coefficient: m.coefficient,
      commission_percent: m.commission_percent,
      monthly_payment: financedAmount * m.coefficient,
      total_payment: financedAmount * m.coefficient * m.term_months,
      commission: financedAmount * (m.commission_percent / 100),
      internal_flag: null as ComparatorResult['internal_flag'],
      rank_cuota: 0,
      rank_comision: 0,
      score: 0,
    }));

    const sortedByCuota = [...calculated].sort((a, b) => a.monthly_payment - b.monthly_payment);
    sortedByCuota.forEach((item, i) => { item.rank_cuota = i + 1; });

    const sortedByComision = [...calculated].sort((a, b) => b.commission - a.commission);
    sortedByComision.forEach((item, i) => { item.rank_comision = i + 1; });

    calculated.forEach(item => { item.score = item.rank_cuota + item.rank_comision; });

    const bestCuotaId = sortedByCuota[0]?.id;
    const bestComisionId = sortedByComision[0]?.id;
    const bestEquilibrioId = [...calculated].sort((a, b) => a.score - b.score)[0]?.id;

    calculated.forEach(item => {
      if (item.id === bestCuotaId) {
        item.internal_flag = 'cliente';
      } else if (item.id === bestEquilibrioId) {
        item.internal_flag = 'equilibrio';
      } else if (item.id === bestComisionId) {
        item.internal_flag = 'empresa';
      }
    });

    if (bestCuotaId === bestEquilibrioId) {
      const nextBest = [...calculated].sort((a, b) => a.score - b.score).find(i => i.id !== bestCuotaId);
      if (nextBest) nextBest.internal_flag = 'equilibrio';
    }
    if (bestCuotaId === bestComisionId) {
      const nextBest = sortedByComision.find(i => i.id !== bestCuotaId && i.internal_flag !== 'equilibrio');
      if (nextBest) nextBest.internal_flag = 'empresa';
    }

    return calculated;
  }, [termModels, financedAmount]);

  // Auto-select equilibrio
  useEffect(() => {
    if (results.length > 0 && !selectedId) {
      const eq = results.find(r => r.internal_flag === 'equilibrio');
      if (eq) setSelectedId(eq.id);
    }
  }, [results, selectedId]);

  // Notify parent of selection
  useEffect(() => {
    if (!enabled) {
      onSelectionChange(null);
      return;
    }
    const selected = results.find(r => r.id === selectedId);
    if (selected) {
      onSelectionChange({
        term_model_id: selected.id,
        down_payment: downPayment,
        financed_amount: financedAmount,
        monthly_payment: selected.monthly_payment,
        total_financed: selected.total_payment,
        commission_estimated: selected.commission,
        internal_flag: selected.internal_flag || 'equilibrio',
        entity_name: selected.entity_name,
        product_name: selected.product_name,
        tin: selected.tin,
        term_months: selected.term_months,
      });
    } else {
      onSelectionChange(null);
    }
  }, [selectedId, enabled, results, downPayment, financedAmount]);

  const isFilterActive = yearFrom !== null && yearTo !== null;

  const filteredAndSorted = useMemo(() => {
    let base = [...results];
    if (isFilterActive) {
      const minMonths = yearFrom! * 12;
      const maxMonths = yearTo! * 12;
      base = base.filter(m => m.term_months >= minMonths && m.term_months <= maxMonths);
    }
    if (sortBy === 'cuota') base.sort((a, b) => a.monthly_payment - b.monthly_payment);
    else if (sortBy === 'total') base.sort((a, b) => a.total_payment - b.total_payment);
    else base.sort((a, b) => b.commission - a.commission);

    const limit = showCount === 'all' ? base.length : parseInt(showCount);
    return base.slice(0, limit);
  }, [results, sortBy, showCount, isFilterActive, yearFrom, yearTo]);

  const bestGlobal = useMemo(() => {
    if (results.length === 0) return null;
    return [...results].sort((a, b) => a.monthly_payment - b.monthly_payment)[0];
  }, [results]);

  const bestRange = useMemo(() => {
    if (!isFilterActive || results.length === 0) return null;
    const minMonths = yearFrom! * 12;
    const maxMonths = yearTo! * 12;
    const filtered = results.filter(m => m.term_months >= minMonths && m.term_months <= maxMonths);
    if (filtered.length === 0) return null;
    return [...filtered].sort((a, b) => a.monthly_payment - b.monthly_payment)[0];
  }, [results, isFilterActive, yearFrom, yearTo]);

  const deltas = useMemo(() => {
    if (!bestGlobal || !bestRange) return null;
    return {
      monthly: bestRange.monthly_payment - bestGlobal.monthly_payment,
      total: bestRange.total_payment - bestGlobal.total_payment,
      years: (bestGlobal.term_months - bestRange.term_months) / 12,
    };
  }, [bestGlobal, bestRange]);

  const flagIcon = (flag: ComparatorResult['internal_flag']) => {
    if (flag === 'cliente') return <Badge variant="outline" className="text-[10px] gap-1 border-green-300 text-green-700 dark:text-green-400"><TrendingDown className="h-3 w-3" />Cliente</Badge>;
    if (flag === 'empresa') return <Badge variant="outline" className="text-[10px] gap-1 border-blue-300 text-blue-700 dark:text-blue-400"><Building2 className="h-3 w-3" />Empresa</Badge>;
    if (flag === 'equilibrio') return <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700 dark:text-amber-400"><Scale className="h-3 w-3" />Equilibrio</Badge>;
    return null;
  };

  const handleQuickRange = (from: number, to: number) => {
    setYearFrom(from);
    setYearTo(to);
  };

  const clearFilter = () => {
    setYearFrom(null);
    setYearTo(null);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Checkbox
            id="add-financing"
            checked={enabled}
            onCheckedChange={(v) => onEnabledChange(!!v)}
          />
          <Label htmlFor="add-financing" className="text-sm font-semibold cursor-pointer">
            Añadir financiación
          </Label>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Precio total</Label>
              <Input value={formatCurrency(totalPrice)} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Entrada</Label>
              <Input
                type="number"
                min={0}
                max={totalPrice}
                value={downPayment || ''}
                onChange={e => {
                  setDownPayment(Number(e.target.value) || 0);
                  setSelectedId(null);
                }}
                className="h-8 text-xs"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Importe a financiar</Label>
              <Input value={formatCurrency(financedAmount)} readOnly className="h-8 text-xs bg-muted font-semibold" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {financedAmount <= 0 ? 'Introduce un importe a financiar válido.' : 'No hay modelos de financiación activos configurados.'}
            </p>
          ) : (
            <>
              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Ordenar por</Label>
                  <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuota">Cuota</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                      <SelectItem value="comision">Comisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Mostrar</Label>
                  <Select value={showCount} onValueChange={v => setShowCount(v as ShowCount)}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="all">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Year range filter */}
              <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                <Label className="text-xs font-medium">Rango de financiación</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <Select value={yearFrom?.toString() ?? ''} onValueChange={v => setYearFrom(v ? Number(v) : null)}>
                      <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y} años</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <Select value={yearTo?.toString() ?? ''} onValueChange={v => setYearTo(v ? Number(v) : null)}>
                      <SelectTrigger className="h-7 w-20 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map(y => (
                          <SelectItem key={y} value={y.toString()}>{y} años</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_RANGES.map(qr => (
                    <Badge
                      key={qr.label}
                      variant={isFilterActive && yearFrom === qr.from && yearTo === qr.to ? 'default' : 'outline'}
                      className="text-[10px] cursor-pointer hover:bg-accent"
                      onClick={() => handleQuickRange(qr.from, qr.to)}
                    >
                      {qr.label}
                    </Badge>
                  ))}
                  <Badge
                    variant={!isFilterActive ? 'default' : 'outline'}
                    className="text-[10px] cursor-pointer hover:bg-accent"
                    onClick={clearFilter}
                  >
                    Todos
                  </Badge>
                </div>
              </div>

              {/* Results Table */}
              {filteredAndSorted.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay modelos disponibles en ese rango.
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 text-xs">#</TableHead>
                        <TableHead className="text-xs">Entidad</TableHead>
                        <TableHead className="text-xs">Producto</TableHead>
                        <TableHead className="text-xs text-right">TIN</TableHead>
                        <TableHead className="text-xs text-right">Plazo</TableHead>
                        <TableHead className="text-xs text-right">Cuota</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-right">Comisión</TableHead>
                        <TableHead className="text-xs w-24">Indicador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSorted.map((r, idx) => (
                        <TableRow
                          key={r.id}
                          className={`cursor-pointer transition-colors ${selectedId === r.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'}`}
                          onClick={() => setSelectedId(r.id)}
                        >
                          <TableCell className="text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="text-xs">{r.entity_name}</TableCell>
                          <TableCell className="text-xs">{r.product_name}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{r.tin}%</TableCell>
                          <TableCell className="text-xs text-right">{r.term_months}m</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{formatCurrency(r.monthly_payment)}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(r.total_payment)}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(r.commission)}</TableCell>
                          <TableCell>{flagIcon(r.internal_flag)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">Seleccionado</Badge>
                  {(() => {
                    const s = results.find(r => r.id === selectedId);
                    return s ? `${s.entity_name} — ${s.product_name} · ${s.term_months}m · ${formatCurrency(s.monthly_payment)}/mes` : '';
                  })()}
                </div>
              )}

              {/* Rappel Advisor */}
              <FinanceRappelAdvisor
                entityName={(() => {
                  const s = results.find(r => r.id === selectedId);
                  return s?.entity_name || null;
                })()}
                financedAmount={financedAmount}
              />

              {/* Comparative block */}
              {bestGlobal && (
                <div className="space-y-3 pt-2">
                  <div className={`grid gap-3 ${isFilterActive && bestRange ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Best global card */}
                    <div className="rounded-md border p-3 bg-muted/20 space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Mejor opción global</p>
                      <p className="text-sm font-semibold">{formatCurrency(bestGlobal.monthly_payment)}<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
                      <p className="text-xs text-muted-foreground">{bestGlobal.entity_name} · {(bestGlobal.term_months / 12).toFixed(0)} años · Total {formatCurrency(bestGlobal.total_payment)}</p>
                    </div>

                    {/* Best range card */}
                    {isFilterActive && bestRange && (
                      <div className="rounded-md border p-3 bg-muted/20 space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Mejor opción {yearFrom}–{yearTo} años</p>
                        <p className="text-sm font-semibold">{formatCurrency(bestRange.monthly_payment)}<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
                        <p className="text-xs text-muted-foreground">{bestRange.entity_name} · {(bestRange.term_months / 12).toFixed(0)} años · Total {formatCurrency(bestRange.total_payment)}</p>
                      </div>
                    )}
                  </div>

                  {/* Deltas */}
                  {isFilterActive && deltas && (
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      {deltas.monthly !== 0 && (
                        <span className={`inline-flex items-center gap-1 ${deltas.monthly > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                          {deltas.monthly > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {deltas.monthly > 0 ? '+' : ''}{formatCurrency(deltas.monthly)}/mes vs global
                        </span>
                      )}
                      {deltas.total !== 0 && (
                        <span className={`inline-flex items-center gap-1 ${deltas.total > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                          {deltas.total > 0 ? '+' : ''}{formatCurrency(deltas.total)} total
                        </span>
                      )}
                      {deltas.years > 0 && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Terminas {deltas.years.toFixed(0)} {deltas.years === 1 ? 'año' : 'años'} antes
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
