import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getBuyers, createCommercialActivity, updateCommercialActivity } from '@/lib/supabase-api';
import {
  ACTIVITY_CHANNEL_LABELS, ACTIVITY_RESULT_LABELS,
  type ActivityChannel, type ActivityResult, type CommercialActivity,
} from '@/lib/types';
import { Phone, PhoneIncoming, MessageCircle, Mail, Users, Video, Wrench, AlertTriangle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

const CHANNEL_ICONS: Record<ActivityChannel, React.ComponentType<{ className?: string }>> = {
  llamada_saliente: Phone,
  llamada_entrante: PhoneIncoming,
  whatsapp: MessageCircle,
  email: Mail,
  reunion_presencial: Users,
  videollamada: Video,
  gestion_postventa: Wrench,
  incidencia: AlertTriangle,
  seguimiento_interno: ClipboardList,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: CommercialActivity | null;
  presetChannel?: ActivityChannel;
  presetBuyerId?: string;
  onSaved?: () => void;
}

export function ActivityDialog({ open, onOpenChange, activity, presetChannel, presetBuyerId, onSaved }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!activity;

  const [buyerId, setBuyerId] = useState('');
  const [channel, setChannel] = useState<ActivityChannel>('llamada_saliente');
  const [subject, setSubject] = useState('');
  const [result, setResult] = useState<ActivityResult>('interesado');
  const [followUpDays, setFollowUpDays] = useState<number>(7);
  const [observations, setObservations] = useState('');
  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState('');

  const { data: buyers = [] } = useQuery({ queryKey: ['buyers'], queryFn: getBuyers });

  useEffect(() => {
    if (open) {
      if (activity) {
        setBuyerId(activity.buyer_id);
        setChannel(activity.channel);
        setSubject(activity.subject);
        setResult(activity.result);
        setFollowUpDays(activity.follow_up_days || 7);
        setObservations(activity.observations);
        setActivityDate(format(new Date(activity.activity_date), "yyyy-MM-dd'T'HH:mm"));
      } else {
        setBuyerId(presetBuyerId || '');
        setChannel(presetChannel || 'llamada_saliente');
        setSubject('');
        setResult('interesado');
        setFollowUpDays(7);
        setObservations('');
        setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      }
      setBuyerSearch('');
    }
  }, [open, activity, presetChannel, presetBuyerId]);

  const filteredBuyers = buyers
    .filter(b => b.active)
    .filter(b => {
      if (!buyerSearch) return true;
      const search = buyerSearch.toLowerCase();
      const fullName = [b.name, b.last_name, b.company_name].filter(Boolean).join(' ').toLowerCase();
      return fullName.includes(search) || (b.phone || '').includes(search);
    })
    .slice(0, 50);

  const handleSave = async () => {
    if (!buyerId) { toast({ title: 'Selecciona un cliente', variant: 'destructive' }); return; }
    if (!subject.trim()) { toast({ title: 'Introduce un asunto', variant: 'destructive' }); return; }
    if (observations.trim().length < 10) { toast({ title: 'Observaciones: mínimo 10 caracteres', variant: 'destructive' }); return; }

    setSaving(true);
    try {
      const followUpDate = result === 'seguimiento_x_dias'
        ? new Date(new Date(activityDate).getTime() + followUpDays * 86400000).toISOString()
        : null;

      const payload = {
        buyer_id: buyerId,
        channel,
        subject: subject.trim(),
        result,
        follow_up_days: result === 'seguimiento_x_dias' ? followUpDays : null,
        follow_up_date: followUpDate,
        observations: observations.trim(),
        activity_date: new Date(activityDate).toISOString(),
      };

      if (isEditing) {
        await updateCommercialActivity(activity.id, payload);
        toast({ title: 'Actividad actualizada' });
      } else {
        await createCommercialActivity({
          ...payload,
          user_id: user!.id,
          user_name: profile?.full_name || user!.email || '',
        });
        toast({ title: 'Actividad registrada' });
      }

      queryClient.invalidateQueries({ queryKey: ['commercial-activities'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-activities'] });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedBuyer = buyers.find(b => b.id === buyerId);
  const selectedBuyerLabel = selectedBuyer
    ? (selectedBuyer.client_type === 'profesional'
      ? selectedBuyer.company_name || selectedBuyer.name
      : [selectedBuyer.name, selectedBuyer.last_name].filter(Boolean).join(' '))
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar actividad' : 'Registrar actividad'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client selector */}
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            {presetBuyerId && selectedBuyerLabel ? (
              <p className="text-sm font-medium p-2 bg-muted rounded-md">{selectedBuyerLabel}</p>
            ) : (
              <div className="space-y-1">
                <Input
                  placeholder="Buscar cliente..."
                  value={buyerSearch}
                  onChange={e => setBuyerSearch(e.target.value)}
                />
                {(buyerSearch || !buyerId) && (
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {filteredBuyers.map(b => {
                      const label = b.client_type === 'profesional'
                        ? b.company_name || b.name
                        : [b.name, b.last_name].filter(Boolean).join(' ');
                      return (
                        <button
                          key={b.id}
                          type="button"
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${buyerId === b.id ? 'bg-primary/10 font-medium' : ''}`}
                          onClick={() => { setBuyerId(b.id); setBuyerSearch(''); }}
                        >
                          {label} {b.phone ? `· ${b.phone}` : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
                {buyerId && !buyerSearch && (
                  <p className="text-xs text-muted-foreground">Seleccionado: <strong>{selectedBuyerLabel}</strong></p>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Fecha y hora</Label>
            <Input type="datetime-local" value={activityDate} onChange={e => setActivityDate(e.target.value)} />
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label>Canal *</Label>
            <Select value={channel} onValueChange={v => setChannel(v as ActivityChannel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTIVITY_CHANNEL_LABELS) as ActivityChannel[]).map(ch => {
                  const Icon = CHANNEL_ICONS[ch];
                  return (
                    <SelectItem key={ch} value={ch}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {ACTIVITY_CHANNEL_LABELS[ch]}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Asunto *</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Consulta sobre Seat Ibiza" maxLength={200} />
          </div>

          {/* Result */}
          <div className="space-y-1.5">
            <Label>Resultado *</Label>
            <Select value={result} onValueChange={v => setResult(v as ActivityResult)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTIVITY_RESULT_LABELS) as ActivityResult[]).map(r => (
                  <SelectItem key={r} value={r}>{ACTIVITY_RESULT_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Follow-up days (conditional) */}
          {result === 'seguimiento_x_dias' && (
            <div className="space-y-1.5">
              <Label>Días de seguimiento</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={followUpDays}
                onChange={e => setFollowUpDays(parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                Seguimiento: {format(new Date(new Date(activityDate).getTime() + followUpDays * 86400000), 'dd/MM/yyyy')}
              </p>
            </div>
          )}

          {/* Observations */}
          <div className="space-y-1.5">
            <Label>Observaciones * <span className="text-muted-foreground">(mín. 10 caracteres)</span></Label>
            <Textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Detalla la interacción..."
              rows={3}
            />
            <p className={`text-xs ${observations.trim().length < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {observations.trim().length}/10 caracteres mínimo
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
