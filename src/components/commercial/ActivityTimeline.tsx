import { useQuery } from '@tanstack/react-query';
import { getActivitiesByBuyer } from '@/lib/supabase-api';
import { ACTIVITY_CHANNEL_LABELS, ACTIVITY_RESULT_LABELS, type CommercialActivity, type ActivityChannel } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneIncoming, MessageCircle, Mail, Users, Video, Wrench, AlertTriangle, ClipboardList, Ban } from 'lucide-react';

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

const RESULT_COLORS: Record<string, string> = {
  interesado: 'bg-emerald-100 text-emerald-800',
  no_interesado: 'bg-red-100 text-red-800',
  no_responde: 'bg-muted text-muted-foreground',
  pendiente_decision: 'bg-amber-100 text-amber-800',
  cita_agendada: 'bg-blue-100 text-blue-800',
  incidencia_detectada: 'bg-destructive/10 text-destructive',
  incidencia_resuelta: 'bg-emerald-100 text-emerald-800',
  seguimiento_x_dias: 'bg-violet-100 text-violet-800',
};

export function ActivityTimeline({ buyerId }: { buyerId: string }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['buyer-activities', buyerId],
    queryFn: () => getActivitiesByBuyer(buyerId),
    enabled: !!buyerId,
  });

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Cargando actividades...</p>;
  if (activities.length === 0) return <p className="text-center text-muted-foreground py-8">Sin actividades registradas</p>;

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      {activities.map((act: CommercialActivity) => {
        const Icon = CHANNEL_ICONS[act.channel] || ClipboardList;
        const isCancelled = act.status === 'anulada';

        return (
          <div key={act.id} className={`relative pl-12 pb-6 ${isCancelled ? 'opacity-50' : ''}`}>
            {/* Icon dot */}
            <div className={`absolute left-3 top-1 w-5 h-5 rounded-full flex items-center justify-center ${isCancelled ? 'bg-muted' : 'bg-primary/10'}`}>
              {isCancelled ? <Ban className="h-3 w-3 text-muted-foreground" /> : <Icon className="h-3 w-3 text-primary" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(act.activity_date), "dd MMM yyyy · HH:mm", { locale: es })}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ACTIVITY_CHANNEL_LABELS[act.channel]}
                </Badge>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${RESULT_COLORS[act.result] || ''}`}>
                  {ACTIVITY_RESULT_LABELS[act.result]}
                </Badge>
                {isCancelled && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Anulada</Badge>}
              </div>

              <p className="text-sm font-medium">{act.subject}</p>
              <p className="text-xs text-muted-foreground">{act.observations}</p>
              <p className="text-[10px] text-muted-foreground/60">por {act.user_name}</p>

              {isCancelled && act.cancelled_reason && (
                <p className="text-xs text-destructive italic">Motivo anulación: {act.cancelled_reason}</p>
              )}

              {act.follow_up_date && act.status === 'activa' && (
                <p className="text-xs text-violet-600">
                  📅 Seguimiento: {format(new Date(act.follow_up_date), 'dd/MM/yyyy')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
