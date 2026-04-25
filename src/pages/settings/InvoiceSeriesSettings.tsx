import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoiceSeries, createInvoiceSeries, updateInvoiceSeries } from '@/lib/supabase-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InvoiceSeries } from '@/lib/types';

export default function InvoiceSeriesSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: series = [], isLoading } = useQuery({ queryKey: ['invoice-series'], queryFn: getInvoiceSeries });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceSeries | null>(null);
  const [form, setForm] = useState({ name: '', prefix: '', year: new Date().getFullYear(), active: true, is_default: false, is_rectificativa: false });
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing(null); setForm({ name: '', prefix: '', year: new Date().getFullYear(), active: true, is_default: false, is_rectificativa: false }); setDialogOpen(true); };
  const openEdit = (s: InvoiceSeries) => { setEditing(s); setForm({ name: s.name, prefix: s.prefix, year: s.year, active: s.active, is_default: s.is_default, is_rectificativa: s.is_rectificativa }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateInvoiceSeries(editing.id, form);
      } else {
        await createInvoiceSeries(form);
      }
      qc.invalidateQueries({ queryKey: ['invoice-series'] });
      setDialogOpen(false);
      toast({ title: editing ? '✅ Serie actualizada' : '✅ Serie creada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Series de Facturación</h1>
          <p className="text-sm text-muted-foreground">Gestión de series de numeración</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva serie</Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Último Nº</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono">{s.prefix}</TableCell>
                  <TableCell>{s.year}</TableCell>
                  <TableCell className="font-mono">{s.current_number}</TableCell>
                  <TableCell>
                    {s.is_default && <Badge className="text-[10px] mr-1">Por defecto</Badge>}
                    {s.is_rectificativa && <Badge variant="secondary" className="text-[10px]">Rectificativa</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.active ? 'default' : 'outline'} className="text-[10px]">{s.active ? 'Activa' : 'Inactiva'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar serie' : 'Nueva serie'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="A" /></div>
            <div><Label>Prefijo</Label><Input value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="A" /></div>
            <div><Label>Año</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || new Date().getFullYear() }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={c => setForm(f => ({ ...f, active: c }))} /><Label>Activa</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_default} onCheckedChange={c => setForm(f => ({ ...f, is_default: c }))} /><Label>Serie por defecto</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_rectificativa} onCheckedChange={c => setForm(f => ({ ...f, is_rectificativa: c }))} /><Label>Serie rectificativa</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.prefix.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
