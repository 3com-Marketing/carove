import type { Vehicle, Expense, Supplier } from './types';

const VEHICLES_KEY = 'carove_vehicles';
const EXPENSES_KEY = 'carove_expenses';
const SUPPLIERS_KEY = 'carove_suppliers';

// ── Seed Data ──────────────────────────────────────────────

function makeSeedVehicles(): Vehicle[] {
  const now = new Date().toISOString();
  const base = {
    tax_type: 'igic' as const,
    tax_rate: 7,
    irpf_rate: 0,
    discount: 0,
    has_second_key: true,
    has_technical_sheet: true,
    has_circulation_permit: true,
    has_manual: true,
    second_registration: null,
    warranty_date: null,
    km_exit: null,
    sale_date: null,
    delivery_date: null,
    lot: null,
    insurer_id: null,
    policy_date: null,
    policy_amount: null,
    buyer_id: null,
    sold_by: null,
    created_by: '1',
    updated_by: '1',
    created_at: now,
    updated_at: now,
  };

  return [
    { ...base, id: 'v1', plate: '4521 BKM', vin: 'WVWZZZ3CZWE123456', brand: 'Volkswagen', model: 'Golf', version: '2.0 TDI Sport', color: 'Blanco', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'diesel', transmission: 'manual', displacement: 1968, horsepower: 150, km_entry: 45000, first_registration: '2021-03-15', itv_date: '2026-03-15', purchase_date: '2025-11-10', expo_date: '2025-11-15', purchase_price: 18500, price_professionals: 22000, price_financed: 23500, price_cash: 22500, pvp_base: 22500, total_expenses: 850, total_cost: 19350, net_profit: 3150, status: 'disponible', center: 'Las Palmas' },
    { ...base, id: 'v2', plate: '3287 CDF', vin: 'VSSZZZ5FZLR012345', brand: 'Seat', model: 'León', version: '1.5 TSI FR', color: 'Rojo', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'gasolina', transmission: 'automatico', displacement: 1498, horsepower: 150, km_entry: 32000, first_registration: '2022-06-20', itv_date: '2026-06-20', purchase_date: '2025-12-01', expo_date: '2025-12-05', purchase_price: 19200, price_professionals: 23000, price_financed: 24500, price_cash: 23500, pvp_base: 23500, total_expenses: 420, total_cost: 19620, net_profit: 3880, status: 'disponible', center: 'Las Palmas' },
    { ...base, id: 'v3', plate: '7834 FGH', vin: 'WBAPH5C55BA123456', brand: 'BMW', model: 'Serie 3', version: '320d M Sport', color: 'Negro', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'diesel', transmission: 'automatico', displacement: 1995, horsepower: 190, km_entry: 58000, first_registration: '2020-09-10', itv_date: '2026-02-20', purchase_date: '2025-10-15', expo_date: '2025-10-20', purchase_price: 24500, price_professionals: 29000, price_financed: 31000, price_cash: 29500, pvp_base: 29500, total_expenses: 1200, total_cost: 25700, net_profit: 3800, status: 'reservado', center: 'Telde' },
    { ...base, id: 'v4', plate: '2156 DLM', vin: 'WDD2050091R234567', brand: 'Mercedes-Benz', model: 'Clase A', version: 'A 200 AMG Line', color: 'Gris', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'gasolina', transmission: 'automatico', displacement: 1332, horsepower: 163, km_entry: 41000, first_registration: '2021-01-25', itv_date: '2025-01-25', purchase_date: '2025-09-20', expo_date: '2025-09-25', purchase_price: 22000, price_professionals: 26500, price_financed: 28000, price_cash: 27000, pvp_base: 27000, total_expenses: 3500, total_cost: 25500, net_profit: 1500, status: 'disponible', center: 'Las Palmas', has_manual: false },
    { ...base, id: 'v5', plate: '5698 GNP', vin: 'WAUZZZ8V1KA345678', brand: 'Audi', model: 'A4', version: '2.0 TDI S line', color: 'Azul', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'diesel', transmission: 'automatico', displacement: 1968, horsepower: 150, km_entry: 67000, first_registration: '2019-11-05', itv_date: '2025-11-05', purchase_date: '2025-08-10', expo_date: '2025-08-15', purchase_price: 20000, price_professionals: 24000, price_financed: 25500, price_cash: 24500, pvp_base: 24500, total_expenses: 980, total_cost: 20980, net_profit: 3520, status: 'disponible', center: 'Las Palmas', lot: 'L-2025-02' },
    { ...base, id: 'v6', plate: '8901 HRT', vin: 'VF1RFB00X67890123', brand: 'Renault', model: 'Clio', version: '1.0 TCe Zen', color: 'Blanco', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'gasolina', transmission: 'manual', displacement: 999, horsepower: 100, km_entry: 28000, first_registration: '2022-04-12', itv_date: '2026-04-12', purchase_date: '2025-07-01', expo_date: '2025-07-05', purchase_price: 10500, price_professionals: 13000, price_financed: 14000, price_cash: 13500, pvp_base: 13500, total_expenses: 350, total_cost: 10850, net_profit: 2650, status: 'vendido', center: 'Arucas', sale_date: '2026-01-20' },
    { ...base, id: 'v7', plate: '1234 JKL', vin: 'JTDKN3DU5A0456789', brand: 'Toyota', model: 'Corolla', version: '1.8 Hybrid Active', color: 'Plata', vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'hibrido', transmission: 'automatico', displacement: 1798, horsepower: 122, km_entry: 35000, first_registration: '2021-08-30', itv_date: '2025-08-30', purchase_date: '2025-12-15', expo_date: '2025-12-18', purchase_price: 19000, price_professionals: 22500, price_financed: 24000, price_cash: 23000, pvp_base: 23000, total_expenses: 200, total_cost: 19200, net_profit: 3800, status: 'disponible', center: 'Las Palmas' },
    { ...base, id: 'v8', plate: '6543 BNM', vin: 'VF3MCYHZRJL567890', brand: 'Peugeot', model: '3008', version: '1.5 BlueHDi Allure', color: 'Verde', vehicle_class: 'mixto', vehicle_type: 'ocasion', engine_type: 'diesel', transmission: 'automatico', displacement: 1499, horsepower: 130, km_entry: 52000, first_registration: '2020-12-01', itv_date: '2024-12-01', purchase_date: '2025-06-01', expo_date: '2025-06-05', purchase_price: 17500, price_professionals: 21000, price_financed: 22500, price_cash: 21500, pvp_base: 21500, total_expenses: 600, total_cost: 18100, net_profit: 3400, status: 'entregado', center: 'Vecindario', sale_date: '2025-11-10', delivery_date: '2025-12-01' },
    { ...base, id: 'v9', plate: '9876 CRS', vin: 'WF0XXXGCDX1678901', brand: 'Ford', model: 'Focus', version: '1.0 EcoBoost Titanium', color: 'Azul', vehicle_class: 'turismo', vehicle_type: 'usado', engine_type: 'gasolina', transmission: 'manual', displacement: 999, horsepower: 125, km_entry: 89000, first_registration: '2018-05-15', itv_date: '2026-05-15', purchase_date: '2026-01-05', expo_date: '2026-01-08', purchase_price: 9800, price_professionals: 12500, price_financed: 13500, price_cash: 12800, pvp_base: 12800, total_expenses: 450, total_cost: 10250, net_profit: 2550, status: 'disponible', center: 'Las Palmas' },
    { ...base, id: 'v10', plate: '3456 DFK', vin: 'KMHJ3814GLU789012', brand: 'Hyundai', model: 'Tucson', version: '1.6 CRDi Tecno', color: 'Gris', vehicle_class: 'mixto', vehicle_type: 'ocasion', engine_type: 'diesel', transmission: 'automatico', displacement: 1598, horsepower: 136, km_entry: 105000, first_registration: '2018-02-20', itv_date: '2024-02-20', purchase_date: '2025-04-10', expo_date: '2025-04-15', purchase_price: 13500, price_professionals: 16000, price_financed: 17000, price_cash: 16500, pvp_base: 16500, total_expenses: 5200, total_cost: 18700, net_profit: -2200, status: 'disponible', center: 'Telde', has_second_key: false, has_manual: false },
  ];
}

