import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Car,
  PlusCircle,
  ArrowLeftRight,
  FileSearch,
  Receipt,
  Archive,
  Building2,
  Shield,
  Users,
  UserCheck,
  Megaphone,
  Activity,
  Package,
  ClipboardCheck,
  FileText,
  Settings,
  CalendarCheck,
  Wallet,
  Scale,
  BookOpen,
  BookText,
  BarChart3,
  TrendingUp,
  UserCircle,
  Phone,
  ClipboardList,
  Target,
  Landmark,
  HeartHandshake,
  Trophy,
  AlertTriangle,
  ShieldCheck,
  Wrench,
  MessageSquareWarning,
  DollarSign,
  ImageIcon,
  Mail,
  ListTodo,
  Brain,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import caroveLogo from '@/assets/carove-icon-white.png';

const mainNav = [
  { title: 'Panel Operativo', url: '/', icon: LayoutDashboard },
  { title: 'Panel Gerencia', url: '/management', icon: BarChart3, adminOnly: true },
  { title: 'Stock de Vehículos', url: '/vehicles', icon: Car },
  { title: 'Compras', url: '/purchases', icon: ShoppingCart },
  { title: 'Nuevo Vehículo', url: '/vehicles/new', icon: PlusCircle },
  { title: 'Documentos IA', url: '/smart-documents', icon: FileSearch, hidden: true },
  { title: 'Ventas', url: '/sales', icon: Receipt },
  { title: 'Reservas', url: '/reservations', icon: CalendarCheck },
  { title: 'Clientes', url: '/clients', icon: UserCheck },
  { title: 'Traspasos', url: '/transfers', icon: ArrowLeftRight },
  { title: 'Tareas', url: '/tasks', icon: ListTodo },
  { title: 'Histórico', url: '/history', icon: Archive },
];

const commercialNav = [
  { title: 'Mi Actividad', url: '/commercial', icon: Phone },
  { title: 'Mis Demandas', url: '/demands', icon: Target },
  { title: 'Registro Actividades', url: '/commercial/activities', icon: ClipboardList },
  { title: 'Mi Cockpit', url: '/incentives', icon: TrendingUp, perm: 'view:incentives' as const },
  
  { title: 'Inteligencia IA', url: '/incentives/intelligence', icon: Brain, adminOnly: true },
  { title: 'Control Operativo', url: '/admin', icon: BarChart3, adminOnly: true },
];

const finanzasTreasuryNav = [
  { title: 'Tesorería', url: '/treasury', icon: Wallet, perm: 'view:treasury' as const },
  { title: 'Caja', url: '/cash-register', icon: DollarSign, perm: 'view:treasury' as const },
  { title: 'Categorías de Caja', url: '/cash-categories', icon: ListTodo, perm: 'manage:treasury' as const },
  { title: 'Gastos Operativos', url: '/operating-expenses', icon: Receipt, perm: 'manage:treasury' as const },
  { title: 'Conciliación Bancaria', url: '/bank-reconciliation', icon: Scale, perm: 'manage:treasury' as const },
];

const finanzasAccountingNav = [
  { title: 'Facturación', url: '/invoices', icon: FileText },
  { title: 'Libro Diario', url: '/accounting', icon: BookOpen, perm: 'view:accounting' as const },
  { title: 'Libro Mayor', url: '/accounting/ledger', icon: BookText, perm: 'view:accounting' as const },
  { title: 'Impuestos', url: '/accounting/taxes', icon: Receipt, perm: 'view:accounting' as const },
  { title: 'PyG', url: '/accounting/profit-loss', icon: TrendingUp, perm: 'view:accounting' as const },
  { title: 'Balance', url: '/accounting/balance', icon: Scale, perm: 'view:accounting' as const },
  { title: 'Margen Vehículos', url: '/vehicles/margin-report', icon: BarChart3 },
];

const masterNav = [
  { title: 'Talleres / Acreedores', url: '/masters/suppliers', icon: Building2, perm: 'view:masters' as const },
  { title: 'Aseguradoras', url: '/masters/insurers', icon: Shield, perm: 'view:masters' as const },
];

