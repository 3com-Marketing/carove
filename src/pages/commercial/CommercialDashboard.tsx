import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Phone, AlertTriangle, Clock, Users } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ACTIVITY_CHANNEL_LABELS, ACTIVITY_RESULT_LABELS, type CommercialActivity } from '@/lib/types';
import { ActivityDialog } from '@/components/commercial/ActivityDialog';
import { Link } from 'react-router-dom';

export default function CommercialDashboard() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = new Date();

  // All activities (RLS handles visibility)
  const { data: activities = [], refetch } = useQuery({
    queryKey: ['commercial-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_activities')
        .select('*')
        .eq('status', 'activa')
        .order('activity_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as CommercialActivity[];
    },
  });

  // KPIs
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const todayCount = activities.filter(a => a.activity_date >= todayStart && a.activity_date <= todayEnd).length;
  const weekCount = activities.filter(a => a.activity_date >= weekStart).length;
  const monthCount = activities.filter(a => a.activity_date >= monthStart).length;

  // Today's activities
  const todayActivities = activities
    .filter(a => a.activity_date >= todayStart && a.activity_date <= todayEnd)
    .slice(0, 10);

  // Pending follow-ups
  const pendingFollowUps = activities
    .filter(a => a.follow_up_date && new Date(a.follow_up_date) <= now)
    .slice(0, 10);

  // Open incidents
  const openIncidents = activities
    .filter(a => a.result === 'incidencia_detectada')
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actividad Comercial</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Vista administrador' : 'Mi actividad'}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva actividad
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{weekCount}</p>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{monthCount}</p>
                <p className="text-xs text-muted-foreground">Este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today */}
        <Card>
          <CardHeader><CardTitle className="text-base">Actividades de hoy</CardTitle></CardHeader>
          <CardContent>
            {todayActivities.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Sin actividades hoy</p>
            ) : (
              <div className="space-y-3">
                {todayActivities.map(a => (
                  <ActivityRow key={a.id} activity={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Seguimientos pendientes ({pendingFollowUps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingFollowUps.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Sin seguimientos pendientes</p>
            ) : (
              <div className="space-y-3">
                {pendingFollowUps.map(a => (
                  <ActivityRow key={a.id} activity={a} showFollowUp />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Incidencias abiertas ({openIncidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openIncidents.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Sin incidencias abiertas</p>
            ) : (
              <div className="space-y-3">
                {openIncidents.map(a => (
                  <ActivityRow key={a.id} activity={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Link to="/commercial/activities">
          <Button variant="outline">Ver todas las actividades</Button>
        </Link>
      </div>

      <ActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

function ActivityRow({ activity, showFollowUp }: { activity: CommercialActivity; showFollowUp?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{activity.subject}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.activity_date), 'HH:mm', { locale: es })}
          </span>
          <Badge variant="outline" className="text-[10px] px-1 py-0">{ACTIVITY_CHANNEL_LABELS[activity.channel]}</Badge>
          <Badge variant="secondary" className="text-[10px] px-1 py-0">{ACTIVITY_RESULT_LABELS[activity.result]}</Badge>
        </div>
        {showFollowUp && activity.follow_up_date && (
          <p className="text-xs text-amber-600">
            Seguimiento: {format(new Date(activity.follow_up_date), 'dd/MM/yyyy')}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">por {activity.user_name}</p>
      </div>
    </div>
  );
}
