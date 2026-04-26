// ─── Shared primitives ───────────────────────────────────────────────────────
export type UUID = string;
export type Timestamptz = string;

// ─── Vehicle ─────────────────────────────────────────────────────────────────
export type VehicleStatus =
  | 'no_disponible'
  | 'disponible'
  | 'reservado'
  | 'vendido'
  | 'entregado';

export type OperativeStatus = 'normal' | 'en_reparacion' | 'en_transito';

export type VehicleClass = 'turismo' | 'furgoneta' | 'industrial' | 'moto' | 'otro';
export type VehicleType = 'ocasion' | 'nuevo' | 'km0' | 'demo';
export type EngineType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico' | 'gas' | 'hibrido_enchufable' | 'microhibrido';
export type Transmission = 'manual' | 'automatica' | 'semiautomatica';
export type TaxType = 'igic' | 'iva' | 'rebu' | 'exento';

export interface Vehicle {
  id: UUID;
  plate?: string;
  vin?: string;
  brand?: string;
  model?: string;
  version?: string | null;
  year?: number | null;
  color?: string | null;
  body_type?: string | null;
  vehicle_class?: VehicleClass | string | null;
  vehicle_type?: VehicleType | string | null;
  engine_type?: EngineType | string | null;
  fuel_type?: string | null;
  transmission?: Transmission | string | null;
  horsepower?: number | null;
  power_hp?: number | null;
  displacement?: number | null;
  km_entry?: number | null;
  km_exit?: number | null;
  mileage?: number | null;
  doors?: number | null;
  seats?: number | null;
  status?: VehicleStatus | string | null;
  operative_status?: OperativeStatus | string | null;
  first_registration?: string | null;
  itv_date?: string | null;
  expo_date?: string | null;
  purchase_date?: string | null;
  sale_date?: string | null;
  purchase_price?: number;
  pvp_base?: number;
  sale_price?: number | null;
  min_price?: number | null;
  price_cash?: number;
  price_financed?: number;
  price_professionals?: number;
  tax_type?: TaxType | string | null;
  tax_rate?: number;
  irpf_rate?: number;
  discount?: number;
  total_expenses?: number;
  total_cost?: number;
  net_profit?: number;
  policy_amount?: number | null;
  real_sale_price?: number | null;
  has_second_key?: boolean | null;
  has_manual?: boolean | null;
  has_technical_sheet?: boolean | null;
  has_circulation_permit?: boolean | null;
  buyer_id?: UUID | null;
  branch_id?: UUID | null;
  master_brand_id?: UUID | null;
  master_model_id?: UUID | null;
  master_version_id?: UUID | null;
  segment_id?: UUID | null;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
  [k: string]: any;
}

// ─── Buyer / Client ──────────────────────────────────────────────────────────
export type ClientType = 'particular' | 'empresa';
export type VatRegime = 'general' | 'recargo_equivalencia' | 'exento';

export interface Buyer {
  id: UUID;
  name?: string;
  last_name?: string | null;
  company_name?: string | null;
  client_type?: ClientType;
  dni?: string | null;
  cif?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  fiscal_address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  province?: string | null;
  iban?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  client_code?: string | null;
  is_buyer?: boolean;
  is_seller?: boolean;
  vat_regime?: VatRegime | string | null;
  acquisition_channel_id?: UUID | null;
  notes?: string | null;
  active?: boolean;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
  [k: string]: any;
}

