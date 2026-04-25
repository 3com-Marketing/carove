import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ACTIVITY_CHANNEL_LABELS, ACTIVITY_RESULT_LABELS,
  type CommercialActivity, type ActivityChannel, type ActivityResult,
} from '@/lib/types';
import { ActivityDialog } from '@/components/commercial/ActivityDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ActivityList() {
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<CommercialActivity | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [cancelActivity, setCancelActivity] = useState<CommercialActivity | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { data: activities = [], refetch } = useQuery({
    queryKey: ['commercial-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commercial_activities')
        .select('*')
        .order('activity_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as CommercialActivity[];
    },
  });

  const filtered = activities.filter(a => {
    if (channelFilter !== 'all' && a.channel !== channelFilter) return false;
    if (resultFilter !== 'all' && a.result !== resultFilter) return false;
    if (searchText) {
      const s = searchText.toLowerCase();
      if (!a.subject.toLowerCase().includes(s) && !a.user_name.toLowerCase().includes(s) && !a.observations.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleCancel = async () => {
    if (!cancelActivity || cancelReason.trim().length < 5) {
      toast({ title: 'Introduce un motivo (mín. 5 caracteres)', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('commercial_activities')
        .update({
          status: 'anulada',
          cancelled_reason: cancelReason.trim(),
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id,
        })
        .eq('id', cancelActivity.id);
      if (error) throw error;
      toast({ title: 'Actividad anulada' });
      refetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setCancelActivity(null);
      setCancelReason('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Registro de Actividades</h1>
        <Button onClick={() => { setEditActivity(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva actividad
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-48"
        />
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los canales</SelectItem>
            {(Object.keys(ACTIVITY_CHANNEL_LABELS) as ActivityChannel[]).map(ch => (
              <SelectItem key={ch} value={ch}>{ACTIVITY_CHANNEL_LABELS[ch]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Resultado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los resultados</SelectItem>
            {(Object.keys(ACTIVITY_RESULT_LABELS) as ActivityResult[]).map(r => (
              <SelectItem key={r} value={r}>{ACTIVITY_RESULT_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Resultado</TableHead>
                {isAdmin && <TableHead>Comercial</TableHead>}
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Sin actividades
                  </TableCell>
                </TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id} className={a.status === 'anulada' ? 'opacity-50' : ''}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(a.activity_date), 'dd/MM/yy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{ACTIVITY_CHANNEL_LABELS[a.channel]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{a.subject}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{ACTIVITY_RESULT_LABELS[a.result]}</Badge>
                  </TableCell>
                  {isAdmin && <TableCell className="text-xs">{a.user_name}</TableCell>}
                  <TableCell>
                    {a.status === 'anulada' ? (
                      <Badge variant="destructive" className="text-[10px]">Anulada</Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">Activa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === 'activa' && a.user_id === user?.id && (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setEditActivity(a); setDialogOpen(true); }}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelActivity(a)}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editActivity}
        onSaved={() => refetch()}
      />

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelActivity} onOpenChange={() => { setCancelActivity(null); setCancelReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular actividad</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Introduce el motivo de anulación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de anulación (mín. 5 caracteres)"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
