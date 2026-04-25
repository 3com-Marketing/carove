import { useAuth } from './useAuth';
import type { UserRole } from '@/lib/types';

type Permission =
  | 'view:masters'
  | 'manage:masters'
  | 'view:users'
  | 'manage:users'
  | 'edit:prices'
  | 'delete:vehicle'
  | 'view:audit'
  | 'manage:postventa'
  | 'validate:postventa'
  | 'view:treasury'
  | 'manage:treasury'
  | 'view:accounting'
  | 'manage:accounting'
  | 'manage:vehicle_masters'
  | 'view:postventa_module'
  | 'manage:postventa_module'
  | 'view:incentives'
  | 'manage:incentives';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  administrador: [
    'view:masters', 'manage:masters',
    'view:users', 'manage:users',
    'edit:prices', 'delete:vehicle',
    'view:audit',
    'manage:postventa', 'validate:postventa',
    'view:treasury', 'manage:treasury',
    'view:accounting', 'manage:accounting',
    'manage:vehicle_masters',
    'view:postventa_module', 'manage:postventa_module',
    'view:incentives', 'manage:incentives',
  ],
  vendedor: [
    'edit:prices',
    'manage:postventa',
    'view:treasury',
    'view:accounting',
    'view:incentives',
  ],
  postventa: [
    'manage:postventa', 'validate:postventa',
    'view:postventa_module', 'manage:postventa_module',
  ],
  contabilidad: [
    'view:treasury', 'manage:treasury',
    'view:accounting', 'manage:accounting',
    'view:masters',
  ],
};

export function useRole() {
  const { profile } = useAuth();
  const role = (profile?.role || 'vendedor') as UserRole;

  const has = (perm: Permission): boolean =>
    ROLE_PERMISSIONS[role]?.includes(perm) ?? false;

  const isAdmin = role === 'administrador';

  return { role, has, isAdmin };
}
