import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIObjectiveRecommendations } from '@/components/incentives/AIObjectiveRecommendations';
import { LeadAssignmentPanel } from '@/components/incentives/LeadAssignmentPanel';
import { SalesPredictionPanel } from '@/components/incentives/SalesPredictionPanel';
import { FinanceOptimizationPanel } from '@/components/incentives/FinanceOptimizationPanel';
import { StrategicInsightsPanel } from '@/components/incentives/StrategicInsightsPanel';
import { RecommendationCenter } from '@/components/incentives/RecommendationCenter';
import { Brain } from 'lucide-react';

export default function CommercialIntelligencePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inteligencia Comercial IA</h1>
          <p className="text-sm text-muted-foreground">Recomendaciones, predicciones e insights basados en datos del CRM</p>
        </div>
      </div>

      <Tabs defaultValue="objectives" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="objectives">Objetivos</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="predictions">Predicción</TabsTrigger>
          <TabsTrigger value="finance">Financiación</TabsTrigger>
          <TabsTrigger value="strategic">Asistente</TabsTrigger>
          <TabsTrigger value="center">Centro</TabsTrigger>
        </TabsList>

        <TabsContent value="objectives"><AIObjectiveRecommendations /></TabsContent>
        <TabsContent value="leads"><LeadAssignmentPanel /></TabsContent>
        <TabsContent value="predictions"><SalesPredictionPanel /></TabsContent>
        <TabsContent value="finance"><FinanceOptimizationPanel /></TabsContent>
        <TabsContent value="strategic"><StrategicInsightsPanel /></TabsContent>
        <TabsContent value="center"><RecommendationCenter /></TabsContent>
      </Tabs>
    </div>
  );
}
