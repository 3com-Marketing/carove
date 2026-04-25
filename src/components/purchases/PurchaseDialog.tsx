import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { createVehiclePurchase } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PURCHASE_SOURCE_LABELS } from '@/lib/types';
import type { PurchaseSourceType } from '@/lib/types';

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function PurchaseDialog({ open, onOpenChange, onCreated }: PurchaseDialogProps) {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<{ id: string; label: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [sourceType, setSourceType] = useState<PurchaseSourceType>('particular');
  const [requestedPrice, setRequestedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Load sellers
    supabase.from('buyers').select('id, name, last_name, company_name, client_type').eq('active', true).order('name').then(({ data }) => {
      setSellers((data || []).map((b: any) => ({
        id: b.id,
        label: b.client_type === 'profesional' ? (b.company_name || b.name) : [b.name, b.last_name].filter(Boolean).join(' '),
      })));
    });
    // Load available vehicles
    supabase.from('vehicles').select('id, brand, model, plate').eq('is_deregistered', false).order('created_at', { ascending: false }).then(({ data }) => {
      setVehicles((data || []).map((v: any) => ({
        id: v.id,
        label: `${v.brand} ${v.model} (${v.plate})`,
      })));
    });
  }, [open]);

  const handleSubmit = async () => {
    if (!sellerId || !vehicleId || !user) {
      toast.error('Selecciona vendedor y vehículo');
      return;
    }
    setLoading(true);
    try {
      // Check for existing active purchase on this vehicle
      const { data: existingPurchases } = await supabase
        .from('vehicle_purchases')
        .select('id, status')
        .eq('vehicle_id', vehicleId)
        .not('status', 'in', '(cancelado,rechazado)');
      
      if (existingPurchases && existingPurchases.length > 0) {
        toast.error('Este vehículo ya tiene una operación de compra activa. No se puede crear otra.');
        setLoading(false);
        return;
      }

      await createVehiclePurchase({
        vehicle_id: vehicleId,
        seller_id: sellerId,
        source_type: sourceType,
        requested_price: parseFloat(requestedPrice) || 0,
        notes: notes || null,
      }, user.id);
      toast.success('Operación de compra creada');
      onOpenChange(false);
      onCreated();
      // Reset
      setSellerId('');
      setVehicleId('');
      setSourceType('particular');
      setRequestedPrice('');
      setNotes('');
    } catch (e: any) {
      toast.error(e.message || 'Error al crear la compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva operación de compra</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Vendedor *</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente vendedor" /></SelectTrigger>
              <SelectContent>
                {sellers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vehículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar vehículo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origen</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as PurchaseSourceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(PURCHASE_SOURCE_LABELS) as [PurchaseSourceType, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Precio solicitado (€)</Label>
            <Input type="number" value={requestedPrice} onChange={e => setRequestedPrice(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Creando...' : 'Crear compra'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
