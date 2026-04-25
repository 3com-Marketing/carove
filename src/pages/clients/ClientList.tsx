import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getBuyers, getAcquisitionChannels } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users } from 'lucide-react';
import { ClientDialog } from '@/components/clients/ClientDialog';

export default function ClientList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');

  const { data: buyers = [], refetch } = useQuery({ queryKey: ['buyers'], queryFn: getBuyers });
  const { data: channels = [] } = useQuery({ queryKey: ['acquisition-channels'], queryFn: getAcquisitionChannels });

  const { data: salesCounts = {} } = useQuery({
    queryKey: ['buyer-sales-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('sales').select('buyer_id');
      const counts: Record<string, number> = {};
      (data || []).forEach(s => { counts[s.buyer_id] = (counts[s.buyer_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: invoiceCounts = {} } = useQuery({
    queryKey: ['buyer-invoice-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('buyer_id').neq('status', 'anulada');
      const counts: Record<string, number> = {};
      (data || []).forEach(i => { counts[i.buyer_id] = (counts[i.buyer_id] || 0) + 1; });
      return counts;
    },
  });

  const channelMap = useMemo(() => {
    const m: Record<string, string> = {};
    channels.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [channels]);

  const filtered = useMemo(() => {
    let list = buyers;

    // Status filter
    if (filterStatus === 'active') list = list.filter(b => (b as any).active !== false);
    else if (filterStatus === 'inactive') list = list.filter(b => (b as any).active === false);

    // Type filter
    if (filterType !== 'all') list = list.filter(b => (b as any).client_type === filterType);

    // Role filter
    if (filterRole === 'buyer') list = list.filter(b => (b as any).is_buyer);
    else if (filterRole === 'seller') list = list.filter(b => (b as any).is_seller);

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.dni && b.dni.toLowerCase().includes(q)) ||
        ((b as any).last_name && (b as any).last_name.toLowerCase().includes(q)) ||
        ((b as any).company_name && (b as any).company_name.toLowerCase().includes(q)) ||
        ((b as any).cif && (b as any).cif.toLowerCase().includes(q))
      );
    }
    return list;
  }, [buyers, search, filterType, filterRole, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Clientes
          </h1>
          <p className="text-sm text-muted-foreground">{buyers.length} clientes registrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo cliente
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar nombre, DNI, CIF, razón social..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="particular">Particular</SelectItem>
            <SelectItem value="profesional">Profesional</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="buyer">Comprador</SelectItem>
            <SelectItem value="seller">Vendedor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>DNI/CIF</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-center">Compras</TableHead>
              <TableHead className="text-center">Facturas</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(b => {
                const bx = b as any;
                const displayName = bx.client_type === 'profesional'
                  ? (bx.company_name || b.name)
                  : [b.name, bx.last_name].filter(Boolean).join(' ');
                const doc = bx.client_type === 'profesional' ? bx.cif : b.dni;
                return (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/clients/${b.id}`)}
                  >
                    <TableCell className="font-medium">{displayName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {bx.client_type === 'profesional' ? 'Prof.' : 'Part.'}
                      </Badge>
                    </TableCell>
                    <TableCell>{doc || '—'}</TableCell>
                    <TableCell>{b.phone || '—'}</TableCell>
                    <TableCell>{bx.acquisition_channel_id ? (channelMap[bx.acquisition_channel_id] || '—') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {bx.is_buyer && <Badge variant="secondary" className="text-xs">C</Badge>}
                        {bx.is_seller && <Badge variant="secondary" className="text-xs">V</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{salesCounts[b.id] || 0}</TableCell>
                    <TableCell className="text-center">{invoiceCounts[b.id] || 0}</TableCell>
                    <TableCell>
                      <Badge variant={bx.active !== false ? 'default' : 'destructive'} className="text-xs">
                        {bx.active !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => refetch()}
      />
    </div>
  );
}
