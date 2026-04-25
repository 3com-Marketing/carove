import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, CreditCard, ClipboardList, Banknote, ShieldCheck, Check } from 'lucide-react';
import { closeCashSession } from '@/lib/supabase-api';
import type { CashSessionSummary } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const STEPS = [
  { label: 'Resumen', icon: ClipboardList },
  { label: 'Efectivo', icon: Banknote },
  { label: 'TPV', icon: CreditCard },
  { label: 'Validación', icon: ShieldCheck },
];

const DISCREPANCY_REASONS = [
  { value: 'error_cambio', label: 'Error al dar cambio' },
  { value: 'gasto_no_registrado', label: 'Gasto no registrado' },
  { value: 'ingreso_no_registrado', label: 'Ingreso no registrado' },
  { value: 'error_conteo', label: 'Error de conteo' },
  { value: 'descuadre_tpv', label: 'Descuadre TPV' },
  { value: 'otro', label: 'Otro' },
];

const TPV_DISCREPANCY_REASONS = [
  { value: 'operacion_no_registrada', label: 'Operación no registrada' },
  { value: 'importe_incorrecto', label: 'Importe registrado incorrectamente' },
  { value: 'devolucion_no_registrada', label: 'Devolución no registrada' },
  { value: 'operacion_duplicada', label: 'Operación duplicada' },
  { value: 'error_lectura_terminal', label: 'Error de lectura del terminal' },
  { value: 'cierre_parcial_tpv', label: 'Cierre parcial del TPV' },
  { value: 'otro', label: 'Otro' },
];

interface Props {
  open: boolean;
  sessionId: string;
  summary: CashSessionSummary;
  onClose: () => void;
  onSuccess: () => void;
}

