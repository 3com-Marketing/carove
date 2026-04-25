import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NewModuleRequestDialog } from '@/components/modules/NewModuleRequestDialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Clock, CheckCircle2, XCircle, Eye, FlaskConical, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ModuleRequest {
  id: string;
  title: string;
  summary: string;
  complexity: string;
  budget_min: number;
  budget_max: number;
  timeline: string | null;
  conversation: { role: string; content: string }[];
  status: string;
  requested_by_name: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  aprobado: { label: 'Aprobado', variant: 'default', icon: CheckCircle2 },
  rechazado: { label: 'Rechazado', variant: 'destructive', icon: XCircle },
};

const DEMO_REQUESTS: ModuleRequest[] = [
  {
    id: 'demo-1',
    title: 'Módulo de facturación con integración Holded',
    summary: 'Sistema de facturación integrado con Holded para automatizar la generación de facturas de venta de vehículos, control de cobros y exportación contable.',
    complexity: 'L',
    budget_min: 8500,
    budget_max: 16000,
    timeline: '5-7 semanas',
    conversation: [
      { role: 'user', content: 'Necesitamos un módulo de facturación que se conecte con Holded.' },
      { role: 'assistant', content: '¡Perfecto! Un módulo de **Facturación** con integración Holded. Déjame hacerte unas preguntas:\n\n1. ¿Qué tipo de facturas generáis? (venta, proforma, abono)\n2. ¿Cuántas facturas al mes aprox.?\n3. ¿Necesitáis control de cobros/pagos?' },
      { role: 'user', content: 'Facturas de venta y proforma. Unas 80-100 al mes. Sí, necesitamos control de cobros.' },
      { role: 'assistant', content: '## Propuesta: Módulo de Facturación\n\n**Alcance v1:**\n- Generación automática de facturas de venta y proforma\n- Integración bidireccional con Holded\n- Control de cobros con estados\n- Dashboard de facturación\n\n**Complejidad:** L (Complejo)\n\n**Presupuesto:** 8.500–16.000 €\n- Base módulo L: 6.500–15.000 €\n- Integración API Holded: +1.500–3.000 €\n- Dashboard analítica: +700–1.500 €\n\n**Plazo:** 5-7 semanas' },
    ],
    status: 'aprobado',
    requested_by_name: 'Carlos Méndez',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'CRM básico para gestión de leads',
    summary: 'CRM ligero para captar y gestionar leads de compradores potenciales, con seguimiento de contactos y pipeline de ventas.',
    complexity: 'M',
    budget_min: 3000,
    budget_max: 7000,
    timeline: '3-4 semanas',
    conversation: [
      { role: 'user', content: 'Quiero un CRM sencillo para gestionar los leads que nos llegan por la web y redes.' },
      { role: 'assistant', content: 'Entendido, un **CRM de leads**. Algunas preguntas:\n\n1. ¿De dónde llegan los leads? (formulario web, WhatsApp, email, redes)\n2. ¿Cuántos leads gestionáis al mes?\n3. ¿Necesitáis un pipeline visual tipo Kanban?' },
      { role: 'user', content: 'Llegan por formulario web y WhatsApp. Unos 50-70 al mes. Sí, un Kanban estaría genial.' },
      { role: 'assistant', content: '## Propuesta: CRM de Leads\n\n**Alcance v1:**\n- Captura de leads desde formulario web\n- Pipeline Kanban con estados personalizables\n- Ficha de contacto con historial\n- Notificaciones por email\n\n**Complejidad:** M (Medio)\n\n**Presupuesto:** 3.000–7.000 €\n- Base módulo M: 2.500–6.500 €\n- Integración webhook formularios: +400–800 €\n\n**Plazo:** 3-4 semanas' },
    ],
    status: 'pendiente',
    requested_by_name: 'Ana García',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Automatización de alertas de ITV y garantías',
    summary: 'Sistema de alertas automáticas para vencimientos de ITV, garantías y seguros, con notificaciones por email y WhatsApp.',
    complexity: 'S',
    budget_min: 1200,
    budget_max: 2800,
    timeline: '1-2 semanas',
    conversation: [
      { role: 'user', content: 'Se nos pasan las fechas de ITV y garantías. Necesito alertas automáticas.' },
      { role: 'assistant', content: '## Propuesta: Alertas Automáticas\n\n**Alcance v1:**\n- Alertas por vencimiento de ITV, garantía y seguro\n- Notificaciones por email\n- Panel de vencimientos próximos\n\n**Complejidad:** S (Simple)\n\n**Presupuesto:** 1.200–2.800 €\n\n**Plazo:** 1-2 semanas' },
    ],
    status: 'rechazado',
    requested_by_name: 'Pedro López',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ModuleRequestsList() {
  const [selectedRequest, setSelectedRequest] = useState<ModuleRequest | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['module-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ModuleRequest[];
    },
  });

  const displayedRequests = demoMode ? DEMO_REQUESTS : requests;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Módulos</h1>
          <p className="text-muted-foreground text-sm">Historial de módulos solicitados a través del asistente IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="demo-mode" className="text-sm text-muted-foreground cursor-pointer">Demo</Label>
            <Switch id="demo-mode" checked={demoMode} onCheckedChange={setDemoMode} />
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowNewDialog(true)}>
            <PlusCircle className="h-4 w-4" />
            Solicitar nuevo
          </Button>
        </div>
      </div>

      {isLoading && !demoMode ? (
        <div className="text-center py-12 text-muted-foreground">Cargando solicitudes...</div>
      ) : displayedRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No hay solicitudes todavía.</p>
            <p className="text-xs text-muted-foreground mt-1">Usa el asistente IA para solicitar un nuevo módulo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayedRequests.map((req) => {
            const cfg = statusConfig[req.status] || statusConfig.pendiente;
            const StatusIcon = cfg.icon;
            return (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={cfg.variant} className="gap-1 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                        {req.complexity && (
                          <Badge variant="outline" className="text-xs">
                            {req.complexity}
                          </Badge>
                        )}
                        {(req.budget_min > 0 || req.budget_max > 0) && (
                          <Badge variant="outline" className="text-xs">
                            {req.budget_min.toLocaleString('es-ES')}–{req.budget_max.toLocaleString('es-ES')} €
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-sm truncate">{req.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.summary.slice(0, 200)}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{req.requested_by_name}</span>
                        <span>·</span>
                        <span>{format(new Date(req.created_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 gap-1.5"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Conversation detail dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedRequest?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {selectedRequest?.conversation?.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <NewModuleRequestDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
