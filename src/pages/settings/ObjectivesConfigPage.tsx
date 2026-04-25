import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import { format, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Pencil, Globe, Users, User, History } from 'lucide-react';
import { ObjectiveDialog } from '@/components/incentives/ObjectiveDialog';

export default function ObjectivesConfigPage() {
  const { isAdmin } = useRole();
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [scope, setScope] = useState<'global' | 'role' | 'individual'>('global');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<any>(null);

  const { data: objectives = [], refetch } = useQuery({
    queryKey: ['objectives-config', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_objectives')
        .select('*')
        .eq('period', period)
        .order('scope');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: changeLog = [] } = useQuery({
    queryKey: ['objective-change-log', period, objectives.length],
    queryFn: async () => {
      const objIds = objectives.map((o: any) => o.id);
      if (objIds.length === 0) return [];
      const { data, error } = await supabase
        .from('objective_change_log')
        .select('*')
        .in('objective_id', objIds)
        .order('changed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: objectives.length > 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-obj-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name');
      if (error) throw error;
      return data || [];
    },
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const scopeLabels: Record<string, string> = { global: 'Global', role: 'Por rol', individual: 'Individual' };
  const periods = Array.from({ length: 6 }, (_, i) => format(addMonths(new Date(), -i + 1), 'yyyy-MM'));

  const handleEdit = (obj: any) => {
    setEditingObj(obj);
    setScope(obj.scope);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingObj(null);
    setDialogOpen(true);
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find((p: any) => p.user_id === userId);
    return p?.full_name || userId?.slice(0, 8);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Configuración de Objetivos</h1>
          <p className="text-sm text-muted-foreground">Define los objetivos mensuales por vendedor, rol o global</p>
        </div>
        <Button onClick={handleNew}>
          <PlusCircle className="h-4 w-4 mr-2" /> Nuevo objetivo
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {periods.map(p => (
          <Button key={p} variant={p === period ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(p)}>
            {p}
          </Button>
        ))}
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
        <TabsList>
          <TabsTrigger value="global" className="flex items-center gap-1"><Globe className="h-3 w-3" /> Global</TabsTrigger>
          <TabsTrigger value="role" className="flex items-center gap-1"><Users className="h-3 w-3" /> Por rol</TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-1"><User className="h-3 w-3" /> Individual</TabsTrigger>
        </TabsList>

        <TabsContent value={scope} className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="pt-4">
              {objectives.filter((o: any) => o.scope === scope).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay objetivos configurados en modo "{scopeLabels[scope]}" para {period}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {scope === 'role' && <TableHead>Rol</TableHead>}
                      {scope === 'individual' && <TableHead>Vendedor</TableHead>}
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Margen (€)</TableHead>
                      <TableHead className="text-right">Financiaciones</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objectives.filter((o: any) => o.scope === scope).map((obj: any) => (
                      <TableRow key={obj.id}>
                        {scope === 'role' && <TableCell><Badge variant="outline">{obj.target_role}</Badge></TableCell>}
                        {scope === 'individual' && <TableCell>{getProfileName(obj.target_user_id)}</TableCell>}
                        <TableCell className="text-right">{obj.target_sales}</TableCell>
                        <TableCell className="text-right">{obj.target_margin?.toLocaleString('es-ES')}€</TableCell>
                        <TableCell className="text-right">{obj.target_financed}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(obj)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {changeLog.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" /> Historial de cambios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-auto">
              {changeLog.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 text-sm p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{format(new Date(log.changed_at), 'dd/MM HH:mm')}</span>
                  <span className="font-medium">{log.field_name}</span>
                  <span className="text-destructive line-through">{log.old_value}</span>
                  <span>→</span>
                  <span className="text-primary font-medium">{log.new_value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ObjectiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        period={period}
        scope={scope}
        existing={editingObj}
        onSaved={refetch}
      />
    </div>
  );
}
