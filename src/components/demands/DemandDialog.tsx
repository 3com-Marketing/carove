import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createDemand, updateDemand } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import type { Demand, IntentionLevel } from '@/lib/types';
import { INTENTION_LEVEL_LABELS } from '@/lib/types';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand?: Demand | null;
  buyerId: string;
  onSaved?: () => void;
}

const FUEL_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diésel' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'electrico', label: 'Eléctrico' },
];

export function DemandDialog({ open, onOpenChange, demand, buyerId, onSaved }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isEditing = !!demand;

  // Bloque 1 - Preferencias
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [segmentId, setSegmentId] = useState<string>('');
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [transmission, setTransmission] = useState<string>('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [kmMax, setKmMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [color, setColor] = useState('');
  const [extras, setExtras] = useState('');

  // Bloque 2 - Presupuesto
  const [maxBudget, setMaxBudget] = useState('');
  const [needsFinancing, setNeedsFinancing] = useState(false);
  const [downPayment, setDownPayment] = useState('');
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeInNotes, setTradeInNotes] = useState('');

  // Bloque 3 - Intención
  const [intentionLevel, setIntentionLevel] = useState<IntentionLevel>('exploracion');

  // Bloque 4 - Observaciones
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  // Master data
  const { data: brands = [] } = useQuery({
    queryKey: ['master-brands'],
    queryFn: async () => {
      const { data } = await supabase.from('master_brands').select('id, name').eq('active', true).order('name');
      return data || [];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ['master-models', selectedBrands],
    queryFn: async () => {
      if (selectedBrands.length === 0) return [];
      const brandIds = brands.filter(b => selectedBrands.includes(b.name)).map(b => b.id);
      if (brandIds.length === 0) return [];
      const { data } = await supabase.from('master_models').select('id, name, brand_id').eq('active', true).in('brand_id', brandIds).order('name');
      return data || [];
    },
    enabled: selectedBrands.length > 0,
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['vehicle-segments'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_segments').select('id, name, code').eq('active', true).order('code');
      return data || [];
    },
  });

  useEffect(() => {
    if (open) {
      if (demand) {
        setSelectedBrands(demand.brand_preferences || []);
        setSelectedModels(demand.model_preferences || []);
        setSegmentId(demand.segment_id || '');
        setFuelTypes(demand.fuel_types || []);
        setTransmission(demand.transmission || '');
        setYearMin(demand.year_min?.toString() || '');
        setYearMax(demand.year_max?.toString() || '');
        setKmMax(demand.km_max?.toString() || '');
        setPriceMin(demand.price_min?.toString() || '');
        setPriceMax(demand.price_max?.toString() || '');
        setColor(demand.preferred_color || '');
        setExtras(demand.required_extras || '');
        setMaxBudget(demand.max_budget?.toString() || '');
        setNeedsFinancing(demand.needs_financing);
        setDownPayment(demand.down_payment?.toString() || '');
        setHasTradeIn(demand.has_trade_in);
        setTradeInNotes(demand.trade_in_notes || '');
        setIntentionLevel(demand.intention_level);
        setNotes(demand.commercial_notes || '');
      } else {
        setSelectedBrands([]);
        setSelectedModels([]);
        setSegmentId('');
        setFuelTypes([]);
        setTransmission('');
        setYearMin('');
        setYearMax('');
        setKmMax('');
        setPriceMin('');
        setPriceMax('');
        setColor('');
        setExtras('');
        setMaxBudget('');
        setNeedsFinancing(false);
        setDownPayment('');
        setHasTradeIn(false);
        setTradeInNotes('');
        setIntentionLevel('exploracion');
        setNotes('');
      }
    }
  }, [open, demand]);

  const toggleBrand = (name: string) => {
    setSelectedBrands(prev => prev.includes(name) ? prev.filter(b => b !== name) : [...prev, name]);
  };

  const toggleFuel = (value: string) => {
    setFuelTypes(prev => prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]);
  };

  const toggleModel = (name: string) => {
    setSelectedModels(prev => prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<Demand> = {
        buyer_id: buyerId,
        brand_preferences: selectedBrands,
        model_preferences: selectedModels,
        segment_id: segmentId || null,
        fuel_types: fuelTypes,
        transmission: transmission || null,
        year_min: yearMin ? parseInt(yearMin) : null,
        year_max: yearMax ? parseInt(yearMax) : null,
        km_max: kmMax ? parseInt(kmMax) : null,
        price_min: priceMin ? parseFloat(priceMin) : null,
        price_max: priceMax ? parseFloat(priceMax) : null,
        preferred_color: color || null,
        required_extras: extras || null,
        max_budget: maxBudget ? parseFloat(maxBudget) : null,
        needs_financing: needsFinancing,
        down_payment: downPayment ? parseFloat(downPayment) : null,
        has_trade_in: hasTradeIn,
        trade_in_notes: tradeInNotes || null,
        intention_level: intentionLevel,
        commercial_notes: notes || null,
      };

      if (isEditing) {
        await updateDemand(demand.id, payload);
        toast({ title: 'Demanda actualizada' });
      } else {
        await createDemand({
          ...payload,
          user_id: user!.id,
          user_name: profile?.full_name || user!.email || '',
        });
        toast({ title: 'Demanda creada' });
      }

      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar demanda' : 'Nueva demanda'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bloque 1 - Preferencias del vehículo */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Preferencias del vehículo</h3>

            <div className="space-y-1.5">
              <Label>Marcas preferidas</Label>
              <div className="flex flex-wrap gap-1.5">
                {brands.slice(0, 30).map(b => (
                  <Badge
                    key={b.id}
                    variant={selectedBrands.includes(b.name) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleBrand(b.name)}
                  >
                    {b.name}
                    {selectedBrands.includes(b.name) && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            {selectedBrands.length > 0 && models.length > 0 && (
              <div className="space-y-1.5">
                <Label>Modelos preferidos</Label>
                <div className="flex flex-wrap gap-1.5">
                  {models.map((m: any) => (
                    <Badge
                      key={m.id}
                      variant={selectedModels.includes(m.name) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleModel(m.name)}
                    >
                      {m.name}
                      {selectedModels.includes(m.name) && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select value={segmentId || '_none'} onValueChange={v => setSegmentId(v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Todos</SelectItem>
                    {segments.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Cambio</Label>
                <Select value={transmission || '_none'} onValueChange={v => setTransmission(v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Indiferente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Indiferente</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatico">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Combustible</Label>
              <div className="flex flex-wrap gap-1.5">
                {FUEL_OPTIONS.map(f => (
                  <Badge
                    key={f.value}
                    variant={fuelTypes.includes(f.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFuel(f.value)}
                  >
                    {f.label}
                    {fuelTypes.includes(f.value) && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Año mín.</Label>
                <Input type="number" value={yearMin} onChange={e => setYearMin(e.target.value)} placeholder="2018" />
              </div>
              <div className="space-y-1.5">
                <Label>Año máx.</Label>
                <Input type="number" value={yearMax} onChange={e => setYearMax(e.target.value)} placeholder="2024" />
              </div>
              <div className="space-y-1.5">
                <Label>Km máx.</Label>
                <Input type="number" value={kmMax} onChange={e => setKmMax(e.target.value)} placeholder="80000" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input value={color} onChange={e => setColor(e.target.value)} placeholder="Blanco" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Precio mín. (€)</Label>
                <Input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="8000" />
              </div>
              <div className="space-y-1.5">
                <Label>Precio máx. (€)</Label>
                <Input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="20000" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Extras obligatorios</Label>
              <Input value={extras} onChange={e => setExtras(e.target.value)} placeholder="Cámara trasera, navegador, sensores..." />
            </div>
          </div>

          {/* Bloque 2 - Presupuesto y pago */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Presupuesto y pago</h3>

            <div className="space-y-1.5">
              <Label>Presupuesto máximo real (€)</Label>
              <Input type="number" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} placeholder="20000" />
            </div>

            <div className="flex items-center justify-between">
              <Label>¿Necesita financiación?</Label>
              <Switch checked={needsFinancing} onCheckedChange={setNeedsFinancing} />
            </div>

            {needsFinancing && (
              <div className="space-y-1.5">
                <Label>Entrada aproximada (€)</Label>
                <Input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} placeholder="3000" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>¿Tiene vehículo para entregar?</Label>
              <Switch checked={hasTradeIn} onCheckedChange={setHasTradeIn} />
            </div>

            {hasTradeIn && (
              <div className="space-y-1.5">
                <Label>Notas de tasación</Label>
                <Textarea value={tradeInNotes} onChange={e => setTradeInNotes(e.target.value)} placeholder="Marca, modelo, km, estado..." rows={2} />
              </div>
            )}
          </div>

          {/* Bloque 3 - Nivel de intención */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Nivel de intención *</h3>
            <Select value={intentionLevel} onValueChange={v => setIntentionLevel(v as IntentionLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(INTENTION_LEVEL_LABELS) as [IntentionLevel, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bloque 4 - Observaciones comerciales */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Observaciones comerciales</h3>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Quiere SUV familiar, máximo 20.000€, urgencia antes de marzo."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear demanda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
