import type { VehicleStatus, OperativeStatus } from './types';

export const VEHICLE_STATUSES: Record<VehicleStatus, { label: string; className: string }> = {
  no_disponible: { label: 'No disponible', className: 'bg-gray-400/80 text-white' },
  disponible: { label: 'Disponible', className: 'bg-status-disponible text-white' },
  reservado: { label: 'Reservado', className: 'bg-status-reservado text-white' },
  vendido: { label: 'Vendido', className: 'bg-status-vendido text-white' },
  entregado: { label: 'Entregado', className: 'bg-status-entregado text-white' },
};

export const ALL_STATUSES: VehicleStatus[] = ['no_disponible', 'disponible', 'reservado', 'vendido', 'entregado'];

export const OPERATIVE_LABELS: Record<OperativeStatus, { label: string; className: string; icon: string } | null> = {
  normal: null,
  en_reparacion: { label: 'En reparación', className: 'bg-status-reparacion text-foreground', icon: 'wrench' },
  en_transito: { label: 'En tránsito', className: 'bg-status-reservado text-white', icon: 'truck' },
};

export const BRANDS = [
  'Volkswagen', 'Seat', 'BMW', 'Mercedes-Benz', 'Audi', 'Renault',
  'Toyota', 'Peugeot', 'Ford', 'Hyundai', 'Kia', 'Citroën',
  'Opel', 'Nissan', 'Skoda', 'Dacia', 'Fiat', 'Mazda',
];



export const DOCUMENT_CATEGORIES = [
  { value: 'ficha_tecnica', label: 'Ficha Técnica' },
  { value: 'permiso_circulacion', label: 'Permiso de Circulación' },
  { value: 'factura_compra', label: 'Factura de Compra' },
  { value: 'pago_compra', label: 'Pago de Compra' },
  { value: 'factura_revision', label: 'Factura Revisión' },
  { value: 'factura_pintura', label: 'Pintura' },
  { value: 'factura_limpieza', label: 'Limpieza' },
  { value: 'otro', label: 'Otro' },
] as const;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
}

export function formatKm(km: number): string {
  return new Intl.NumberFormat('es-ES').format(km) + ' km';
}

export function daysInStock(expoDate: string): number {
  return Math.floor((Date.now() - new Date(expoDate).getTime()) / (1000 * 60 * 60 * 24));
}

export const BODY_TYPES: { value: string; label: string }[] = [
  { value: 'sedan', label: 'Sedán' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'suv', label: 'SUV' },
  { value: 'coupe', label: 'Coupé' },
  { value: 'cabrio', label: 'Cabrio' },
  { value: 'monovolumen', label: 'Monovolumen' },
  { value: 'pick_up', label: 'Pick-up' },
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'otro', label: 'Otro' },
];
