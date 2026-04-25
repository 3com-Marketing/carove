import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Settings, CalendarClock, FileText, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getTaxModels, updateTaxModelActive, getTaxModelPeriods } from '@/lib/supabase-api';
import { AEAT_URLS } from '@/lib/tax-export';
import { TaxModelConfigDialog } from '@/components/accounting/TaxModelConfigDialog';
import type { TaxModel, TaxModelPeriod } from '@/lib/types';

// Fiscal deadlines
function getNextDeadline(model: TaxModel, now: Date): { label: string; date: Date; daysLeft: number } | null {
  const year = now.getFullYear();
  if (model.period_type === 'trimestral') {
    const deadlines = [
      { q: 1, label: `T1 ${year}`, date: new Date(year, 3, 20) },
      { q: 2, label: `T2 ${year}`, date: new Date(year, 6, 20) },
      { q: 3, label: `T3 ${year}`, date: new Date(year, 9, 20) },
      { q: 4, label: `T4 ${year}`, date: new Date(year + 1, 0, 30) },
    ];
    const next = deadlines.find(d => d.date > now);
    if (!next) return null;
    const daysLeft = Math.ceil((next.date.getTime() - now.getTime()) / 86400000);
    return { label: next.label, date: next.date, daysLeft };
  }
  // Annual
  const annualDeadline = new Date(year, 6, 25); // July 25
  if (annualDeadline > now) {
    const daysLeft = Math.ceil((annualDeadline.getTime() - now.getTime()) / 86400000);
    return { label: `Anual ${year - 1}`, date: annualDeadline, daysLeft };
  }
  return null;
}

const STATUS_STYLES: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  verificado: 'bg-blue-100 text-blue-800',
  presentado: 'bg-emerald-100 text-emerald-800',
};

export default function TaxModelsPage() {
  const [configOpen, setConfigOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const now = new Date();

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['tax-models'],
    queryFn: getTaxModels,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['tax-model-periods'],
    queryFn: () => getTaxModelPeriods(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateTaxModelActive(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-models'] });
    },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const activeModels = models.filter(m => m.is_active);
  const upcomingDeadlines = activeModels
    .map(m => ({ model: m, deadline: getNextDeadline(m, now) }))
    .filter(d => d.deadline && d.deadline.daysLeft <= 90)
    .sort((a, b) => (a.deadline!.daysLeft - b.deadline!.daysLeft))
    .slice(0, 4);

  // Get current period status for each active model
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  function getPeriodStatus(model: TaxModel): TaxModelPeriod | undefined {
    return periods.find(p =>
      p.tax_model_id === model.id &&
      p.year === currentYear &&
      (model.period_type === 'anual' ? p.quarter === null : p.quarter === currentQuarter)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impuestos</h1>
          <p className="text-sm text-muted-foreground">Gestión de modelos fiscales y obligaciones tributarias</p>
        </div>
        <Button variant="outline" onClick={() => setConfigOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Configurar
        </Button>
      </div>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Próximos vencimientos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {upcomingDeadlines.map(({ model, deadline }) => (
              <Card
                key={model.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/accounting/taxes/${model.model_code}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{model.model_code}</p>
                      <p className="text-xs text-muted-foreground truncate">{model.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={deadline!.daysLeft <= 15 ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-amber-50 text-amber-700 border-amber-200'}
                    >
                      {deadline!.daysLeft}d
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {deadline!.label} · Límite {deadline!.date.toLocaleDateString('es-ES')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active models table */}
      {activeModels.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Configura tus modelos fiscales</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Activa los formularios tributarios que apliquen a tu empresa.
            </p>
            <Button onClick={() => setConfigOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar modelos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Impuestos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Modelo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-28">Periodo</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="w-20">AEAT</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeModels.map(model => {
                  const period = getPeriodStatus(model);
                  const status = period?.status || 'pendiente';
                  const aeatInfo = AEAT_URLS[model.model_code];
                  return (
                    <TableRow
                      key={model.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/accounting/taxes/${model.model_code}`)}
                    >
                      <TableCell className="font-bold tabular-nums">{model.model_code}</TableCell>
                      <TableCell className="text-sm">{model.description}</TableCell>
                      <TableCell>
                        <span className="text-xs capitalize">{model.period_type}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[status]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {aeatInfo && (
                          <a
                            href={aeatInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                            onClick={(e) => e.stopPropagation()}
                            title={aeatInfo.label}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TaxModelConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        models={models}
        onToggle={(id, active) => toggleMutation.mutate({ id, active })}
        loading={toggleMutation.isPending}
      />
    </div>
  );
}
