import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  list: any;
  onOpenChange: (open: boolean) => void;
}

export function ContactListMembersDialog({ open, list, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['email-list-members', list?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_contact_list_members').select('*').eq('list_id', list.id).order('added_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!list?.id && open,
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ['buyers-with-email', search],
    queryFn: async () => {
      let q = supabase.from('buyers').select('id, name, last_name, email, company_name').not('email', 'is', null).neq('email', '').eq('active', true);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
      const { data, error } = await q.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: showImport && open,
  });

  const addMember = useMutation({
    mutationFn: async (params: { email: string; name: string; buyer_id?: string }) => {
      const existing = members.find((m: any) => m.email === params.email);
      if (existing) throw new Error('Ya existe');
      const { error } = await supabase.from('email_contact_list_members').insert({ list_id: list.id, ...params });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-list-members', list.id] });
      qc.invalidateQueries({ queryKey: ['email-list-member-counts'] });
      toast.success('Contacto añadido');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_contact_list_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-list-members', list.id] });
      qc.invalidateQueries({ queryKey: ['email-list-member-counts'] });
      toast.success('Contacto eliminado');
    },
  });

  const handleAddManual = () => {
    if (!manualEmail.trim()) return;
    addMember.mutate({ email: manualEmail.trim(), name: manualName.trim() });
    setManualName(''); setManualEmail(''); setShowManual(false);
  };

  const existingEmails = new Set(members.map((m: any) => m.email));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: list.color }} />
            {list.name} — Miembros ({members.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowImport(!showImport); setShowManual(false); }}>
            <UserPlus className="h-4 w-4 mr-1" />Importar clientes
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowManual(!showManual); setShowImport(false); }}>
            <Plus className="h-4 w-4 mr-1" />Añadir manual
          </Button>
        </div>

        {showImport && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="flex gap-2">
              <Search className="h-4 w-4 mt-2.5 text-muted-foreground" />
              <Input placeholder="Buscar cliente por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {buyers.filter((b: any) => !existingEmails.has(b.email)).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm">
                  <span>{b.company_name || `${b.name} ${b.last_name || ''}`} — <span className="text-muted-foreground">{b.email}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => addMember.mutate({ email: b.email!, name: b.company_name || `${b.name} ${b.last_name || ''}`.trim(), buyer_id: b.id })}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {buyers.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>}
            </div>
          </div>
        )}

        {showManual && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Nombre</Label><Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nombre" /></div>
              <div><Label className="text-xs">Email *</Label><Input type="email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="email@ejemplo.com" /></div>
            </div>
            <Button size="sm" onClick={handleAddManual} disabled={!manualEmail.trim()}>Añadir</Button>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Sin miembros. Importa clientes o añade contactos manualmente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name || '—'}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell><Badge variant={m.buyer_id ? 'default' : 'secondary'}>{m.buyer_id ? 'Cliente' : 'Manual'}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
