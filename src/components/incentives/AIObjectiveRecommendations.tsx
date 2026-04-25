import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Target } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import { toast } from '@/hooks/use-toast';

export function AIObjectiveRecommendations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: savedRecs } = useQuery({
    queryKey: ['ai-recommendations', 'objetivo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('category', 'objetivo')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('ai-incentives', {
        body: { type: 'objectives' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const recs = data?.result?.recommendations || [];
      setRecommendations(recs);
      setIsGenerating(false);
      toast({ title: 'Recomendaciones generadas', description: `${recs.length} sugerencias de objetivos` });
    },
    onError: (e: any) => {
      setIsGenerating(false);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const saveRecommendation = async (rec: any, status: string) => {
    await supabase.from('ai_recommendations').insert({
      category: 'objetivo',
      title: rec.title,
      description: rec.description,
      estimated_impact: rec.impact,
      recommended_action: `Actual: ${rec.current_value} → Sugerido: ${rec.suggested_value}`,
      data_source: rec.reasoning,
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      metadata: rec,
    });
    queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    setRecommendations(prev => prev.filter(r => r.title !== rec.title));
    toast({ title: status === 'aceptada' ? 'Aceptada' : 'Ignorada' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Recomendaciones IA de Objetivos</h3>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generar recomendaciones
        </Button>
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Nuevas sugerencias</h4>
          {recommendations.map((rec, i) => (
            <Card key={i} className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{rec.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="font-medium">Valor actual:</span> {rec.current_value}</div>
                  <div><span className="font-medium">Sugerido:</span> {rec.suggested_value}</div>
                </div>
                <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                <div className="text-xs"><span className="font-medium">Impacto:</span> {rec.impact}</div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs" onClick={() => saveRecommendation(rec, 'aceptada')}>Aceptar</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveRecommendation(rec, 'revisada')}>Modificar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => saveRecommendation(rec, 'ignorada')}>Ignorar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(savedRecs || []).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Historial de recomendaciones</h4>
          {(savedRecs || []).map((rec: any) => (
            <RecommendationCard
              key={rec.id}
              title={rec.title}
              description={rec.description}
              category="Objetivo"
              status={rec.status}
              estimatedImpact={rec.estimated_impact}
              recommendedAction={rec.recommended_action}
              dataSource={rec.data_source}
              showActions={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
