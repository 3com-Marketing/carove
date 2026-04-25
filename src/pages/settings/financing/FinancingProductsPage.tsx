import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, ChevronRight, ArrowLeft, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getFinanceEntities, getFinanceProducts, createFinanceProduct, updateFinanceProduct, deleteFinanceProduct,
  getFinanceTermModels,
} from '@/lib/supabase-api';
import { ProductDialog } from '@/components/financing/ProductDialog';

export default function FinancingProductsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entityIdParam = searchParams.get('entity_id');

  const { data: entities = [] } = useQuery({ queryKey: ['finance-entities'], queryFn: getFinanceEntities });
  const { data: products = [], isLoading } = useQuery({ queryKey: ['finance-products'], queryFn: getFinanceProducts });
  const { data: termModels = [] } = useQuery({ queryKey: ['finance-term-models'], queryFn: getFinanceTermModels });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterEntity, setFilterEntity] = useState(entityIdParam || '_all');

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['finance-entities'] });
    qc.invalidateQueries({ queryKey: ['finance-products'] });
    qc.invalidateQueries({ queryKey: ['finance-term-models'] });
  };

  const handleSave = async (data: { name: string; entity_id: string; commission_percent: number }) => {
    try {
      if (editing) {
        await updateFinanceProduct(editing.id, data);
      } else {
        await createFinanceProduct(data);
      }
      invalidateAll();
      toast({ title: '✅ Producto guardado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await updateFinanceProduct(id, { active });
      invalidateAll();
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFinanceProduct(id);
      invalidateAll();
      toast({ title: '🗑️ Producto eliminado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const activeEntityId = entityIdParam || (filterEntity !== '_all' ? filterEntity : null);
  const entity = activeEntityId ? entities.find((e: any) => e.id === activeEntityId) : null;
  const filteredProducts = activeEntityId ? products.filter((p: any) => p.entity_id === activeEntityId) : products;

  const getModelCount = (productId: string) => termModels.filter((m: any) => m.product_id === productId).length;
  const totalModels = activeEntityId
    ? termModels.filter((m: any) => filteredProducts.some((p: any) => p.id === m.product_id)).length
    : termModels.length;

  // For ProductDialog: pre-select entity when drilling down
  const handleNewProduct = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground" onClick={() => navigate('/settings/financing')}>
          Financiación
        </Button>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">{entity?.name || 'Productos'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {entity ? entity.name : 'Productos Financieros'}
          </h1>
          {entity && (
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} · {totalModels} modelos
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/settings/financing')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a entidades
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm">Productos</CardTitle>
            {!entityIdParam && (
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Filtrar por entidad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas las entidades</SelectItem>
                  {entities.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button size="sm" onClick={handleNewProduct} disabled={entities.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  {!activeEntityId && <TableHead>Entidad</TableHead>}
                  <TableHead className="text-right">Comisión %</TableHead>
                  <TableHead className="text-right">Nº Modelos</TableHead>
                  <TableHead className="w-20">Activo</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    {!activeEntityId && <TableCell className="text-xs">{entities.find((e: any) => e.id === p.entity_id)?.name || '—'}</TableCell>}
                    <TableCell className="text-xs text-right font-mono">{p.commission_percent ?? 2}%</TableCell>
                    <TableCell className="text-right text-xs font-mono">{getModelCount(p.id)}</TableCell>
                    <TableCell><Switch checked={p.active} onCheckedChange={v => handleToggle(p.id, v)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/settings/financing/modelos?product_id=${p.id}`)}>
                          <Eye className="h-3 w-3 mr-1" /> Ver modelos
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle><AlertDialogDescription>No se podrá eliminar si tiene modelos asociados.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={activeEntityId ? 5 : 6} className="text-center text-muted-foreground py-8">
                      Sin productos configurados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        entities={entities}
        onSave={handleSave}
        defaultEntityId={entityIdParam || undefined}
      />
    </div>
  );
}
