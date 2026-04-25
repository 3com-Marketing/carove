import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Loader2, AlertTriangle, TrendingUp, ExternalLink, Info, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

interface MarketVehicle {
  brand: string;
  model: string;
  version?: string;
  year: number;
  km: number;
  fuel?: string;
  transmission?: string;
  id: string;
}

interface Comparable {
  titulo: string;
  precio: number;
  year: number;
  km: number;
  provincia: string;
  url: string;
  fuente?: string;
  dias_publicado?: number;
  fecha_publicacion?: string;
}

interface MarketResult {
  id: string | null;
  comparables: Comparable[];
  total_comparables: number;
  total_ads_available?: number;
  precio_medio: number;
  mediana: number;
  percentil_25: number;
  percentil_75: number;
  competencia: 'baja' | 'media' | 'alta';
  valor_sugerido: number;
  error?: string;
}

interface ComputedMetrics {
  precio_medio: number;
  mediana: number;
  percentil_25: number;
  percentil_75: number;
  competencia: 'baja' | 'media' | 'alta';
  valor_sugerido: number;
}

interface MarketComparisonBlockProps {
  vehicle: MarketVehicle;
  onMarketValueChange: (value: number) => void;
}

const COMP_COLORS: Record<string, string> = {
  baja: 'text-emerald-600',
  media: 'text-yellow-600',
  alta: 'text-destructive',
};

const COMP_LABELS: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