function makeSeedSuppliers(): Supplier[] {
  return [
    { id: 's1', name: 'Taller Mecánico Guanarteme', phone: '928 123 456', email: 'info@tallerguanarteme.es', address: 'C/ León y Castillo 45, Las Palmas', specialty: 'Mecánica general', active: true, is_internal: false },
    { id: 's2', name: 'AutoPintura Canarias', phone: '928 234 567', email: 'contacto@autopinturacanarias.com', address: 'Pol. Ind. El Sebadal, Las Palmas', specialty: 'Pintura y chapa', active: true, is_internal: false },
    { id: 's3', name: 'CleanCar Express', phone: '928 345 678', email: null, address: 'Av. Mesa y López 80, Las Palmas', specialty: 'Limpieza y detailing', active: true, is_internal: false },
  ];
}

function makeSeedExpenses(): Expense[] {
  const now = new Date().toISOString();
  return [
    { id: 'e1', vehicle_id: 'v1', date: '2025-11-20', completion_date: '2025-11-22', supplier_id: 's1', supplier_name: 'Taller Mecánico Guanarteme', invoice_number: 'F-2025-0234', amount: 450, description: 'Revisión general', observations: 'Cambio de aceite, filtros y pastillas de freno', courtesy_vehicle_plate: null, courtesy_delivery_date: null, courtesy_return_date: null, created_by: '1', created_at: now, updated_by: '1', updated_at: now },
    { id: 'e2', vehicle_id: 'v1', date: '2025-11-25', completion_date: '2025-11-28', supplier_id: 's3', supplier_name: 'CleanCar Express', invoice_number: 'F-2025-0891', amount: 400, description: 'Limpieza integral', observations: 'Pulido de carrocería, limpieza tapicería, tratamiento cerámico', courtesy_vehicle_plate: null, courtesy_delivery_date: null, courtesy_return_date: null, created_by: '1', created_at: now, updated_by: '1', updated_at: now },
    { id: 'e3', vehicle_id: 'v4', date: '2025-12-01', completion_date: null, supplier_id: 's1', supplier_name: 'Taller Mecánico Guanarteme', invoice_number: 'F-2025-0267', amount: 2200, description: 'Reparación motor', observations: 'Problema con cadena de distribución. Requiere recambio completo.', courtesy_vehicle_plate: '0000 TST', courtesy_delivery_date: '2025-12-01', courtesy_return_date: null, created_by: '1', created_at: now, updated_by: '1', updated_at: now },
    { id: 'e4', vehicle_id: 'v4', date: '2025-12-10', completion_date: '2025-12-12', supplier_id: 's2', supplier_name: 'AutoPintura Canarias', invoice_number: 'F-2025-0445', amount: 1300, description: 'Repintado parcial', observations: 'Reparar y repintar paragolpes delantero y aleta derecha', courtesy_vehicle_plate: null, courtesy_delivery_date: null, courtesy_return_date: null, created_by: '1', created_at: now, updated_by: '1', updated_at: now },
    { id: 'e5', vehicle_id: 'v10', date: '2025-05-01', completion_date: '2025-05-20', supplier_id: 's1', supplier_name: 'Taller Mecánico Guanarteme', invoice_number: 'F-2025-0102', amount: 5200, description: 'Reparación integral', observations: 'Motor, frenos, suspensión. Coste excesivo para el valor del vehículo.', courtesy_vehicle_plate: null, courtesy_delivery_date: null, courtesy_return_date: null, created_by: '1', created_at: now, updated_by: '1', updated_at: now },
  ];
}

