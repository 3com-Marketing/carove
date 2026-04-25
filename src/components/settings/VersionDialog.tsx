import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { getSuggestedVersionNames } from '@/lib/supabase-api';
import type { MasterVersion, MasterBrand, MasterModel } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  version: MasterVersion | null | undefined;
  brands: MasterBrand[];
  models: MasterModel[];
  onSave: (data: { master_model_id: string; name: string; active: boolean }) => void;
  loading?: boolean;
}

export function VersionDialog({ open, onOpenChange, version, brands, models, onSave, loading }: Props) {
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const filteredModels = models.filter(m => m.brand_id === brandId && m.active);

  useEffect(() => {
    if (version) {
      const model = models.find(m => m.id === version.master_model_id);
      setBrandId(model?.brand_id || '');
      setModelId(version.master_model_id);
      setName(version.name);
      setActive(version.active);
    } else {
      setBrandId('');
      setModelId('');
      setName('');
      setActive(true);
    }
    setSuggestions([]);
  }, [version, open, models]);

  // Check for suggested names when name changes
  useEffect(() => {
    if (!brandId || name.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await getSuggestedVersionNames(brandId, name);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [name, brandId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId || !name.trim()) return;
    onSave({ master_model_id: modelId, name: name.trim(), active });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{version ? 'Editar Versión' : 'Nueva Versión'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={brandId} onValueChange={v => { setBrandId(v); setModelId(''); }} disabled={!!version}>
              <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
              <SelectContent>
                {brands.filter(b => b.active).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modelo Maestro</Label>
            <Select value={modelId} onValueChange={setModelId} disabled={!brandId || !!version}>
              <SelectTrigger><SelectValue placeholder="Seleccionar modelo" /></SelectTrigger>
              <SelectContent>
                {filteredModels.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nombre versión</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Sport, Advance, Zen..." required />
          </div>

          {suggestions.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Existe una versión con este nombre en otros modelos de la marca: <strong>{suggestions[0]}</strong>.
                ¿Deseas utilizar el mismo nombre normalizado?
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} id="version-active" />
            <Label htmlFor="version-active">Activa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !modelId || !name.trim()}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