function recalcMetrics(comparables: Comparable[]): ComputedMetrics {
  if (comparables.length === 0) {
    return { precio_medio: 0, mediana: 0, percentil_25: 0, percentil_75: 0, competencia: 'baja', valor_sugerido: 0 };
  }

  const prices = comparables.map(c => c.precio).sort((a, b) => a - b);
  const n = prices.length;

  const precio_medio = Math.round(prices.reduce((s, p) => s + p, 0) / n);

  const median = (arr: number[]) => {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
  };

  const percentile = (arr: number[], p: number) => {
    const idx = (p / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return arr[lo];
    return Math.round(arr[lo] + (arr[hi] - arr[lo]) * (idx - lo));
  };

  const mediana = median(prices);
  const percentil_25 = percentile(prices, 25);
  const percentil_75 = percentile(prices, 75);

  const competencia: 'baja' | 'media' | 'alta' = n < 10 ? 'baja' : n <= 25 ? 'media' : 'alta';

  // Valor sugerido: mediana ajustada por competencia
  const factor = competencia === 'baja' ? 0.97 : competencia === 'media' ? 0.95 : 0.93;
  const valor_sugerido = Math.round(mediana * factor);

  return { precio_medio, mediana, percentil_25, percentil_75, competencia, valor_sugerido };
}

export function MarketComparisonBlock({ vehicle, onMarketValueChange }: MarketComparisonBlockProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'result' | 'error' | 'cached'>('idle');
  const [result, setResult] = useState<MarketResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cachedDate, setCachedDate] = useState<string | null>(null);
  const [excludedIndexes, setExcludedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    checkExisting();
  }, [vehicle.id]);

  // Reset exclusions when result changes
  useEffect(() => {
    setExcludedIndexes(new Set());
  }, [result]);

  const activeComparables = useMemo(() => {
    if (!result) return [];
    return result.comparables.filter((_, i) => !excludedIndexes.has(i));
  }, [result, excludedIndexes]);

  const metrics = useMemo(() => {
    if (!result) return null;
    if (excludedIndexes.size === 0) {
      // Use original server metrics when nothing excluded
      return {
        precio_medio: result.precio_medio,
        mediana: result.mediana,
        percentil_25: result.percentil_25,
        percentil_75: result.percentil_75,
        competencia: result.competencia,
        valor_sugerido: result.valor_sugerido,
      } as ComputedMetrics;
    }
    return recalcMetrics(activeComparables);
  }, [result, excludedIndexes, activeComparables]);

  const toggleExclude = useCallback((index: number) => {
    setExcludedIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Propagate value change when metrics change due to exclusions
  useEffect(() => {
    if (metrics && excludedIndexes.size > 0 && metrics.valor_sugerido > 0 && (state === 'result')) {
      onMarketValueChange(metrics.valor_sugerido);
    }
  }, [metrics, excludedIndexes.size]);

  const restoreAll = useCallback(() => {
    setExcludedIndexes(new Set());
    if (result && result.valor_sugerido > 0) {
      onMarketValueChange(result.valor_sugerido);
    }
  }, [result, onMarketValueChange]);

  const checkExisting = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('market_comparisons' as any)
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const cached = data[0] as any;
      setResult({
        id: cached.id,
        comparables: cached.comparables || [],
        total_comparables: cached.total_comparables,
        total_ads_available: cached.total_ads_available || 0,
        precio_medio: cached.precio_medio,
        mediana: cached.mediana,
        percentil_25: cached.percentil_25,
        percentil_75: cached.percentil_75,
        competencia: cached.competencia,
        valor_sugerido: cached.valor_sugerido,
      });
      setCachedDate(cached.created_at);
      setState('cached');
    }
  };

  const runAnalysis = async () => {
    setState('loading');
    setErrorMsg('');

    try {
      const year = vehicle.year || new Date().getFullYear();

      const { data, error } = await supabase.functions.invoke('market-comparison', {
        body: {
          brand: vehicle.brand,
          model: vehicle.model,
          year,
          km: vehicle.km || 0,
          fuel: vehicle.fuel,
          transmission: vehicle.transmission,
          vehicle_id: vehicle.id,
        },
      });

      if (error) {
        setState('error');
        setErrorMsg(error.message || 'Error al contactar con el servicio de análisis');
        return;
      }

      if (data.error && (!data.comparables || data.comparables.length === 0) && !data.precio_medio) {
        setState('error');
        setErrorMsg(data.error);
        return;
      }

      setResult(data as MarketResult);
      setCachedDate(null);
      setState('result');

      if (data.valor_sugerido > 0) {
        onMarketValueChange(data.valor_sugerido);
      }
    } catch (err) {
      setState('error');
      setErrorMsg(String(err));
    }
  };

  const useCached = () => {
    if (result && result.valor_sugerido > 0) {
      onMarketValueChange(result.valor_sugerido);
    }
    setState('result');
  };

  if (state === 'idle') {
    return (
      <Card className="border border-dashed shadow-sm">
        <CardContent className="py-6 flex flex-col items-center gap-3">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Analiza el mercado en Canarias para obtener una referencia de precio basada en anuncios reales.
          </p>
          <Button onClick={runAnalysis} variant="outline" size="sm">
            <Search className="h-4 w-4 mr-1" />
            Analizar mercado Canarias
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === 'cached') {
    const daysAgo = cachedDate
      ? Math.floor((Date.now() - new Date(cachedDate).getTime()) / 86400000)
      : 0;
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Comparativa de mercado
            <Badge variant="secondary" className="text-xs">
              {daysAgo === 0 ? 'Hoy' : `Hace ${daysAgo}d`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Existe un análisis reciente ({result?.total_comparables} comparables, valor sugerido: {formatCurrency(result?.valor_sugerido || 0)}).
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={useCached}>
              Usar existente
            </Button>
            <Button size="sm" variant="outline" onClick={runAnalysis}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Forzar actualización
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === 'loading') {
    return (
      <Card className="border shadow-sm">
        <CardContent className="py-8 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analizando mercado en Canarias...</p>
          <p className="text-xs text-muted-foreground">Buscando anuncios de {vehicle.brand} {vehicle.model} en Las Palmas y Tenerife</p>
        </CardContent>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card className="border border-destructive/30 shadow-sm">
        <CardContent className="py-6 flex flex-col items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive text-center">{errorMsg}</p>
          <Button size="sm" variant="outline" onClick={runAnalysis}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Result state
  if (!result || !metrics) return null;

  const hasComparables = result.comparables.length > 0;
  const totalAds = result.total_ads_available || 0;
  const totalComps = result.comparables.length;
  const activeCount = totalComps - excludedIndexes.size;
  const hasExclusions = excludedIndexes.size > 0;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Comparativa de mercado
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={runAnalysis}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Actualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Comparables</p>
            <p className="text-lg font-bold">
              {hasExclusions ? (
                <span>{activeCount}<span className="text-xs font-normal text-muted-foreground">/{totalComps}</span></span>
              ) : (
                totalComps
              )}
            </p>
            {totalAds > totalComps && !hasExclusions && (
              <p className="text-[10px] text-muted-foreground">{totalAds} en portal</p>
            )}
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Precio medio</p>
            <p className="text-sm font-semibold">{formatCurrency(metrics.precio_medio)}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Mediana</p>
            <p className="text-sm font-semibold">{formatCurrency(metrics.mediana)}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">Competencia</p>
            <p className={`text-sm font-semibold ${COMP_COLORS[metrics.competencia]}`}>
              {COMP_LABELS[metrics.competencia]}
            </p>
          </div>
        </div>

        <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Valor sugerido (mediana ajustada)</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(metrics.valor_sugerido)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Rango: {formatCurrency(metrics.percentil_25)} — {formatCurrency(metrics.percentil_75)}
          </p>
          {hasExclusions && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Recalculado con {activeCount} de {totalComps} comparables
            </p>
          )}
        </div>

        {/* Comparables table */}
        {hasComparables && (
          <>
            {hasExclusions && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Usando <span className="font-medium text-foreground">{activeCount}</span> de {totalComps} — desmarca los que no apliquen
                </p>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={restoreAll}>
                  <RotateCcw className="h-3 w-3" />
                  Restaurar
                </Button>
              </div>
            )}
            {!hasExclusions && (
              <p className="text-xs text-muted-foreground">
                Desmarca los anuncios que no apliquen para ajustar el análisis
              </p>
            )}
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8"></TableHead>
                     <TableHead className="text-xs">Anuncio</TableHead>
                     <TableHead className="text-xs text-right">Precio</TableHead>
                     <TableHead className="text-xs">Provincia</TableHead>
                     <TableHead className="text-xs text-center">Días</TableHead>
                     <TableHead className="text-xs">Fuente</TableHead>
                     <TableHead className="text-xs w-10">Ver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.comparables.slice(0, 30).map((c, i) => {
                    const isExcluded = excludedIndexes.has(i);
                    return (
                      <TableRow
                        key={i}
                        className={isExcluded ? 'opacity-40' : ''}
                      >
                        <TableCell className="py-1.5 pr-0">
                          <Checkbox
                            checked={!isExcluded}
                            onCheckedChange={() => toggleExclude(i)}
                            className="h-3.5 w-3.5"
                          />
                        </TableCell>
                        <TableCell className={`text-xs py-1.5 max-w-[280px] truncate ${isExcluded ? 'line-through' : ''}`}>
                          {c.url ? (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {c.titulo}
                            </a>
                          ) : (
                            c.titulo
                          )}
                        </TableCell>
                        <TableCell className={`text-xs py-1.5 text-right font-medium ${isExcluded ? 'line-through' : ''}`}>
                          {formatCurrency(c.precio)}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">{c.provincia || 'Canarias'}</TableCell>
                        <TableCell className="text-xs py-1.5 text-center">
                          {c.dias_publicado != null ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                c.dias_publicado < 15
                                  ? 'border-emerald-500 text-emerald-600'
                                  : c.dias_publicado <= 45
                                  ? 'border-yellow-500 text-yellow-600'
                                  : 'border-destructive text-destructive'
                              }`}
                            >
                              {c.dias_publicado}d
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {c.fuente === 'autocasion' ? 'Autocasión' : 'Coches.net'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" title="Ver anuncio original">
                              <ExternalLink className="h-3.5 w-3.5 text-primary hover:text-primary/80" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Info note about limited SSR results */}
        {hasComparables && totalAds > totalComps && (
          <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Se muestran {totalComps} anuncios con enlace directo de {totalAds} disponibles en el portal.
              Las métricas se calculan con los datos extraídos. Para ver todos los anuncios, busca directamente en coches.net.
            </p>
          </div>
        )}

        {!hasComparables && metrics.precio_medio > 0 && (
          <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {totalAds > 0
                ? `Hay ${totalAds} anuncios en el portal pero no se pudieron extraer los detalles individuales. Las métricas se basan en los datos agregados del portal.`
                : 'Las métricas se basan en los datos agregados disponibles del portal.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
