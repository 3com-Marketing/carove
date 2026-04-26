import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVehicles, getVehiclePrimaryImages } from '@/lib/supabase-api';
import { formatCurrency, formatKm, formatDate, VEHICLE_STATUSES, ALL_STATUSES, daysInStock } from '@/lib/constants';
import { useBranches } from '@/hooks/useBranches';
import type { Vehicle, VehicleStatus } from '@/lib/types';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import { VehicleCatalogGrid } from '@/components/vehicles/VehicleCatalogGrid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, X, CheckCircle, XCircle, Clock, Loader2, LayoutList, LayoutGrid, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabFilter = 'disponibles' | 'todos' | 'historico';
type ViewMode = 'table' | 'catalog';

export default function VehicleList() {
  const navigate = useNavigate();
  const { data: branches = [] } = useBranches();
  const { data: allVehicles = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const [tab, setTab] = useState<TabFilter>('disponibles');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | null>(null);
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [lotFilter, setLotFilter] = useState('');
  const [expoFrom, setExpoFrom] = useState('');
  const [expoTo, setExpoTo] = useState('');
  const [showBaja, setShowBaja] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('vehicleListView');
    return stored === 'catalog' ? 'catalog' : 'table';
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('vehicleListView', mode);
  };

  // Batch fetch primary images
  const vehicleIds = useMemo(() => allVehicles.map(v => v.id), [allVehicles]);
  const { data: imageMap = {} } = useQuery({
    queryKey: ['vehicle-primary-images', vehicleIds],
    queryFn: () => getVehiclePrimaryImages(vehicleIds),
    enabled: vehicleIds.length > 0,
  });

  // Collect unique lot values
  const lots = useMemo(() => {
    const set = new Set<string>();
    allVehicles.forEach(v => { if (v.lot) set.add(v.lot); });
    return Array.from(set).sort();
  }, [allVehicles]);

  const filtered = useMemo(() => {
    let list = allVehicles;
    if (tab === 'disponibles') list = list.filter(v => v.status === 'disponible' || v.status === 'reservado' || v.status === 'no_disponible');
    else if (tab === 'historico') list = list.filter(v => v.status === 'vendido' || v.status === 'entregado' || v.is_deregistered);
    if (!showBaja && tab !== 'historico') list = list.filter(v => !v.is_deregistered);
    if (statusFilter) list = list.filter(v => v.status === statusFilter);
    if (centerFilter !== 'all') list = list.filter(v => v.center === centerFilter);
    if (priceMin) list = list.filter(v => v.pvp_base >= Number(priceMin));
    if (priceMax) list = list.filter(v => v.pvp_base <= Number(priceMax));
    if (lotFilter) list = list.filter(v => v.lot === lotFilter);
    if (expoFrom) list = list.filter(v => v.expo_date >= expoFrom);
    if (expoTo) list = list.filter(v => v.expo_date <= expoTo + 'T23:59:59');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.plate.toLowerCase().includes(q) || v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q));
    }
    return list;
  }, [allVehicles, tab, search, statusFilter, centerFilter, priceMin, priceMax, lotFilter, expoFrom, expoTo, showBaja]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'disponibles', label: 'Disponibles', count: allVehicles.filter(v => v.status === 'disponible' || v.status === 'reservado' || v.status === 'no_disponible').length },
    { key: 'todos', label: 'Todos', count: allVehicles.length },
    { key: 'historico', label: 'Histórico', count: allVehicles.filter(v => ['vendido', 'entregado'].includes(v.status) || v.is_deregistered).length },
  ];

  const docCheck = (ok: boolean) => ok
    ? <CheckCircle className="h-3.5 w-3.5 text-status-disponible" />
    : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />;

  const hasExtraFilters = centerFilter !== 'all' || priceMin || priceMax || lotFilter || expoFrom || expoTo || !showBaja;

  const clearFilters = () => {
    setCenterFilter('all'); setPriceMin(''); setPriceMax('');
    setLotFilter(''); setExpoFrom(''); setExpoTo(''); setShowBaja(true);
  };

  const ThumbnailCell = ({ vehicleId, brand, model }: { vehicleId: string; brand: string; model: string }) => {
    const url = imageMap[vehicleId];
    return (
      <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
        {url ? (
          <img src={url} alt={`${brand} ${model}`} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Stock de Vehículos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestión completa del inventario</p>
        </div>
        <Button onClick={() => navigate('/vehicles/new')} size="sm" className="gradient-brand border-0 text-white hover:opacity-90 shrink-0">
          <PlusCircle className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Nuevo vehículo</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)} className={cn('transition-opacity touch-manipulation', statusFilter && statusFilter !== s ? 'opacity-40' : '')}>
            <StatusBadge status={s} />
          </button>
        ))}
        {statusFilter && (
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setStatusFilter(null)}>
            <X className="h-3 w-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex rounded-lg bg-muted p-1 gap-0.5 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn('px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap touch-manipulation', tab === t.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {t.label} <span className="ml-1 opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar matrícula, marca, modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9 text-sm" />
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg bg-muted p-1 gap-0.5">
              <button
                onClick={() => handleViewChange('table')}
                className={cn('p-1.5 rounded-md transition-colors', viewMode === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                title="Vista tabla"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewChange('catalog')}
                className={cn('p-1.5 rounded-md transition-colors', viewMode === 'catalog' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                title="Vista catálogo"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Select value={centerFilter} onValueChange={setCenterFilter}>
            <SelectTrigger className="h-10 sm:h-8 text-xs w-full sm:w-[140px]">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="PVP mín." value={priceMin} onChange={e => setPriceMin(e.target.value)} className="h-10 sm:h-8 text-xs w-full sm:w-[100px]" />
          <Input type="number" placeholder="PVP máx." value={priceMax} onChange={e => setPriceMax(e.target.value)} className="h-10 sm:h-8 text-xs w-full sm:w-[100px]" />
          {lots.length > 0 && (
            <Select value={lotFilter || 'all'} onValueChange={v => setLotFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 sm:h-8 text-xs w-full sm:w-[130px]">
                <SelectValue placeholder="Lote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los lotes</SelectItem>
                {lots.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Input type="date" placeholder="Expo desde" value={expoFrom} onChange={e => setExpoFrom(e.target.value)} className="h-10 sm:h-8 text-xs w-full sm:w-[130px]" title="Fecha exposición desde" />
          <Input type="date" placeholder="Expo hasta" value={expoTo} onChange={e => setExpoTo(e.target.value)} className="h-10 sm:h-8 text-xs w-full sm:w-[130px]" title="Fecha exposición hasta" />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer col-span-2 sm:col-span-1 touch-manipulation py-1">
            <input type="checkbox" checked={showBaja} onChange={e => setShowBaja(e.target.checked)} className="rounded h-4 w-4" />
            Mostrar bajas
          </label>
          {hasExtraFilters && (
            <Button variant="ghost" size="sm" className="text-xs h-10 sm:h-8 col-span-2 sm:col-span-1" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <>
          <Card className="border shadow-sm hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Foto</TableHead>
                    <TableHead className="w-28">Estado</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead className="text-right">CC</TableHead>
                    <TableHead className="text-right">CV</TableHead>
                    <TableHead>Motor</TableHead>
                    <TableHead className="text-right">KM</TableHead>
                    <TableHead className="text-center" title="Permiso Circulación">PC</TableHead>
                    <TableHead className="text-center" title="Ficha Técnica">FT</TableHead>
                    <TableHead className="text-right">PVP</TableHead>
                    <TableHead className="text-right">Beneficio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                        {search ? 'Sin resultados para tu búsqueda.' : 'Tu stock está listo para recibir vehículos. ¡Empieza añadiendo uno!'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(v => {
                    const dias = daysInStock(v.expo_date);
                    return (
                      <TableRow key={v.id} className={cn('cursor-pointer hover:bg-muted/40 transition-colors', v.status === 'no_disponible' && 'opacity-50')} onClick={() => navigate(`/vehicles/${v.id}`)}>
                        <TableCell><ThumbnailCell vehicleId={v.id} brand={v.brand} model={v.model} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={v.status} />
                            {dias > 90 && v.status === 'disponible' && <span title={`${dias} días en stock`}><Clock className="h-3.5 w-3.5 text-status-vendido" /></span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{v.brand}</TableCell>
                        <TableCell>{v.model}</TableCell>
                        <TableCell className="font-mono text-xs">{v.plate}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{v.center}</TableCell>
                        <TableCell className="text-right text-xs">{v.displacement}</TableCell>
                        <TableCell className="text-right text-xs">{v.horsepower}</TableCell>
                        <TableCell className="text-xs capitalize">{v.engine_type}</TableCell>
                        <TableCell className="text-right text-xs">{formatKm(v.km_entry)}</TableCell>
                        <TableCell className="text-center">{docCheck(v.has_circulation_permit)}</TableCell>
                        <TableCell className="text-center">{docCheck(v.has_technical_sheet)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatCurrency(v.pvp_base)}</TableCell>
                        <TableCell className={cn('text-right font-semibold text-sm', v.net_profit >= 0 ? 'text-status-disponible' : 'text-destructive')}>
                          {formatCurrency(v.net_profit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile table cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <Card className="border"><CardContent className="py-12 text-center text-muted-foreground text-sm">{search ? 'Sin resultados.' : 'Tu stock está listo. ¡Añade tu primer vehículo!'}</CardContent></Card>
            ) : filtered.map(v => (
              <Card key={v.id} className={cn('border shadow-sm cursor-pointer hover:shadow-md transition-shadow', v.status === 'no_disponible' && 'opacity-50')} onClick={() => navigate(`/vehicles/${v.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <ThumbnailCell vehicleId={v.id} brand={v.brand} model={v.model} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{v.brand} {v.model}</p>
                          <p className="text-xs text-muted-foreground">{v.version}</p>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Matrícula: <strong className="text-foreground">{v.plate}</strong></span>
                    <span>KM: <strong className="text-foreground">{formatKm(v.km_entry)}</strong></span>
                    <span>Motor: <strong className="text-foreground capitalize">{v.engine_type}</strong></span>
                    <span>Centro: <strong className="text-foreground">{v.center}</strong></span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-sm font-semibold">{formatCurrency(v.pvp_base)}</span>
                    <span className={cn('text-sm font-semibold', v.net_profit >= 0 ? 'text-status-disponible' : 'text-destructive')}>
                      {v.net_profit >= 0 ? '+' : ''}{formatCurrency(v.net_profit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── CATALOG VIEW ── */}
      {viewMode === 'catalog' && (
        <VehicleCatalogGrid vehicles={filtered} imageMap={imageMap} />
      )}

      <Card className="border shadow-sm">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            Mostrando <strong className="text-foreground">{filtered.length}</strong> de {allVehicles.length} vehículos
            {statusFilter && <> · Filtro: <StatusBadge status={statusFilter} className="text-[10px] ml-1" /></>}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