export function CloseCashSessionDialog({ open, sessionId, summary, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [countedBalance, setCountedBalance] = useState('');
  const [tpvTerminal, setTpvTerminal] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [discrepancyComment, setDiscrepancyComment] = useState('');
  const [tpvDiscrepancyReason, setTpvDiscrepancyReason] = useState('');
  const [tpvDiscrepancyComment, setTpvDiscrepancyComment] = useState('');

  const counted = parseFloat(countedBalance);
  const tpvTerminalVal = parseFloat(tpvTerminal);
  const hasCountedValue = countedBalance.trim() !== '' && !isNaN(counted);
  const hasTpvValue = tpvTerminal.trim() !== '' && !isNaN(tpvTerminalVal);

  const cashDifference = hasCountedValue ? Math.round((counted - summary.expected_balance) * 100) / 100 : 0;
  const hasCashDiscrepancy = hasCountedValue && cashDifference !== 0;

  const tpvDifference = hasTpvValue ? Math.round((tpvTerminalVal - summary.total_tpv) * 100) / 100 : 0;
  const hasTpvDiscrepancy = hasTpvValue && tpvDifference !== 0;

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const canNextStep1 = true;
  const canNextStep2 = hasCountedValue && (!hasCashDiscrepancy || discrepancyReason !== '');
  const canNextStep3 = hasTpvValue && (!hasTpvDiscrepancy || tpvDiscrepancyReason !== '');

  const hasAnyIssue = hasCashDiscrepancy || hasTpvDiscrepancy;

  const resetAndClose = () => {
    setStep(0);
    setCountedBalance('');
    setTpvTerminal('');
    setNotes('');
    setDiscrepancyReason('');
    setDiscrepancyComment('');
    setTpvDiscrepancyReason('');
    setTpvDiscrepancyComment('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await closeCashSession(
        sessionId, counted, summary.expected_balance, summary.total_tpv,
        notes || null, user.id, profile?.full_name || user.email || '',
        summary.cash_income, summary.cash_expense,
        hasCashDiscrepancy ? discrepancyReason : null,
        hasCashDiscrepancy && discrepancyComment ? discrepancyComment : null,
        tpvTerminalVal,
        hasTpvDiscrepancy ? tpvDiscrepancyReason : null,
        hasTpvDiscrepancy && tpvDiscrepancyComment ? tpvDiscrepancyComment : null
      );
      toast({ title: 'Caja cerrada correctamente' });
      onSuccess();
      resetAndClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && resetAndClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors
                    ${done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'}`}>
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] mt-1 ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mx-1 mt-[-12px] ${i < step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {step === 0 && <StepSummary summary={summary} fmt={fmt} />}
        {step === 1 && (
          <StepCash
            countedBalance={countedBalance} setCountedBalance={setCountedBalance}
            summary={summary} fmt={fmt}
            cashDifference={cashDifference} hasCountedValue={hasCountedValue} hasCashDiscrepancy={hasCashDiscrepancy}
            discrepancyReason={discrepancyReason} setDiscrepancyReason={setDiscrepancyReason}
            discrepancyComment={discrepancyComment} setDiscrepancyComment={setDiscrepancyComment}
          />
        )}
        {step === 2 && (
          <StepTpv
            tpvTerminal={tpvTerminal} setTpvTerminal={setTpvTerminal}
            summary={summary} fmt={fmt}
            tpvDifference={tpvDifference} hasTpvValue={hasTpvValue} hasTpvDiscrepancy={hasTpvDiscrepancy}
            tpvDiscrepancyReason={tpvDiscrepancyReason} setTpvDiscrepancyReason={setTpvDiscrepancyReason}
            tpvDiscrepancyComment={tpvDiscrepancyComment} setTpvDiscrepancyComment={setTpvDiscrepancyComment}
          />
        )}
        {step === 3 && (
          <StepValidation
            summary={summary} fmt={fmt}
            counted={counted} tpvTerminalVal={tpvTerminalVal}
            cashDifference={cashDifference} tpvDifference={tpvDifference}
            hasCashDiscrepancy={hasCashDiscrepancy} hasTpvDiscrepancy={hasTpvDiscrepancy}
            discrepancyReason={discrepancyReason} discrepancyComment={discrepancyComment}
            tpvDiscrepancyReason={tpvDiscrepancyReason} tpvDiscrepancyComment={tpvDiscrepancyComment}
            hasAnyIssue={hasAnyIssue}
            notes={notes} setNotes={setNotes}
          />
        )}

        <DialogFooter className="gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Atrás</Button>}
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canNextStep2 : step === 2 ? !canNextStep3 : !canNextStep1}
            >
              Siguiente
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Cerrando...' : 'Confirmar cierre de caja'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Step 1: Resumen ─── */
function StepSummary({ summary, fmt }: { summary: CashSessionSummary; fmt: (n: number) => string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Resumen de la sesión activa antes del cierre.</p>
      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
        <Row label="Saldo inicial" value={fmt(summary.opening_balance)} />
        <Row label="Ingresos efectivo" value={`+${fmt(summary.cash_income)}`} className="text-emerald-600" />
        <Row label="Gastos efectivo" value={`-${fmt(summary.cash_expense)}`} className="text-red-500" />
        <div className="border-t border-border my-1" />
        <Row label="Saldo esperado" value={fmt(summary.expected_balance)} className="font-bold text-primary" />
      </div>
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2 text-sm">
        <Row label="Total TPV sistema" value={fmt(summary.total_tpv)} className="text-blue-600 font-bold" />
      </div>
      <p className="text-xs text-muted-foreground">Movimientos registrados: <strong>{summary.movement_count}</strong></p>
    </div>
  );
}

/* ─── Step 2: Cuadre efectivo ─── */
function StepCash({ countedBalance, setCountedBalance, summary, fmt, cashDifference, hasCountedValue, hasCashDiscrepancy, discrepancyReason, setDiscrepancyReason, discrepancyComment, setDiscrepancyComment }: any) {
  const DiffIcon = cashDifference === 0 ? CheckCircle2 : cashDifference > 0 ? TrendingUp : TrendingDown;
  const diffColor = cashDifference === 0 ? 'text-emerald-600' : cashDifference > 0 ? 'text-amber-600' : 'text-red-600';
  const diffLabel = cashDifference === 0 ? 'Caja correcta' : cashDifference > 0 ? 'Sobrante de caja' : 'Faltante de caja';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Introduce el efectivo contado en caja.</p>
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <Row label="Saldo esperado" value={fmt(summary.expected_balance)} className="font-bold text-primary" />
      </div>
      <div>
        <Label>Saldo contado real (€) *</Label>
        <Input type="number" min="0" step="0.01" value={countedBalance} onChange={e => setCountedBalance(e.target.value)} placeholder="Introduce el efectivo contado..." autoFocus />
        {hasCountedValue && (
          <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${diffColor}`}>
            <DiffIcon className="h-4 w-4" />
            {diffLabel}: {fmt(Math.abs(cashDifference))}
          </div>
        )}
      </div>
      {hasCashDiscrepancy && (
        <DiscrepancyBlock
          reasons={DISCREPANCY_REASONS}
          reason={discrepancyReason} setReason={setDiscrepancyReason}
          comment={discrepancyComment} setComment={setDiscrepancyComment}
          title="Descuadre de efectivo — justificación obligatoria"
        />
      )}
    </div>
  );
}

/* ─── Step 3: Conciliación TPV ─── */
function StepTpv({ tpvTerminal, setTpvTerminal, summary, fmt, tpvDifference, hasTpvValue, hasTpvDiscrepancy, tpvDiscrepancyReason, setTpvDiscrepancyReason, tpvDiscrepancyComment, setTpvDiscrepancyComment }: any) {
  const diffColor = tpvDifference === 0 ? 'text-emerald-600' : 'text-amber-600';
  const diffLabel = tpvDifference === 0 ? 'TPV correcto' : 'TPV con descuadre';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Introduce el total del datáfono para conciliar.</p>
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm">
        <Row label="Total TPV sistema" value={fmt(summary.total_tpv)} className="text-blue-600 font-bold" />
      </div>
      <div>
        <Label>Total TPV terminal (€) *</Label>
        <Input type="number" min="0" step="0.01" value={tpvTerminal} onChange={e => setTpvTerminal(e.target.value)} placeholder="Introduce el total del datáfono..." autoFocus />
        {hasTpvValue && (
          <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${diffColor}`}>
            {tpvDifference === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {diffLabel}: {fmt(Math.abs(tpvDifference))}
          </div>
        )}
      </div>
      {hasTpvDiscrepancy && (
        <DiscrepancyBlock
          reasons={TPV_DISCREPANCY_REASONS}
          reason={tpvDiscrepancyReason} setReason={setTpvDiscrepancyReason}
          comment={tpvDiscrepancyComment} setComment={setTpvDiscrepancyComment}
          title="Descuadre de TPV — justificación obligatoria"
        />
      )}
    </div>
  );
}

/* ─── Step 4: Validación final ─── */
function StepValidation({ summary, fmt, counted, tpvTerminalVal, cashDifference, tpvDifference, hasCashDiscrepancy, hasTpvDiscrepancy, discrepancyReason, discrepancyComment, tpvDiscrepancyReason, tpvDiscrepancyComment, hasAnyIssue, notes, setNotes }: any) {
  const CashIcon = cashDifference === 0 ? CheckCircle2 : cashDifference > 0 ? TrendingUp : TrendingDown;
  const cashColor = cashDifference === 0 ? 'text-emerald-600' : cashDifference > 0 ? 'text-amber-600' : 'text-red-600';
  const cashLabel = cashDifference === 0 ? 'Caja correcta' : cashDifference > 0 ? 'Sobrante' : 'Faltante';
  const tpvColor = tpvDifference === 0 ? 'text-emerald-600' : 'text-amber-600';
  const tpvLabel = tpvDifference === 0 ? 'TPV correcto' : 'TPV con descuadre';

  return (
    <div className="space-y-4">
      <Alert variant={hasAnyIssue ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {hasAnyIssue ? 'Existen diferencias. La sesión quedará pendiente de revisión.' : 'Todo cuadra perfectamente. ¿Confirmar cierre?'}
        </AlertDescription>
      </Alert>

      {/* Cash block */}
      <div className="text-sm space-y-1 bg-muted/50 rounded-lg p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cuadre efectivo</p>
        <Row label="Saldo esperado" value={fmt(summary.expected_balance)} />
        <Row label="Saldo contado" value={fmt(counted)} />
        <p className={`font-bold ${cashColor}`}>
          <CashIcon className="inline h-4 w-4 mr-1" />
          {cashLabel}: {fmt(Math.abs(cashDifference))}
        </p>
        {hasCashDiscrepancy && discrepancyReason && (
          <>
            <div className="border-t border-border my-2" />
            <p><strong>Motivo:</strong> {DISCREPANCY_REASONS.find(r => r.value === discrepancyReason)?.label}</p>
            {discrepancyComment && <p><strong>Comentario:</strong> {discrepancyComment}</p>}
          </>
        )}
      </div>

      {/* TPV block */}
      <div className="text-sm space-y-1 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Conciliación TPV</p>
        <Row label="TPV sistema" value={fmt(summary.total_tpv)} />
        <Row label="TPV terminal" value={fmt(tpvTerminalVal)} />
        <p className={`font-bold ${tpvColor}`}>
          {tpvDifference === 0 ? <CheckCircle2 className="inline h-4 w-4 mr-1" /> : <AlertTriangle className="inline h-4 w-4 mr-1" />}
          {tpvLabel}: {fmt(Math.abs(tpvDifference))}
        </p>
        {hasTpvDiscrepancy && tpvDiscrepancyReason && (
          <>
            <div className="border-t border-border my-2" />
            <p><strong>Motivo:</strong> {TPV_DISCREPANCY_REASONS.find(r => r.value === tpvDiscrepancyReason)?.label}</p>
            {tpvDiscrepancyComment && <p><strong>Comentario:</strong> {tpvDiscrepancyComment}</p>}
          </>
        )}
      </div>

      {hasAnyIssue && <p className="text-amber-600 text-xs font-medium">⚠ Esta sesión quedará pendiente de revisión</p>}

      <div>
        <Label>Notas de cierre (opcional)</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones del cierre..." />
      </div>
    </div>
  );
}

/* ─── Shared components ─── */

function DiscrepancyBlock({ reasons, reason, setReason, comment, setComment, title }: any) {
  return (
    <div className="space-y-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg p-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <div>
        <Label>Motivo del descuadre *</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger><SelectValue placeholder="Selecciona un motivo..." /></SelectTrigger>
          <SelectContent>
            {reasons.map((r: any) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Comentario adicional (opcional)</Label>
        <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Describe lo sucedido..." />
      </div>
    </div>
  );
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
