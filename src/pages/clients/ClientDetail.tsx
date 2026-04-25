import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBuyerById, getBuyerSalesHistory, getBuyerInvoices, updateBuyer, getAcquisitionChannels, getActivitiesByBuyer, getDemandsByBuyer } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, User, ShoppingCart, FileText, LinkIcon, Power, Phone, Target } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/constants';
import { ClientDialog } from '@/components/clients/ClientDialog';
import { useToast } from '@/hooks/use-toast';
import { ActivityTimeline } from '@/components/commercial/ActivityTimeline';
import { QuickActivityButtons } from '@/components/commercial/QuickActivityButtons';
import { DemandDialog } from '@/components/demands/DemandDialog';
import { DEMAND_STATUS_LABELS, INTENTION_LEVEL_LABELS } from '@/lib/types';

const INVOICE_STATUS_COLORS: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  emitida: 'bg-primary/10 text-primary',
  anulada: 'bg-destructive/10 text-destructive',
  rectificada: 'bg-amber-100 text-amber-800',
};

const VAT_LABELS: Record<string, string> = { general: 'General', rebu: 'REBU', exento: 'Exento' };

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);

  const { data: buyer, isLoading, refetch } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => getBuyerById(id!),
    enabled: !!id,
  });

  const { data: salesHistory = [] } = useQuery({
    queryKey: ['buyer-sales', id],
    queryFn: () => getBuyerSalesHistory(id!),
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['buyer-invoices', id],
    queryFn: () => getBuyerInvoices(id!),
    enabled: !!id,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['acquisition-channels'],
    queryFn: getAcquisitionChannels,
  });

  const { data: activityCount = 0, refetch: refetchActivities } = useQuery({
    queryKey: ['buyer-activities-count', id],
    queryFn: async () => {
      const data = await getActivitiesByBuyer(id!);
      return data.length;
    },
    enabled: !!id,
  });

  const { data: demands = [], refetch: refetchDemands } = useQuery({
    queryKey: ['buyer-demands', id],
    queryFn: () => getDemandsByBuyer(id!),
    enabled: !!id,
  });

  // Linked vehicles (purchases as buyer via sales)
  const { data: linkedVehicles = [] } = useQuery({
    queryKey: ['buyer-vehicles', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('vehicle_id, sale_date, sale_price')
        .eq('buyer_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Vehicles where this client is the owner/seller (owner_client_id)
  const { data: ownedVehicles = [] } = useQuery({
    queryKey: ['buyer-owned-vehicles', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('id, plate, brand, model, status')
        .eq('owner_client_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ['profile', buyer?.created_by],
    queryFn: async () => {
      if (!buyer?.created_by) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', buyer.created_by).maybeSingle();
      return data;
    },
    enabled: !!buyer?.created_by,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!buyer) return <div className="p-8 text-center text-muted-foreground">Cliente no encontrado</div>;

  const channelName = channels.find(c => c.id === buyer.acquisition_channel_id)?.name;
  const displayName = buyer.client_type === 'profesional'
    ? (buyer.company_name || buyer.name)
    : [buyer.name, buyer.last_name].filter(Boolean).join(' ');

  const hasOperations = salesHistory.length > 0 || invoices.length > 0;

  const handleToggleActive = async () => {
    try {
      await updateBuyer(buyer.id, { active: !buyer.active } as any);
      toast({ title: buyer.active ? 'Cliente desactivado' : 'Cliente activado' });
      refetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline">{buyer.client_type === 'profesional' ? 'Profesional' : 'Particular'}</Badge>
            {buyer.is_buyer && <Badge variant="secondary">Comprador</Badge>}
            {buyer.is_seller && <Badge variant="secondary">Vendedor</Badge>}
            <Badge variant={buyer.active ? 'default' : 'destructive'}>
              {buyer.active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleToggleActive}>
          <Power className="h-4 w-4 mr-2" />
          {buyer.active ? 'Desactivar' : 'Activar'}
        </Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos" className="gap-1.5"><User className="h-4 w-4" /> Datos</TabsTrigger>
          <TabsTrigger value="relaciones" className="gap-1.5"><LinkIcon className="h-4 w-4" /> Relaciones</TabsTrigger>
          <TabsTrigger value="compras" className="gap-1.5"><ShoppingCart className="h-4 w-4" /> Compras ({salesHistory.length})</TabsTrigger>
          <TabsTrigger value="facturas" className="gap-1.5"><FileText className="h-4 w-4" /> Facturas ({invoices.length})</TabsTrigger>
          <TabsTrigger value="actividad" className="gap-1.5"><Phone className="h-4 w-4" /> Actividad ({activityCount})</TabsTrigger>
          <TabsTrigger value="demandas" className="gap-1.5"><Target className="h-4 w-4" /> Demandas ({demands.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <div className="grid gap-4">
            <Card>
              <CardHeader><CardTitle>Datos del cliente</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buyer.client_type === 'particular' ? (
                    <>
                      <Field label="Nombre" value={buyer.name} />
                      <Field label="Apellidos" value={buyer.last_name} />
                      <Field label="DNI" value={buyer.dni} />
                      <Field label="Dirección" value={buyer.address} />
                    </>
                  ) : (
                    <>
                      <Field label="Razón social" value={buyer.company_name} />
                      <Field label="CIF" value={buyer.cif} />
                      <Field label="Nombre contacto" value={buyer.contact_name} />
                      <Field label="Régimen IVA" value={buyer.vat_regime ? VAT_LABELS[buyer.vat_regime] : null} />
                      <Field label="Dirección fiscal" value={buyer.fiscal_address} />
                    </>
                  )}
                  <Field label="Teléfono" value={buyer.phone} />
                  <Field label="Email" value={buyer.email} />
                  <Field label="Ciudad" value={buyer.city} />
                  <Field label="C.P." value={buyer.postal_code} />
                  <Field label="Provincia" value={buyer.province} />
                  <Field label="IBAN" value={buyer.iban} />
                  <Field label="Canal de captación" value={channelName} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Control interno</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Fecha de creación" value={formatDate(buyer.created_at)} />
                  <Field label="Creado por" value={creatorProfile?.full_name || '—'} />
                  <Field label="Último cambio de tipo" value={buyer.type_changed_at ? formatDate(buyer.type_changed_at) : 'Nunca'} />
                  <Field label="Estado" value={buyer.active ? 'Activo' : 'Inactivo'} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relaciones">
          <div className="space-y-4">
            {/* Vehículos como propietario/vendedor */}
            <Card>
              <CardHeader><CardTitle>Vehículos como propietario / vendedor</CardTitle></CardHeader>
              <CardContent>
                {ownedVehicles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin vehículos como propietario</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ownedVehicles.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell>
                            <Link to={`/vehicles/${v.id}`} className="text-primary hover:underline font-mono text-xs">
                              {v.plate}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{v.brand} {v.model}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{v.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Vehículos comprados */}
            <Card>
              <CardHeader><CardTitle>Vehículos comprados</CardTitle></CardHeader>
              <CardContent>
                {linkedVehicles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin vehículos comprados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehículo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedVehicles.map((v: any) => (
                        <TableRow key={v.vehicle_id}>
                          <TableCell>
                            <Link to={`/vehicles/${v.vehicle_id}`} className="text-primary hover:underline">
                              Ver vehículo
                            </Link>
                          </TableCell>
                          <TableCell>{formatDate(v.sale_date)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(v.sale_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compras">
          <Card>
            <CardContent className="pt-6">
              {salesHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin compras registradas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{formatDate(s.sale_date)}</TableCell>
                        <TableCell>
                          {s.vehicle ? (
                            <Link to={`/vehicles/${s.vehicle.id}`} className="text-primary hover:underline">
                              {s.vehicle.brand} {s.vehicle.model} — {s.vehicle.plate}
                            </Link>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(s.sale_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturas">
          <Card>
            <CardContent className="pt-6">
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin facturas emitidas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">IGIC</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Link to={`/invoices/${inv.id}`} className="text-primary hover:underline font-medium">
                            {inv.full_number || 'Borrador'}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(inv.issue_date)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.base_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.tax_amount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={INVOICE_STATUS_COLORS[inv.status] || ''}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actividad">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Registro rápido</CardTitle></CardHeader>
              <CardContent>
                <QuickActivityButtons buyerId={buyer.id} onSaved={() => refetchActivities()} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Cronología de actividad</CardTitle></CardHeader>
              <CardContent>
                <ActivityTimeline buyerId={buyer.id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demandas">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setDemandOpen(true)}>
                <Target className="h-4 w-4 mr-2" /> Nueva Demanda
              </Button>
            </div>
            {demands.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sin demandas registradas para este cliente
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Intención</TableHead>
                        <TableHead>Presupuesto</TableHead>
                        <TableHead>Preferencias</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demands.map(d => (
                        <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/demands/${d.id}`)}>
                          <TableCell>
                            <Badge variant="secondary">{INTENTION_LEVEL_LABELS[d.intention_level]}</Badge>
                          </TableCell>
                          <TableCell>{d.max_budget ? formatCurrency(d.max_budget) : d.price_max ? `Hasta ${formatCurrency(d.price_max)}` : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {[...d.brand_preferences, ...d.fuel_types].filter(Boolean).join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{DEMAND_STATUS_LABELS[d.status]}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
          <DemandDialog open={demandOpen} onOpenChange={setDemandOpen} buyerId={buyer.id} onSaved={() => refetchDemands()} />
        </TabsContent>
      </Tabs>

      <ClientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        buyer={buyer}
        onSaved={() => refetch()}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}