// ─── Sale ────────────────────────────────────────────────────────────────────
export interface Sale {
  id: UUID;
  vehicle_id?: UUID;
  buyer_id?: UUID | null;
  sale_price: number;
  purchase_price?: number;
  margin?: number | null;
  sale_date?: string;
  base_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  discount?: number;
  discount_condition?: string | null;
  payment_breakdown?: any | null;
  financed?: boolean;
  finance_entity?: string | null;
  finance_amount?: number | null;
  finance_commission?: number | null;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Reservation ─────────────────────────────────────────────────────────────
export type ReservationWorkflowStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'converted'
  | 'expired'
  | 'cancelled';

export const RESERVATION_STATUS_LABELS: Record<ReservationWorkflowStatus, string> = {
  draft: 'Borrador',
  pending_signature: 'Pendiente firma',
  signed: 'Firmada',
  converted: 'Convertida',
  expired: 'Vencida',
  cancelled: 'Cancelada',
};

export const RESERVATION_STATUS_COLORS: Record<ReservationWorkflowStatus, string> = {
  draft: 'bg-gray-200 text-gray-700',
  pending_signature: 'bg-amber-100 text-amber-800',
  signed: 'bg-green-100 text-green-800',
  converted: 'bg-blue-100 text-blue-800',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

export type ReservationDocumentType =
  | 'reservation_document'
  | 'deposit_receipt'
  | 'sales_contract'
  | 'proforma_invoice';

export const RESERVATION_DOC_TYPE_LABELS: Record<ReservationDocumentType, string> = {
  reservation_document: 'Documento de Reserva',
  deposit_receipt: 'Recibo de Señal',
  sales_contract: 'Contrato de Compraventa',
  proforma_invoice: 'Factura Proforma',
};

export const TIMELINE_EVENT_LABELS: Record<string, string> = {
  created: 'Creada',
  pending_signature: 'Pasada a firma',
  signed: 'Firmada',
  converted: 'Convertida a venta',
  cancelled: 'Cancelada',
  expired: 'Vencida',
  payment_added: 'Pago añadido',
  reminder_sent: 'Recordatorio enviado',
};

export interface Reservation {
  id: UUID;
  vehicle_id?: UUID;
  buyer_id?: UUID;
  reservation_amount: number;
  reservation_status?: ReservationWorkflowStatus | string;
  reservation_date?: string;
  expiration_date?: string;
  signed_at?: Timestamptz | null;
  vehicle_pvp_snapshot?: number;
  notes?: string | null;
  reminder_24h_sent?: boolean;
  reminder_24h_sent_at?: Timestamptz | null;
  reminder_same_day_sent?: boolean;
  reminder_same_day_sent_at?: Timestamptz | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
  [k: string]: any;
}

// ─── Demand ──────────────────────────────────────────────────────────────────
export type DemandStatus = 'open' | 'matched' | 'converted' | 'cancelled';
export type IntentionLevel = 'baja' | 'media' | 'alta' | 'urgente';

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  open: 'Abierta',
  matched: 'Con match',
  converted: 'Convertida',
  cancelled: 'Cancelada',
};

export const INTENTION_LEVEL_LABELS: Record<IntentionLevel, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export interface Demand {
  id: UUID;
  buyer_id?: UUID;
  brand?: string | null;
  model?: string | null;
  body_type?: string | null;
  fuel_type?: string | null;
  transmission?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  km_max?: number | null;
  year_min?: number | null;
  year_max?: number | null;
  intention_level?: IntentionLevel | string;
  status?: DemandStatus | string;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
  [k: string]: any;
}

// ─── Commercial Activity ─────────────────────────────────────────────────────
export type ActivityChannel =
  | 'llamada_saliente'
  | 'llamada_entrante'
  | 'whatsapp'
  | 'email'
  | 'reunion_presencial'
  | 'videollamada'
  | 'gestion_postventa'
  | 'incidencia'
  | 'seguimiento_interno';

export type ActivityResult =
  | 'interesado'
  | 'pendiente_decision'
  | 'no_interesado'
  | 'cita_agendada'
  | 'propuesta_enviada'
  | 'reserva'
  | 'venta'
  | 'sin_respuesta'
  | 'seguimiento_x_dias'
  | 'incidencia_detectada'
  | 'incidencia_resuelta';

export const ACTIVITY_CHANNEL_LABELS: Record<ActivityChannel, string> = {
  llamada_saliente: 'Llamada saliente',
  llamada_entrante: 'Llamada entrante',
  whatsapp: 'WhatsApp',
  email: 'Email',
  reunion_presencial: 'Reunión presencial',
  videollamada: 'Videollamada',
  gestion_postventa: 'Gestión postventa',
  incidencia: 'Incidencia',
  seguimiento_interno: 'Seguimiento interno',
};

export const ACTIVITY_RESULT_LABELS: Record<ActivityResult, string> = {
  interesado: 'Interesado',
  pendiente_decision: 'Pendiente decisión',
  no_interesado: 'No interesado',
  cita_agendada: 'Cita agendada',
  propuesta_enviada: 'Propuesta enviada',
  reserva: 'Reserva',
  venta: 'Venta',
  sin_respuesta: 'Sin respuesta',
  seguimiento_x_dias: 'Seguimiento en X días',
  incidencia_detectada: 'Incidencia detectada',
  incidencia_resuelta: 'Incidencia resuelta',
};

export interface CommercialActivity {
  id: UUID;
  buyer_id?: UUID | null;
  vehicle_id?: UUID | null;
  channel: ActivityChannel | string;
  result?: ActivityResult | string | null;
  notes?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Purchase ────────────────────────────────────────────────────────────────
export type PurchaseStatus =
  | 'nuevo'
  | 'en_tasacion'
  | 'tasado'
  | 'oferta_realizada'
  | 'negociacion'
  | 'acordado'
  | 'comprado'
  | 'cancelado'
  | 'rechazado';

export type PurchaseSourceType = 'particular' | 'profesional' | 'subasta' | 'concesionario' | 'otro';
export type PurchasePaymentMethod = 'cash' | 'transfer' | 'cheque' | 'mixto' | 'pendiente';
export type PurchasePaymentStatus = 'pendiente' | 'parcial' | 'pagado';
export type PreparationStatus = 'pendiente' | 'en_curso' | 'completado' | 'omitido';
export type PreparationCategory = 'mecanica' | 'estetica' | 'documentacion' | 'limpieza' | 'otro';
export type PreparationRole = 'taller' | 'admin' | 'comercial';
export type PreparationExecutionType = 'interna' | 'externa';

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  nuevo: 'Nuevo',
  en_tasacion: 'En tasación',
  tasado: 'Tasado',
  oferta_realizada: 'Oferta realizada',
  negociacion: 'Negociación',
  acordado: 'Acordado',
  comprado: 'Comprado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
};

export const PURCHASE_STATUS_COLORS: Record<PurchaseStatus, string> = {
  nuevo: 'bg-gray-200 text-gray-700',
  en_tasacion: 'bg-blue-100 text-blue-800',
  tasado: 'bg-blue-100 text-blue-800',
  oferta_realizada: 'bg-amber-100 text-amber-800',
  negociacion: 'bg-amber-100 text-amber-800',
  acordado: 'bg-green-100 text-green-800',
  comprado: 'bg-green-200 text-green-900',
  cancelado: 'bg-red-100 text-red-700',
  rechazado: 'bg-red-100 text-red-700',
};

export const PURCHASE_PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  cheque: 'Cheque',
  mixto: 'Mixto',
  pendiente: 'Pendiente',
};

