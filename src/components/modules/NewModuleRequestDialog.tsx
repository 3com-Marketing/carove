import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewModuleRequestDialog({ open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [complexity, setComplexity] = useState('M');

  const budgetRanges: Record<string, { min: number; max: number; timeline: string }> = {
    S: { min: 800, max: 2800, timeline: '1-2 semanas' },
    M: { min: 3000, max: 7000, timeline: '3-4 semanas' },
    L: { min: 6500, max: 15000, timeline: '5-7 semanas' },
    XL: { min: 12000, max: 30000, timeline: '8-12 semanas' },
  };

  const reset = () => {
    setTitle('');
    setSummary('');
    setComplexity('M');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim()) {
      toast.error('Completa el título y la descripción');
      return;
    }
    if (!user) return;

    setSaving(true);
    const range = budgetRanges[complexity];
    const { error } = await supabase.from('module_requests').insert({
      title: title.trim(),
      summary: summary.trim(),
      complexity,
      budget_min: range.min,
      budget_max: range.max,
      timeline: range.timeline,
      requested_by: user.id,
      requested_by_name: profile?.full_name || user.email || '',
      conversation: [{ role: 'user', content: summary.trim() }],
    });

    setSaving(false);
    if (error) {
      toast.error('Error al crear la solicitud');
      return;
    }

    toast.success('Solicitud creada correctamente');
    queryClient.invalidateQueries({ queryKey: ['module-requests'] });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de módulo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="req-title">Título del módulo</Label>
            <Input
              id="req-title"
              placeholder="Ej: Integración con WhatsApp Business"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-summary">Descripción</Label>
            <Textarea
              id="req-summary"
              placeholder="Describe qué necesitas, qué problema resuelve y cualquier detalle relevante..."
              rows={4}
              value={summary}
              onChange={e => setSummary(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Complejidad estimada</Label>
            <Select value={complexity} onValueChange={setComplexity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S">S — Simple (800–2.800 €, 1-2 sem.)</SelectItem>
                <SelectItem value="M">M — Medio (3.000–7.000 €, 3-4 sem.)</SelectItem>
                <SelectItem value="L">L — Complejo (6.500–15.000 €, 5-7 sem.)</SelectItem>
                <SelectItem value="XL">XL — Muy complejo (12.000–30.000 €, 8-12 sem.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
