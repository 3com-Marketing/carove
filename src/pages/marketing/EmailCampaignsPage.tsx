import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Mail, Users, Pencil, Copy, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContactListDialog } from '@/components/marketing/ContactListDialog';
import { ContactListMembersDialog } from '@/components/marketing/ContactListMembersDialog';
import { EmailCampaignEditor } from '@/components/marketing/EmailCampaignEditor';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  ready: { label: 'Lista', variant: 'default' },
  sent_mock: { label: 'Enviada (sim.)', variant: 'outline' },
};

export default function EmailCampaignsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [listDialog, setListDialog] = useState<{ open: boolean; list?: any }>({ open: false });
  const [membersDialog, setMembersDialog] = useState<{ open: boolean; list?: any }>({ open: false });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  const { data: lists = [] } = useQuery({
    queryKey: ['email-contact-lists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_contact_lists').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ['email-list-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_contact_list_members').select('list_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((m: any) => { counts[m.list_id] = (counts[m.list_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_contact_lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-contact-lists'] }); toast.success('Lista eliminada'); },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-campaigns'] }); toast.success('Campaña eliminada'); },
  });

  const duplicateCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { id, created_at, updated_at, ...rest } = campaign;
      const { error } = await supabase.from('email_campaigns').insert({ ...rest, name: `${rest.name} (copia)`, status: 'draft', user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-campaigns'] }); toast.success('Campaña duplicada'); },
  });

  const getListName = (listId: string | null) => {
    if (!listId) return '—';
    const list = lists.find((l: any) => l.id === listId);
    return list?.name || '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
        <p className="text-muted-foreground text-sm">Maqueta y gestiona campañas de email organizadas por listas de contactos</p>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2"><Mail className="h-4 w-4" />Campañas</TabsTrigger>
          <TabsTrigger value="lists" className="gap-2"><Users className="h-4 w-4" />Listas de Contactos</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCampaign(null); setEditorOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Nueva Campaña
            </Button>
          </div>
          {campaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No hay campañas aún. Crea la primera.</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Lista destino</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c: any) => {
                    const st = statusConfig[c.status] || statusConfig.draft;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{getListName(c.list_id)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{c.subject || '—'}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-xs">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingCampaign(c); setEditorOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateCampaign.mutate(c)}><Copy className="h-4 w-4 mr-2" />Duplicar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteCampaign.mutate(c.id)}><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setListDialog({ open: true })}><Plus className="h-4 w-4 mr-2" />Nueva Lista</Button>
          </div>
          {lists.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No hay listas aún. Crea la primera.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lists.map((l: any) => (
                <Card key={l.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: l.color }} />
                  <CardContent className="pt-5 pl-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{l.name}</h3>
                        {l.description && <p className="text-xs text-muted-foreground mt-1">{l.description}</p>}
                        <p className="text-sm text-muted-foreground mt-2">
                          <Users className="h-3.5 w-3.5 inline mr-1" />{memberCounts[l.id] || 0} contactos
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setMembersDialog({ open: true, list: l })}><Eye className="h-4 w-4 mr-2" />Ver miembros</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setListDialog({ open: true, list: l })}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteList.mutate(l.id)}><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContactListDialog
        open={listDialog.open}
        list={listDialog.list}
        onOpenChange={(open) => setListDialog({ open })}
      />
      {membersDialog.list && (
        <ContactListMembersDialog
          open={membersDialog.open}
          list={membersDialog.list}
          onOpenChange={(open) => setMembersDialog({ open })}
        />
      )}
      <EmailCampaignEditor
        open={editorOpen}
        campaign={editingCampaign}
        lists={lists}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}