export const PURCHASE_PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagado: 'Pagado',
};

export const PURCHASE_NEXT_STATUSES: Record<PurchaseStatus, PurchaseStatus[]> = {
  nuevo: ['en_tasacion', 'cancelado'],
  en_tasacion: ['tasado', 'cancelado'],
  tasado: ['oferta_realizada', 'rechazado'],
  oferta_realizada: ['negociacion', 'acordado', 'rechazado'],
  negociacion: ['acordado', 'rechazado'],
  acordado: ['comprado', 'cancelado'],
  comprado: [],
  cancelado: [],
  rechazado: [],
};

export const PREPARATION_CATEGORY_LABELS: Record<PreparationCategory, string> = {
  mecanica: 'Mecánica',
  estetica: 'Estética',
  documentacion: 'Documentación',
  limpieza: 'Limpieza',
  otro: 'Otro',
};

export const PREPARATION_CATEGORY_ICONS: Record<PreparationCategory, string> = {
  mecanica: 'wrench',
  estetica: 'sparkles',
  documentacion: 'file-text',
  limpieza: 'spray-can',
  otro: 'package',
};

export const PREPARATION_STATUS_LABELS: Record<PreparationStatus, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  completado: 'Completado',
  omitido: 'Omitido',
};

export const PREPARATION_STATUS_COLORS: Record<PreparationStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  en_curso: 'bg-blue-100 text-blue-800',
  completado: 'bg-green-100 text-green-800',
  omitido: 'bg-gray-200 text-gray-600',
};

export const PREPARATION_ROLE_LABELS: Record<PreparationRole, string> = {
  taller: 'Taller',
  admin: 'Administración',
  comercial: 'Comercial',
};

