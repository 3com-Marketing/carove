import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

interface Props {
  open: boolean;
  list?: any;
  onOpenChange: (open: boolean) => void;
}

export function ContactListDialog({ open, list, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(list?.name || '');
      setDescription(list?.description || '');
      setColor(list?.color || COLORS[0]);
    }
  }, [open, list]);

  const save = useMutation({
    mutationFn: async () => {
      if (list) {
        const { error } = await supabase.from('email_contact_lists').update({ name, description, color }).eq('id', list.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_contact_lists').insert({ name, description, color, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-contact-lists'] });
      toast.success(list ? 'Lista actualizada' : 'Lista creada');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{list ? 'Editar Lista' : 'Nueva Lista de Contactos'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Clientes VIP" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional..." rows={2} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{ backgroundColor: c, borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent', transform: color === c ? 'scale(1.15)' : 'scale(1)' }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
            {list ? 'Guardar' : 'Crear lista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
