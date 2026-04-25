import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, CalendarIcon, AlertTriangle, RotateCcw } from 'lucide-react';
import { getBuyers, getActiveReservationByVehicle, createReservation } from '@/lib/supabase-api';
import { formatCurrency } from '@/lib/constants';
import type { Vehicle } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { cn } from '@/lib/utils';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ReservationDialogProps {
  vehicle: Vehicle;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  defaultBuyerId?: string;
}

export function ReservationDialog({ vehicle, open, onConfirm, onCancel, defaultBuyerId }: ReservationDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: buyers = [] } = useQuery({ queryKey: ['buyers'], queryFn: getBuyers });
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const suggestedAmount = useMemo(() => Math.round(vehicle.pvp_base * 0.03 * 100) / 100, [vehicle.pvp_base]);

  const [buyerId, setBuyerId] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date>(addDays(new Date(), 3));
  const [amount, setAmount] = useState('');
  const [isManualAmount, setIsManualAmount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingReservation, setExistingReservation] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setBuyerId(defaultBuyerId || '');
      setExpirationDate(addDays(new Date(), 3));
      setAmount(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '');
      setIsManualAmount(false);
      setPaymentMethod('');
      setNotes('');
      setError('');
      setSubmitting(false);
      setExistingReservation(null);

      getActiveReservationByVehicle(vehicle.id).then(res => {
        if (res) setExistingReservation(res.id);
      });
    }
  }, [open, vehicle.id, defaultBuyerId, suggestedAmount]);

  const parsedAmount = parseFloat(amount) || 0;
  const isPastDate = isBefore(expirationDate, startOfDay(new Date()));
  const isAmountInvalid = parsedAmount <= 0;
  const canSubmit = buyerId && !isPastDate && !submitting && !existingReservation && !isAmountInvalid;

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const num = parseFloat(value) || 0;
    setIsManualAmount(Math.abs(num - suggestedAmount) > 0.01);
  };

  const handleRecalculate = () => {
    setAmount(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '');
    setIsManualAmount(false);
  };

  const handleConfirm = async () => {
    if (!canSubmit || !user) return;
    if (parsedAmount <= 0) {
      setError('La señal debe ser superior a 0,00 €');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createReservation({
        vehicle_id: vehicle.id,
        buyer_id: buyerId,
        expiration_date: expirationDate.toISOString(),
        reservation_amount: parsedAmount,
        payment_method: parsedAmount > 0 ? paymentMethod || null : null,
        notes: notes || null,
        deposit_amount_source: isManualAmount ? 'manual' : 'auto',
        vehicle_pvp_snapshot: vehicle.pvp_base,
        reservation_status: 'draft',
      }, user.id);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      onConfirm();
    } catch (e: any) {
      setError(e.message || 'Error al crear la reserva');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Reserva — {vehicle.brand} {vehicle.model}</DialogTitle>
          <p className="text-sm text-muted-foreground">{vehicle.plate} · PVP: {formatCurrency(vehicle.pvp_base)}</p>
        </DialogHeader>

        {existingReservation ? (
          <div className="space-y-4 py-2">
            <Alert className="border-status-reservado/50 bg-status-reservado/10">
              <AlertTriangle className="h-4 w-4 text-status-reservado" />
              <AlertDescription className="text-sm">
                Este vehículo ya tiene una reserva activa.
              </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={() => { onCancel(); navigate(`/reservations/${existingReservation}`); }}>
              Ver reserva existente
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <div className="flex gap-2">
                <Select value={buyerId || '_none'} onValueChange={v => setBuyerId(v === '_none' ? '' : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Seleccionar cliente</SelectItem>
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

            {/* Fecha límite */}
            <div className="space-y-1.5">
              <Label>Fecha límite *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !expirationDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(expirationDate, 'dd/MM/yyyy', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={d => { if (d) { setExpirationDate(d); setCalendarOpen(false); } }}
                    disabled={d => isBefore(d, startOfDay(new Date()))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {isPastDate && <p className="text-xs text-destructive">La fecha no puede ser en el pasado</p>}
            </div>

            {/* Señal / Anticipo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Señal / Anticipo (€) *</Label>
                <Badge variant="outline" className={cn('text-[10px] font-normal', isManualAmount ? 'border-amber-500/50 text-amber-700' : 'border-primary/50 text-primary')}>
                  {isManualAmount ? '✏️ Editado manualmente' : '🤖 Calculado automáticamente'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className={cn(isAmountInvalid && amount !== '' && 'border-destructive')}
                />
                {isManualAmount && suggestedAmount > 0 && (
                  <Button type="button" variant="outline" size="icon" onClick={handleRecalculate} title="Recalcular al 3% del PVP">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Importe sugerido según el 3% del PVP ({formatCurrency(suggestedAmount)}). Puedes modificarlo manualmente.
              </p>
              {isAmountInvalid && amount !== '' && (
                <p className="text-xs text-destructive font-medium">La señal debe ser superior a 0,00 €</p>
              )}
            </div>

            {/* Método de pago */}
            {parsedAmount > 0 && (
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select value={paymentMethod || '_none'} onValueChange={v => setPaymentMethod(v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Seleccionar método</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones opcionales..." rows={2} />
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </div>
        )}

        {!existingReservation && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!canSubmit}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar reserva
            </Button>
          </DialogFooter>
        )}
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
