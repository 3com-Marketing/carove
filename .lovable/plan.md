

# Plan: Tabla de sucursales con CRUD en Configuración

## Resumen

Crear una tabla `branches` en la base de datos, una página CRUD en `/settings/branches`, y reemplazar todas las referencias al array hardcodeado `CENTERS` por datos dinámicos de la tabla.

---

## Cambios

### 1. Migración SQL — tabla `branches`

```sql
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  address text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
CREATE POLICY "Authenticated users can read branches"
  ON public.branches FOR SELECT TO authenticated USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Admins can manage branches"
  ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Trigger updated_at
CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar datos iniciales
INSERT INTO public.branches (name) VALUES
  ('Las Palmas'), ('Telde'), ('Arucas'), ('Vecindario');
```

### 2. Nueva página — `src/pages/settings/BranchesPage.tsx`

CRUD siguiendo el patrón exacto de `AcquisitionChannelsPage`:
- Tabla con columnas: Nombre, Dirección, Teléfono, Estado, Acciones
- Dialog para crear/editar con campos: nombre (obligatorio), dirección, teléfono
- Botón activar/desactivar
- Icono `Building2`, título "Sucursales"

### 3. Hook reutilizable — `src/hooks/useBranches.tsx`

Query compartido que devuelve las sucursales activas como `string[]` de nombres, para reemplazar `CENTERS` en todos los consumidores:

```ts
export function useBranches() {
  return useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches').select('name').eq('active', true).order('name');
      return (data || []).map(b => b.name);
    },
  });
}
```

### 4. Reemplazar `CENTERS` en 6 archivos

| Archivo | Cambio |
|---------|--------|
| `src/pages/vehicles/VehicleNew.tsx` | `useBranches()` en lugar de `CENTERS` |
| `src/pages/vehicles/VehicleList.tsx` | `useBranches()` en lugar de `CENTERS` |
| `src/pages/vehicles/VehicleDetail.tsx` | `useBranches()` en lugar de `CENTERS` |
| `src/components/vehicles/TransferRequestDialog.tsx` | `useBranches()` en lugar de `CENTERS` |
| `src/pages/transfers/TransfersPendingPage.tsx` | `useBranches()` en lugar de `CENTERS` |
| `src/pages/masters/UsersList.tsx` | `useBranches()` en lugar de `CENTERS` |

Eliminar `CENTERS` de `src/lib/constants.ts`.

### 5. Routing y sidebar

- `src/App.tsx`: añadir ruta `/settings/branches` → `BranchesPage`
- `src/components/layout/AppSidebar.tsx`: añadir entrada "Sucursales" en `settingsNavAdmin` con `perm: 'view:users'` e icono `Building2`

