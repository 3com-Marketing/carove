import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getBuyerById } from '@/lib/supabase-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User, ExternalLink, X, Search } from 'lucide-react';

interface OwnerCardProps {
  ownerClientId: string | null;
  editing: boolean;
  onOwnerChange: (id: string | null) => void;
}

export function OwnerCard({ ownerClientId, editing, onOwnerChange }: OwnerCardProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: owner } = useQuery({
    queryKey: ['buyer', ownerClientId],
    queryFn: () => getBuyerById(ownerClientId!),
    enabled: !!ownerClientId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['buyers-search', search],
    queryFn: async () => {
      let q = supabase.from('buyers').select('id, name, last_name, company_name, client_type, dni, cif').eq('active', true).limit(20);
      if (search.trim()) {
        q = q.or(`name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%,dni.ilike.%${search}%,cif.ilike.%${search}%`);
      }
      const { data } = await q;
      return data || [];
    },
    enabled: editing,
  });

  const displayName = owner
    ? owner.client_type === 'profesional'
      ? (owner.company_name || owner.name)
      : [owner.name, owner.last_name].filter(Boolean).join(' ')
    : null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Propietario / Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  <Search className="h-3 w-3 mr-2" />
                  {displayName || 'Seleccionar propietario...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-72" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar cliente..." value={search} onValueChange={setSearch} />
                  <CommandList>
                    <CommandEmpty>Sin resultados</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c: any) => {
                        const name = c.client_type === 'profesional'
                          ? (c.company_name || c.name)
                          : [c.name, c.last_name].filter(Boolean).join(' ');
                        return (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={() => { onOwnerChange(c.id); setOpen(false); }}
                          >
                            <span className="text-xs">{name}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {c.client_type === 'profesional' ? 'Prof.' : 'Part.'}
                            </Badge>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {ownerClientId && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => onOwnerChange(null)}>
                <X className="h-3 w-3 mr-1" /> Quitar propietario
              </Button>
            )}
          </div>
        ) : owner ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              <Badge variant="outline" className="text-[10px]">
                {owner.client_type === 'profesional' ? 'Profesional' : 'Particular'}
              </Badge>
            </div>
            {(owner.dni || owner.cif) && (
              <p className="text-xs text-muted-foreground">{owner.client_type === 'profesional' ? owner.cif : owner.dni}</p>
            )}
            <Link to={`/clients/${owner.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Ver ficha <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">Sin propietario asignado</p>
        )}
      </CardContent>
    </Card>
  );
}
