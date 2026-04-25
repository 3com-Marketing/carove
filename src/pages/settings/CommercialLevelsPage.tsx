import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Pencil, Trash2, Trophy, Zap } from 'lucide-react';
import { LevelDialog } from '@/components/incentives/LevelDialog';
import { PointRuleDialog } from '@/components/incentives/PointRuleDialog';
import { toast } from 'sonner';

export default function CommercialLevelsPage() {
  const { isAdmin } = useRole();
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<any>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: levels = [], refetch: refetchLevels } = useQuery({
    queryKey: ['commercial-levels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('commercial_levels').select('*').order('min_points');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rules = [], refetch: refetchRules } = useQuery({
    queryKey: ['point-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('point_rules').select('*').order('action');
      if (error) throw error;
      return data || [];
    },
  });

  const handleDeleteLevel = async (id: string) => {
    const { error } = await supabase.from('commercial_levels').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Nivel eliminado'); refetchLevels(); }
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase.from('point_rules').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Regla eliminada'); refetchRules(); }
  };

  const ACTION_LABELS: Record<string, string> = {
    venta: 'Venta de vehículo',
    financiacion: 'Operación financiada',
    producto_adicional: 'Producto adicional',
    margen_superior: 'Margen superior a umbral',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Niveles Comerciales</h1>
        <p className="text-sm text-muted-foreground">Configura los niveles de gamificación y reglas de puntos</p>
      </div>

      {/* Levels */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Niveles
          </CardTitle>
          <Button size="sm" onClick={() => { setEditingLevel(null); setLevelDialogOpen(true); }}>
            <PlusCircle className="h-4 w-4 mr-1" /> Nuevo nivel
          </Button>
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin niveles configurados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Puntos mínimos</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.min_points}</TableCell>
                    <TableCell>x{l.bonus_multiplier}</TableCell>
                    <TableCell className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingLevel(l); setLevelDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLevel(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Point Rules */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Reglas de Puntos
          </CardTitle>
          <Button size="sm" onClick={() => { setEditingRule(null); setRuleDialogOpen(true); }}>
            <PlusCircle className="h-4 w-4 mr-1" /> Nueva regla
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin reglas configuradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Puntos</TableHead>
                  <TableHead>Umbral</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{ACTION_LABELS[r.action] || r.action}</TableCell>
                    <TableCell>{r.points} pts</TableCell>
                    <TableCell>{r.action === 'margen_superior' ? `${r.threshold.toLocaleString('es-ES')}€` : '—'}</TableCell>
                    <TableCell className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingRule(r); setRuleDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LevelDialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen} existing={editingLevel} onSaved={refetchLevels} />
      <PointRuleDialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen} existing={editingRule} onSaved={refetchRules} />
    </div>
  );
}
