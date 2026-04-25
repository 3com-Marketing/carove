import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, PlusCircle, Banknote, CreditCard, ArrowRightLeft, Landmark, Lock } from 'lucide-react';
import { getBuyers, getProfiles, createSale, createFinanceSimulation } from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import type { Vehicle } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { FinanceComparatorSection, type FinanceSelection } from '@/components/vehicles/FinanceComparatorSection';

interface SaleDialogProps {
  vehicle: Vehicle;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  defaultBuyerId?: string;
  reservationAmount?: number;
  reservationPaymentMethod?: string;
  reservationDate?: string;
}

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  financiado: 'Financiado',
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="h-4 w-4" />,
  tarjeta: <CreditCard className="h-4 w-4" />,
  transferencia: <ArrowRightLeft className="h-4 w-4" />,
  financiado: <Landmark className="h-4 w-4" />,
};

interface PaymentBlock {
  method: string;
  enabled: boolean;
  amount: number;
}

export function SaleDialog({ vehicle, open, onConfirm, onCancel, defaultBuyerId, reservationAmount, reservationPaymentMethod, reservationDate }: SaleDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: buyers = [] } = useQuery({ queryKey: ['buyers'], queryFn: getBuyers });
  const { data: profiles = [] } = useQuery({ queryKey: ['profiles'], queryFn: getProfiles });
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const [buyerId, setBuyerId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [salePrice, setSalePrice] = useState(vehicle.pvp_base > 0 ? vehicle.pvp_base.toString() : '');
  const [discount, setDiscount] = useState('0');
  const [discountCondition, setDiscountCondition] = useState('');
  const [taxType, setTaxType] = useState('igic');
  const [taxRate, setTaxRate] = useState('7');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Payment blocks
  const [paymentBlocks, setPaymentBlocks] = useState<PaymentBlock[]>([
    { method: 'efectivo', enabled: false, amount: 0 },
    { method: 'tarjeta', enabled: false, amount: 0 },
    { method: 'transferencia', enabled: false, amount: 0 },
    { method: 'financiado', enabled: false, amount: 0 },
  ]);

  // Finance
  const [financeSelection, setFinanceSelection] = useState<FinanceSelection | null>(null);

  // Pre-select current user as seller
  useEffect(() => {
    if (user && profiles.length > 0 && !sellerId) {
      const me = profiles.find(p => p.user_id === user.id);
      if (me) setSellerId(me.user_id);
    }
  }, [user, profiles, sellerId]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setBuyerId(defaultBuyerId || '');
      setSaleDate(new Date().toISOString().slice(0, 10));
      setSalePrice(vehicle.pvp_base > 0 ? vehicle.pvp_base.toString() : '');
      setDiscount('0');
      setDiscountCondition('');
      setTaxType('igic');
      setTaxRate('7');
      setNotes('');
      setError('');
      setSubmitting(false);
      setPaymentBlocks([
        { method: 'efectivo', enabled: false, amount: 0 },
        { method: 'tarjeta', enabled: false, amount: 0 },
        { method: 'transferencia', enabled: false, amount: 0 },
        { method: 'financiado', enabled: false, amount: 0 },
      ]);
      setFinanceSelection(null);
    }
  }, [open, vehicle.pvp_base, defaultBuyerId]);

  const price = parseFloat(salePrice) || 0;
  const discountNum = parseFloat(discount) || 0;
  const rate = parseFloat(taxRate) || 0;

  const netPrice = price - discountNum;

  const fiscalCalc = useMemo(() => {
    if (netPrice <= 0) return { base: 0, tax: 0, total: 0 };
    const base = Math.round((netPrice / (1 + rate / 100)) * 100) / 100;
    const tax = Math.round((netPrice - base) * 100) / 100;
    return { base, tax, total: netPrice };
  }, [netPrice, rate]);

  const hasFinancedBlock = paymentBlocks.find(b => b.method === 'financiado')?.enabled || false;

  const signalAmount = reservationAmount || 0;
  // Non-financed blocks total
  const nonFinancedCovered = paymentBlocks.filter(b => b.enabled && b.method !== 'financiado').reduce((s, b) => s + b.amount, 0);
  const entradaTotal = nonFinancedCovered + signalAmount;
  // Auto-calculate financed amount as the remainder
  const financedAmount = hasFinancedBlock ? Math.max(0, Math.round((netPrice - entradaTotal) * 100) / 100) : 0;
  const totalCovered = entradaTotal + financedAmount;
  const pendingAmount = netPrice - totalCovered;

  const toggleBlock = useCallback((method: string, enabled: boolean) => {
    setPaymentBlocks(prev => prev.map(b =>
      b.method === method ? { ...b, enabled, amount: enabled ? b.amount : 0 } : b
    ));
    if (method === 'financiado' && !enabled) {
      setFinanceSelection(null);
    }
  }, []);

  const updateBlockAmount = useCallback((method: string, amount: number) => {
    setPaymentBlocks(prev => prev.map(b =>
      b.method === method ? { ...b, amount } : b
    ));
  }, []);

  const sellerProfile = profiles.find(p => p.user_id === sellerId);
  const hasAnyPayment = paymentBlocks.some(b => b.enabled && b.amount > 0) || signalAmount > 0;
  const canSubmit = buyerId && price > 0 && sellerId && hasAnyPayment && !submitting && (!hasFinancedBlock || financeSelection);

  const handleConfirm = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const activeNonFinanced = paymentBlocks.filter(b => b.enabled && b.method !== 'financiado' && b.amount > 0);
      const paymentBreakdown = [
        ...(signalAmount > 0 ? [{ method: reservationPaymentMethod || 'efectivo', amount: signalAmount }] : []),
        ...activeNonFinanced.map(b => ({ method: b.method, amount: b.amount })),
        ...(hasFinancedBlock && financedAmount > 0 ? [{ method: 'financiado', amount: financedAmount }] : []),
      ];
      const methodSummary = [...new Set(paymentBreakdown.map(l => l.method))].join('+');

      const sale = await createSale({
        vehicle_id: vehicle.id,
        buyer_id: buyerId,
        seller_id: sellerId,
        seller_name: sellerProfile?.full_name || '',
        sale_date: new Date(saleDate).toISOString(),
        sale_price: price,
        discount: discountNum,
        tax_type: taxType,
        tax_rate: rate,
        payment_method: methodSummary,
        finance_entity: financeSelection?.entity_name || null,
        notes: notes || null,
        payment_breakdown: paymentBreakdown,
        discount_condition: discountNum > 0 && discountCondition ? discountCondition : null,
      }, user.id);

      // Create finance simulation if financed
      if (hasFinancedBlock && financeSelection) {
        try {
          await createFinanceSimulation({
            vehicle_id: vehicle.id,
            buyer_id: buyerId,
            sale_id: sale.id,
            term_model_id: financeSelection.term_model_id,
            tin_used: financeSelection.tin,
            coefficient_used: 0,
            additional_rate_used: 0,
            financed_amount: financeSelection.financed_amount,
            adjusted_capital: financeSelection.financed_amount,
            down_payment: financeSelection.down_payment,
            monthly_payment: financeSelection.monthly_payment,
            total_estimated: financeSelection.total_financed,
            term_months_used: financeSelection.term_months,
            entity_name_snapshot: financeSelection.entity_name,
            product_name_snapshot: financeSelection.product_name,
            status: 'aprobada' as any,
            created_by: user.id,
          });
        } catch (e) {
          console.error('Error creating finance simulation:', e);
        }
      }

      onConfirm();
    } catch (e: any) {
      setError(e.message || 'Error al registrar la venta');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Cerrar Venta — {vehicle.brand} {vehicle.model}</DialogTitle>
          <p className="text-sm text-muted-foreground">{vehicle.plate} · {vehicle.version}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-2">
          {/* LEFT COLUMN — Sale data */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Datos de la Venta</h3>

            {/* Comprador */}
            <div className="space-y-1.5">
              <Label>Comprador *</Label>
              <div className="flex gap-2">
                <Select value={buyerId || '_none'} onValueChange={v => setBuyerId(v === '_none' ? '' : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar comprador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Seleccionar comprador</SelectItem>
                    {buyers.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}{b.dni ? ` — ${b.dni}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setClientDialogOpen(true)} title="Crear cliente">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vendedor */}
            <div className="space-y-1.5">
              <Label>Vendedor *</Label>
              <Select value={sellerId || '_none'} onValueChange={v => setSellerId(v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Seleccionar vendedor</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label>Fecha de venta</Label>
              <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </div>

            {/* Precio + Descuento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Precio final *</Label>
                <Input type="number" min="0.01" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento</Label>
                <Input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} />
              </div>
            </div>

            {/* Condición de descuento */}
            {discountNum > 0 && (
              <div className="space-y-1.5">
                <Label>Condición del descuento</Label>
                <Textarea
                  value={discountCondition}
                  onChange={e => setDiscountCondition(e.target.value)}
                  placeholder="Ej: Descuento comercial por fidelización, descuento por pronto pago..."
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Se incluirá en el contrato de compraventa</p>
              </div>
            )}

            {/* Impuesto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo impuesto</Label>
                <Select value={taxType} onValueChange={setTaxType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="igic">IGIC</SelectItem>
                    <SelectItem value="iva">IVA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>% Impuesto</Label>
                <Input type="number" min="0" step="0.5" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
              </div>
            </div>

            {/* Desglose fiscal */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base imponible</span>
                <span className="font-medium">{formatCurrency(fiscalCalc.base)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cuota {taxType.toUpperCase()} ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(fiscalCalc.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(fiscalCalc.total)}</span>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas internas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones opcionales..." rows={2} />
            </div>
          </div>

          {/* RIGHT COLUMN — Payment Plan */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Plan de Pagos</h3>

            {/* Reservation signal block */}
            {signalAmount > 0 && (
              <div className="rounded-lg border-2 border-accent/50 bg-accent/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold">Señal de Reserva</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Registrada</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {METHOD_LABELS[reservationPaymentMethod || 'efectivo'] || 'Efectivo'}
                    {reservationDate && ` · ${formatDate(reservationDate)}`}
                  </span>
                  <span className="font-bold text-accent">{formatCurrency(signalAmount)}</span>
                </div>
              </div>
            )}

            {/* Payment method blocks */}
            <div className="space-y-2">
              {paymentBlocks.map(block => {
                const isFinanced = block.method === 'financiado';
                const displayAmount = isFinanced ? financedAmount : block.amount;
                return (
                  <div
                    key={block.method}
                    className={`rounded-lg border-2 p-3 transition-all ${
                      block.enabled
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`pay-${block.method}`}
                        checked={block.enabled}
                        onCheckedChange={(checked) => toggleBlock(block.method, !!checked)}
                      />
                      <label
                        htmlFor={`pay-${block.method}`}
                        className="flex items-center gap-2 text-sm font-medium cursor-pointer flex-1"
                      >
                        {METHOD_ICONS[block.method]}
                        {METHOD_LABELS[block.method]}
                      </label>
                      {block.enabled && (
                        <div className="flex items-center gap-1">
                          {isFinanced ? (
                            <span className="w-28 h-8 flex items-center justify-end text-sm font-bold text-primary">
                              {formatCurrency(financedAmount)}
                            </span>
                          ) : (
                            <>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={block.amount || ''}
                                onChange={e => updateBlockAmount(block.method, parseFloat(e.target.value) || 0)}
                                placeholder="0,00"
                                className="w-28 h-8 text-right text-sm font-medium"
                                autoFocus
                              />
                              <span className="text-xs text-muted-foreground">€</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {isFinanced && block.enabled && financedAmount > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
                        <span>Entrada: {formatCurrency(entradaTotal)}</span>
                        <span>A financiar: <span className="font-semibold text-primary">{formatCurrency(financedAmount)}</span></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Coverage summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio venta</span>
                <span className="font-medium">{formatCurrency(price)}</span>
              </div>
              {discountNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="font-medium text-destructive">-{formatCurrency(discountNum)}</span>
                </div>
              )}
              {discountNum > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Precio neto</span>
                    <span>{formatCurrency(netPrice)}</span>
                  </div>
                </>
              )}
              {signalAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Señal reserva</span>
                  <span className="font-medium text-accent">-{formatCurrency(signalAmount)}</span>
                </div>
              )}
              {paymentBlocks.filter(b => b.enabled && b.method !== 'financiado').filter(b => b.amount > 0).map(b => (
                <div key={b.method} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{METHOD_LABELS[b.method]}</span>
                  <span className="font-medium">-{formatCurrency(b.amount)}</span>
                </div>
              ))}
              {hasFinancedBlock && financedAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Financiado</span>
                  <span className="font-medium text-primary">-{formatCurrency(financedAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Pendiente</span>
                <span className={
                  pendingAmount > 0.01
                    ? 'text-destructive'
                    : pendingAmount < -0.01
                      ? 'text-chart-4'
                      : 'text-accent'
                }>
                  {formatCurrency(pendingAmount)}
                  {Math.abs(pendingAmount) < 0.01 && ' ✅'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FINANCE SECTION — full width */}
        {hasFinancedBlock && (
          <div className="px-6 pb-2">
            <Separator className="mb-4" />
            <FinanceComparatorSection
              totalPrice={financedAmount}
              onSelectionChange={setFinanceSelection}
              enabled={hasFinancedBlock}
              onEnabledChange={() => {}}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive font-medium px-6">{error}</p>
        )}

        <DialogFooter className="px-6 pb-6 pt-2 gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar venta
          </Button>
        </DialogFooter>
      </DialogContent>

      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onSaved={(newBuyer) => {
          queryClient.invalidateQueries({ queryKey: ['buyers'] });
          setBuyerId(newBuyer.id);
        }}
      />
    </Dialog>
  );
}
