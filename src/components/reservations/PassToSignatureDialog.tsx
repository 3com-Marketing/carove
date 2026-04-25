import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/constants';
import type { Reservation, Vehicle, Buyer, CompanySettings } from '@/lib/types';
import { AlertTriangle, CheckCircle2, Loader2, Send, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  vehicle: Vehicle | null;
  buyer: Buyer | null;
  company: CompanySettings | null;
  onConfirm: (snapshot: any) => Promise<void>;
}

export function PassToSignatureDialog({ open, onOpenChange, reservation, vehicle, buyer, company, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

  const errors: string[] = [];
  if (!buyer) errors.push('No hay cliente asignado');
  else if (!buyer.dni && !buyer.cif) errors.push('El cliente no tiene DNI/CIF');
  if (!vehicle) errors.push('No hay vehículo asignado');
  else if (!vehicle.pvp_base || vehicle.pvp_base <= 0) errors.push('El vehículo no tiene PVP definido');
  if (!reservation.reservation_amount || reservation.reservation_amount <= 0) errors.push('La señal debe ser superior a 0,00 €');

  const canProceed = errors.length === 0;

  const handleConfirm = async () => {
    if (!canProceed || !vehicle || !buyer) return;
    setLoading(true);
    try {
      const snapshot = {
        company: {
          name: company?.company_name || '',
          tax_id: company?.tax_id || '',
          address: [company?.address, company?.postal_code, company?.city, company?.province].filter(Boolean).join(', '),
          phone: company?.phone || '',
          email: company?.email || '',
          iban: company?.iban || '',
        },
        customer: {
          full_name: `${buyer.name}${buyer.last_name ? ' ' + buyer.last_name : ''}`,
          tax_id: buyer.dni || buyer.cif || '',
          address: buyer.address || '',
          city: buyer.city || '',
          postal_code: buyer.postal_code || '',
          province: buyer.province || '',
          phone: buyer.phone || '',
          email: buyer.email || '',
          client_type: buyer.client_type,
        },
        vehicle: {
          make: vehicle.brand,
          model: vehicle.model,
          version: vehicle.version,
          plate: vehicle.plate,
          vin: vehicle.vin,
          registration_date: vehicle.first_registration,
          mileage: vehicle.km_entry,
          color: vehicle.color,
          has_second_key: vehicle.has_second_key,
        },
        pricing: {
          sale_price: vehicle.pvp_base,
          deposit_amount: reservation.reservation_amount,
          remaining_amount: vehicle.pvp_base - reservation.reservation_amount,
          deposit_source: reservation.deposit_amount_source,
          tax_type: vehicle.tax_type,
          tax_rate: vehicle.tax_rate,
        },
        payment: {
          method: reservation.payment_method || reservation.deposit_payment_method || null,
        },
        reservation: {
          number: reservation.reservation_number || '',
          created_at: reservation.reservation_date,
          expiration_date: reservation.expiration_date,
        },
        generated_at: new Date().toISOString(),
      };
      await onConfirm(snapshot);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Pasar a firma
          </DialogTitle>
          <DialogDescription>
            Se generarán el contrato de compraventa y la factura proforma. Los datos se congelarán en una instantánea documental.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Validation errors */}
          {errors.length > 0 && (
            <Alert className="border-destructive/50 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-sm text-destructive">• {e}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {canProceed && vehicle && buyer && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Vehículo</span>
                <span className="font-medium">{vehicle.brand} {vehicle.model} · {vehicle.plate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{buyer.name}{buyer.last_name ? ` ${buyer.last_name}` : ''}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PVP</span>
                <span className="font-bold">{formatCurrency(vehicle.pvp_base)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Señal</span>
                <span className="font-bold text-primary">{formatCurrency(reservation.reservation_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pendiente</span>
                <span className="font-medium">{formatCurrency(vehicle.pvp_base - reservation.reservation_amount)}</span>
              </div>

              <Separator />

              {/* Documents to generate */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Documentos que se generarán:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Contrato de compraventa</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">Numerado</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span>Factura proforma</span>
                    <Badge variant="outline" className="text-[9px] ml-auto">Numerada</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {canProceed && (
            <Alert className="border-blue-500/50 bg-blue-500/5">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700">
                Se guardará una instantánea de los datos para preservar la validez documental.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!canProceed || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar y generar documentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
