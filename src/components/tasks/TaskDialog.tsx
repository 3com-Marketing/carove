import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Profile {
  user_id: string;
  full_name: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  onSaved: () => void;
}

export function TaskDialog({ open, onOpenChange, task, onSaved }: TaskDialogProps) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('media');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; label: string; plate: string; model: string }[]>([]);
  const [buyers, setBuyers] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setPriority(task.priority);
        setAssignedTo(task.assigned_to || '');
        setDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '');
        setVehicleId(task.vehicle_id || '');
        setBuyerId(task.buyer_id || '');
      } else {
        setTitle('');
        setDescription('');
        setPriority('media');
        setAssignedTo('');
        setDueDate('');
        setVehicleId('');
        setBuyerId('');
      }
    }
  }, [open, task]);

  const loadOptions = async () => {
    const [{ data: profilesData }, { data: vehiclesData }, { data: buyersData }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').eq('active', true),
      supabase.from('vehicles').select('id, brand, model, plate').in('status', ['disponible', 'reservado'] as any).limit(200),
      supabase.from('buyers').select('id, name, last_name, company_name, client_type').eq('active', true).limit(200),
    ]);
    setUsers(profilesData || []);
    setVehicles((vehiclesData || []).map(v => ({ id: v.id, label: `${v.plate} - ${v.brand} ${v.model}`, plate: v.plate || '', model: v.model || '' })));
    setBuyers((buyersData || []).map(b => ({
      id: b.id,
      label: b.client_type === 'empresa' ? (b.company_name || b.name) : `${b.name} ${b.last_name || ''}`.trim(),
    })));
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!user) return;
    setSaving(true);

    const assignedUser = users.find(u => u.user_id === assignedTo);
    const vehicleObj = vehicles.find(v => v.id === vehicleId);
    const buyerObj = buyers.find(b => b.id === buyerId);

    // Auto-format title with vehicle info if vehicle is selected
    let finalTitle = title.trim();
    if (vehicleObj && !finalTitle.startsWith('[')) {
      const prefix = `[${vehicleObj.plate || '???'} - ${vehicleObj.model || '???'}]`;
      finalTitle = `${prefix} ${finalTitle}`;
    }

    const payload = {
      title: finalTitle,
      description,
      priority: priority as any,
      assigned_to: assignedTo || null,
      assigned_to_name: assignedUser?.full_name || '',
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      vehicle_id: vehicleId || null,
      vehicle_label: vehicleObj?.label || '',
      buyer_id: buyerId || null,
      buyer_label: buyerObj?.label || '',
    };

    let error;
    if (task) {
      ({ error } = await supabase.from('tasks').update(payload).eq('id', task.id));
    } else {
      ({ error } = await supabase.from('tasks').insert({
        ...payload,
        created_by: user.id,
        created_by_name: profile?.full_name || '',
      } as any));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(task ? 'Tarea actualizada' : 'Tarea creada');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Preparar documentación vehículo" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">🟢 Baja</SelectItem>
                  <SelectItem value="media">🟡 Media</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha límite</Label>
              <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Asignar a</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehículo (opcional)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={buyerId} onValueChange={setBuyerId}>
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {buyers.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? 'Guardar' : 'Crear Tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