const settingsNavAdmin = [
  { title: 'Gestión de Usuarios', url: '/settings/users', icon: Users, perm: 'view:users' as const },
  { title: 'Datos de Empresa', url: '/settings/company', icon: Building2, perm: 'view:users' as const },
  { title: 'Series de Factura', url: '/settings/invoice-series', icon: Settings, perm: 'view:users' as const },
  { title: 'Datos Maestros Veh.', url: '/settings/vehicle-masters', icon: Car, perm: 'manage:vehicle_masters' as const },
  { title: 'Canales Captación', url: '/settings/acquisition-channels', icon: Megaphone, perm: 'view:users' as const },
  { title: 'Sucursales', url: '/settings/branches', icon: Building2, perm: 'view:users' as const },
  { title: 'Financiación', url: '/settings/financing', icon: Landmark, perm: 'view:users' as const },
  { title: 'Objetivos Comerciales', url: '/settings/incentives', icon: Target, perm: 'manage:incentives' as const },
  { title: 'Escalones Incentivos', url: '/settings/incentive-tiers', icon: TrendingUp, perm: 'manage:incentives' as const },
  { title: 'Niveles Comerciales', url: '/settings/commercial-levels', icon: Trophy, perm: 'manage:incentives' as const },
  { title: 'Rappels Financieros', url: '/settings/finance-rappels', icon: Landmark, perm: 'manage:incentives' as const },
];

const postventaNav = [
  { title: 'Dashboard', url: '/postventa', icon: HeartHandshake },
  { title: 'Seguimientos', url: '/postventa/followups', icon: Phone },
  { title: 'Incidencias', url: '/postventa/incidents', icon: AlertTriangle },
  { title: 'Garantías', url: '/postventa/warranties', icon: ShieldCheck },
  { title: 'Reparaciones', url: '/postventa/repairs', icon: Wrench },
  { title: 'Revisiones', url: '/postventa/reviews', icon: ClipboardCheck },
  { title: 'Reclamaciones', url: '/postventa/claims', icon: MessageSquareWarning },
  { title: 'Inc. Financiación', url: '/postventa/finance-incidents', icon: Landmark },
  { title: 'Costes', url: '/postventa/costs', icon: DollarSign },
  { title: 'Estadísticas', url: '/postventa/stats', icon: BarChart3 },
];

const marketingNav = [
  { title: 'Generador Imágenes', url: '/marketing/images', icon: ImageIcon },
];

const systemNav = [
  { title: 'Solicitudes de Módulos', url: '/modules', icon: Package },
  { title: 'Inventario Features', url: '/features', icon: ClipboardCheck },
  { title: 'Estado del sistema', url: '/status', icon: Activity },
];

function NavItem({ item }: { item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> } }) {
  const location = useLocation();
  const isActive = item.url === '/' ? location.pathname === '/' : location.pathname.startsWith(item.url);
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-primary font-medium'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { has, isAdmin } = useRole();

  const visibleMasters = masterNav.filter(item => {
    if (item.perm === 'view:masters') return has('view:masters') || isAdmin;
    return true;
  });

  const visibleSettingsAdmin = settingsNavAdmin.filter(item => has(item.perm));
  const visibleTreasury = finanzasTreasuryNav.filter(item => has(item.perm));
  const visibleAccounting = finanzasAccountingNav.filter(item => !('perm' in item) || has(item.perm as any));
  const showPostventa = has('view:postventa_module');
  const showFinanzas = visibleTreasury.length > 0 || visibleAccounting.length > 0;

  return (
    <Sidebar className="border-r-0">
      <div className="p-5 pb-2">
        <div className="flex items-center gap-3">
          <img src={caroveLogo} alt="Carove" className="h-9 w-9 rounded-lg" />
          <div>
            <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">Carove</h2>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Gestión</p>
          </div>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.filter(item => {
                if ((item as any).hidden) return false;
                if ((item as any).adminOnly && !isAdmin) return false;
                return true;
              }).map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Comercial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commercialNav.filter(item => {
                if ((item as any).adminOnly && !isAdmin) return false;
                if ((item as any).perm && !has((item as any).perm)) return false;
                return true;
              }).map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showPostventa && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
              Postventa
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {postventaNav.map(item => <NavItem key={item.url} item={item} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Imágenes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingNav.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showFinanzas && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
              Finanzas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {visibleTreasury.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/30 px-3 pt-2 pb-1 font-medium">Tesorería</p>
                  <SidebarMenu>
                    {visibleTreasury.map(item => <NavItem key={item.url} item={item} />)}
                  </SidebarMenu>
                </>
              )}
              {visibleAccounting.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/30 px-3 pt-3 pb-1 font-medium">Contabilidad</p>
                  <SidebarMenu>
                    {visibleAccounting.map(item => <NavItem key={item.url} item={item} />)}
                  </SidebarMenu>
                </>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleMasters.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
              Maestros
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMasters.map(item => <NavItem key={item.url} item={item} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Configuración
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem item={{ title: 'Mi Perfil', url: '/settings/profile', icon: UserCircle }} />
              {visibleSettingsAdmin.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNav.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
