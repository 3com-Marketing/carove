import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign, Plus, Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard,
  Lock, LockOpen, CheckCircle2, TrendingDown, TrendingUp, Hash, History,
  AlertTriangle, Eye, CheckCheck, Clock, Minus, Calculator,
} from 'lucide-react';
import {
  getTodayCashSession, getCashSessionMovements, calculateCashSessionSummary,
  getCashSessionHistory, updateCashSessionReview,
} from '@/lib/supabase-api';
import type { CashSession, CashSessionMovement } from '@/lib/types';
import type { CashSessionSummary } from '@/lib/supabase-api';
import { OpenCashSessionDialog } from '@/components/treasury/OpenCashSessionDialog';
import { CashSessionMovementDialog } from '@/components/treasury/CashSessionMovementDialog';
import { CloseCashSessionDialog } from '@/components/treasury/CloseCashSessionDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

const DISCREPANCY_REASON_LABELS: Record<string, string> = {
  error_cambio: 'Error al dar cambio',
  gasto_no_registrado: 'Gasto no registrado',
  ingreso_no_registrado: 'Ingreso no registrado',
  error_conteo: 'Error de conteo',
  descuadre_tpv: 'Descuadre TPV',
  otro: 'Otro',
};

const TPV_DISCREPANCY_REASON_LABELS: Record<string, string> = {
  operacion_no_registrada: 'Operación no registrada',
  importe_incorrecto: 'Importe incorrecto',
  devolucion_no_registrada: 'Devolución no registrada',
  operacion_duplicada: 'Operación duplicada',
  error_lectura_terminal: 'Error lectura terminal',
  cierre_parcial_tpv: 'Cierre parcial TPV',
  otro: 'Otro',
};

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export default function CashRegisterPage() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashSessionMovement[]>([]);
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [movDialog, setMovDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterMethod, setFilterMethod] = useState<string>('todos');

  // History state
  const [history, setHistory] = useState<CashSession[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histStatus, setHistStatus] = useState<string>('todos');
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [histSettlement, setHistSettlement] = useState<string>('todos');
  const [histReview, setHistReview] = useState<string>('todos');
  const [histTpvStatus, setHistTpvStatus] = useState<string>('todos');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getTodayCashSession();
      setSession(s);
      if (s) {
        const movs = await getCashSessionMovements(s.id);
        setMovements(movs);
        setSummary(calculateCashSessionSummary(Number(s.opening_balance), movs));
      } else {
        setMovements([]);
        setSummary(null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const data = await getCashSessionHistory({
        status: histStatus,
        from: histFrom || undefined,
        to: histTo || undefined,
      });
      setHistory(data);
    } catch {
      // ignore
    } finally {
      setHistLoading(false);
    }
  }, [histStatus, histFrom, histTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = movements.filter(m => {
    if (filterType !== 'todos' && m.movement_type !== filterType) return false;
    if (filterMethod !== 'todos' && m.payment_method !== filterMethod) return false;
    return true;
  });

  const historyFiltered = history.filter(s => {
    if (histSettlement !== 'todos' && s.settlement_status !== histSettlement) return false;
    if (histReview !== 'todos' && s.review_status !== histReview) return false;
    if (histTpvStatus !== 'todos' && s.tpv_status !== histTpvStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Caja Diaria</h1>
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="today" onValueChange={v => v === 'history' && loadHistory()}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Caja Diaria</h1>
          <TabsList>
            <TabsTrigger value="today">Hoy</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" /> Historial</TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TODAY TAB ─── */}
        <TabsContent value="today" className="space-y-5 mt-4">
          {!session ? (
            <Card className="max-w-lg mx-auto">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Lock className="h-16 w-16 text-muted-foreground/40" />
                <p className="text-lg font-medium text-center">No hay caja abierta hoy</p>
                <p className="text-sm text-muted-foreground text-center">
                  Abre la caja para empezar a registrar movimientos del día.
                </p>
                <Button size="lg" onClick={() => setOpenDialog(true)}>
                  <Wallet className="h-4 w-4 mr-2" /> Abrir caja
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ── Bloque 1: Estado de la caja ── */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={session.status === 'abierta' ? 'default' : 'secondary'}
                        className="text-sm px-3 py-1"
                      >
                        {session.status === 'abierta'
                          ? <><LockOpen className="h-3.5 w-3.5 mr-1" /> Caja abierta</>
                          : <><Lock className="h-3.5 w-3.5 mr-1" /> Caja cerrada</>}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{session.opened_by_name || 'Usuario'}</span>
                        {' · '}
                        <Clock className="inline h-3 w-3 -mt-0.5" />{' '}
                        {format(new Date(session.opened_at), 'HH:mm')}
                        {' · '}
                        {format(new Date(session.session_date), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo inicial</p>
                      <p className="text-lg font-bold text-primary">{fmt(Number(session.opening_balance))}</p>
                    </div>
                  </div>
                  {session.status === 'cerrada' && session.closed_at && (
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                      Cerrada a las {format(new Date(session.closed_at), 'HH:mm')} por{' '}
                      <span className="font-medium text-foreground">{session.closed_by_name || 'Usuario'}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Bloque 2: KPIs en tiempo real ── */}
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    icon={DollarSign}
                    label="Saldo esperado"
                    value={fmt(summary.expected_balance)}
                    cardClass="border-primary/30 bg-primary/5"
                    valueClass="text-primary"
                  />
                  <KpiCard
                    icon={ArrowUpCircle}
                    label="Ingresos efectivo"
                    value={`+${fmt(summary.cash_income)}`}
                    valueClass="text-emerald-600"
                  />
                  <KpiCard
                    icon={ArrowDownCircle}
                    label="Gastos efectivo"
                    value={`-${fmt(summary.cash_expense)}`}
                    valueClass="text-red-500"
                  />
                  <KpiCard
                    icon={CreditCard}
                    label="Total TPV"
                    value={fmt(summary.total_tpv)}
                    cardClass="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800"
                    valueClass="text-blue-600"
                    subtitle="No afecta al cuadre"
                  />
                </div>
              )}

              {/* ── Bloque 3: Alertas contextuales ── */}
              <DashboardAlerts session={session} history={history} />

              {/* ── Bloque 4: Acciones rápidas (solo caja abierta) ── */}
              {session.status === 'abierta' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    size="lg"
                    className="h-16 flex flex-col gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setMovDialog(true)}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs font-medium">Añadir ingreso</span>
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-16 flex flex-col gap-1"
                    onClick={() => setMovDialog(true)}
                  >
                    <Minus className="h-5 w-5" />
                    <span className="text-xs font-medium">Añadir gasto</span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 flex flex-col gap-1"
                    onClick={() => {
                      if (summary) {
                        toast({
                          title: 'Arqueo de caja',
                          description: `Saldo esperado: ${fmt(summary.expected_balance)} | Ingresos: ${fmt(summary.cash_income)} | Gastos: ${fmt(summary.cash_expense)} | TPV: ${fmt(summary.total_tpv)}`,
                        });
                      }
                    }}
                  >
                    <Calculator className="h-5 w-5" />
                    <span className="text-xs font-medium">Hacer arqueo</span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 flex flex-col gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setCloseDialog(true)}
                  >
                    <Lock className="h-5 w-5" />
                    <span className="text-xs font-medium">Cerrar caja</span>
                  </Button>
                </div>
              )}

              {/* ── Closed session result card ── */}
              {session.status === 'cerrada' && (
                <ClosedSessionSummaryCard session={session} onReviewUpdate={loadData} />
              )}

              {/* ── Bloque 5: Últimos movimientos ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="text-base">
                      Últimos movimientos
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (mostrando {Math.min(filtered.length, 15)} de {movements.length})
                      </span>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos tipos</SelectItem>
                          <SelectItem value="ingreso">Ingresos</SelectItem>
                          <SelectItem value="gasto">Gastos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterMethod} onValueChange={setFilterMethod}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos métodos</SelectItem>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="tpv">TPV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No hay movimientos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.slice(0, 15).map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{format(new Date(m.movement_datetime), 'HH:mm')}</TableCell>
                            <TableCell>
                              <Badge variant={m.movement_type === 'ingreso' ? 'default' : 'destructive'} className="text-xs">
                                {m.movement_type === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs uppercase">{m.payment_method}</TableCell>
                            <TableCell className="text-xs capitalize">{m.category_name || m.category?.replace('_', ' ') || '—'}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{m.concept}</TableCell>
                            <TableCell className={`text-right font-medium text-sm ${m.movement_type === 'gasto' ? 'text-red-600' : 'text-emerald-600'}`}>
                              {m.movement_type === 'gasto' ? '-' : '+'}{fmt(Number(m.amount))}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.created_by_name}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── HISTORY TAB ─── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={histStatus} onValueChange={v => { setHistStatus(v); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos estados</SelectItem>
                <SelectItem value="abierta">Abiertas</SelectItem>
                <SelectItem value="cerrada">Cerradas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={histSettlement} onValueChange={v => { setHistSettlement(v); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Cuadre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos cuadres</SelectItem>
                <SelectItem value="correcta">Caja correcta</SelectItem>
                <SelectItem value="sobrante">Sobrante</SelectItem>
                <SelectItem value="faltante">Faltante</SelectItem>
              </SelectContent>
            </Select>
            <Select value={histReview} onValueChange={v => { setHistReview(v); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Revisión" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas revisiones</SelectItem>
                <SelectItem value="validada">Validada</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="revisada">Revisada</SelectItem>
                <SelectItem value="resuelta">Resuelta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={histTpvStatus} onValueChange={v => { setHistTpvStatus(v); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Estado TPV" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos TPV</SelectItem>
                <SelectItem value="correcto">TPV correcto</SelectItem>
                <SelectItem value="descuadre">TPV descuadre</SelectItem>
                <SelectItem value="pendiente_revision">TPV pend. revisión</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-[150px] h-8 text-xs" value={histFrom} onChange={e => setHistFrom(e.target.value)} placeholder="Desde" />
            <Input type="date" className="w-[150px] h-8 text-xs" value={histTo} onChange={e => setHistTo(e.target.value)} placeholder="Hasta" />
            <Button size="sm" variant="outline" onClick={loadHistory}>Filtrar</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Dif. Efectivo</TableHead>
                    <TableHead>Cuadre</TableHead>
                    <TableHead className="text-right">TPV Sist.</TableHead>
                    <TableHead className="text-right">TPV Term.</TableHead>
                    <TableHead className="text-right">Dif. TPV</TableHead>
                    <TableHead>Estado TPV</TableHead>
                    <TableHead>Revisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histLoading ? (
                    <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                  ) : historyFiltered.length === 0 ? (
                    <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">No hay sesiones</TableCell></TableRow>
                  ) : (
                    historyFiltered.map(s => {
                      const diff = s.difference != null ? Number(s.difference) : null;
                      const diffColor = diff === null ? '' : diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600';
                      const tpvDiff = s.tpv_difference != null ? Number(s.tpv_difference) : null;
                      const tpvDiffColor = tpvDiff === null ? '' : tpvDiff === 0 ? 'text-emerald-600' : 'text-amber-600';
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-medium">{format(new Date(s.session_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-xs">{s.opened_by_name}<br /><span className="text-muted-foreground">{format(new Date(s.opened_at), 'HH:mm')}</span></TableCell>
                          <TableCell className="text-xs">
                            {s.closed_at ? <>{s.closed_by_name}<br /><span className="text-muted-foreground">{format(new Date(s.closed_at), 'HH:mm')}</span></> : '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">{s.expected_balance != null ? fmt(Number(s.expected_balance)) : '—'}</TableCell>
                          <TableCell className="text-right text-xs">{s.counted_balance != null ? fmt(Number(s.counted_balance)) : '—'}</TableCell>
                          <TableCell className={`text-right text-xs font-medium ${diffColor}`}>
                            {diff != null ? (diff >= 0 ? '+' : '') + fmt(diff) : '—'}
                          </TableCell>
                          <TableCell>
                            <SettlementBadge status={s.settlement_status} difference={diff} />
                          </TableCell>
                          <TableCell className="text-right text-xs">{s.total_tpv != null ? fmt(Number(s.total_tpv)) : '—'}</TableCell>
                          <TableCell className="text-right text-xs">{s.tpv_terminal_total != null ? fmt(Number(s.tpv_terminal_total)) : '—'}</TableCell>
                          <TableCell className={`text-right text-xs font-medium ${tpvDiffColor}`}>
                            {tpvDiff != null ? (tpvDiff >= 0 ? '+' : '') + fmt(tpvDiff) : '—'}
                          </TableCell>
                          <TableCell>
                            <TpvStatusBadge status={s.tpv_status} />
                          </TableCell>
                          <TableCell>
                            <ReviewBadge status={s.general_review_status} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OpenCashSessionDialog open={openDialog} onClose={() => setOpenDialog(false)} onSuccess={loadData} />
      {session && (
        <>
          <CashSessionMovementDialog
            open={movDialog}
            sessionId={session.id}
            onClose={() => setMovDialog(false)}
            onSuccess={loadData}
          />
          {summary && (
            <CloseCashSessionDialog
              open={closeDialog}
              sessionId={session.id}
              summary={summary}
              onClose={() => setCloseDialog(false)}
              onSuccess={loadData}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function DashboardAlerts({ session, history }: { session: CashSession; history: CashSession[] }) {
  const alerts: { type: 'ok' | 'warn' | 'error'; message: string }[] = [];

  // Check if session has been open too long
  if (session.status === 'abierta') {
    const hoursOpen = differenceInHours(new Date(), new Date(session.opened_at));
    if (hoursOpen >= 10) {
      alerts.push({ type: 'warn', message: `La caja lleva abierta más de ${hoursOpen} horas. Considera cerrarla.` });
    }
  }

  // Check pending reviews in history
  const pendingReviews = history.filter(s => s.general_review_status === 'pendiente');
  if (pendingReviews.length > 0) {
    alerts.push({ type: 'error', message: `Hay ${pendingReviews.length} sesión(es) anterior(es) pendiente(s) de revisión.` });
  }

  if (alerts.length === 0 && session.status === 'abierta') {
    alerts.push({ type: 'ok', message: 'Todo en orden. No hay incidencias pendientes.' });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <Alert
          key={i}
          variant={a.type === 'error' ? 'destructive' : 'default'}
          className={
            a.type === 'ok'
              ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800'
              : a.type === 'warn'
              ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
              : ''
          }
        >
          {a.type === 'ok' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {a.type === 'warn' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
          {a.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          <AlertDescription className="text-sm">{a.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function ClosedSessionSummaryCard({ session, onReviewUpdate }: { session: CashSession; onReviewUpdate?: () => void }) {
  const { profile } = useAuth();
  const diff = Number(session.difference ?? 0);
  const tpvDiff = Number(session.tpv_difference ?? 0);
  const DiffIcon = diff === 0 ? CheckCircle2 : diff > 0 ? TrendingUp : TrendingDown;
  const diffColor = diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600';
  const diffBg = diff === 0 ? 'bg-emerald-50 border-emerald-200' : diff > 0 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const tpvDiffColor = tpvDiff === 0 ? 'text-emerald-600' : 'text-amber-600';
  const isAdmin = profile?.role === 'administrador';

  const handleReview = async (status: 'revisada' | 'resuelta') => {
    try {
      await updateCashSessionReview(session.id, status);
      toast({ title: `Sesión marcada como ${status}` });
      onReviewUpdate?.();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card className={`border-2 ${diffBg}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DiffIcon className={`h-5 w-5 ${diffColor}`} />
            Resultado del cierre
          </CardTitle>
          <div className="flex items-center gap-2">
            <ReviewBadge status={session.general_review_status} />
            {isAdmin && (session.requires_review || session.general_review_status === 'pendiente') && session.general_review_status === 'pendiente' && (
              <Button size="sm" variant="outline" onClick={() => handleReview('revisada')}>
                <Eye className="h-3 w-3 mr-1" /> Marcar revisada
              </Button>
            )}
            {isAdmin && session.general_review_status === 'revisada' && (
              <Button size="sm" variant="outline" onClick={() => handleReview('resuelta')}>
                <CheckCheck className="h-3 w-3 mr-1" /> Resolver
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Block 1: Cash reconciliation */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cuadre efectivo</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Saldo inicial</p>
              <p className="font-medium">{fmt(Number(session.opening_balance))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Ingresos efectivo</p>
              <p className="font-medium text-emerald-600">+{fmt(Number(session.cash_income ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Gastos efectivo</p>
              <p className="font-medium text-red-500">-{fmt(Number(session.cash_expense ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo esperado</p>
              <p className="font-medium text-primary">{fmt(Number(session.expected_balance ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo contado</p>
              <p className="font-medium">{fmt(Number(session.counted_balance ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Diferencia</p>
              <p className={`font-bold text-lg ${diffColor}`}>{diff >= 0 ? '+' : ''}{fmt(diff)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Estado</p>
              <SettlementBadge status={session.settlement_status} difference={diff} />
            </div>
          </div>
          {session.discrepancy_reason && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Justificación descuadre efectivo</span>
              </div>
              <p className="text-sm"><strong>Motivo:</strong> {DISCREPANCY_REASON_LABELS[session.discrepancy_reason] || session.discrepancy_reason}</p>
              {session.discrepancy_comment && <p className="text-sm text-muted-foreground mt-1"><strong>Comentario:</strong> {session.discrepancy_comment}</p>}
            </div>
          )}
        </div>

        {/* Block 2: TPV reconciliation */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Conciliación TPV
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">TPV sistema</p>
              <p className="font-medium text-blue-600">{fmt(Number(session.total_tpv ?? 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">TPV terminal</p>
              <p className="font-medium">{session.tpv_terminal_total != null ? fmt(Number(session.tpv_terminal_total)) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Diferencia TPV</p>
              <p className={`font-bold ${tpvDiffColor}`}>
                {session.tpv_difference != null ? (tpvDiff >= 0 ? '+' : '') + fmt(tpvDiff) : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Estado TPV</p>
              <TpvStatusBadge status={session.tpv_status} />
            </div>
          </div>
          {session.tpv_discrepancy_reason && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Justificación descuadre TPV</span>
              </div>
              <p className="text-sm"><strong>Motivo:</strong> {TPV_DISCREPANCY_REASON_LABELS[session.tpv_discrepancy_reason] || session.tpv_discrepancy_reason}</p>
              {session.tpv_discrepancy_comment && <p className="text-sm text-muted-foreground mt-1"><strong>Comentario:</strong> {session.tpv_discrepancy_comment}</p>}
            </div>
          )}
        </div>

        {/* Session info */}
        <div className="border-t border-border pt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Apertura</p>
            <p className="font-medium">{session.opened_by_name} · {format(new Date(session.opened_at), 'HH:mm')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Cierre</p>
            <p className="font-medium">{session.closed_by_name} · {session.closed_at ? format(new Date(session.closed_at), 'HH:mm') : '—'}</p>
          </div>
          {session.closing_notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Notas de cierre</p>
              <p className="text-sm">{session.closing_notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewBadge({ status }: { status: string }) {
  if (status === 'validada') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">✔ Validada</Badge>;
  if (status === 'pendiente') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">⏳ Pendiente</Badge>;
  if (status === 'revisada') return <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">👁 Revisada</Badge>;
  if (status === 'resuelta') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">✔ Resuelta</Badge>;
  return null;
}

function TpvStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status || status === 'pendiente') return <Badge variant="secondary" className="text-[10px]">—</Badge>;
  if (status === 'correcto') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">✔ Correcto</Badge>;
  if (status === 'descuadre') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">⚠ Descuadre</Badge>;
  if (status === 'pendiente_revision') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">⏳ Pend. revisión</Badge>;
  return null;
}

function SettlementBadge({ status, difference }: { status: string | null; difference: number | null }) {
  if (!status) return <Badge variant="secondary" className="text-[10px]">abierta</Badge>;
  if (status === 'correcta') return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">✔ Correcta</Badge>;
  if (status === 'sobrante') return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">⚠ Sobrante</Badge>;
  return <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">⚠ Faltante</Badge>;
}

function KpiCard({ icon: Icon, label, value, cardClass, valueClass, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  cardClass?: string;
  valueClass?: string;
  subtitle?: string;
}) {
  return (
    <Card className={cardClass}>
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${valueClass || 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <span className={`text-xl font-bold ${valueClass || ''}`}>{value}</span>
        {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
      </CardContent>
    </Card>
  );
}
