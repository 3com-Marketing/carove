import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, ChevronRight, ArrowLeft, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getFinanceEntities, getFinanceProducts,
  getFinanceTermModels, createFinanceTermModel, updateFinanceTermModel, deleteFinanceTermModel,
  upsertTermModelsFromImport,
} from '@/lib/supabase-api';
import { TermModelDialog } from '@/components/financing/TermModelDialog';
import { ExcelImporter } from '@/components/financing/ExcelImporter';

export default function FinancingModelsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get('product_id');

  const { data: entities = [] } = useQuery({ queryKey: ['finance-entities'], queryFn: getFinanceEntities });
  const { data: products = [] } = useQuery({ queryKey: ['finance-products'], queryFn: getFinanceProducts });
  const { data: termModels = [], isLoading } = useQuery({ queryKey: ['finance-term-models'], queryFn: getFinanceTermModels });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showGlobal, setShowGlobal] = useState(!productIdParam);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['finance-entities'] });
    qc.invalidateQueries({ queryKey: ['finance-products'] });
    qc.invalidateQueries({ queryKey: ['finance-term-models'] });
  };

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateFinanceTermModel(editing.id, data);
      } else {
        await createFinanceTermModel(data);
      }
      invalidateAll();
      toast({ title: '✅ Modelo guardado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await updateFinanceTermModel(id, { active });
      invalidateAll();
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFinanceTermModel(id);
      invalidateAll();
      toast({ title: '🗑️ Modelo eliminado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleImport = async (rows: any[]) => {
    return await upsertTermModelsFromImport(rows, entities, products);
  };

  const product = productIdParam ? products.find((p: any) => p.id === productIdParam) : null;
  const entity = product ? entities.find((e: any) => e.id === product.entity_id) : null;

  const isFiltered = productIdParam && !showGlobal;
  const displayModels = isFiltered
    ? termModels.filter((m: any) => m.product_id === productIdParam)
    : termModels;

  const productsWithEntity = products.map((p: any) => ({
    ...p,
    entity_name: entities.find((e: any) => e.id === p.entity_id)?.name || '',
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground" onClick={() => navigate('/settings/financing')}>
          Financiación
        </Button>
        {entity && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground" onClick={() => navigate(`/settings/financing/productos?entity_id=${entity.id}`)}>
              {entity.name}
            </Button>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{product?.name || 'Modelos'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isFiltered ? `Modelos — ${product?.name}` : 'Todos los Modelos por Plazo'}
          </h1>
          {isFiltered && (
            <p className="text-sm text-muted-foreground">
              {displayModels.length} modelo{displayModels.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {productIdParam && (
            <Button
              variant={showGlobal ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGlobal(!showGlobal)}
            >
              <Globe className="h-4 w-4 mr-1" /> {showGlobal ? 'Filtrar producto' : 'Vista global'}
            </Button>
          )}
          {entity && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/settings/financing/productos?entity_id=${entity.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver a productos
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/settings/financing')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Entidades
          </Button>
        </div>
      </div>

      <ExcelImporter onImport={handleImport} />

      <Card className="border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Modelos por Plazo</CardTitle>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={products.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isFiltered && <TableHead className="text-xs">Producto</TableHead>}
                    <TableHead className="text-xs text-right">TIN%</TableHead>
                    <TableHead className="text-xs text-right">Plazo</TableHead>
                    <TableHead className="text-xs text-right">Coeficiente</TableHead>
                    <TableHead className="text-xs text-right">% Adicional</TableHead>
                     <TableHead className="text-xs text-right">Comisión</TableHead>
                     <TableHead className="text-xs w-20">Activo</TableHead>
                     <TableHead className="text-xs w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayModels.map((m: any) => {
                    const prod = products.find((p: any) => p.id === m.product_id);
                    const ent = prod ? entities.find((e: any) => e.id === prod.entity_id) : null;
                    return (
                      <TableRow key={m.id}>
                        {!isFiltered && <TableCell className="text-xs">{ent?.name} — {prod?.name || '—'}</TableCell>}
                        <TableCell className="text-xs text-right font-mono">{m.tin}%</TableCell>
                        <TableCell className="text-xs text-right">{m.term_months} m</TableCell>
                        <TableCell className="text-xs text-right font-mono">{m.coefficient}</TableCell>
                         <TableCell className="text-xs text-right">{m.additional_rate ? `${(m.additional_rate * 100).toFixed(2)}%` : '—'}</TableCell>
                         <TableCell className="text-xs text-right">
                           {m.commission_percent != null
                             ? <span className="font-mono">{m.commission_percent}%</span>
                             : <span className="text-muted-foreground">↑ producto ({prod?.commission_percent ?? 2}%)</span>
                           }
                         </TableCell>
                         <TableCell><Switch checked={m.active} onCheckedChange={v => handleToggle(m.id, v)} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7" onClick={() => { setEditing(m); setDialogOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>¿Eliminar modelo?</AlertDialogTitle><AlertDialogDescription>No se podrá eliminar si tiene simulaciones asociadas.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(m.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {displayModels.length === 0 && (
                    <TableRow>
                     <TableCell colSpan={isFiltered ? 7 : 8} className="text-center text-muted-foreground py-8">
                         Sin modelos configurados
                       </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TermModelDialog open={dialogOpen} onOpenChange={setDialogOpen} model={editing} products={productsWithEntity} onSave={handleSave} />
    </div>
  );
}