// ── CRUD Operations ────────────────────────────────────────

export function getVehicles(): Vehicle[] {
  const data = localStorage.getItem(VEHICLES_KEY);
  if (!data) {
    const seed = makeSeedVehicles();
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
}

export function getVehicleById(id: string): Vehicle | undefined {
  return getVehicles().find(v => v.id === id);
}

export function createVehicle(vehicle: Partial<Vehicle>): Vehicle {
  const vehicles = getVehicles();
  const now = new Date().toISOString();
  const newV: Vehicle = {
    id: crypto.randomUUID(),
    plate: '', vin: '', brand: '', model: '', version: '', color: '',
    vehicle_class: 'turismo', vehicle_type: 'ocasion', engine_type: 'gasolina', transmission: 'manual',
    displacement: 0, horsepower: 0, km_entry: 0, km_exit: null,
    first_registration: now, second_registration: null, warranty_date: null, itv_date: null,
    purchase_date: now, sale_date: null, delivery_date: null, expo_date: now,
    has_second_key: false, has_technical_sheet: false, has_circulation_permit: false, has_manual: false,
    purchase_price: 0, tax_type: 'igic', tax_rate: 7, irpf_rate: 0, discount: 0,
    price_professionals: 0, price_financed: 0, price_cash: 0, pvp_base: 0,
    total_expenses: 0, total_cost: 0, net_profit: 0,
    status: 'disponible', center: 'Las Palmas', lot: null,
    insurer_id: null, policy_date: null, policy_amount: null, buyer_id: null, sold_by: null,
    created_by: '1', created_at: now, updated_by: '1', updated_at: now,
    ...vehicle,
  };
  vehicles.push(newV);
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  return newV;
}

export function updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | null {
  const vehicles = getVehicles();
  const idx = vehicles.findIndex(v => v.id === id);
  if (idx === -1) return null;
  vehicles[idx] = { ...vehicles[idx], ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  return vehicles[idx];
}

export function deleteVehicle(id: string): boolean {
  const vehicles = getVehicles();
  const filtered = vehicles.filter(v => v.id !== id);
  if (filtered.length === vehicles.length) return false;
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(filtered));
  return true;
}

// ── Expenses ───────────────────────────────────────────────

export function getExpenses(vehicleId?: string): Expense[] {
  const data = localStorage.getItem(EXPENSES_KEY);
  if (!data) {
    const seed = makeSeedExpenses();
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(seed));
    return vehicleId ? seed.filter(e => e.vehicle_id === vehicleId) : seed;
  }
  const expenses: Expense[] = JSON.parse(data);
  return vehicleId ? expenses.filter(e => e.vehicle_id === vehicleId) : expenses;
}

