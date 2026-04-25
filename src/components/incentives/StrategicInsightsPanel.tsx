import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Brain } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import { toast } from '@/hooks/use-toast';

export function StrategicInsightsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newInsights, setNewInsights] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  const { data: savedInsights } = useQuery({
    queryKey: ['ai-recommendations', 'rendimiento'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_recommendations')
        .select('*')
        .in('category', ['rendimiento', 'financiacion', 'lead', 'prediccion'])
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-incentives', {
        body: { type: 'strategic_insights' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const insights = data?.result?.insights || [];
      setNewInsights(insights);
      toast({ title: 'Análisis completado', description: `${insights.length} insights generados` });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const saveInsight = async (insight: any, status: string) => {
    await supabase.from('ai_recommendations').insert({
      category: insight.category || 'rendimiento',
      title: insight.title,
      description: insight.description,
      estimated_impact: insight.estimated_impact,
      recommended_action: insight.recommended_action,
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      metadata: insight,
    });
    queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    setNewInsights(prev => prev.filter(i => i.title !== insight.title));
    toast({ title: status === 'revisada' ? 'Marcado como revisado' : 'Archivado' });
  };

  const filteredSaved = filter === 'all'
    ? savedInsights || []
    : (savedInsights || []).filter((s: any) => s.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Asistente Comercial IA</h3>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generar análisis
        </Button>
      </div>

      {newInsights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Nuevos insights</h4>
          {newInsights.map((insight, i) => (
            <RecommendationCard
              key={i}
              title={insight.title}
              description={insight.description}
              category={insight.category}
              severity={insight.severity}
              estimatedImpact={insight.estimated_impact}
              recommendedAction={insight.recommended_action}
              onAccept={() => saveInsight(insight, 'revisada')}
              onIgnore={() => saveInsight(insight, 'ignorada')}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Filtrar:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="rendimiento">Rendimiento</SelectItem>
            <SelectItem value="financiacion">Financiación</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="objetivo">Objetivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredSaved.length > 0 && (
        <div className="space-y-3">
          {filteredSaved.map((rec: any) => (
            <RecommendationCard
              key={rec.id}
              title={rec.title}
              description={rec.description}
              category={rec.category}
              status={rec.status}
              estimatedImpact={rec.estimated_impact}
              recommendedAction={rec.recommended_action}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
