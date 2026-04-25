import { useState } from 'react';
import { MarketComparisonBlock } from './MarketComparisonBlock';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface AppraisalFormData {
  exterior_score: number;
  exterior_notes: string;
  interior_score: number;
  interior_notes: string;
  mechanical_score: number;
  mechanical_notes: string;
  tires_score: number;
  tires_notes: string;
  electrical_score: number;
  electrical_notes: string;
  market_value: number;
  offer_price: number;
  internal_notes: string;
}

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

interface AppraisalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AppraisalFormData) => Promise<void>;
  initialData?: Partial<AppraisalFormData>;
  title?: string;
  vehicle?: MarketVehicle;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Deficiente',
  2: 'Regular',
  3: 'Aceptable',
  4: 'Bueno',
  5: 'Excelente',
};

const SCORE_COLORS: Record<number, string> = {
  1: 'text-destructive',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-emerald-500',
  5: 'text-primary',
};

function ScoreSection({
  label,
  description,
  score,
  notes,
  onScoreChange,
  onNotesChange,
}: {
  label: string;
  description: string;
  score: number;
  notes: string;
  onScoreChange: (v: number) => void;
  onNotesChange: (v: string) => void;
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{label}</span>
          <span className={`text-xs font-semibold ${SCORE_COLORS[score]}`}>
            {score}/5 — {SCORE_LABELS[score]}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Slider
          min={1}
          max={5}
          step={1}
          value={[score]}
          onValueChange={([v]) => onScoreChange(v)}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <Textarea
          placeholder="Observaciones..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </CardContent>
    </Card>
  );
}

export function AppraisalDialog({ open, onOpenChange, onSave, initialData, title = 'Nueva Tasación', vehicle }: AppraisalDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppraisalFormData>({
    exterior_score: initialData?.exterior_score ?? 3,
    exterior_notes: initialData?.exterior_notes ?? '',
    interior_score: initialData?.interior_score ?? 3,
    interior_notes: initialData?.interior_notes ?? '',
    mechanical_score: initialData?.mechanical_score ?? 3,
    mechanical_notes: initialData?.mechanical_notes ?? '',
    tires_score: initialData?.tires_score ?? 3,
    tires_notes: initialData?.tires_notes ?? '',
    electrical_score: initialData?.electrical_score ?? 3,
    electrical_notes: initialData?.electrical_notes ?? '',
    market_value: initialData?.market_value ?? 0,
    offer_price: initialData?.offer_price ?? 0,
    internal_notes: initialData?.internal_notes ?? '',
  });

  const set = <K extends keyof AppraisalFormData>(key: K, val: AppraisalFormData[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Formulario de tasación del vehículo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estado del vehículo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ScoreSection label="Exterior" description="Carrocería, pintura, cristales" score={form.exterior_score} notes={form.exterior_notes} onScoreChange={v => set('exterior_score', v)} onNotesChange={v => set('exterior_notes', v)} />
            <ScoreSection label="Interior" description="Tapicería, salpicadero, volante" score={form.interior_score} notes={form.interior_notes} onScoreChange={v => set('interior_score', v)} onNotesChange={v => set('interior_notes', v)} />
            <ScoreSection label="Mecánica" description="Motor, cambio, frenos, suspensión" score={form.mechanical_score} notes={form.mechanical_notes} onScoreChange={v => set('mechanical_score', v)} onNotesChange={v => set('mechanical_notes', v)} />
            <ScoreSection label="Neumáticos" description="Estado y profundidad" score={form.tires_score} notes={form.tires_notes} onScoreChange={v => set('tires_score', v)} onNotesChange={v => set('tires_notes', v)} />
            <ScoreSection label="Electricidad" description="Luces, cuadro, A/C" score={form.electrical_score} notes={form.electrical_notes} onScoreChange={v => set('electrical_score', v)} onNotesChange={v => set('electrical_notes', v)} />
          </div>

          {vehicle && (
            <MarketComparisonBlock
              vehicle={vehicle}
              onMarketValueChange={(value) => set('market_value', value)}
            />
          )}

          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">Valoración económica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor de mercado (referencia)</Label>
              <Input type="number" min={0} step={100} value={form.market_value || ''} onChange={e => set('market_value', Number(e.target.value) || 0)} placeholder="0 €" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Precio de oferta al cliente</Label>
              <Input type="number" min={0} step={100} value={form.offer_price || ''} onChange={e => set('offer_price', Number(e.target.value) || 0)} placeholder="0 €" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notas internas (no aparecen en documento)</Label>
            <Textarea value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} rows={2} placeholder="Notas internas..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Guardar tasación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
