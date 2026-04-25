import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { TaxModel } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: TaxModel[];
  onToggle: (id: string, active: boolean) => void;
  loading?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  iva: 'IVA',
  igic: 'IGIC',
  irpf: 'IRPF',
  sociedades: 'Sociedades',
  informativa: 'Informativa',
};

const CATEGORY_COLORS: Record<string, string> = {
  iva: 'bg-blue-100 text-blue-800',
  igic: 'bg-emerald-100 text-emerald-800',
  irpf: 'bg-amber-100 text-amber-800',
  sociedades: 'bg-purple-100 text-purple-800',
  informativa: 'bg-gray-100 text-gray-700',
};

export function TaxModelConfigDialog({ open, onOpenChange, models, onToggle, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Modelos Fiscales</DialogTitle>
          <DialogDescription>Activa los formularios tributarios que apliquen a tu empresa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {models.map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                m.is_active ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-sm font-bold tabular-nums ${m.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {m.model_code}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${m.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>{m.description}</p>
                  <div className="flex gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[m.category] || ''}`}>
                      {CATEGORY_LABELS[m.category] || m.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">{m.period_type}</span>
                  </div>
                </div>
              </div>
              <Switch
                checked={m.is_active}
                onCheckedChange={(v) => onToggle(m.id, v)}
                disabled={loading}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
