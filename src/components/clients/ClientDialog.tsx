import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle } from 'lucide-react';
import { createBuyer, updateBuyer, checkDuplicateDni, getAcquisitionChannels } from '@/lib/supabase-api';
import type { Buyer, ClientType, VatRegime } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer?: Buyer | null;
  onSaved: (buyer: Buyer) => void;
}

export function ClientDialog({ open, onOpenChange, buyer, onSaved }: ClientDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEdit = !!buyer;

  // Form state
  const [clientType, setClientType] = useState<ClientType>('particular');
  const [isBuyer, setIsBuyer] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [channelId, setChannelId] = useState('');

  // Particular fields
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');

  // Profesional fields
  const [companyName, setCompanyName] = useState('');
  const [cif, setCif] = useState('');
  const [contactName, setContactName] = useState('');
  const [vatRegime, setVatRegime] = useState<VatRegime | ''>('');
  const [fiscalAddress, setFiscalAddress] = useState('');

  // Common fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [iban, setIban] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [dniDuplicate, setDniDuplicate] = useState(false);

  const { data: channels = [] } = useQuery({
    queryKey: ['acquisition-channels'],
    queryFn: getAcquisitionChannels,
  });

  useEffect(() => {
    if (open) {
      setClientType(buyer?.client_type || 'particular');
      setIsBuyer(buyer?.is_buyer ?? true);
      setIsSeller(buyer?.is_seller ?? false);
      setChannelId(buyer?.acquisition_channel_id || '');
      setName(buyer?.name || '');
      setLastName(buyer?.last_name || '');
      setDni(buyer?.dni || '');
      setCompanyName(buyer?.company_name || '');
      setCif(buyer?.cif || '');
      setContactName(buyer?.contact_name || '');
      setVatRegime((buyer?.vat_regime as VatRegime) || '');
      setFiscalAddress(buyer?.fiscal_address || '');
      setPhone(buyer?.phone || '');
      setEmail(buyer?.email || '');
      setAddress(buyer?.address || '');
      setCity(buyer?.city || '');
      setPostalCode(buyer?.postal_code || '');
      setProvince(buyer?.province || '');
      setIban(buyer?.iban || '');
      setDniDuplicate(false);
      setSubmitting(false);
    }
  }, [open, buyer]);

  // DNI/CIF duplicate check
  useEffect(() => {
    const docToCheck = clientType === 'particular' ? dni : cif;
    if (!docToCheck || docToCheck.length < 3) { setDniDuplicate(false); return; }
    const timeout = setTimeout(async () => {
      try {
        const dup = await checkDuplicateDni(docToCheck, buyer?.id);
        setDniDuplicate(dup);
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timeout);
  }, [dni, cif, clientType, buyer?.id]);

  const handleTypeChange = (newType: ClientType) => {
    if (isEdit && buyer?.client_type !== newType) {
      // Could warn if has operations — for now just set
    }
    setClientType(newType);
  };

  const validate = (): string | null => {
    if (!isBuyer && !isSeller) return 'Debe marcar al menos un rol (Comprador o Vendedor)';
    if (!channelId) return 'Debe seleccionar un canal de captación';
    if (clientType === 'particular') {
      if (!name.trim()) return 'El nombre es obligatorio';
      if (!dni.trim()) return 'El DNI es obligatorio para particulares';
    } else {
      if (!companyName.trim()) return 'La razón social es obligatoria';
      if (!cif.trim()) return 'El CIF es obligatorio para profesionales';
      if (!vatRegime) return 'El régimen IVA es obligatorio para profesionales';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast({ title: 'Validación', description: err, variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const payload: Partial<Buyer> = {
        client_type: clientType,
        is_buyer: isBuyer,
        is_seller: isSeller,
        acquisition_channel_id: channelId || null,
        name: clientType === 'particular' ? name.trim() : companyName.trim(),
        last_name: clientType === 'particular' ? (lastName.trim() || null) : null,
        dni: clientType === 'particular' ? (dni.trim() || null) : null,
        company_name: clientType === 'profesional' ? (companyName.trim() || null) : null,
        cif: clientType === 'profesional' ? (cif.trim() || null) : null,
        contact_name: clientType === 'profesional' ? (contactName.trim() || null) : null,
        vat_regime: clientType === 'profesional' ? (vatRegime as VatRegime) || null : null,
        fiscal_address: clientType === 'profesional' ? (fiscalAddress.trim() || null) : null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        province: province.trim() || null,
        iban: iban.trim() || null,
      };

      if (isEdit && buyer?.client_type !== clientType) {
        (payload as any).type_changed_at = new Date().toISOString();
      }

      if (!isEdit) {
        payload.created_by = user?.id || null;
      }

      const saved = isEdit
        ? await updateBuyer(buyer!.id, payload)
        : await createBuyer(payload);
      toast({ title: isEdit ? 'Cliente actualizado' : 'Cliente creado' });
      onSaved(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const activeChannels = channels.filter(c => c.active || c.id === buyer?.acquisition_channel_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Block 1: Configuration */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Configuración principal</p>

            <div className="space-y-1.5">
              <Label>Tipo de cliente *</Label>
              <Select value={clientType} onValueChange={(v) => handleTypeChange(v as ClientType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="profesional">Profesional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Roles comerciales *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isBuyer} onCheckedChange={(c) => setIsBuyer(!!c)} />
                  Comprador
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isSeller} onCheckedChange={(c) => setIsSeller(!!c)} />
                  Vendedor
                </label>
              </div>
              {!isBuyer && !isSeller && (
                <p className="text-xs text-destructive">Debe marcar al menos un rol</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Canal de captación *</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar canal..." /></SelectTrigger>
                <SelectContent>
                  {activeChannels.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Block 2: Dynamic fields */}
          {clientType === 'particular' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" />
                </div>
                <div className="space-y-1.5">
                  <Label>Apellidos</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Apellidos" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>DNI *</Label>
                <Input value={dni} onChange={e => setDni(e.target.value)} placeholder="12345678A" />
                {dniDuplicate && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" /> Ya existe un cliente con este DNI
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Razón social *</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nombre empresa" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CIF *</Label>
                  <Input value={cif} onChange={e => setCif(e.target.value)} placeholder="B12345678" />
                  {dniDuplicate && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" /> Ya existe un cliente con este CIF
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Régimen IVA *</Label>
                  <Select value={vatRegime} onValueChange={(v) => setVatRegime(v as VatRegime)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="rebu">REBU</SelectItem>
                      <SelectItem value="exento">Exento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre de contacto</Label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dirección fiscal</Label>
                <Input value={fiscalAddress} onChange={e => setFiscalAddress(e.target.value)} />
              </div>
            </div>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          {clientType === 'particular' && (
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle, número..." />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>C.P.</Label>
              <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Provincia</Label>
              <Input value={province} onChange={e => setProvince(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>IBAN</Label>
            <Input value={iban} onChange={e => setIban(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
