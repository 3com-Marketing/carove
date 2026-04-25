import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Sparkles, Users, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const MODES = [
  { value: 'ia', label: 'Asignación inteligente IA' },
  { value: 'rotacion', label: 'Rotación simple' },
  { value: 'equilibrado', label: 'Reparto equilibrado' },
  { value: 'rendimiento', label: 'Prioridad por rendimiento' },
  { value: 'nivel', label: 'Prioridad por nivel comercial' },
];

export function LeadAssignmentPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('ia');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: history } = useQuery({
    queryKey: ['lead-assignments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_assignments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('ai-incentives', {
        body: { type: 'leads' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const assigns = data?.result?.assignments || [];
      setSuggestions(assigns);
      setIsGenerating(false);
      toast({ title: 'Análisis completado', description: `${assigns.length} sugerencias de asignación` });
    },
    onError: (e: any) => {
      setIsGenerating(false);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const confirmAssignment = async (s: any) => {
    const { error } = await supabase.from('lead_assignments').insert({
      demand_id: s.demand_id,
      assigned_to: s.suggested_seller_id,
      assignment_mode: mode,
      reason: s.reason,
      is_automatic: false,
      created_by: user?.id!,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSuggestions(prev => prev.filter(x => x.demand_id !== s.demand_id));
    queryClient.invalidateQueries({ queryKey: ['lead-assignments'] });
    toast({ title: 'Lead asignado', description: `Asignado a ${s.suggested_seller_name}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Asignación Inteligente de Leads</h3>
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Modo de asignación</label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Analizar leads pendientes
        </Button>
      </div>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Sugerencias de asignación</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Demanda</TableHead>
                  <TableHead>Vendedor sugerido</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Confianza</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono">{s.demand_id?.slice(0, 8)}...</TableCell>
                    <TableCell className="text-sm">{s.suggested_seller_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">{s.reason}</TableCell>
                    <TableCell>
                      <Badge variant={s.confidence === 'alta' ? 'default' : s.confidence === 'media' ? 'secondary' : 'outline'}>
                        {s.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" className="h-7" onClick={() => confirmAssignment(s)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setSuggestions(prev => prev.filter(x => x.demand_id !== s.demand_id))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(history || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Historial de asignaciones</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Demanda</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history || []).map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="text-xs font-mono">{h.demand_id?.slice(0, 8)}...</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{h.assignment_mode}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">{h.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
