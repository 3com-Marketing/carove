import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAcquisitionChannels, createAcquisitionChannel, updateAcquisitionChannel } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Megaphone, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AcquisitionChannelsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');

  const { data: channels = [] } = useQuery({
    queryKey: ['acquisition-channels-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('acquisition_channels').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Count clients per channel
  const { data: clientCounts = {} } = useQuery({
    queryKey: ['channel-client-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('buyers').select('acquisition_channel_id');
      const counts: Record<string, number> = {};
      (data || []).forEach((b: any) => {
        if (b.acquisition_channel_id) counts[b.acquisition_channel_id] = (counts[b.acquisition_channel_id] || 0) + 1;
      });
      return counts;
    },
  });

  const openCreate = () => { setEditingId(null); setName(''); setDialogOpen(true); };
  const openEdit = (ch: any) => { setEditingId(ch.id); setName(ch.name); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await updateAcquisitionChannel(editingId, { name: name.trim() });
        toast({ title: 'Canal actualizado' });
      } else {
        await createAcquisitionChannel(name.trim());
        toast({ title: 'Canal creado' });
      }
      queryClient.invalidateQueries({ queryKey: ['acquisition-channels-all'] });
      queryClient.invalidateQueries({ queryKey: ['acquisition-channels'] });
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (ch: any) => {
    if (ch.active && (clientCounts[ch.id] || 0) > 0) {
      // Can deactivate but warn
    }
    try {
      await updateAcquisitionChannel(ch.id, { active: !ch.active });
      toast({ title: ch.active ? 'Canal desactivado' : 'Canal activado' });
      queryClient.invalidateQueries({ queryKey: ['acquisition-channels-all'] });
      queryClient.invalidateQueries({ queryKey: ['acquisition-channels'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Canales de Captación
          </h1>
          <p className="text-sm text-muted-foreground">Gestión de canales de captación de clientes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo canal
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-center">Clientes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((ch: any) => (
              <TableRow key={ch.id}>
                <TableCell className="font-medium">{ch.name}</TableCell>
                <TableCell className="text-center">{clientCounts[ch.id] || 0}</TableCell>
                <TableCell>
                  <Badge variant={ch.active ? 'default' : 'destructive'}>
                    {ch.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ch)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(ch)}>
                      {ch.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Canal' : 'Nuevo Canal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del canal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