export function createExpense(expense: Partial<Expense>): Expense {
  const all = getExpenses();
  const now = new Date().toISOString();
  const newE: Expense = {
    id: crypto.randomUUID(),
    vehicle_id: '',
    date: now,
    completion_date: null,
    supplier_id: '',
    supplier_name: '',
    invoice_number: '',
    amount: 0,
    description: '',
    observations: '',
    courtesy_vehicle_plate: null,
    courtesy_delivery_date: null,
    courtesy_return_date: null,
    created_by: '1',
    created_at: now,
    updated_by: '1',
    updated_at: now,
    ...expense,
  };
  all.push(newE);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(all));
  return newE;
}

// ── Notes ─────────────────────────────────────────────────

const NOTES_KEY = 'carove_notes';

export function getNotes(vehicleId?: string): import('./types').Note[] {
  const data = localStorage.getItem(NOTES_KEY);
  const notes: import('./types').Note[] = data ? JSON.parse(data) : [];
  return vehicleId ? notes.filter(n => n.vehicle_id === vehicleId) : notes;
}

export function createNote(note: Partial<import('./types').Note>): import('./types').Note {
  const all = getNotes();
  const now = new Date().toISOString();
  const newN: import('./types').Note = {
    id: crypto.randomUUID(),
    vehicle_id: '',
    content: '',
    author_id: '1',
    author_name: '',
    created_at: now,
    ...note,
  };
  all.push(newN);
  localStorage.setItem(NOTES_KEY, JSON.stringify(all));
  return newN;
}

// ── Suppliers ──────────────────────────────────────────────

export function getSuppliers(): Supplier[] {
  const data = localStorage.getItem(SUPPLIERS_KEY);
  if (!data) {
    const seed = makeSeedSuppliers();
    localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(data);
}

// ── Reset ──────────────────────────────────────────────────

export function resetAllData() {
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(makeSeedVehicles()));
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(makeSeedExpenses()));
  localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(makeSeedSuppliers()));
}

export function clearAllData() {
  localStorage.removeItem(VEHICLES_KEY);
  localStorage.removeItem(EXPENSES_KEY);
  localStorage.removeItem(SUPPLIERS_KEY);
}
