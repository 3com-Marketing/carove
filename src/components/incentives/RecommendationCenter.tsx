import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, LayoutList } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

export function RecommendationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: recs, isLoading } = useQuery({
    queryKey: ['ai-recommendations-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_recommendations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('ai_recommendations').update({
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['ai-recommendations-all'] });
    toast({ title: `Recomendación ${status}` });
  };

  const filtered = (recs || []).filter((r: any) => {
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    total: (recs || []).length,
    pendiente: (recs || []).filter((r: any) => r.status === 'pendiente').length,
    aceptada: (recs || []).filter((r: any) => r.status === 'aceptada').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutList className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Centro de Recomendaciones</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{counts.total} total</Badge>
          <Badge variant="default">{counts.pendiente} pendientes</Badge>
          <Badge variant="secondary">{counts.aceptada} aceptadas</Badge>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="objetivo">Objetivos</SelectItem>
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="financiacion">Financiación</SelectItem>
            <SelectItem value="rendimiento">Rendimiento</SelectItem>
            <SelectItem value="prediccion">Predicción</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="aceptada">Aceptada</SelectItem>
            <SelectItem value="ignorada">Ignorada</SelectItem>
            <SelectItem value="revisada">Revisada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}

      <div className="space-y-3">
        {filtered.map((rec: any) => (
          <RecommendationCard
            key={rec.id}
            title={rec.title}
            description={rec.description}
            category={rec.category}
            status={rec.status}
            estimatedImpact={rec.estimated_impact}
            recommendedAction={rec.recommended_action}
            dataSource={rec.data_source}
            onAccept={() => updateStatus(rec.id, 'aceptada')}
            onIgnore={() => updateStatus(rec.id, 'ignorada')}
            onReview={() => updateStatus(rec.id, 'revisada')}
          />
        ))}
        {filtered.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">No hay recomendaciones con los filtros seleccionados</p>
        )}
      </div>
    </div>
  );
}
