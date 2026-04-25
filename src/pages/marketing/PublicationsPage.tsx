import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Instagram, CalendarDays, List, Settings2 } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  addMonths, subMonths, isSameMonth, isSameDay, isToday, getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PublicationDrawer } from '@/components/marketing/PublicationDrawer';
import { SocialAccountsPanel } from '@/components/marketing/SocialAccountsPanel';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

interface Publication {
  id: string;
  platform: string;
  caption: string;
  hashtags: string;
  image_url: string | null;
  generated_image_id: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  ai_tone: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  published: 'Publicada',
  failed: 'Error',
};

export default function PublicationsPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPub, setEditPub] = useState<Publication | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const fetchPublications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true });

    if (!error && data) {
      setPublications(data as Publication[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPublications(); }, [fetchPublications]);

  const filtered = statusFilter === 'all'
    ? publications
    : publications.filter(p => p.status === statusFilter);

  // Build calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getPublicationsForDay = (d: Date) =>
    filtered.filter(p => {
      const date = p.scheduled_at;
      return date && isSameDay(new Date(date), d);
    });

  const handleNewPublication = (d?: Date) => {
    setEditPub(null);
    setSelectedDate(d || new Date());
    setDrawerOpen(true);
  };

  const handleEditPublication = (pub: Publication) => {
    setEditPub(pub);
    setSelectedDate(pub.scheduled_at ? new Date(pub.scheduled_at) : new Date());
    setDrawerOpen(true);
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publicaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifica, crea y programa contenido para redes sociales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" /> Cuentas
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Cuentas de Redes Sociales</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <SocialAccountsPanel />
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={() => handleNewPublication()} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Publicación
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borradores</SelectItem>
              <SelectItem value="scheduled">Programadas</SelectItem>
              <SelectItem value="published">Publicadas</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="rounded-r-none gap-1"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="rounded-l-none gap-1"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {weekDays.map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const dayPubs = getPublicationsForDay(d);
              const inMonth = isSameMonth(d, currentMonth);
              const today = isToday(d);
              return (
                <div
                  key={i}
                  onClick={() => handleNewPublication(d)}
                  className={cn(
                    "min-h-[100px] p-1.5 border-b border-r border-border cursor-pointer transition-colors hover:bg-muted/30",
                    !inMonth && "bg-muted/20",
                    today && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    today ? "text-primary font-bold" : inMonth ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {format(d, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayPubs.slice(0, 3).map(pub => (
                      <button
                        key={pub.id}
                        onClick={e => { e.stopPropagation(); handleEditPublication(pub); }}
                        className={cn(
                          "w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate transition-colors",
                          statusColors[pub.status] || 'bg-muted'
                        )}
                      >
                        {pub.image_url && (
                          <img src={pub.image_url} alt="" className="w-4 h-4 rounded-sm object-cover shrink-0" />
                        )}
                        <Instagram className="h-3 w-3 shrink-0" />
                        <span className="truncate">{pub.caption?.slice(0, 30) || 'Sin texto'}</span>
                        {pub.scheduled_at && (
                          <span className="ml-auto shrink-0">{format(new Date(pub.scheduled_at), 'HH:mm')}</span>
                        )}
                      </button>
                    ))}
                    {dayPubs.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{dayPubs.length - 3} más</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week/List view */
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No hay publicaciones</p>
              <p className="text-sm">Crea tu primera publicación para verla aquí.</p>
            </div>
          ) : (
            filtered.map(pub => (
              <button
                key={pub.id}
                onClick={() => handleEditPublication(pub)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left"
              >
                {pub.image_url ? (
                  <img src={pub.image_url} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Instagram className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pub.caption?.slice(0, 80) || 'Sin texto'}</p>
                  <p className="text-xs text-muted-foreground">
                    {pub.scheduled_at
                      ? format(new Date(pub.scheduled_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })
                      : 'Sin programar'}
                  </p>
                </div>
                <Badge className={cn('shrink-0', statusColors[pub.status])}>
                  {statusLabels[pub.status] || pub.status}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}

      <PublicationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        publication={editPub}
        defaultDate={selectedDate}
        onSaved={fetchPublications}
      />
    </div>
  );
}