export const PREPARATION_ROLE_COLORS: Record<PreparationRole, string> = {
  taller: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
  comercial: 'bg-green-100 text-green-800',
};

export const PREPARATION_ROLE_ICONS: Record<PreparationRole, string> = {
  taller: 'wrench',
  admin: 'briefcase',
  comercial: 'users',
};

export const PREPARATION_EXECUTION_TYPE_LABELS: Record<PreparationExecutionType, string> = {
  interna: 'Interna',
  externa: 'Externa',
};

export const PREPARATION_EXECUTION_TYPE_ICONS: Record<PreparationExecutionType, string> = {
  interna: 'home',
  externa: 'external-link',
};

export const PURCHASE_SOURCE_LABELS: Record<PurchaseSourceType, string> = {
  particular: 'Particular',
  profesional: 'Profesional',
  subasta: 'Subasta',
  concesionario: 'Concesionario',
  otro: 'Otro',
};

export interface VehiclePurchase {
  id: UUID;
  vehicle_id?: UUID;
  supplier_id?: UUID | null;
  source_type?: PurchaseSourceType | string | null;
  status?: PurchaseStatus | string;
  purchase_date?: string;
  purchase_price?: number;
  payment_status?: PurchasePaymentStatus | string;
  payment_method?: PurchasePaymentMethod | string | null;
  payment_date?: string | null;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Invoice / InvoiceSeries ─────────────────────────────────────────────────
export interface InvoiceSeries {
  id: UUID;
  name: string;
  prefix?: string | null;
  next_number: number;
  active: boolean;
  created_at?: Timestamptz;
}

export interface Invoice {
  id: UUID;
  invoice_number?: string | null;
  invoice_series?: UUID | null;
  buyer_id?: UUID | null;
  vehicle_id?: UUID | null;
  sale_id?: UUID | null;
  base_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status?: string;
  payment_status?: string;
  issue_date?: string;
  due_date?: string | null;
  paid_at?: Timestamptz | null;
  original_invoice_id?: UUID | null;
  rectification_type?: string | null;
  rectification_reason?: string | null;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface Payment {
  id: UUID;
  invoice_id?: UUID | null;
  reservation_id?: UUID | null;
  sale_id?: UUID | null;
  amount: number;
  payment_method?: string;
  payment_date?: string;
  notes?: string | null;
  is_refund?: boolean;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Treasury ────────────────────────────────────────────────────────────────
export interface CashMovement {
  id: UUID;
  movement_type: 'ingreso' | 'gasto' | string;
  movement_reason?: string;
  origin_type?: string;
  description?: string | null;
  amount: number;
  movement_date: string;
  payment_method?: string;
  notes?: string | null;
  is_system_generated?: boolean;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface OperatingExpense {
  id: UUID;
  category?: string;
  description?: string;
  amount: number;
  expense_date: string;
  payment_method?: string;
  invoice_number?: string | null;
  notes?: string | null;
  recurrent?: boolean;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface BankAccount {
  id: UUID;
  name: string;
  bank_name?: string | null;
  iban?: string | null;
  balance?: number;
  active?: boolean;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface BankMovement {
  id: UUID;
  bank_account_id: UUID;
  type: 'income' | 'expense' | string;
  amount: number;
  description?: string | null;
  movement_date: string;
  reconciled?: boolean;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface CashCategory {
  id: UUID;
  name: string;
  type?: 'ingreso' | 'gasto' | string;
  active?: boolean;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface CashSession {
  id: UUID;
  status?: 'open' | 'closed' | string;
  opening_balance?: number;
  closing_balance?: number | null;
  real_balance?: number | null;
  tpv_amount?: number | null;
  cash_difference?: number | null;
  tpv_difference?: number | null;
  opened_at?: Timestamptz;
  closed_at?: Timestamptz | null;
  notes?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface CashSessionMovement {
  id: UUID;
  session_id: UUID;
  type: 'income' | 'expense' | string;
  amount: number;
  description?: string | null;
  payment_method?: string;
  category_id?: UUID | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Accounting ──────────────────────────────────────────────────────────────
export interface AccountChartEntry {
  id: UUID;
  code: string;
  name: string;
  account_type: 'activo' | 'pasivo' | 'ingreso' | 'gasto' | 'patrimonio' | string;
  parent_code?: string | null;
  active?: boolean;
  is_system?: boolean;
  [k: string]: any;
}

export interface JournalEntry {
  id: UUID;
  entry_number?: string | null;
  entry_date: string;
  description?: string | null;
  reference?: string | null;
  is_manual?: boolean;
  origin_type?: string;
  status?: string;
  total_debit?: number;
  total_credit?: number;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface JournalEntryLine {
  id: UUID;
  journal_entry_id: UUID;
  account_code: string;
  debit?: number;
  credit?: number;
  description?: string | null;
  [k: string]: any;
}

export interface AccountingPeriod {
  id: UUID;
  year: number;
  status: 'open' | 'closed' | string;
  closed_at?: Timestamptz | null;
  closed_by?: UUID | null;
  [k: string]: any;
}

// ─── Tax models ──────────────────────────────────────────────────────────────
export type TaxPeriodStatus = 'pending' | 'verified' | 'submitted';

export interface TaxModel {
  id: UUID;
  model_number: string;
  name: string;
  tax_type?: string;
  frequency?: 'quarterly' | 'annual' | 'monthly' | string;
  active?: boolean;
  tax_model_periods?: TaxModelPeriod[];
  [k: string]: any;
}

export interface TaxModelPeriod {
  id: UUID;
  tax_model_id: UUID;
  year: number;
  period: number;
  status?: TaxPeriodStatus | string;
  base_amount?: number | null;
  tax_amount?: number | null;
  notes?: string | null;
  [k: string]: any;
}

// ─── User / Roles ────────────────────────────────────────────────────────────
export type UserRole = 'administrador' | 'vendedor' | 'postventa' | 'contabilidad';

// ─── Company / Branches / Channels / Segments ────────────────────────────────
export interface CompanySettings {
  id: UUID;
  company_name?: string;
  cif?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  igic_rate?: number;
  logo_url?: string | null;
  updated_at?: Timestamptz;
  [k: string]: any;
}

export interface AcquisitionChannel {
  id: UUID;
  name: string;
  active?: boolean;
  [k: string]: any;
}

export interface VehicleSegment {
  id: UUID;
  name: string;
  description?: string | null;
  active?: boolean;
  [k: string]: any;
}

export interface MasterBrand {
  id: UUID;
  name: string;
  active?: boolean;
  [k: string]: any;
}

export interface MasterModel {
  id: UUID;
  name: string;
  brand_id: UUID;
  segment_id?: UUID | null;
  active?: boolean;
  master_brands?: { name?: string } | null;
  [k: string]: any;
}

export interface MasterVersion {
  id: UUID;
  name: string;
  model_id: UUID;
  active?: boolean;
  [k: string]: any;
}

// ─── Suppliers / Insurers / Repairs ──────────────────────────────────────────
export interface Supplier {
  id: UUID;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cif?: string | null;
  category?: string | null;
  notes?: string | null;
  active?: boolean;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface Insurer {
  id: UUID;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean;
  [k: string]: any;
}

export type RepairOrderCategoryType = string;
export interface RepairOrderCategory {
  id: UUID;
  name: string;
  category_type?: RepairOrderCategoryType;
  active?: boolean;
  [k: string]: any;
}

export interface RepairOrder {
  id: UUID;
  vehicle_id: UUID;
  description?: string;
  category?: string | null;
  estimated_cost?: number | null;
  final_cost?: number | null;
  workshop?: string | null;
  status?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface SupplierInvoice {
  id: UUID;
  supplier_id?: UUID | null;
  invoice_number?: string | null;
  amount: number;
  invoice_date?: string;
  due_date?: string | null;
  notes?: string | null;
  paid?: boolean;
  [k: string]: any;
}

export interface SupplierPayment {
  id: UUID;
  supplier_invoice_id: UUID;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  bank_account_id?: UUID | null;
  notes?: string | null;
  [k: string]: any;
}

// ─── Vehicle insurances / docs / appraisals ──────────────────────────────────
export type InsuranceStatus = 'vigente' | 'vencida' | 'cancelada' | string;

export interface VehicleInsurance {
  id: UUID;
  vehicle_id: UUID;
  policy_number?: string | null;
  coverage_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  premium?: number | null;
  status?: InsuranceStatus;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface VehicleDocument {
  id: UUID;
  vehicle_id: UUID;
  category?: string;
  file_url?: string;
  file_name?: string;
  uploaded_by?: UUID | null;
  uploaded_at?: Timestamptz;
  [k: string]: any;
}

export interface VehiclePreparationItem {
  id: UUID;
  vehicle_id: UUID;
  item_name: string;
  category?: PreparationCategory | string;
  role?: PreparationRole | string;
  execution_type?: PreparationExecutionType | string;
  status?: PreparationStatus | string;
  completed_by?: UUID | null;
  completed_at?: Timestamptz | null;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Transfers ───────────────────────────────────────────────────────────────
export interface VehicleTransfer {
  id: UUID;
  vehicle_id: UUID;
  from_branch_id?: UUID | null;
  to_branch_id?: UUID | null;
  status?: string;
  requested_at?: Timestamptz;
  completed_at?: Timestamptz | null;
  notes?: string | null;
  requested_by?: UUID | null;
  [k: string]: any;
}

// ─── Postventa / Notes / Tickets ─────────────────────────────────────────────
export interface AfterSaleTicket {
  id: UUID;
  vehicle_id?: UUID | null;
  buyer_id?: UUID | null;
  description?: string | null;
  status?: string;
  severity?: string;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface Note {
  id: UUID;
  vehicle_id?: UUID | null;
  content: string;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface Expense {
  id: UUID;
  vehicle_id?: UUID | null;
  category?: string | null;
  description?: string | null;
  amount: number;
  date: string;
  created_by?: UUID | null;
  [k: string]: any;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface AppNotification {
  id: UUID;
  user_id: UUID;
  type?: string;
  title?: string;
  message?: string | null;
  link?: string | null;
  reference_id?: UUID | null;
  read?: boolean;
  seen?: boolean;
  created_at?: Timestamptz;
  [k: string]: any;
}

// ─── Audit ───────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: UUID;
  table_name?: string;
  record_id?: UUID;
  action?: string;
  old_data?: any;
  new_data?: any;
  user_id?: UUID | null;
  created_at?: Timestamptz;
  profiles?: { full_name?: string } | null;
  [k: string]: any;
}

// ─── Finance ─────────────────────────────────────────────────────────────────
export interface FinanceEntity {
  id: UUID;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  active?: boolean;
  [k: string]: any;
}

export interface FinanceProduct {
  id: UUID;
  entity_id: UUID;
  name: string;
  product_type?: string | null;
  active?: boolean;
  finance_entities?: { name?: string } | null;
  [k: string]: any;
}

export interface FinanceTermModel {
  id: UUID;
  product_id: UUID;
  name: string;
  months: number;
  interest_rate: number;
  opening_fee?: number;
  active?: boolean;
  finance_products?: { name?: string; finance_entities?: { name?: string } } | null;
  [k: string]: any;
}

export type FinanceSimulationStatus = 'draft' | 'approved' | 'rejected' | string;

export interface FinanceSimulation {
  id: UUID;
  vehicle_id?: UUID | null;
  buyer_id?: UUID | null;
  entity_id?: UUID | null;
  vehicle_price: number;
  down_payment: number;
  financed_amount: number;
  monthly_payment: number;
  total_financed?: number;
  total_estimated?: number;
  commission_estimated?: number | null;
  months?: number;
  interest_rate?: number;
  tin_used?: number;
  coefficient_used?: number;
  additional_rate_used?: number;
  adjusted_capital?: number;
  status?: FinanceSimulationStatus;
  created_by?: UUID | null;
  created_at?: Timestamptz;
  [k: string]: any;
}

export interface FinanceInstallment {
  id: UUID;
  simulation_id: UUID;
  installment_number: number;
  amount: number;
  due_date?: string;
  [k: string]: any;
}

// ─── Smart documents ─────────────────────────────────────────────────────────
export interface CirculationPermitData {
  plate?: string;
  vin?: string;
  brand?: string;
  model?: string;
  version?: string;
  first_registration?: string;
  fuel_type?: string;
  power_hp?: number | string;
  km?: number | string;
  owner_type?: 'particular' | 'empresa' | string;
  owner_name?: string;
  owner_last_name?: string;
  owner_dni?: string;
  owner_cif?: string;
  owner_company_name?: string;
  owner_address?: string;
  [k: string]: any;
}
