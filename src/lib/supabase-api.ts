import { supabase } from '@/integrations/supabase/client';
import type { Vehicle, Expense, Supplier, Insurer, Note, Buyer, AfterSaleTicket, AuditLog, VehicleDocument, Sale, CompanySettings, InvoiceSeries, Invoice, Reservation, AppNotification, Payment, CashMovement, OperatingExpense, BankAccount, BankMovement, AccountChartEntry, JournalEntry, JournalEntryLine, RepairOrder, RepairOrderCategory, SupplierInvoice, SupplierPayment, VehicleTransfer, OperativeStatus, AcquisitionChannel, Demand, FinanceEntity, FinanceProduct, FinanceTermModel, FinanceSimulation, FinanceSimulationStatus, FinanceInstallment, CashCategory, VehiclePurchase, PurchaseStatus } from './types';

export interface Proposal {
  id: string;
  vehicle_id: string;
  proposal_type: string;
  buyer_id: string | null;
  buyer_name: string;
  buyer_iban: string | null;
  total_amount: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
  down_payment: number | null;
  financed_amount: number | null;
  finance_term_model_id: string | null;
  monthly_payment: number | null;
  total_financed: number | null;
  commission_estimated: number | null;
  internal_flag: string | null;
}

// ── Vehicles ──────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapVehicle);
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapVehicle(data) : null;
}

export async function createVehicle(vehicle: Partial<Vehicle>, userId: string): Promise<Vehicle> {
  const insertData = {
      plate: vehicle.plate || '',
      vin: vehicle.vin || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      version: vehicle.version || '',
      color: vehicle.color || '',
      vehicle_class: vehicle.vehicle_class || 'turismo',
      vehicle_type: vehicle.vehicle_type || 'ocasion',
      engine_type: vehicle.engine_type || 'gasolina',
      transmission: vehicle.transmission || 'manual',
      displacement: vehicle.displacement || 0,
      horsepower: vehicle.horsepower || 0,
      km_entry: vehicle.km_entry || 0,
      first_registration: vehicle.first_registration || new Date().toISOString(),
      purchase_date: vehicle.purchase_date || new Date().toISOString(),
      expo_date: vehicle.expo_date || new Date().toISOString(),
      has_second_key: vehicle.has_second_key ?? false,
      has_technical_sheet: vehicle.has_technical_sheet ?? false,
      has_circulation_permit: vehicle.has_circulation_permit ?? false,
      has_manual: vehicle.has_manual ?? false,
      purchase_price: vehicle.purchase_price || 0,
      pvp_base: vehicle.pvp_base || 0,
      price_professionals: vehicle.price_professionals || 0,
      price_financed: vehicle.price_financed || 0,
      price_cash: vehicle.price_cash || 0,
      tax_type: vehicle.tax_type || 'igic',
      tax_rate: vehicle.tax_rate ?? 7,
      irpf_rate: vehicle.irpf_rate ?? 0,
      discount: vehicle.discount ?? 0,
      total_expenses: vehicle.total_expenses || 0,
      total_cost: vehicle.total_cost || 0,
      status: ((vehicle as any).status || 'no_disponible'),
      net_profit: vehicle.net_profit || 0,
      center: vehicle.center || 'Las Palmas',
      itv_date: vehicle.itv_date || null,
      master_brand_id: vehicle.master_brand_id || null,
      master_model_id: vehicle.master_model_id || null,
      master_version_id: vehicle.master_version_id || null,
      segment_id: vehicle.segment_id || null,
      body_type: vehicle.body_type || null,
      segment_auto_assigned: vehicle.segment_auto_assigned ?? false,
      needs_review: vehicle.needs_review ?? false,
      created_from: (vehicle as any).created_from || null,
      owner_client_id: (vehicle as any).owner_client_id || null,
      created_by: userId,
      updated_by: userId,
    };
  const { data, error } = await supabase
    .from('vehicles')
    .insert(insertData as any)
    .select()
    .single();
  if (error) throw error;
  return mapVehicle(data);
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>, userId: string): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ ...updates, updated_by: userId } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapVehicle(data);
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

// ── Expenses ──────────────────────────────────────────────

export async function getExpenses(vehicleId?: string): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('date', { ascending: false });
  if (vehicleId) query = query.eq('vehicle_id', vehicleId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapExpense);
}

export async function createExpense(expense: Partial<Expense>, userId: string): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      vehicle_id: expense.vehicle_id,
      date: expense.date || new Date().toISOString(),
      completion_date: expense.completion_date || null,
      supplier_id: expense.supplier_id || null,
      supplier_name: expense.supplier_name || '',
      invoice_number: expense.invoice_number || '',
      amount: expense.amount || 0,
      description: expense.description || '',
      observations: expense.observations || '',
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapExpense(data);
}

export async function updateExpense(id: string, updates: Partial<Expense>, userId: string): Promise<Expense> {
  const { expense_category, ...rest } = updates;
  const payload: any = { ...rest, updated_by: userId };
  if (expense_category) payload.expense_category = expense_category;
  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapExpense(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ── Notes ─────────────────────────────────────────────────

export async function getNotes(vehicleId?: string): Promise<Note[]> {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false });
  if (vehicleId) query = query.eq('vehicle_id', vehicleId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapNote);
}

export async function createNote(note: Partial<Note>, userId: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      vehicle_id: note.vehicle_id,
      content: note.content || '',
      author_id: userId,
      author_name: note.author_name || '',
    })
    .select()
    .single();
  if (error) throw error;
  return mapNote(data);
}

// ── Suppliers ─────────────────────────────────────────────

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('is_internal', { ascending: false }).order('name');
  if (error) throw error;
  return (data || []) as Supplier[];
}

export async function getInternalSupplier(): Promise<Supplier | null> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('is_internal', true).limit(1).maybeSingle();
  if (error) throw error;
  return data as Supplier | null;
}

export async function createSupplier(s: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert({
    name: s.name || '',
    phone: s.phone || '',
    email: s.email || null,
    address: s.address || null,
    specialty: s.specialty || null,
    active: s.active ?? true,
  }).select().single();
  if (error) throw error;
  return data as Supplier;
}

export async function updateSupplier(id: string, s: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').update(s).eq('id', id).select().single();
  if (error) throw error;
  return data as Supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// ── Insurers ──────────────────────────────────────────────

export async function getInsurers(): Promise<Insurer[]> {
  const { data, error } = await supabase.from('insurers').select('*').order('name');
  if (error) throw error;
  return (data || []) as Insurer[];
}

export async function createInsurer(i: Partial<Insurer>): Promise<Insurer> {
  const { data, error } = await supabase.from('insurers').insert({
    name: i.name || '',
    phone: i.phone || null,
    email: i.email || null,
    contact_person: i.contact_person || null,
    active: i.active ?? true,
  }).select().single();
  if (error) throw error;
  return data as Insurer;
}

export async function updateInsurer(id: string, i: Partial<Insurer>): Promise<Insurer> {
  const { data, error } = await supabase.from('insurers').update(i).eq('id', id).select().single();
  if (error) throw error;
  return data as Insurer;
}

export async function deleteInsurer(id: string): Promise<void> {
  const { error } = await supabase.from('insurers').delete().eq('id', id);
  if (error) throw error;
}

// ── Mappers (DB row → app type) ───────────────────────────

function mapVehicle(row: any): Vehicle {
  return {
    ...row,
    first_registration: row.first_registration || '',
    purchase_date: row.purchase_date || '',
    expo_date: row.expo_date || '',
    itv_date: row.itv_date || null,
    purchase_price: Number(row.purchase_price),
    pvp_base: Number(row.pvp_base),
    price_professionals: Number(row.price_professionals),
    price_financed: Number(row.price_financed),
    price_cash: Number(row.price_cash),
    tax_rate: Number(row.tax_rate),
    irpf_rate: Number(row.irpf_rate),
    discount: Number(row.discount),
    total_expenses: Number(row.total_expenses),
    total_cost: Number(row.total_cost),
    net_profit: Number(row.net_profit),
    policy_amount: row.policy_amount ? Number(row.policy_amount) : null,
    real_sale_price: row.real_sale_price ? Number(row.real_sale_price) : null,
  };
}

function mapExpense(row: any): Expense {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

function mapNote(row: any): Note {
  return row as Note;
}

// ── Buyers ────────────────────────────────────────────────

export async function getBuyers(): Promise<Buyer[]> {
  const { data, error } = await supabase.from('buyers').select('*').order('name');
  if (error) throw error;
  return (data || []) as Buyer[];
}

export async function getBuyerById(id: string): Promise<Buyer | null> {
  const { data, error } = await supabase.from('buyers').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Buyer | null;
}

export async function createBuyer(b: Partial<Buyer>): Promise<Buyer> {
  const { data, error } = await supabase.from('buyers').insert({
    name: b.name || '',
    last_name: b.last_name || null,
    dni: b.dni || null,
    phone: b.phone || null,
    email: b.email || null,
    address: b.address || null,
    iban: b.iban || null,
    invoice_number: b.invoice_number || null,
    invoice_date: b.invoice_date || null,
    client_code: b.client_code || null,
    city: b.city || null,
    postal_code: b.postal_code || null,
    province: b.province || null,
    client_type: b.client_type || 'particular',
    is_buyer: b.is_buyer ?? true,
    is_seller: b.is_seller ?? false,
    acquisition_channel_id: b.acquisition_channel_id || null,
    company_name: b.company_name || null,
    cif: b.cif || null,
    contact_name: b.contact_name || null,
    fiscal_address: b.fiscal_address || null,
    vat_regime: b.vat_regime || null,
    active: b.active ?? true,
    created_by: b.created_by || null,
  }).select().single();
  if (error) throw error;
  return data as Buyer;
}

export async function updateBuyer(id: string, b: Partial<Buyer>): Promise<Buyer> {
  const { data, error } = await supabase.from('buyers').update(b).eq('id', id).select().single();
  if (error) throw error;
  return data as Buyer;
}

// ── Acquisition Channels ──────────────────────────────────

export async function getAcquisitionChannels(): Promise<AcquisitionChannel[]> {
  const { data, error } = await supabase
    .from('acquisition_channels')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []) as AcquisitionChannel[];
}

export async function createAcquisitionChannel(name: string): Promise<AcquisitionChannel> {
  const { data, error } = await supabase
    .from('acquisition_channels')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data as AcquisitionChannel;
}

export async function updateAcquisitionChannel(id: string, updates: Partial<AcquisitionChannel>): Promise<AcquisitionChannel> {
  const { data, error } = await supabase
    .from('acquisition_channels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AcquisitionChannel;
}

// ── After Sale Tickets ────────────────────────────────────

export async function getAfterSaleTickets(vehicleId: string): Promise<AfterSaleTicket[]> {
  const { data, error } = await supabase
    .from('after_sale_tickets')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as AfterSaleTicket[];
}

export async function createAfterSaleTicket(ticket: { vehicle_id: string; task_description: string; requested_by: string; requested_by_name: string }): Promise<AfterSaleTicket> {
  const { data, error } = await supabase
    .from('after_sale_tickets')
    .insert(ticket)
    .select()
    .single();
  if (error) throw error;
  return data as AfterSaleTicket;
}

export async function validateAfterSaleTicket(id: string, status: 'validado' | 'rechazado', validatedBy: string): Promise<AfterSaleTicket> {
  const { data, error } = await supabase
    .from('after_sale_tickets')
    .update({ validation_status: status, validated_by: validatedBy, validation_date: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AfterSaleTicket;
}

// ── Audit Logs ────────────────────────────────────────────

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AuditLog[];
}

export async function getAuditLogsByVehicle(vehicleId: string, limit = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AuditLog[];
}

// ── Documents ─────────────────────────────────────────────

/** Extract storage path from a file_url (legacy full URL or relative path) */
function extractStoragePath(fileUrl: string, bucket: string): string {
  const marker = `/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) return decodeURIComponent(fileUrl.substring(idx + marker.length));
  return fileUrl; // already a relative path
}

/** Generate a signed URL for a file in a private bucket (30 min TTL) */
export async function getSignedDocumentUrl(path: string, bucket = 'vehicle-documents'): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 1800);
  if (error) throw error;
  return data.signedUrl;
}

export async function getDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const docs = (data || []) as VehicleDocument[];

  // Generate signed URLs for each document
  const withUrls = await Promise.all(
    docs.map(async (doc) => {
      try {
        const path = extractStoragePath(doc.file_url, 'vehicle-documents');
        const signedUrl = await getSignedDocumentUrl(path, 'vehicle-documents');
        return { ...doc, file_url: signedUrl, _storage_path: path };
      } catch {
        return doc; // fallback to original URL if signing fails
      }
    })
  );
  return withUrls;
}

export async function uploadDocument(file: File, vehicleId: string, category: string, userId: string, userName: string): Promise<VehicleDocument> {
  const safeName = file.name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.\-]/g, '');
  const path = `${vehicleId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('vehicle-documents')
    .upload(path, file);
  if (uploadError) throw uploadError;

  // Store the relative path, NOT the public URL (bucket is private)
  const { data, error } = await supabase
    .from('documents')
    .insert({
      vehicle_id: vehicleId,
      category,
      filename: file.name,
      file_url: path,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: userId,
      uploaded_by_name: userName,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VehicleDocument;
}

export async function updateDocument(id: string, updates: { filename?: string; category?: string }): Promise<VehicleDocument> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as VehicleDocument;
}

export async function deleteDocument(id: string, fileUrl: string): Promise<void> {
  // Extract path — works for both legacy full URLs and new relative paths
  const path = extractStoragePath(fileUrl, 'vehicle-documents');
  await supabase.storage.from('vehicle-documents').remove([path]);
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

/** Get confirmed smart_documents linked to a vehicle with signed URLs */
export async function getSmartDocumentsForVehicle(vehicleId: string) {
  const { data, error } = await supabase
    .from('smart_documents')
    .select('*')
    .eq('linked_vehicle_id', vehicleId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const docs = data || [];

  const withUrls = await Promise.all(
    docs.map(async (doc) => {
      try {
        const signedUrl = await getSignedDocumentUrl(doc.file_path, 'smart-documents');
        return { ...doc, _signed_url: signedUrl };
      } catch {
        return { ...doc, _signed_url: '' };
      }
    })
  );
  return withUrls;
}

// ── Profiles (for seller selector) ────────────────────────

export async function getProfiles(): Promise<{ id: string; user_id: string; full_name: string; email: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, full_name, email')
    .eq('active', true)
    .order('full_name');
  if (error) throw error;
  return data || [];
}

// ── Proposals ─────────────────────────────────────────────

export async function getProposals(vehicleId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Proposal[];
}

export async function createProposal(proposal: {
  vehicle_id: string;
  proposal_type: string;
  buyer_id?: string | null;
  buyer_name: string;
  buyer_iban: string | null;
  total_amount: number;
  created_by: string;
  created_by_name: string;
  down_payment?: number | null;
  financed_amount?: number | null;
  finance_term_model_id?: string | null;
  monthly_payment?: number | null;
  total_financed?: number | null;
  commission_estimated?: number | null;
  internal_flag?: string | null;
}): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .insert(proposal as any)
    .select()
    .single();
  if (error) throw error;
  return data as Proposal;
}

// ── Sales ─────────────────────────────────────────────────

export async function createSale(
  saleData: {
    vehicle_id: string;
    buyer_id: string;
    seller_id: string;
    seller_name: string;
    sale_date: string;
    sale_price: number;
    discount: number;
    tax_type: string;
    tax_rate: number;
    payment_method: string;
    finance_entity?: string | null;
    notes?: string | null;
    payment_breakdown?: { method: string; amount: number }[] | null;
    discount_condition?: string | null;
  },
  userId: string
): Promise<Sale> {
  // 1. Insert sale
  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...saleData,
      created_by: userId,
    } as any)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este vehículo ya tiene una venta registrada');
    }
    throw error;
  }

  // 2. Update vehicle
  const { error: vError } = await supabase
    .from('vehicles')
    .update({
      status: 'vendido' as any,
      sale_date: saleData.sale_date,
      buyer_id: saleData.buyer_id,
      sold_by: saleData.seller_name,
      real_sale_price: saleData.sale_price,
      updated_by: userId,
    } as any)
    .eq('id', saleData.vehicle_id);

  if (vError) throw vError;

  return mapSale(data);
}

export async function getSaleByVehicleId(vehicleId: string): Promise<Sale | null> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSale(data) : null;
}

export async function getSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('sale_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSale);
}

function mapSale(row: any): Sale {
  return {
    ...row,
    sale_price: Number(row.sale_price),
    discount: Number(row.discount),
    tax_rate: Number(row.tax_rate),
    base_amount: Number(row.base_amount),
    tax_amount: Number(row.tax_amount),
    total_amount: Number(row.total_amount),
    payment_breakdown: row.payment_breakdown || null,
    discount_condition: row.discount_condition || null,
  };
}

// ── Company Settings ──────────────────────────────────────

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as CompanySettings | null;
}

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
  const current = await getCompanySettings();
  if (!current) throw new Error('No se encontraron datos de empresa');
  const { data, error } = await supabase
    .from('company_settings')
    .update(updates as any)
    .eq('id', current.id)
    .select()
    .single();
  if (error) throw error;
  return data as CompanySettings;
}

// ── Invoice Series ────────────────────────────────────────

export async function getInvoiceSeries(): Promise<InvoiceSeries[]> {
  const { data, error } = await supabase
    .from('invoice_series')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []) as InvoiceSeries[];
}

export async function createInvoiceSeries(series: Partial<InvoiceSeries>): Promise<InvoiceSeries> {
  const { data, error } = await supabase
    .from('invoice_series')
    .insert({
      name: series.name || '',
      prefix: series.prefix || '',
      year: series.year || new Date().getFullYear(),
      active: series.active ?? true,
      is_default: series.is_default ?? false,
      is_rectificativa: series.is_rectificativa ?? false,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as InvoiceSeries;
}

export async function updateInvoiceSeries(id: string, updates: Partial<InvoiceSeries>): Promise<InvoiceSeries> {
  const { data, error } = await supabase
    .from('invoice_series')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as InvoiceSeries;
}

// ── Invoices ──────────────────────────────────────────────

export async function getInvoices(filters?: { status?: string; series_id?: string; from?: string; to?: string; type?: string }): Promise<Invoice[]> {
  let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.series_id) query = query.eq('series_id', filters.series_id);
  if (filters?.type) query = query.eq('invoice_type', filters.type);
  if (filters?.from) query = query.gte('issue_date', filters.from);
  if (filters?.to) query = query.lte('issue_date', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapInvoice(data) : null;
}

export async function createInvoiceFromSale(
  saleId: string,
  seriesId: string,
  userId: string,
  userName: string
): Promise<Invoice> {
  // 1. Get sale
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .single();
  if (saleErr) throw saleErr;
  if (sale.invoice_status === 'facturada') throw new Error('Esta venta ya tiene una factura emitida');

  // 2. Get vehicle
  const { data: vehicle, error: vErr } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', sale.vehicle_id)
    .single();
  if (vErr) throw vErr;

  // 3. Get buyer
  const { data: buyer, error: bErr } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', sale.buyer_id)
    .single();
  if (bErr) throw bErr;

  // 4. INSERT as borrador
  const { data: invoice, error: insErr } = await supabase
    .from('invoices')
    .insert({
      invoice_type: 'emitida',
      series_id: seriesId,
      status: 'borrador',
      sale_id: saleId,
      vehicle_id: sale.vehicle_id,
      buyer_id: sale.buyer_id,
      buyer_name: buyer.name,
      buyer_dni: buyer.dni,
      buyer_address: [buyer.address, buyer.city, buyer.postal_code, buyer.province].filter(Boolean).join(', ') || null,
      vehicle_plate: vehicle.plate,
      vehicle_vin: vehicle.vin,
      vehicle_brand_model: `${vehicle.brand} ${vehicle.model}`,
      base_amount: sale.base_amount,
      tax_type: sale.tax_type,
      tax_rate: sale.tax_rate,
      tax_amount: sale.tax_amount,
      total_amount: sale.total_amount,
      issued_by: userId,
      issued_by_name: userName,
    } as any)
    .select()
    .single();
  if (insErr) throw insErr;

  // 5. UPDATE to emitida (triggers numbering)
  const { data: emitted, error: emitErr } = await supabase
    .from('invoices')
    .update({ status: 'emitida' } as any)
    .eq('id', invoice.id)
    .select()
    .single();
  if (emitErr) throw emitErr;

  // 6. Update sale
  await supabase
    .from('sales')
    .update({
      invoice_status: 'facturada',
      invoice_number: emitted.full_number,
      invoice_date: new Date().toISOString(),
    } as any)
    .eq('id', saleId);

  return mapInvoice(emitted);
}

export async function createRectificativeInvoice(
  originalInvoiceId: string,
  data: { rectification_type: string; rectification_reason: string; base_amount: number; tax_rate: number; tax_amount: number; total_amount: number; notes?: string },
  seriesId: string,
  userId: string,
  userName: string
): Promise<Invoice> {
  // 1. Get original
  const original = await getInvoiceById(originalInvoiceId);
  if (!original) throw new Error('Factura original no encontrada');
  if (original.status !== 'emitida') throw new Error('Solo se pueden rectificar facturas emitidas');

  // 2. INSERT rectificativa as borrador
  const { data: rect, error: insErr } = await supabase
    .from('invoices')
    .insert({
      invoice_type: 'rectificativa',
      series_id: seriesId,
      status: 'borrador',
      vehicle_id: original.vehicle_id,
      buyer_id: original.buyer_id,
      buyer_name: original.buyer_name,
      buyer_dni: original.buyer_dni,
      buyer_address: original.buyer_address,
      vehicle_plate: original.vehicle_plate,
      vehicle_vin: original.vehicle_vin,
      vehicle_brand_model: original.vehicle_brand_model,
      base_amount: data.base_amount,
      tax_type: original.tax_type,
      tax_rate: data.tax_rate,
      tax_amount: data.tax_amount,
      total_amount: data.total_amount,
      rectifies_invoice_id: originalInvoiceId,
      rectification_type: data.rectification_type,
      rectification_reason: data.rectification_reason,
      issued_by: userId,
      issued_by_name: userName,
      notes: data.notes || null,
    } as any)
    .select()
    .single();
  if (insErr) throw insErr;

  // 3. Emit rectificativa
  const { data: emitted, error: emitErr } = await supabase
    .from('invoices')
    .update({ status: 'emitida' } as any)
    .eq('id', rect.id)
    .select()
    .single();
  if (emitErr) throw emitErr;

  // 4. Mark original as rectificada
  await supabase
    .from('invoices')
    .update({ status: 'rectificada' } as any)
    .eq('id', originalInvoiceId);

  return mapInvoice(emitted);
}

export async function getIgicBook(startDate: string, endDate: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'emitida')
    .gte('issue_date', startDate)
    .lte('issue_date', endDate)
    .order('full_number');
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function getInvoicesByVehicle(vehicleId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function getInvoiceBySaleId(saleId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('sale_id', saleId)
    .neq('status', 'anulada')
    .maybeSingle();
  if (error) throw error;
  return data ? mapInvoice(data) : null;
}

function mapInvoice(row: any): Invoice {
  return {
    ...row,
    base_amount: Number(row.base_amount),
    tax_rate: Number(row.tax_rate),
    tax_amount: Number(row.tax_amount),
    total_amount: Number(row.total_amount),
    payment_status: row.payment_status || 'pendiente',
  };
}

// ── Payments ──────────────────────────────────────────────

function mapPayment(row: any): Payment {
  return { ...row, amount: Number(row.amount) };
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPayment);
}

export async function getPaymentsByReservation(reservationId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('payment_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPayment);
}

export async function getInvoicePaymentSummary(invoiceId: string): Promise<{ totalPaid: number; totalRefunded: number; netPaid: number; pending: number; status: string }> {
  const payments = await getPaymentsByInvoice(invoiceId);
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error('Factura no encontrada');

  const totalPaid = payments.filter(p => !p.is_refund).reduce((s, p) => s + p.amount, 0);
  const totalRefunded = payments.filter(p => p.is_refund).reduce((s, p) => s + p.amount, 0);
  const netPaid = Math.round((totalPaid - totalRefunded) * 100) / 100;
  const pending = Math.round((invoice.total_amount - netPaid) * 100) / 100;

  let status = 'pendiente';
  if (netPaid >= invoice.total_amount) status = 'cobrada';
  else if (netPaid > 0) status = 'parcial';

  return { totalPaid, totalRefunded, netPaid, pending: Math.max(0, pending), status };
}

export async function createPayment(
  paymentData: {
    payment_type: 'factura' | 'reserva';
    invoice_id?: string | null;
    reservation_id?: string | null;
    vehicle_id: string;
    buyer_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    is_refund: boolean;
    notes?: string | null;
  },
  userId: string
): Promise<Payment> {
  if (paymentData.amount <= 0) throw new Error('El importe debe ser mayor que 0');

  if (paymentData.payment_type === 'factura') {
    if (!paymentData.invoice_id) throw new Error('Se requiere referencia a factura');
    const invoice = await getInvoiceById(paymentData.invoice_id);
    if (!invoice) throw new Error('Factura no encontrada');

    // Block payments on non-emitida invoices (covers borrador & rectificada)
    if (invoice.status !== 'emitida') throw new Error('Solo se pueden registrar pagos en facturas emitidas');

    if (!paymentData.is_refund) {
      // Get current summary
      const summary = await getInvoicePaymentSummary(paymentData.invoice_id);
      if (summary.status === 'cobrada') throw new Error('Esta factura ya está cobrada. Solo se permiten devoluciones');
      const newTotal = summary.netPaid + paymentData.amount;
      if (newTotal > invoice.total_amount + 0.01) throw new Error(`El importe supera el saldo pendiente (${formatCurrencyPlain(summary.pending)} €)`);
    }
  }

  if (paymentData.payment_type === 'reserva') {
    if (!paymentData.reservation_id) throw new Error('Se requiere referencia a reserva');
    const reservation = await getReservationById(paymentData.reservation_id);
    if (!reservation) throw new Error('Reserva no encontrada');
    if (reservation.status === 'convertida' && !paymentData.is_refund) throw new Error('No se pueden registrar cobros en reservas convertidas');
    if (reservation.status === 'cancelada' && !paymentData.is_refund) throw new Error('Reserva cancelada. Solo se permiten devoluciones');
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      payment_type: paymentData.payment_type,
      invoice_id: paymentData.invoice_id || null,
      reservation_id: paymentData.reservation_id || null,
      vehicle_id: paymentData.vehicle_id,
      buyer_id: paymentData.buyer_id,
      amount: paymentData.amount,
      payment_date: paymentData.payment_date,
      payment_method: paymentData.payment_method,
      is_refund: paymentData.is_refund,
      notes: paymentData.notes || null,
      created_by: userId,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return mapPayment(data);
}

function formatCurrencyPlain(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

export async function getInvoicesPendingPayment(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'emitida')
    .neq('payment_status', 'cobrada')
    .order('issue_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function getReservationPaymentsTotal(reservationId: string): Promise<{ totalPaid: number; totalRefunded: number; netPaid: number }> {
  const payments = await getPaymentsByReservation(reservationId);
  const totalPaid = payments.filter(p => !p.is_refund).reduce((s, p) => s + p.amount, 0);
  const totalRefunded = payments.filter(p => p.is_refund).reduce((s, p) => s + p.amount, 0);
  return { totalPaid, totalRefunded, netPaid: Math.round((totalPaid - totalRefunded) * 100) / 100 };
}

// ── Buyer History ─────────────────────────────────────────

export async function getBuyerSalesHistory(buyerId: string): Promise<(Sale & { vehicle?: Vehicle })[]> {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('sale_date', { ascending: false });
  if (error) throw error;
  if (!sales || sales.length === 0) return [];

  const vehicleIds = [...new Set(sales.map(s => s.vehicle_id))];
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .in('id', vehicleIds);

  const vehicleMap = new Map((vehicles || []).map(v => [v.id, mapVehicle(v)]));
  return sales.map(s => ({ ...mapSale(s), vehicle: vehicleMap.get(s.vehicle_id) }));
}

export async function getBuyerInvoices(buyerId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoice);
}

export async function checkDuplicateDni(dni: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from('buyers').select('id', { count: 'exact', head: true }).eq('dni', dni);
  if (excludeId) query = query.neq('id', excludeId);
  const { count, error } = await query;
  if (error) throw error;
  return (count || 0) > 0;
}

// ── Reservations ──────────────────────────────────────────

export async function getReservations(filters?: { status?: string }): Promise<Reservation[]> {
  let query = supabase.from('reservations').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapReservation);
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  const { data, error } = await supabase.from('reservations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapReservation(data) : null;
}

export async function getActiveReservationByVehicle(vehicleId: string): Promise<Reservation | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .in('reservation_status', ['pending_signature', 'signed'])
    .maybeSingle();
  if (error) throw error;
  return data ? mapReservation(data) : null;
}

export async function getReservationsByVehicle(vehicleId: string): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReservation);
}

export async function createReservation(
  reservation: {
    vehicle_id: string;
    buyer_id: string;
    expiration_date: string;
    reservation_amount: number;
    payment_method?: string | null;
    notes?: string | null;
    deposit_amount_source?: 'auto' | 'manual';
    vehicle_pvp_snapshot?: number;
    reservation_status?: string;
  },
  userId: string
): Promise<Reservation> {
  if (reservation.reservation_amount <= 0) {
    throw new Error('La señal debe ser superior a 0,00 €');
  }
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      vehicle_id: reservation.vehicle_id,
      buyer_id: reservation.buyer_id,
      expiration_date: reservation.expiration_date,
      reservation_amount: reservation.reservation_amount,
      payment_method: reservation.payment_method || null,
      notes: reservation.notes || null,
      deposit_amount_source: reservation.deposit_amount_source || 'auto',
      vehicle_pvp_snapshot: reservation.vehicle_pvp_snapshot || 0,
      reservation_status: reservation.reservation_status || 'draft',
      created_by: userId,
    } as any)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Este vehículo ya tiene una reserva activa');
    throw error;
  }
  return mapReservation(data);
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapReservation(data);
}

export async function cancelReservation(id: string, reason?: string): Promise<void> {
  const res = await getReservationById(id);
  if (!res) throw new Error('Reserva no encontrada');

  await supabase.from('reservations').update({
    reservation_status: 'cancelled',
    cancellation_reason: reason || null,
    cancelled_at: new Date().toISOString(),
  } as any).eq('id', id);

  const { data: vehicle } = await supabase.from('vehicles').select('status').eq('id', res.vehicle_id).single();
  if (vehicle && vehicle.status === 'reservado') {
    await supabase.from('vehicles').update({ status: 'disponible' } as any).eq('id', res.vehicle_id);
  }
}

export async function expireReservation(id: string): Promise<void> {
  const res = await getReservationById(id);
  if (!res) throw new Error('Reserva no encontrada');

  await supabase.from('reservations').update({
    reservation_status: 'expired',
  } as any).eq('id', id);

  const { data: vehicle } = await supabase.from('vehicles').select('status').eq('id', res.vehicle_id).single();
  if (vehicle && vehicle.status === 'reservado') {
    await supabase.from('vehicles').update({ status: 'disponible' } as any).eq('id', res.vehicle_id);
  }
}

export async function convertReservationToSale(id: string, saleId: string): Promise<void> {
  await supabase.from('reservations').update({
    reservation_status: 'converted',
    converted_sale_id: saleId,
    converted_to_sale_at: new Date().toISOString(),
  } as any).eq('id', id);
}

export async function updateReservationWorkflowStatus(
  id: string,
  newStatus: string,
  extraUpdates?: Record<string, any>
): Promise<Reservation> {
  const updates: Record<string, any> = {
    reservation_status: newStatus,
    ...extraUpdates,
  };

  const { data, error } = await supabase
    .from('reservations')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapReservation(data);
}

export async function getReservationClauses(): Promise<import('./types').ReservationClause[]> {
  const { data, error } = await supabase
    .from('reservation_clauses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as any;
}

// ── Reservation Documents ─────────────────────────────────

export async function getReservationDocuments(reservationId: string): Promise<import('./types').ReservationDocument[]> {
  const { data, error } = await supabase
    .from('reservation_documents')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as any;
}

export async function createReservationDocument(doc: {
  reservation_id: string;
  document_type: string;
  snapshot_json: any;
  created_by: string;
}): Promise<import('./types').ReservationDocument> {
  // Auto-increment version
  const { data: existing } = await supabase
    .from('reservation_documents')
    .select('version')
    .eq('reservation_id', doc.reservation_id)
    .eq('document_type', doc.document_type)
    .order('version', { ascending: false })
    .limit(1);
  const nextVersion = (existing && existing.length > 0 ? (existing[0] as any).version : 0) + 1;

  const { data, error } = await supabase
    .from('reservation_documents')
    .insert({ ...doc, version: nextVersion } as any)
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

const DOC_TYPE_TO_REPORT: Record<string, string> = {
  reservation_document: 'reservation-contract',
  deposit_receipt: 'reservation-receipt',
  sales_contract: 'sales-contract',
  proforma_invoice: 'proforma-invoice',
};

const DOC_TYPE_TO_EVENT: Record<string, string> = {
  reservation_document: 'reservation_document_generated',
  deposit_receipt: 'deposit_receipt_generated',
  sales_contract: 'sales_contract_generated',
  proforma_invoice: 'proforma_generated',
};

/** View an existing document's HTML — returns saved html_content if available */
export async function viewDocumentHtml(reservationId: string, docType: string): Promise<string> {
  // Check if there's a saved html_content first
  const { data: existingDoc } = await supabase
    .from('reservation_documents')
    .select('html_content')
    .eq('reservation_id', reservationId)
    .eq('document_type', docType)
    .order('version', { ascending: false })
    .limit(1);

  if (existingDoc && existingDoc.length > 0 && (existingDoc[0] as any).html_content) {
    return (existingDoc[0] as any).html_content as string;
  }

  const reportType = DOC_TYPE_TO_REPORT[docType] || docType;
  const res = await supabase.functions.invoke('generate-report-pdf', {
    body: { type: reportType, params: { reservation_id: reservationId } },
  });
  if (res.error) throw new Error(res.error.message || 'Error generando vista previa');
  const { url } = res.data;
  const htmlRes = await fetch(url);
  return htmlRes.text();
}

/** Update html_content of an existing document */
export async function updateDocumentHtmlContent(docId: string, htmlContent: string): Promise<void> {
  const { error } = await supabase
    .from('reservation_documents')
    .update({ html_content: htmlContent } as any)
    .eq('id', docId);
  if (error) throw error;
}

/** Get the latest document record for a given reservation + type */
export async function getLatestReservationDocument(
  reservationId: string,
  docType: string
): Promise<import('./types').ReservationDocument | null> {
  const { data, error } = await supabase
    .from('reservation_documents')
    .select('*')
    .eq('reservation_id', reservationId)
    .eq('document_type', docType)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? (data[0] as any) : null;
}

export async function generateAndSaveDocument(
  reservationId: string,
  docType: string,
  snapshot: any,
  userId: string,
  userName: string
): Promise<{ html: string; doc: import('./types').ReservationDocument }> {
  // 1. Save document record with snapshot
  const doc = await createReservationDocument({
    reservation_id: reservationId,
    document_type: docType,
    snapshot_json: snapshot,
    created_by: userId,
  });

  // 2. Generate the PDF/HTML via edge function
  const reportType = DOC_TYPE_TO_REPORT[docType] || docType;
  const res = await supabase.functions.invoke('generate-report-pdf', {
    body: { type: reportType, params: { reservation_id: reservationId } },
  });
  if (res.error) throw new Error(res.error.message || 'Error generando documento');
  const { url } = res.data;
  const htmlRes = await fetch(url);
  const html = await htmlRes.text();

  // 3. Save html_content for editable documents
  await updateDocumentHtmlContent(doc.id, html);

  // 4. Log timeline event
  const eventType = DOC_TYPE_TO_EVENT[docType] || 'document_regenerated';
  await addTimelineEvent(reservationId, eventType, userId, userName, {
    document_type: docType,
    version: doc.version,
    document_number: doc.document_number,
  });

  return { html, doc };
}

// ── Reservation Timeline ──────────────────────────────────

export async function getReservationTimeline(reservationId: string): Promise<import('./types').ReservationTimelineEvent[]> {
  const { data, error } = await supabase
    .from('reservation_timeline')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as any;
}

export async function addTimelineEvent(
  reservationId: string,
  eventType: string,
  actorId: string,
  actorName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await supabase.from('reservation_timeline').insert({
    reservation_id: reservationId,
    event_type: eventType,
    actor_id: actorId,
    actor_name: actorName,
    metadata: metadata || {},
  } as any);
}

// ── Pass to Signature ─────────────────────────────────────

export async function passToSignature(
  reservationId: string,
  userId: string,
  userName: string,
  snapshot: any
): Promise<{ reservation: Reservation; contractHtml: string; proformaHtml: string }> {
  // 1. Save snapshot and update status
  const reservation = await updateReservationWorkflowStatus(reservationId, 'pending_signature', {
    passed_to_signature_at: new Date().toISOString(),
    signature_snapshot: snapshot,
  });

  // 2. Generate real documents with snapshots (auto-versioned + auto-numbered)
  const [contractResult, proformaResult] = await Promise.all([
    generateAndSaveDocument(reservationId, 'sales_contract', snapshot, userId, userName),
    generateAndSaveDocument(reservationId, 'proforma_invoice', snapshot, userId, userName),
  ]);

  // 3. Add timeline event
  await addTimelineEvent(reservationId, 'passed_to_signature', userId, userName, {
    snapshot_keys: Object.keys(snapshot),
    contract_number: contractResult.doc.document_number,
    proforma_number: proformaResult.doc.document_number,
  });

  return { reservation, contractHtml: contractResult.html, proformaHtml: proformaResult.html };
}

export async function markAsSigned(reservationId: string, userId: string, userName: string): Promise<Reservation> {
  const res = await updateReservationWorkflowStatus(reservationId, 'signed', {
    signed_at: new Date().toISOString(),
  });
  await addTimelineEvent(reservationId, 'marked_as_signed', userId, userName);
  return res;
}

// markAsPaid and markAsDelivered removed — payments and deliveries are now managed in /sales

function mapReservation(row: any): Reservation {
  return {
    ...row,
    reservation_amount: Number(row.reservation_amount),
    vehicle_pvp_snapshot: Number(row.vehicle_pvp_snapshot || 0),
  };
}

// ── Notifications ─────────────────────────────────────────

export async function getNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('seen', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as AppNotification[];
}

export async function markNotificationsSeen(ids: string[]): Promise<void> {
  const { error } = await supabase.from('notifications').update({ seen: true } as any).in('id', ids);
  if (error) throw error;
}

export async function checkAndCreateExpirationAlerts(): Promise<void> {
  // Get active reservations expiring within 24h that haven't sent alerts
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*')
    .in('reservation_status', ['pending_signature', 'signed']);

  if (!reservations || reservations.length === 0) return;

  // Get all active users
  const { data: profiles } = await supabase.from('profiles').select('user_id').eq('active', true);
  if (!profiles || profiles.length === 0) return;

  // Get vehicles and buyers for messages
  const vehicleIds = [...new Set(reservations.map(r => r.vehicle_id))];
  const buyerIds = [...new Set(reservations.map(r => r.buyer_id))];
  const { data: vehicles } = await supabase.from('vehicles').select('id, plate, brand, model').in('id', vehicleIds);
  const { data: buyers } = await supabase.from('buyers').select('id, name').in('id', buyerIds);

  const vehicleMap = new Map((vehicles || []).map(v => [v.id, v]));
  const buyerMap = new Map((buyers || []).map(b => [b.id, b]));

  for (const res of reservations) {
    const expDate = new Date(res.expiration_date);
    const v = vehicleMap.get(res.vehicle_id);
    const b = buyerMap.get(res.buyer_id);
    const vLabel = v ? `${v.brand} ${v.model} (${v.plate})` : 'Vehículo';
    const bLabel = b ? b.name : 'Cliente';

    // 24h alert
    if (!res.reminder_24h_sent && expDate <= in24h && expDate > now) {
      const notifications = profiles.map(p => ({
        user_id: p.user_id,
        type: 'reserva_24h',
        reference_id: res.id,
        message: `Reserva de ${vLabel} para ${bLabel} vence en menos de 24h`,
      }));
      await supabase.from('notifications').insert(notifications as any);
      await supabase.from('reservations').update({ reminder_24h_sent: true, reminder_24h_sent_at: now.toISOString() } as any).eq('id', res.id);
    }

    // Same day alert
    if (!res.reminder_same_day_sent && expDate.toDateString() === now.toDateString()) {
      const notifications = profiles.map(p => ({
        user_id: p.user_id,
        type: 'reserva_hoy',
        reference_id: res.id,
        message: `Reserva de ${vLabel} para ${bLabel} vence HOY`,
      }));
      await supabase.from('notifications').insert(notifications as any);
      await supabase.from('reservations').update({ reminder_same_day_sent: true, reminder_same_day_sent_at: now.toISOString() } as any).eq('id', res.id);
    }
  }
}

// ── Cash Movements (Treasury) ─────────────────────────────

function mapCashMovement(row: any): CashMovement {
  return { ...row, amount: Number(row.amount) };
}

export async function getCashMovements(filters?: {
  from?: string; to?: string; movement_type?: string; movement_reason?: string;
  origin_type?: string; payment_method?: string; is_system?: boolean;
}): Promise<CashMovement[]> {
  let query = supabase.from('cash_movements').select('*').order('movement_date', { ascending: false });
  if (filters?.from) query = query.gte('movement_date', filters.from);
  if (filters?.to) query = query.lte('movement_date', filters.to);
  if (filters?.movement_type) query = query.eq('movement_type', filters.movement_type);
  if (filters?.movement_reason) query = query.eq('movement_reason', filters.movement_reason);
  if (filters?.origin_type) query = query.eq('origin_type', filters.origin_type);
  if (filters?.payment_method) query = query.eq('payment_method', filters.payment_method);
  if (filters?.is_system === true) query = query.eq('is_system_generated', true);
  if (filters?.is_system === false) query = query.eq('is_system_generated', false);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCashMovement);
}

export async function getCashBalance(): Promise<number> {
  const { data, error } = await supabase.from('cash_movements').select('movement_type, amount');
  if (error) throw error;
  let balance = 0;
  (data || []).forEach(r => {
    const amt = Number(r.amount);
    balance += r.movement_type === 'ingreso' ? amt : -amt;
  });
  return Math.round(balance * 100) / 100;
}

export async function getCashSummary(month: number, year: number): Promise<{ ingresos: number; gastos: number; resultado: number }> {
  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();
  const { data, error } = await supabase.from('cash_movements').select('movement_type, amount')
    .gte('movement_date', from).lte('movement_date', to);
  if (error) throw error;
  let ingresos = 0, gastos = 0;
  (data || []).forEach(r => {
    const amt = Number(r.amount);
    if (r.movement_type === 'ingreso') ingresos += amt;
    else gastos += amt;
  });
  return {
    ingresos: Math.round(ingresos * 100) / 100,
    gastos: Math.round(gastos * 100) / 100,
    resultado: Math.round((ingresos - gastos) * 100) / 100,
  };
}

export async function createManualCashMovement(data: {
  movement_type: string; movement_reason: string; description: string;
  amount: number; movement_date: string; payment_method: string; notes?: string | null;
}, userId: string): Promise<CashMovement> {
  const { data: row, error } = await supabase.from('cash_movements').insert({
    movement_type: data.movement_type,
    movement_reason: data.movement_reason,
    origin_type: 'manual',
    description: data.description,
    amount: data.amount,
    movement_date: data.movement_date,
    payment_method: data.payment_method,
    notes: data.notes || null,
    is_system_generated: false,
    created_by: userId,
  } as any).select().single();
  if (error) throw error;
  return mapCashMovement(row);
}

export async function updateCashMovementNotes(id: string, fields: { description?: string; notes?: string }): Promise<CashMovement> {
  const { data, error } = await supabase.from('cash_movements').update(fields as any).eq('id', id).select().single();
  if (error) throw error;
  return mapCashMovement(data);
}

// ── Operating Expenses ────────────────────────────────────

function mapOperatingExpense(row: any): OperatingExpense {
  return { ...row, amount: Number(row.amount) };
}

export async function getOperatingExpenses(filters?: { from?: string; to?: string; category?: string }): Promise<OperatingExpense[]> {
  let query = supabase.from('operating_expenses').select('*').order('expense_date', { ascending: false });
  if (filters?.from) query = query.gte('expense_date', filters.from);
  if (filters?.to) query = query.lte('expense_date', filters.to);
  if (filters?.category) query = query.eq('category', filters.category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapOperatingExpense);
}

export async function createOperatingExpense(data: {
  category: string; description: string; amount: number;
  expense_date: string; payment_method: string; notes?: string | null;
}, userId: string): Promise<OperatingExpense> {
  const { data: row, error } = await supabase.from('operating_expenses').insert({
    ...data, notes: data.notes || null, created_by: userId,
  } as any).select().single();
  if (error) throw error;
  return mapOperatingExpense(row);
}

// ── Bank Accounts & Movements ─────────────────────────────

export async function getBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase.from('bank_accounts').select('*').order('bank_name');
  if (error) throw error;
  return (data || []).map(r => ({ ...r, initial_balance: Number(r.initial_balance) })) as BankAccount[];
}

export async function createBankAccount(d: { bank_name: string; account_name: string; iban: string; initial_balance: number }): Promise<BankAccount> {
  const { data, error } = await supabase.from('bank_accounts').insert(d as any).select().single();
  if (error) throw error;
  return { ...data, initial_balance: Number(data.initial_balance) } as BankAccount;
}

export async function getBankMovements(accountId?: string, filters?: { reconciled?: boolean }): Promise<BankMovement[]> {
  let query = supabase.from('bank_movements').select('*').order('movement_date', { ascending: false });
  if (accountId) query = query.eq('bank_account_id', accountId);
  if (filters?.reconciled === true) query = query.eq('is_reconciled', true);
  if (filters?.reconciled === false) query = query.eq('is_reconciled', false);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(r => ({ ...r, amount: Number(r.amount) })) as BankMovement[];
}

export async function createBankMovement(d: {
  bank_account_id: string; movement_date: string; description: string;
  amount: number; movement_type: string;
}): Promise<BankMovement> {
  const { data, error } = await supabase.from('bank_movements').insert(d as any).select().single();
  if (error) throw error;
  return { ...data, amount: Number(data.amount) } as BankMovement;
}

export async function reconcileMovements(bankMovementId: string, cashMovementId: string): Promise<void> {
  const { error } = await supabase.from('bank_movements')
    .update({ is_reconciled: true, reconciled_cash_movement_id: cashMovementId } as any)
    .eq('id', bankMovementId);
  if (error) throw error;
}

// ── Accounting ────────────────────────────────────────────

export async function getAccountChart(): Promise<AccountChartEntry[]> {
  const { data, error } = await supabase.from('account_chart').select('*').eq('active', true).order('code');
  if (error) throw error;
  return (data || []) as AccountChartEntry[];
}

export async function getJournalEntries(filters?: { from?: string; to?: string; origin_type?: string }): Promise<JournalEntry[]> {
  let query = supabase.from('journal_entries').select('*').order('entry_date', { ascending: false });
  if (filters?.from) query = query.gte('entry_date', filters.from);
  if (filters?.to) query = query.lte('entry_date', filters.to);
  if (filters?.origin_type) query = query.eq('origin_type', filters.origin_type);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapJournalEntry);
}

export async function getJournalEntryById(id: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase.from('journal_entries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapJournalEntry(data) : null;
}

export async function getJournalEntryLines(entryId: string): Promise<JournalEntryLine[]> {
  const { data, error } = await supabase.from('journal_entry_lines').select('*').eq('entry_id', entryId).order('created_at');
  if (error) throw error;
  return (data || []).map(r => ({ ...r, debit: Number(r.debit), credit: Number(r.credit) })) as JournalEntryLine[];
}

export async function getJournalEntryByOrigin(originType: string, originId: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase.from('journal_entries').select('*')
    .eq('origin_type', originType).eq('origin_id', originId).eq('status', 'posted').maybeSingle();
  if (error) throw error;
  return data ? mapJournalEntry(data) : null;
}

export async function getLedger(accountCode: string, filters?: { from?: string; to?: string }): Promise<(JournalEntryLine & { entry_number: string; entry_date: string })[]> {
  // Get all lines for this account, join with entry
  let query = supabase.from('journal_entry_lines').select('*, journal_entries!inner(entry_number, entry_date)')
    .eq('account_code', accountCode).order('created_at', { ascending: true });
  if (filters?.from) query = query.gte('journal_entries.entry_date', filters.from);
  if (filters?.to) query = query.lte('journal_entries.entry_date', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    debit: Number(r.debit),
    credit: Number(r.credit),
    entry_number: r.journal_entries?.entry_number || '',
    entry_date: r.journal_entries?.entry_date || '',
  }));
}

export async function getMonthlyAccountingSummary(month: number, year: number): Promise<{
  ventasBase: number; igicRepercutido: number; gastosOperativos: number; resultado: number; numAsientos: number;
}> {
  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get all lines in period, excluding closing/opening entries
  const { data: lines, error } = await supabase.from('journal_entry_lines')
    .select('account_code, debit, credit, journal_entries!inner(entry_date, origin_type)')
    .gte('journal_entries.entry_date', from).lte('journal_entries.entry_date', to)
    .not('journal_entries.origin_type', 'in', '("closing","opening")');
  if (error) throw error;

  let ventasBase = 0, igicRepercutido = 0, gastosOperativos = 0;
  (lines || []).forEach((r: any) => {
    if (r.account_code === '700') ventasBase += Number(r.credit) - Number(r.debit);
    if (r.account_code === '477') igicRepercutido += Number(r.credit) - Number(r.debit);
    if (r.account_code === '620') gastosOperativos += Number(r.debit) - Number(r.credit);
  });

  // Count entries
  const { count } = await supabase.from('journal_entries').select('id', { count: 'exact', head: true })
    .gte('entry_date', from).lte('entry_date', to);

  return {
    ventasBase: Math.round(ventasBase * 100) / 100,
    igicRepercutido: Math.round(igicRepercutido * 100) / 100,
    gastosOperativos: Math.round(gastosOperativos * 100) / 100,
    resultado: Math.round((ventasBase - gastosOperativos) * 100) / 100,
    numAsientos: count || 0,
  };
}

export async function createManualJournalEntry(
  data: { entry_date: string; description: string; lines: { account_code: string; description: string; debit: number; credit: number }[] },
  userId: string
): Promise<JournalEntry> {
  // Validate Debe = Haber
  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error('El asiento no cuadra: Debe ≠ Haber');
  if (data.lines.length < 2) throw new Error('Un asiento necesita al menos 2 líneas');

  const { data: result, error } = await supabase.rpc('fn_create_journal_entry', {
    p_entry_date: data.entry_date,
    p_description: data.description,
    p_origin_type: 'manual',
    p_origin_id: null,
    p_created_by: userId,
    p_lines: JSON.stringify(data.lines),
    p_status: 'adjustment',
  });
  if (error) throw error;

  const entry = await getJournalEntryById(result as string);
  if (!entry) throw new Error('Error creando asiento');
  return entry;
}

function mapJournalEntry(row: any): JournalEntry {
  return { ...row, total_debit: Number(row.total_debit), total_credit: Number(row.total_credit) };
}

// ── Accounting Year Close/Open ────────────────────────────

export async function getAccountingPeriods(): Promise<import('./types').AccountingPeriod[]> {
  const { data, error } = await supabase.from('accounting_periods').select('*').order('year', { ascending: false });
  if (error) throw error;
  return (data || []) as import('./types').AccountingPeriod[];
}

export async function closeAccountingYear(year: number, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_close_accounting_year', {
    p_year: year,
    p_created_by: userId,
  });
  if (error) throw error;
  return data as string;
}

export async function openAccountingYear(year: number, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_open_accounting_year', {
    p_year: year,
    p_created_by: userId,
  });
  if (error) throw error;
  return data as string;
}

// ── Profit & Loss (PyG) ──────────────────────────────────

export interface ProfitLossLine {
  code: string;
  name: string;
  account_type: string;
  saldo: number;
}

export async function getProfitAndLoss(year: number, month: number): Promise<ProfitLossLine[]> {
  const from = new Date(year, 0, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get all journal entry lines in YTD range, excluding closing/opening
  const { data: lines, error } = await supabase.from('journal_entry_lines')
    .select('account_code, debit, credit, journal_entries!inner(entry_date, origin_type, status)')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
    .not('journal_entries.origin_type', 'in', '("closing","opening")')
    .in('journal_entries.status', ['posted', 'adjustment']);
  if (error) throw error;

  // Get account chart for ingreso/gasto accounts
  const { data: accounts, error: accErr } = await supabase.from('account_chart')
    .select('code, name, account_type')
    .eq('active', true)
    .in('account_type', ['ingreso', 'gasto']);
  if (accErr) throw accErr;

  const accountMap = new Map<string, { name: string; account_type: string }>();
  (accounts || []).forEach(a => accountMap.set(a.code, { name: a.name, account_type: a.account_type }));

  // Aggregate by account code
  const saldos = new Map<string, { debit: number; credit: number }>();
  (lines || []).forEach((r: any) => {
    const acc = accountMap.get(r.account_code);
    if (!acc) return; // skip non-ingreso/gasto accounts
    const cur = saldos.get(r.account_code) || { debit: 0, credit: 0 };
    cur.debit += Number(r.debit);
    cur.credit += Number(r.credit);
    saldos.set(r.account_code, cur);
  });

  const result: ProfitLossLine[] = [];
  saldos.forEach((val, code) => {
    const acc = accountMap.get(code)!;
    // Ingresos: visual positive = credit - debit
    // Gastos: visual positive = debit - credit
    const saldo = acc.account_type === 'ingreso'
      ? Math.round((val.credit - val.debit) * 100) / 100
      : Math.round((val.debit - val.credit) * 100) / 100;
    if (saldo !== 0) {
      result.push({ code, name: acc.name, account_type: acc.account_type, saldo });
    }
  });

  return result.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getAccount129Balance(year: number, month: number): Promise<number> {
  const from = new Date(year, 0, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data, error } = await supabase.from('journal_entry_lines')
    .select('debit, credit, journal_entries!inner(entry_date, origin_type, status)')
    .eq('account_code', '129')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
    .not('journal_entries.origin_type', 'in', '("closing","opening")')
    .in('journal_entries.status', ['posted', 'adjustment']);
  if (error) throw error;

  let saldo = 0;
  (data || []).forEach((r: any) => {
    saldo += Number(r.credit) - Number(r.debit);
  });
  return Math.round(saldo * 100) / 100;
}

// ── Balance Sheet (Balance de Situación) ──────────────────

export interface BalanceSheetLine {
  code: string;
  name: string;
  account_type: string;
  saldo: number; // internal: debit - credit (not normalized)
}

export async function getBalanceSheet(year: number, month: number): Promise<BalanceSheetLine[]> {
  const from = new Date(year, 0, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get all journal entry lines in YTD range, excluding closing/opening
  const { data: lines, error } = await supabase.from('journal_entry_lines')
    .select('account_code, debit, credit, journal_entries!inner(entry_date, origin_type, status)')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
    .not('journal_entries.origin_type', 'in', '("closing","opening")')
    .in('journal_entries.status', ['posted', 'adjustment']);
  if (error) throw error;

  // Get account chart for activo/pasivo/patrimonio accounts
  const { data: accounts, error: accErr } = await supabase.from('account_chart')
    .select('code, name, account_type')
    .eq('active', true)
    .in('account_type', ['activo', 'pasivo', 'patrimonio']);
  if (accErr) throw accErr;

  const accountMap = new Map<string, { name: string; account_type: string }>();
  (accounts || []).forEach(a => accountMap.set(a.code, { name: a.name, account_type: a.account_type }));

  // Aggregate by account code: saldo = SUM(debit) - SUM(credit)
  const saldos = new Map<string, { debit: number; credit: number }>();
  (lines || []).forEach((r: any) => {
    const acc = accountMap.get(r.account_code);
    if (!acc) return;
    const cur = saldos.get(r.account_code) || { debit: 0, credit: 0 };
    cur.debit += Number(r.debit);
    cur.credit += Number(r.credit);
    saldos.set(r.account_code, cur);
  });

  const result: BalanceSheetLine[] = [];
  saldos.forEach((val, code) => {
    const acc = accountMap.get(code)!;
    const saldo = Math.round((val.debit - val.credit) * 100) / 100;
    if (saldo !== 0) {
      result.push({ code, name: acc.name, account_type: acc.account_type, saldo });
    }
  });

  return result.sort((a, b) => a.code.localeCompare(b.code));
}

// ── Report PDF (ephemeral ticket) ─────────────────────────

export async function requestReportPdf(
  type: 'pyg' | 'balance' | 'vehicle-margin',
  params: Record<string, any>,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa');

  const res = await supabase.functions.invoke('generate-report-pdf', {
    method: 'POST',
    body: { type, params },
  });

  if (res.error) throw new Error(res.error.message || 'Error generando ticket de PDF');
  return res.data.url;
}

/** Fetch HTML content from an ephemeral ticket URL */
export async function requestReportHtml(
  type: 'pyg' | 'balance' | 'vehicle-margin',
  params: Record<string, any>,
): Promise<string> {
  const url = await requestReportPdf(type, params);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al obtener el documento del servidor');
  const html = await response.text();
  if (!html || html.length < 50) throw new Error('El documento recibido está vacío');
  return html;
}

// ── Vehicle Images ────────────────────────────────────────

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  original_url: string;
  thumbnail_url: string | null;
  is_primary: boolean;
  order_index: number;
  alt_text: string;
  is_public: boolean;
  uploaded_by: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

export async function getVehicleImages(vehicleId: string | undefined): Promise<VehicleImage[]> {
  if (!vehicleId) return [];
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as VehicleImage[];
}

export async function uploadVehicleImage(
  file: File,
  vehicleId: string,
  userId: string,
): Promise<VehicleImage> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${vehicleId}/${timestamp}_${safeName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('vehicle-images')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(path);

  // Check if this is the first image (mark as primary)
  const { count } = await supabase
    .from('vehicle_images')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId);

  const isFirst = (count || 0) === 0;

  // Get next order_index
  const { data: maxOrder } = await supabase
    .from('vehicle_images')
    .select('order_index')
    .eq('vehicle_id', vehicleId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextOrder = maxOrder && maxOrder.length > 0 ? (maxOrder[0] as any).order_index + 1 : 0;

  // Insert record
  const { data, error } = await supabase
    .from('vehicle_images')
    .insert({
      vehicle_id: vehicleId,
      original_url: urlData.publicUrl,
      is_primary: isFirst,
      order_index: nextOrder,
      uploaded_by: userId,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (error) throw error;
  const image = data as unknown as VehicleImage;

  // Trigger thumbnail generation (fire and forget)
  supabase.functions.invoke('generate-thumbnail', {
    body: { bucket: 'vehicle-images', path, vehicleId, imageId: image.id },
  }).catch(err => console.warn('Thumbnail generation failed (non-blocking):', err));

  return image;
}

export async function deleteVehicleImage(
  id: string,
  originalUrl: string,
  thumbnailUrl: string | null,
): Promise<void> {
  // Extract storage paths from public URLs
  const extractPath = (url: string) => {
    const marker = '/object/public/vehicle-images/';
    const idx = url.indexOf(marker);
    return idx >= 0 ? url.substring(idx + marker.length) : null;
  };

  const originalPath = extractPath(originalUrl);
  const thumbPath = thumbnailUrl ? extractPath(thumbnailUrl) : null;

  // Get image info before deleting (to check if primary)
  const { data: image } = await supabase
    .from('vehicle_images')
    .select('vehicle_id, is_primary')
    .eq('id', id)
    .single();

  // Delete from storage
  const pathsToDelete = [originalPath, thumbPath].filter(Boolean) as string[];
  if (pathsToDelete.length > 0) {
    await supabase.storage.from('vehicle-images').remove(pathsToDelete);
  }

  // Delete record
  const { error } = await supabase
    .from('vehicle_images')
    .delete()
    .eq('id', id);
  if (error) throw error;

  // If was primary, reassign to first remaining
  if (image && (image as any).is_primary) {
    const vehicleId = (image as any).vehicle_id;
    const { data: remaining } = await supabase
      .from('vehicle_images')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .order('order_index', { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      await supabase
        .from('vehicle_images')
        .update({ is_primary: true })
        .eq('id', (remaining[0] as any).id);
    }
  }
}

export async function updateVehicleImageOrder(
  images: { id: string; order_index: number }[],
): Promise<void> {
  for (const img of images) {
    const { error } = await supabase
      .from('vehicle_images')
      .update({ order_index: img.order_index })
      .eq('id', img.id);
    if (error) throw error;
  }
}

export async function setVehicleImagePrimary(
  imageId: string,
  vehicleId: string,
): Promise<void> {
  // Remove primary from all
  const { error: e1 } = await supabase
    .from('vehicle_images')
    .update({ is_primary: false })
    .eq('vehicle_id', vehicleId);
  if (e1) throw e1;

  // Set new primary
  const { error: e2 } = await supabase
    .from('vehicle_images')
    .update({ is_primary: true })
    .eq('id', imageId);
  if (e2) throw e2;
}

// ── Vehicle Primary Images (batch) ───────────────────────

export async function getVehiclePrimaryImages(vehicleIds: string[]): Promise<Record<string, string>> {
  if (vehicleIds.length === 0) return {};
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('vehicle_id, thumbnail_url, original_url')
    .in('vehicle_id', vehicleIds)
    .eq('is_primary', true);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach(row => {
    map[row.vehicle_id] = row.thumbnail_url || row.original_url;
  });
  return map;
}

// ── Repair Orders ────────────────────────────────────────

export async function getRepairOrders(vehicleId?: string): Promise<RepairOrder[]> {
  let query = supabase.from('repair_orders').select('*').order('created_at', { ascending: false });
  if (vehicleId) query = query.eq('vehicle_id', vehicleId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RepairOrder[];
}

export async function getActiveRepairOrder(vehicleId: string): Promise<RepairOrder | null> {
  const { data, error } = await supabase
    .from('repair_orders')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .in('status', ['abierta', 'presupuestada', 'aprobada', 'en_ejecucion'])
    .maybeSingle();
  if (error) throw error;
  return data as unknown as RepairOrder | null;
}

export async function getRepairOrderById(id: string): Promise<RepairOrder | null> {
  const { data, error } = await supabase
    .from('repair_orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as RepairOrder | null;
}

export async function createRepairOrder(
  order: { vehicle_id: string; supplier_id: string; estimated_end_date?: string; observations?: string },
  userId: string
): Promise<RepairOrder> {
  const { data, error } = await supabase
    .from('repair_orders')
    .insert({
      vehicle_id: order.vehicle_id,
      supplier_id: order.supplier_id,
      estimated_end_date: order.estimated_end_date || null,
      observations: order.observations || '',
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RepairOrder;
}

export async function updateRepairOrderStatus(
  id: string,
  status: string,
  cancellationReason?: string
): Promise<RepairOrder> {
  const updates: any = { status };
  if (cancellationReason) updates.cancellation_reason = cancellationReason;
  const { data, error } = await supabase
    .from('repair_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RepairOrder;
}

// ── Repair Order Categories ──────────────────────────────

export async function getRepairOrderCategories(orderId: string): Promise<RepairOrderCategory[]> {
  const { data, error } = await supabase
    .from('repair_order_categories')
    .select('*')
    .eq('repair_order_id', orderId)
    .order('created_at');
  if (error) throw error;
  return (data || []) as unknown as RepairOrderCategory[];
}

export async function createRepairOrderCategory(
  cat: { repair_order_id: string; category_type: string; estimated_amount: number; description?: string }
): Promise<RepairOrderCategory> {
  const { data, error } = await supabase
    .from('repair_order_categories')
    .insert({
      repair_order_id: cat.repair_order_id,
      category_type: cat.category_type,
      estimated_amount: cat.estimated_amount,
      description: cat.description || '',
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RepairOrderCategory;
}

export async function updateRepairOrderCategory(
  id: string,
  updates: { category_type?: string; estimated_amount?: number; description?: string }
): Promise<RepairOrderCategory> {
  const { data, error } = await supabase
    .from('repair_order_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RepairOrderCategory;
}

export async function deleteRepairOrderCategory(id: string): Promise<void> {
  const { error } = await supabase.from('repair_order_categories').delete().eq('id', id);
  if (error) throw error;
}

// ── Supplier Invoices ────────────────────────────────────

export async function getSupplierInvoices(orderId: string): Promise<SupplierInvoice[]> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('*')
    .eq('repair_order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SupplierInvoice[];
}

export async function createSupplierInvoice(
  invoice: {
    repair_order_id: string;
    vehicle_id: string;
    supplier_id: string;
    invoice_number: string;
    invoice_date: string;
    base_amount: number;
    tax_type?: string;
    tax_rate?: number;
    pdf_path?: string;
    rectifies_invoice_id?: string;
  },
  userId: string
): Promise<SupplierInvoice> {
  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert({
      repair_order_id: invoice.repair_order_id,
      vehicle_id: invoice.vehicle_id,
      supplier_id: invoice.supplier_id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      base_amount: invoice.base_amount,
      tax_type: invoice.tax_type || 'igic',
      tax_rate: invoice.tax_rate ?? 7,
      pdf_path: invoice.pdf_path || null,
      rectifies_invoice_id: invoice.rectifies_invoice_id || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as SupplierInvoice;
}

export async function cancelSupplierInvoice(
  invoiceId: string,
  reason: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('fn_supplier_invoice_cancel_reverse', {
    p_invoice_id: invoiceId,
    p_reason: reason,
    p_user_id: userId,
  });
  if (error) throw error;
}

// ── Supplier Payments ────────────────────────────────────

export async function getSupplierPayments(invoiceId: string): Promise<SupplierPayment[]> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('*')
    .eq('supplier_invoice_id', invoiceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SupplierPayment[];
}

export async function createSupplierPayment(
  payment: {
    supplier_invoice_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    bank_account_id?: string;
    notes?: string;
  },
  userId: string
): Promise<SupplierPayment> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .insert({
      supplier_invoice_id: payment.supplier_invoice_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      bank_account_id: payment.bank_account_id || null,
      notes: payment.notes || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as SupplierPayment;
}

// ── Supplier Repair Stats ────────────────────────────────

export async function getSupplierRepairStats(supplierId: string) {
  const { data: orders, error: e1 } = await supabase
    .from('repair_orders')
    .select('id, estimated_total')
    .eq('supplier_id', supplierId);
  if (e1) throw e1;

  const { data: invoices, error: e2 } = await supabase
    .from('supplier_invoices')
    .select('total_amount, repair_order_id')
    .eq('supplier_id', supplierId)
    .neq('status', 'anulada');
  if (e2) throw e2;

  const totalOrders = orders?.length || 0;
  const totalInvoiced = (invoices || []).reduce((sum, i) => sum + Number(i.total_amount), 0);
  const avgPerOrder = totalOrders > 0 ? totalInvoiced / totalOrders : 0;

  // Calculate average deviation
  let totalDeviation = 0;
  let deviationCount = 0;
  (orders || []).forEach(order => {
    const orderInvoices = (invoices || []).filter(i => i.repair_order_id === order.id);
    if (orderInvoices.length > 0) {
      const invoiced = orderInvoices.reduce((s, i) => s + Number(i.total_amount), 0);
      const estimated = Number(order.estimated_total);
      if (estimated > 0) {
        totalDeviation += ((invoiced - estimated) / estimated) * 100;
        deviationCount++;
      }
    }
  });
  const avgDeviation = deviationCount > 0 ? totalDeviation / deviationCount : 0;

  return { totalOrders, totalInvoiced, avgPerOrder, avgDeviation };
}

// ── Vehicle Transfers ────────────────────────────────────

export async function getVehicleTransfers(vehicleId: string): Promise<VehicleTransfer[]> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as VehicleTransfer[];
}

export async function getActiveTransfer(vehicleId: string): Promise<VehicleTransfer | null> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .in('status', ['solicitado', 'enviado'])
    .maybeSingle();
  if (error) throw error;
  return data as unknown as VehicleTransfer | null;
}

export async function getPendingTransfers(branch?: string): Promise<VehicleTransfer[]> {
  let query = supabase
    .from('vehicle_transfers')
    .select('*')
    .in('status', ['solicitado', 'enviado'])
    .order('created_at', { ascending: false });
  // No branch filter - fetch all active, filter in UI
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as VehicleTransfer[];
}

export async function getAllTransfers(limit = 50): Promise<VehicleTransfer[]> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as unknown as VehicleTransfer[];
}

export async function createTransferRequest(
  vehicleId: string,
  originBranch: string,
  destinationBranch: string,
  requestingBranch: string,
  observations: string,
  userId: string
): Promise<VehicleTransfer> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .insert({
      vehicle_id: vehicleId,
      origin_branch: originBranch,
      destination_branch: destinationBranch,
      requesting_branch: requestingBranch,
      requested_by: userId,
      observations: observations || '',
      vehicle_center_at_request: originBranch, // trigger will override
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehicleTransfer;
}

export async function sendTransfer(transferId: string, userId: string): Promise<VehicleTransfer> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .update({
      status: 'enviado',
      sent_by: userId,
      sent_at: new Date().toISOString(),
    } as any)
    .eq('id', transferId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehicleTransfer;
}

export async function receiveTransfer(transferId: string, userId: string): Promise<VehicleTransfer> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .update({
      status: 'recibido',
      received_by: userId,
      received_at: new Date().toISOString(),
    } as any)
    .eq('id', transferId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehicleTransfer;
}

export async function cancelTransfer(transferId: string, reason: string, userId: string): Promise<VehicleTransfer> {
  const { data, error } = await supabase
    .from('vehicle_transfers')
    .update({
      status: 'cancelado',
      cancellation_reason: reason,
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
    } as any)
    .eq('id', transferId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehicleTransfer;
}

export async function updateProfileBranch(userId: string, branchId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ branch_id: branchId } as any)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Operative Status ─────────────────────────────────────

export async function getOperativeStatusBatch(vehicleIds: string[]): Promise<Record<string, OperativeStatus>> {
  if (vehicleIds.length === 0) return {};

  const [{ data: transfers }, { data: repairs }] = await Promise.all([
    supabase
      .from('vehicle_transfers')
      .select('vehicle_id')
      .in('vehicle_id', vehicleIds)
      .eq('status', 'enviado'),
    supabase
      .from('repair_orders')
      .select('vehicle_id')
      .in('vehicle_id', vehicleIds)
      .in('status', ['abierta', 'presupuestada', 'aprobada', 'en_ejecucion']),
  ]);

  const inTransit = new Set((transfers || []).map(t => t.vehicle_id));
  const inRepair = new Set((repairs || []).map(r => r.vehicle_id));

  const result: Record<string, OperativeStatus> = {};
  vehicleIds.forEach(id => {
    if (inTransit.has(id)) result[id] = 'en_transito';
    else if (inRepair.has(id)) result[id] = 'en_reparacion';
    else result[id] = 'normal';
  });
  return result;
}

export async function setVehicleDeregistered(vehicleId: string, value: boolean, userId: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ is_deregistered: value, updated_by: userId } as any)
    .eq('id', vehicleId);
  if (error) throw error;
}

// ── Tax Models ───────────────────────────────────────────

import type { TaxModel, TaxModelPeriod } from './types';

export async function getTaxModels(): Promise<TaxModel[]> {
  const { data, error } = await supabase
    .from('tax_models')
    .select('*')
    .order('display_order');
  if (error) throw error;
  return (data || []) as TaxModel[];
}

export async function updateTaxModelActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('tax_models')
    .update({ is_active })
    .eq('id', id);
  if (error) throw error;
}

export async function getTaxModelPeriods(taxModelId?: string): Promise<TaxModelPeriod[]> {
  let query = supabase.from('tax_model_periods').select('*').order('year', { ascending: false });
  if (taxModelId) query = query.eq('tax_model_id', taxModelId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as TaxModelPeriod[];
}

export async function upsertTaxModelPeriod(period: {
  tax_model_id: string;
  year: number;
  quarter: number | null;
  status: string;
  verified_by?: string | null;
  verified_at?: string | null;
  presented_at?: string | null;
  notes?: string | null;
}): Promise<void> {
  // Check if period already exists
  let query = supabase
    .from('tax_model_periods')
    .select('id')
    .eq('tax_model_id', period.tax_model_id)
    .eq('year', period.year);
  if (period.quarter !== null) query = query.eq('quarter', period.quarter);
  else query = query.is('quarter', null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('tax_model_periods')
      .update({
        status: period.status,
        verified_by: period.verified_by,
        verified_at: period.verified_at,
        presented_at: period.presented_at,
        notes: period.notes,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('tax_model_periods')
      .insert(period as any);
    if (error) throw error;
  }
}

export async function getTaxCalculationData(
  modelCode: string,
  year: number,
  quarter: number | null,
): Promise<Record<string, number>> {
  // Calculate date range
  let startDate: string, endDate: string;
  if (quarter) {
    const startMonth = (quarter - 1) * 3;
    startDate = new Date(year, startMonth, 1).toISOString();
    endDate = new Date(year, startMonth + 3, 0, 23, 59, 59).toISOString();
  } else {
    startDate = new Date(year, 0, 1).toISOString();
    endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
  }

  const taxType = modelCode === '420' ? 'igic' : 'iva';

  // Fetch invoices (sales) with buyer info for 349/369
  const { data: invoices } = await supabase
    .from('invoices')
    .select('base_amount, tax_amount, tax_type, tax_rate, buyer_dni, buyer_name')
    .gte('issue_date', startDate)
    .lte('issue_date', endDate)
    .eq('status', 'emitida');

  // Fetch operating expenses (with category for 115)
  const { data: opExpenses } = await supabase
    .from('operating_expenses')
    .select('amount, category')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  // Fetch vehicle expenses with tax info
  const { data: vExpenses } = await supabase
    .from('expenses')
    .select('amount, base_amount, tax_amount, tax_type, tax_rate')
    .gte('date', startDate)
    .lte('date', endDate);

  const allInvoices = invoices || [];
  const allOpExpenses = opExpenses || [];
  const allVExpenses = vExpenses || [];

  // ── Model 349: Intra-community operations ──
  if (modelCode === '349') {
    const euPrefixes = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','EL','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','SE'];
    const intraInvoices = allInvoices.filter(i => {
      const dni = (i.buyer_dni || '').toUpperCase().trim();
      return euPrefixes.some(p => dni.startsWith(p));
    });
    return {
      intraOpsCount: intraInvoices.length,
      intraOpsBase: intraInvoices.reduce((s, i) => s + Number(i.base_amount), 0),
      totalBase: intraInvoices.reduce((s, i) => s + Number(i.base_amount), 0),
      totalTax: 0,
    };
  }

  // ── Model 369: OSS regime ──
  if (modelCode === '369') {
    const euPrefixes = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','EL','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','SE'];
    const ossInvoices = allInvoices.filter(i => {
      const dni = (i.buyer_dni || '').toUpperCase().trim();
      return euPrefixes.some(p => dni.startsWith(p));
    });
    return {
      ossOpsCount: ossInvoices.length,
      ossBase: ossInvoices.reduce((s, i) => s + Number(i.base_amount), 0),
      ossTax: ossInvoices.reduce((s, i) => s + Number(i.tax_amount), 0),
      totalBase: ossInvoices.reduce((s, i) => s + Number(i.base_amount), 0),
      totalTax: ossInvoices.reduce((s, i) => s + Number(i.tax_amount), 0),
    };
  }

  // ── Model 115: Rental retentions ──
  if (modelCode === '115') {
    const rentalExpenses = allOpExpenses.filter(e =>
      (e.category || '').toLowerCase().includes('alquiler')
    );
    const rentalTotal = rentalExpenses.reduce((s, e) => s + Number(e.amount), 0);
    // Assume standard 19% retention on rental
    const retentionRate = 0.19;
    return {
      rentalCount: rentalExpenses.length,
      rentalBase: rentalTotal,
      rentalRetention: rentalTotal * retentionRate,
      totalBase: rentalTotal,
      totalTax: rentalTotal * retentionRate,
    };
  }

  // ── Model 190: Annual summary of retentions (aggregate 4 quarters of 111) ──
  if (modelCode === '190') {
    let totalAnnualBase = 0;
    let totalAnnualRetention = 0;
    const result: Record<string, number> = {};
    for (let q = 1; q <= 4; q++) {
      const qStart = new Date(year, (q - 1) * 3, 1).toISOString();
      const qEnd = new Date(year, q * 3, 0, 23, 59, 59).toISOString();
      const { data: qExpenses } = await supabase
        .from('expenses')
        .select('amount, base_amount, tax_amount, tax_type, tax_rate')
        .gte('date', qStart)
        .lte('date', qEnd);
      const qBase = (qExpenses || []).reduce((s, e) => s + Number(e.base_amount || e.amount || 0), 0);
      const qRet = (qExpenses || [])
        .filter(e => e.tax_type === 'irpf' || (e.tax_rate && e.tax_rate > 0))
        .reduce((s, e) => s + Number(e.tax_amount || 0), 0);
      result[`q${q}Base`] = qBase;
      result[`q${q}Retention`] = qRet;
      totalAnnualBase += qBase;
      totalAnnualRetention += qRet;
    }
    return { ...result, totalAnnualBase, totalAnnualRetention, totalBase: totalAnnualBase, totalTax: totalAnnualRetention };
  }

  // ── Model 200: Corporate tax ──
  if (modelCode === '200') {
    const annualIncome = allInvoices.reduce((s, i) => s + Number(i.base_amount), 0);
    const annualExpenses = allVExpenses.reduce((s, e) => s + Number(e.base_amount || e.amount || 0), 0)
      + allOpExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const profit = annualIncome - annualExpenses;
    const taxBase = Math.max(profit, 0);
    return {
      annualIncome,
      annualExpenses,
      profit,
      taxBase,
      corporateTax: taxBase * 0.25,
      totalBase: taxBase,
      totalTax: taxBase * 0.25,
    };
  }

  // ── Standard models: 303, 420, 130, 111 ──
  const filteredInvoices = allInvoices.filter(i =>
    ['303', '420'].includes(modelCode) ? i.tax_type === taxType : true
  );

  const salesBase = filteredInvoices.reduce((s, i) => s + Number(i.base_amount), 0);
  const salesTax = filteredInvoices.reduce((s, i) => s + Number(i.tax_amount), 0);

  const filteredExpenses = allVExpenses.filter(e =>
    ['303', '420'].includes(modelCode) ? e.tax_type === taxType : true
  );
  const expensesBase = filteredExpenses.reduce((s, e) => s + Number(e.base_amount || e.amount || 0), 0);
  const expensesTax = filteredExpenses.reduce((s, e) => s + Number(e.tax_amount || 0), 0);

  const opTotal = allOpExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Model 111: IRPF retentions
  const retentionBase = allVExpenses.reduce((s, e) => s + Number(e.base_amount || e.amount || 0), 0);
  const retentionAmount = allVExpenses
    .filter(e => e.tax_type === 'irpf' || (e.tax_rate && e.tax_rate > 0))
    .reduce((s, e) => s + Number(e.tax_amount || 0), 0);

  return {
    salesBase,
    salesTax,
    expensesBase,
    expensesTax,
    income: salesBase,
    expenses: expensesBase + opTotal,
    retentionBase,
    retentionAmount,
    retentionCount: allVExpenses.filter(e => e.tax_type === 'irpf').length,
    totalBase: salesBase,
    totalTax: salesTax,
  };
}

// ══════════════════════════════════════════════════════════
// Vehicle Master Data
// ══════════════════════════════════════════════════════════

import type { VehicleSegment, MasterBrand, MasterModel, MasterVersion } from './types';

// ── Segments ─────────────────────────────────────────────

export async function getSegments(): Promise<VehicleSegment[]> {
  const { data, error } = await supabase.from('vehicle_segments').select('*').order('name');
  if (error) throw error;
  return (data || []) as unknown as VehicleSegment[];
}

export async function createSegment(s: Partial<VehicleSegment>): Promise<VehicleSegment> {
  const { data, error } = await supabase.from('vehicle_segments').insert({
    code: s.code || '',
    name: s.name || '',
    description: s.description || '',
    size_range: s.size_range || '',
    examples: s.examples || '',
    active: s.active ?? true,
  }).select().single();
  if (error) throw error;
  return data as unknown as VehicleSegment;
}

export async function updateSegment(id: string, s: Partial<VehicleSegment>): Promise<VehicleSegment> {
  const { data, error } = await supabase.from('vehicle_segments').update(s as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as VehicleSegment;
}

// ── Master Brands ────────────────────────────────────────

export async function getMasterBrands(): Promise<MasterBrand[]> {
  const { data, error } = await supabase.from('master_brands').select('*').order('name');
  if (error) throw error;
  return (data || []) as unknown as MasterBrand[];
}

export async function createMasterBrand(name: string, userId: string): Promise<MasterBrand> {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const { data, error } = await supabase.from('master_brands').insert({
    name,
    normalized_name: normalized,
    created_by: userId,
    is_validated: false,
  }).select().single();
  if (error) throw error;
  return data as unknown as MasterBrand;
}

export async function updateMasterBrand(id: string, updates: Partial<MasterBrand>): Promise<MasterBrand> {
  const { data, error } = await supabase.from('master_brands').update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as MasterBrand;
}

export async function validateMasterBrand(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('master_brands').update({
    is_validated: true,
    validated_by: userId,
    validated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

// ── Master Models ────────────────────────────────────────

export async function getMasterModels(brandId?: string): Promise<MasterModel[]> {
  let query = supabase.from('master_models').select('*').order('name');
  if (brandId) query = query.eq('brand_id', brandId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as MasterModel[];
}

export async function createMasterModel(m: { brand_id: string; name: string; body_type: string; segment_id: string }, userId: string): Promise<MasterModel> {
  const normalized = m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const { data, error } = await supabase.from('master_models').insert({
    brand_id: m.brand_id,
    name: m.name,
    normalized_name: normalized,
    body_type: m.body_type,
    segment_id: m.segment_id,
    created_by: userId,
    is_validated: false,
  }).select().single();
  if (error) throw error;
  return data as unknown as MasterModel;
}

export async function updateMasterModel(id: string, updates: Partial<MasterModel>): Promise<MasterModel> {
  const { data, error } = await supabase.from('master_models').update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as MasterModel;
}

export async function validateMasterModel(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('master_models').update({
    is_validated: true,
    validated_by: userId,
    validated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

// ── Master Versions ──────────────────────────────────────

export async function getMasterVersions(modelId?: string): Promise<MasterVersion[]> {
  let query = supabase.from('master_versions').select('*').order('name');
  if (modelId) query = query.eq('master_model_id', modelId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as MasterVersion[];
}

export async function createMasterVersion(v: { master_model_id: string; name: string }, userId: string): Promise<MasterVersion> {
  const normalized = v.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const { data, error } = await supabase.from('master_versions').insert({
    master_model_id: v.master_model_id,
    name: v.name,
    normalized_name: normalized,
    created_by: userId,
    is_validated: false,
  }).select().single();
  if (error) throw error;
  return data as unknown as MasterVersion;
}

export async function updateMasterVersion(id: string, updates: Partial<MasterVersion>): Promise<MasterVersion> {
  const { data, error } = await supabase.from('master_versions').update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as MasterVersion;
}

export async function validateMasterVersion(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('master_versions').update({
    is_validated: true,
    validated_by: userId,
    validated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function getSuggestedVersionNames(brandId: string, name: string): Promise<string[]> {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Get all models for this brand
  const { data: brandModels } = await supabase.from('master_models').select('id').eq('brand_id', brandId);
  if (!brandModels || brandModels.length === 0) return [];
  const modelIds = brandModels.map(m => m.id);
  // Find versions with similar normalized name across those models
  const { data: versions } = await supabase
    .from('master_versions')
    .select('name, normalized_name')
    .in('master_model_id', modelIds)
    .eq('normalized_name', normalized);
  if (!versions || versions.length === 0) return [];
  return [...new Set(versions.map(v => v.name))];
}

// ── Commercial Activities ─────────────────────────────────

import type { CommercialActivity } from './types';

export async function getCommercialActivities(): Promise<CommercialActivity[]> {
  const { data, error } = await supabase
    .from('commercial_activities')
    .select('*')
    .order('activity_date', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []) as unknown as CommercialActivity[];
}

export async function getActivitiesByBuyer(buyerId: string): Promise<CommercialActivity[]> {
  const { data, error } = await supabase
    .from('commercial_activities')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('activity_date', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CommercialActivity[];
}

export async function createCommercialActivity(activity: Partial<CommercialActivity>): Promise<CommercialActivity> {
  const { data, error } = await supabase
    .from('commercial_activities')
    .insert({
      user_id: activity.user_id,
      user_name: activity.user_name || '',
      buyer_id: activity.buyer_id,
      activity_date: activity.activity_date || new Date().toISOString(),
      channel: activity.channel,
      subject: activity.subject || '',
      result: activity.result,
      follow_up_days: activity.follow_up_days || null,
      follow_up_date: activity.follow_up_date || null,
      observations: activity.observations || '',
      vehicle_id: activity.vehicle_id || null,
      sale_id: activity.sale_id || null,
      reservation_id: activity.reservation_id || null,
      demand_id: (activity as any).demand_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CommercialActivity;
}

export async function updateCommercialActivity(id: string, updates: Partial<CommercialActivity>): Promise<CommercialActivity> {
  const { data, error } = await supabase
    .from('commercial_activities')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CommercialActivity;
}

// ── Demands ──────────────────────────────────────────────

export async function getDemands(): Promise<Demand[]> {
  const { data, error } = await supabase
    .from('demands')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Demand[];
}

export async function getDemandsByBuyer(buyerId: string): Promise<Demand[]> {
  const { data, error } = await supabase
    .from('demands')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Demand[];
}

export async function getDemandById(id: string): Promise<Demand | null> {
  const { data, error } = await supabase
    .from('demands')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Demand | null;
}

export async function createDemand(demand: Partial<Demand>): Promise<Demand> {
  const { data, error } = await supabase
    .from('demands')
    .insert({
      user_id: demand.user_id,
      user_name: demand.user_name || '',
      buyer_id: demand.buyer_id,
      brand_preferences: demand.brand_preferences || [],
      model_preferences: demand.model_preferences || [],
      segment_id: demand.segment_id || null,
      fuel_types: demand.fuel_types || [],
      transmission: demand.transmission || null,
      year_min: demand.year_min || null,
      year_max: demand.year_max || null,
      km_max: demand.km_max || null,
      price_min: demand.price_min || null,
      price_max: demand.price_max || null,
      preferred_color: demand.preferred_color || null,
      required_extras: demand.required_extras || null,
      max_budget: demand.max_budget || null,
      needs_financing: demand.needs_financing ?? false,
      down_payment: demand.down_payment || null,
      has_trade_in: demand.has_trade_in ?? false,
      trade_in_notes: demand.trade_in_notes || null,
      intention_level: demand.intention_level || 'exploracion',
      commercial_notes: demand.commercial_notes || null,
      status: 'activa',
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Demand;
}

export async function updateDemand(id: string, updates: Partial<Demand>): Promise<Demand> {
  const { data, error } = await supabase
    .from('demands')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Demand;
}

export async function convertDemandToSale(demandId: string, saleId: string): Promise<Demand> {
  const { data, error } = await supabase
    .from('demands')
    .update({
      status: 'convertida',
      converted_sale_id: saleId,
      converted_at: new Date().toISOString(),
    } as any)
    .eq('id', demandId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Demand;
}

export async function getMatchingVehicles(demand: Demand) {
  let query = supabase
    .from('vehicles')
    .select('id, plate, brand, model, version, color, engine_type, transmission, first_registration, km_entry, price_cash, status, center')
    .eq('status', 'disponible');

  const { data, error } = await query;
  if (error) throw error;

  const vehicles = data || [];

  return vehicles.map((v: any) => {
    let score = 0;
    const criteria: string[] = [];

    if (demand.brand_preferences.length > 0 && demand.brand_preferences.some(b => v.brand?.toLowerCase().includes(b.toLowerCase()))) {
      score++;
      criteria.push('marca');
    }
    if (demand.price_min != null && demand.price_max != null && v.price_cash >= demand.price_min && v.price_cash <= demand.price_max) {
      score++;
      criteria.push('precio');
    } else if (demand.price_max != null && v.price_cash <= demand.price_max) {
      score++;
      criteria.push('precio');
    }
    if (demand.fuel_types.length > 0 && demand.fuel_types.includes(v.engine_type)) {
      score++;
      criteria.push('combustible');
    }
    if (demand.transmission && v.transmission === demand.transmission) {
      score++;
      criteria.push('cambio');
    }
    if (demand.year_min != null) {
      const year = new Date(v.first_registration).getFullYear();
      if (year >= demand.year_min) { score++; criteria.push('año'); }
    }
    if (demand.km_max != null && v.km_entry <= demand.km_max) {
      score++;
      criteria.push('km');
    }

    const level = score >= 3 ? 'alta' : score >= 2 ? 'media' : 'baja';

    return { ...v, matchScore: score, matchLevel: level, matchCriteria: criteria };
  }).filter((v: any) => v.matchLevel !== 'baja')
    .sort((a: any, b: any) => b.matchScore - a.matchScore);
}

// ── Finance Entities ─────────────────────────────────────

export async function getFinanceEntities(): Promise<FinanceEntity[]> {
  const { data, error } = await supabase.from('finance_entities').select('*').order('name');
  if (error) throw error;
  return (data || []) as unknown as FinanceEntity[];
}

export async function createFinanceEntity(name: string): Promise<FinanceEntity> {
  const { data, error } = await supabase.from('finance_entities').insert({ name } as any).select().single();
  if (error) throw error;
  return data as unknown as FinanceEntity;
}

export async function updateFinanceEntity(id: string, updates: Partial<FinanceEntity>): Promise<FinanceEntity> {
  const { data, error } = await supabase.from('finance_entities').update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as FinanceEntity;
}

export async function deleteFinanceEntity(id: string): Promise<void> {
  const { error } = await supabase.from('finance_entities').delete().eq('id', id);
  if (error) throw error;
}

// ── Finance Products ─────────────────────────────────────

export async function getFinanceProducts(): Promise<FinanceProduct[]> {
  const { data, error } = await supabase.from('finance_products').select('*').order('name');
  if (error) throw error;
  return (data || []) as unknown as FinanceProduct[];
}

export async function createFinanceProduct(p: { name: string; entity_id: string; commission_percent?: number }): Promise<FinanceProduct> {
  const { data, error } = await supabase.from('finance_products').insert(p as any).select().single();
  if (error) throw error;
  return data as unknown as FinanceProduct;
}

export async function updateFinanceProduct(id: string, updates: Partial<FinanceProduct>): Promise<FinanceProduct> {
  const { data, error } = await supabase.from('finance_products').update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as FinanceProduct;
}

export async function deleteFinanceProduct(id: string): Promise<void> {
  const { error } = await supabase.from('finance_products').delete().eq('id', id);
  if (error) throw error;
}

// ── Finance Term Models ──────────────────────────────────

export async function getFinanceTermModels(): Promise<FinanceTermModel[]> {
  const { data, error } = await supabase.from('finance_term_models').select('*').order('term_months');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    tin: Number(r.tin),
    coefficient: Number(r.coefficient),
    additional_rate: Number(r.additional_rate),
  })) as FinanceTermModel[];
}

export async function createFinanceTermModel(m: Partial<FinanceTermModel>): Promise<FinanceTermModel> {
  const { data, error } = await supabase.from('finance_term_models').insert(m as any).select().single();
  if (error) throw error;
  return data as unknown as FinanceTermModel;
}

export async function updateFinanceTermModel(id: string, updates: Partial<FinanceTermModel>): Promise<FinanceTermModel> {
  const { data, error } = await supabase.from('finance_term_models').update(updates as any).eq('id', id).select().single();
  if (error) throw error;
  return data as unknown as FinanceTermModel;
}

export async function deleteFinanceTermModel(id: string): Promise<void> {
  const { error } = await supabase.from('finance_term_models').delete().eq('id', id);
  if (error) throw error;
}

// ── Active Term Models for Comparator ────────────────────

export async function getActiveTermModels() {
  // Get active models with product and entity names
  const { data: models, error: mErr } = await supabase.from('finance_term_models').select('*').eq('active', true).order('term_months');
  if (mErr) throw mErr;

  const { data: products, error: pErr } = await supabase.from('finance_products').select('*').eq('active', true);
  if (pErr) throw pErr;

  const { data: entities, error: eErr } = await supabase.from('finance_entities').select('*').eq('active', true);
  if (eErr) throw eErr;

  return (models || []).map((m: any) => {
    const product = (products || []).find((p: any) => p.id === m.product_id);
    const entity = product ? (entities || []).find((e: any) => e.id === product.entity_id) : null;
    return {
      ...m,
      tin: Number(m.tin),
      coefficient: Number(m.coefficient),
      additional_rate: Number(m.additional_rate),
      product_name: product?.name || '',
      entity_name: entity?.name || '',
    };
  }).filter((m: any) => m.product_name && m.entity_name);
}

export async function getActiveTermModelsWithCommission() {
  const { data: models, error: mErr } = await supabase.from('finance_term_models').select('*').eq('active', true).order('term_months');
  if (mErr) throw mErr;

  const { data: products, error: pErr } = await supabase.from('finance_products').select('*').eq('active', true);
  if (pErr) throw pErr;

  const { data: entities, error: eErr } = await supabase.from('finance_entities').select('*').eq('active', true);
  if (eErr) throw eErr;

  return (models || []).map((m: any) => {
    const product = (products || []).find((p: any) => p.id === m.product_id);
    const entity = product ? (entities || []).find((e: any) => e.id === product.entity_id) : null;
    return {
      ...m,
      tin: Number(m.tin),
      coefficient: Number(m.coefficient),
      additional_rate: Number(m.additional_rate),
      commission_percent: m.commission_percent != null ? Number(m.commission_percent) : Number(product?.commission_percent ?? 2),
      product_name: product?.name || '',
      entity_name: entity?.name || '',
    };
  }).filter((m: any) => m.product_name && m.entity_name);
}

// ── Finance Simulations ──────────────────────────────────

export async function createFinanceSimulation(sim: Partial<FinanceSimulation>): Promise<FinanceSimulation> {
  const { data, error } = await supabase.from('finance_simulations').insert(sim as any).select().single();
  if (error) throw error;
  return mapFinanceSimulation(data);
}

export async function getSimulationsByVehicle(vehicleId: string): Promise<FinanceSimulation[]> {
  const { data, error } = await supabase
    .from('finance_simulations')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapFinanceSimulation);
}

export async function updateSimulationStatus(id: string, status: FinanceSimulationStatus): Promise<FinanceSimulation> {
  const { data, error } = await supabase
    .from('finance_simulations')
    .update({ status } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapFinanceSimulation(data);
}

export async function linkSimulationToSale(simId: string, saleId: string): Promise<FinanceSimulation> {
  const { data, error } = await supabase
    .from('finance_simulations')
    .update({ sale_id: saleId } as any)
    .eq('id', simId)
    .select()
    .single();
  if (error) throw error;
  return mapFinanceSimulation(data);
}

function mapFinanceSimulation(row: any): FinanceSimulation {
  return {
    ...row,
    tin_used: Number(row.tin_used),
    coefficient_used: Number(row.coefficient_used),
    additional_rate_used: Number(row.additional_rate_used),
    financed_amount: Number(row.financed_amount),
    adjusted_capital: Number(row.adjusted_capital),
    down_payment: Number(row.down_payment),
    monthly_payment: Number(row.monthly_payment),
    total_estimated: Number(row.total_estimated),
  };
}

// ── Finance Installments ─────────────────────────────────

export async function generateInstallments(simulationId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_generate_finance_installments', { p_simulation_id: simulationId });
  if (error) throw error;
}

export async function getInstallments(simulationId: string): Promise<FinanceInstallment[]> {
  const { data, error } = await supabase
    .from('finance_installments')
    .select('*')
    .eq('simulation_id', simulationId)
    .order('installment_number');
  if (error) throw error;
  return (data || []).map((r: any) => ({ ...r, amount: Number(r.amount) })) as FinanceInstallment[];
}

// ── Finance Proposal PDF ─────────────────────────────────

export async function generateFinanceProposalPdf(simulationId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
    method: 'POST',
    body: { type: 'finance-proposal', params: { simulation_id: simulationId } },
  });
  if (error) throw error;
  if (data?.url) {
    window.open(data.url, '_blank');
  } else {
    throw new Error('No se recibió URL del PDF');
  }
}

export async function generateFinanceProposalPdfFromProposal(proposalId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
    method: 'POST',
    body: { type: 'finance-proposal', params: { proposal_id: proposalId } },
  });
  if (error) throw error;
  if (data?.url) {
    // Fetch the HTML from the ticket URL so we can load it as srcDoc
    const response = await fetch(data.url);
    if (!response.ok) throw new Error('Error al obtener el documento');
    const html = await response.text();
    return html;
  } else {
    throw new Error('No se recibió URL del PDF');
  }
}

// ── Excel Import for Term Models ─────────────────────────

export async function upsertTermModelsFromImport(
  rows: any[],
  entities: FinanceEntity[],
  products: FinanceProduct[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  let created = 0, updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const entityName = row.entidad?.trim();
      const productName = row.producto?.trim();
      const tin = parseFloat(row.tin);
      const termMonths = parseInt(row.plazo_meses);
      const coefficient = parseFloat(row.coefficient);
      const additionalRate = parseFloat(row.additional_rate) || 0;
      const active = row.active?.toLowerCase?.() !== 'false' && row.active !== '0';

      if (!entityName || !productName || isNaN(tin) || isNaN(termMonths) || isNaN(coefficient)) {
        errors.push(`Fila ${row._lineNumber}: datos inválidos`);
        continue;
      }

      // Find or skip entity/product
      const entity = entities.find(e => e.name.toLowerCase() === entityName.toLowerCase());
      if (!entity) { errors.push(`Fila ${row._lineNumber}: entidad "${entityName}" no encontrada`); continue; }

      const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase() && p.entity_id === entity.id);
      if (!product) { errors.push(`Fila ${row._lineNumber}: producto "${productName}" no encontrado en ${entityName}`); continue; }

      // Check existing
      const { data: existing } = await supabase
        .from('finance_term_models')
        .select('id')
        .eq('product_id', product.id)
        .eq('tin', tin)
        .eq('term_months', termMonths)
        .maybeSingle();

      const commissionStr = row.comision ?? row.commission ?? row.commission_percent;
      const commissionPercent = commissionStr != null && commissionStr !== '' ? parseFloat(commissionStr) : null;

      if (existing) {
        await supabase.from('finance_term_models').update({ coefficient, additional_rate: additionalRate, active, ...(commissionPercent != null ? { commission_percent: commissionPercent } : {}) } as any).eq('id', existing.id);
        updated++;
      } else {
        await supabase.from('finance_term_models').insert({ product_id: product.id, tin, term_months: termMonths, coefficient, additional_rate: additionalRate, active, ...(commissionPercent != null ? { commission_percent: commissionPercent } : {}) } as any);
        created++;
      }
    } catch (e: any) {
      errors.push(`Fila ${row._lineNumber}: ${e.message}`);
    }
  }

  return { created, updated, errors };
}

// ── Cash Sessions (Caja Diaria) ──────────────────────────

export async function getTodayCashSession() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('session_date', today)
    .maybeSingle();
  if (error) throw error;
  return data as import('./types').CashSession | null;
}

export async function openCashSession(openingBalance: number, notes: string | null, userId: string, userName: string) {
  const { data, error } = await supabase
    .from('cash_sessions')
    .insert({
      opening_balance: openingBalance,
      notes,
      opened_by: userId,
      opened_by_name: userName,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as import('./types').CashSession;
}

export async function getCashSessionMovements(sessionId: string) {
  const { data, error } = await supabase
    .from('cash_session_movements')
    .select('*, cash_categories(name)')
    .eq('session_id', sessionId)
    .order('movement_datetime', { ascending: false });
  if (error) throw error;
  return (data || []).map((m: any) => ({
    ...m,
    category_name: m.cash_categories?.name || m.category || '',
  })) as unknown as import('./types').CashSessionMovement[];
}

export async function createCashSessionMovement(mov: {
  session_id: string;
  movement_type: string;
  payment_method: string;
  category: string;
  category_id?: string | null;
  concept: string;
  amount: number;
  client_id?: string | null;
  vehicle_id?: string | null;
  notes?: string | null;
  created_by: string;
  created_by_name: string;
}) {
  const { data, error } = await supabase
    .from('cash_session_movements')
    .insert(mov as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as import('./types').CashSessionMovement;
}

// ── Cash Categories ──────────────────────────────────────

export async function getCashCategories(type?: 'ingreso' | 'gasto', activeOnly = true): Promise<CashCategory[]> {
  let q = supabase.from('cash_categories').select('*').order('sort_order');
  if (type) q = q.eq('category_type', type);
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as CashCategory[];
}

export async function createCashCategory(name: string, categoryType: 'ingreso' | 'gasto', sortOrder: number) {
  const { data, error } = await supabase
    .from('cash_categories')
    .insert({ name, category_type: categoryType, sort_order: sortOrder } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CashCategory;
}

export async function updateCashCategory(id: string, fields: Partial<Pick<CashCategory, 'name' | 'active' | 'sort_order'>>) {
  const { data, error } = await supabase
    .from('cash_categories')
    .update(fields as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CashCategory;
}

export async function getCategoryUsageCount(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('cash_session_movements')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);
  if (error) throw error;
  return count || 0;
}

export async function closeCashSession(
  sessionId: string,
  countedBalance: number,
  expectedBalance: number,
  totalTpv: number,
  closingNotes: string | null,
  userId: string,
  userName: string,
  cashIncome: number = 0,
  cashExpense: number = 0,
  discrepancyReason: string | null = null,
  discrepancyComment: string | null = null,
  tpvTerminalTotal: number | null = null,
  tpvDiscrepancyReason: string | null = null,
  tpvDiscrepancyComment: string | null = null
) {
  const difference = Math.round((countedBalance - expectedBalance) * 100) / 100;
  const settlement_status: 'correcta' | 'sobrante' | 'faltante' =
    difference === 0 ? 'correcta' : difference > 0 ? 'sobrante' : 'faltante';
  const tpv_difference = tpvTerminalTotal != null ? Math.round((tpvTerminalTotal - totalTpv) * 100) / 100 : null;
  const tpv_status = tpvTerminalTotal != null ? (tpv_difference === 0 ? 'correcto' : 'descuadre') : null;
  const general_review_status = (difference !== 0 || (tpv_difference != null && tpv_difference !== 0)) ? 'pendiente' : 'validada';

  const { data, error } = await supabase
    .from('cash_sessions')
    .update({
      status: 'cerrada',
      counted_balance: countedBalance,
      expected_balance: expectedBalance,
      difference,
      total_tpv: totalTpv,
      closing_balance: countedBalance,
      closing_notes: closingNotes,
      closed_by: userId,
      closed_by_name: userName,
      closed_at: new Date().toISOString(),
      cash_income: cashIncome,
      cash_expense: cashExpense,
      settlement_status,
      discrepancy_reason: discrepancyReason,
      discrepancy_comment: discrepancyComment,
      tpv_terminal_total: tpvTerminalTotal,
      tpv_difference,
      tpv_status,
      tpv_discrepancy_reason: tpvDiscrepancyReason,
      tpv_discrepancy_comment: tpvDiscrepancyComment,
      general_review_status,
    } as any)
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as import('./types').CashSession;
}

export async function updateCashSessionReview(
  sessionId: string,
  reviewStatus: 'revisada' | 'resuelta',
  comment?: string
) {
  const updateData: any = { review_status: reviewStatus };
  if (comment !== undefined) updateData.discrepancy_comment = comment;
  const { data, error } = await supabase
    .from('cash_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as import('./types').CashSession;
}

export async function getCashSessionHistory(filters?: { status?: string; from?: string; to?: string }) {
  let q = supabase
    .from('cash_sessions')
    .select('*')
    .order('session_date', { ascending: false });
  if (filters?.status && filters.status !== 'todos') q = q.eq('status', filters.status);
  if (filters?.from) q = q.gte('session_date', filters.from);
  if (filters?.to) q = q.lte('session_date', filters.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as import('./types').CashSession[];
}

export interface CashSessionSummary {
  opening_balance: number;
  cash_income: number;
  cash_expense: number;
  expected_balance: number;
  total_tpv: number;
  movement_count: number;
}

export function calculateCashSessionSummary(
  openingBalance: number,
  movements: import('./types').CashSessionMovement[]
): CashSessionSummary {
  let cash_income = 0, cash_expense = 0, total_tpv = 0;
  for (const m of movements) {
    const amt = Number(m.amount);
    if (m.movement_type === 'ingreso') {
      if (m.payment_method === 'efectivo') cash_income += amt;
      else if (m.payment_method === 'tpv') total_tpv += amt;
    } else {
      if (m.payment_method === 'efectivo') cash_expense += amt;
      else if (m.payment_method === 'tpv') total_tpv -= amt;
    }
  }
  return {
    opening_balance: openingBalance,
    cash_income,
    cash_expense,
    expected_balance: openingBalance + cash_income - cash_expense,
    total_tpv,
    movement_count: movements.length,
  };
}

// ── Vehicle Purchases ────────────────────────────────────

export async function getVehiclePurchases(): Promise<(VehiclePurchase & { seller_name?: string; vehicle_info?: string })[]> {
  const { data, error } = await supabase
    .from('vehicle_purchases')
    .select('*, buyers!vehicle_purchases_seller_id_fkey(name, last_name, company_name, client_type), vehicles!vehicle_purchases_vehicle_id_fkey(brand, model, plate)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((d: any) => {
    const buyer = d.buyers;
    const vehicle = d.vehicles;
    const seller_name = buyer?.client_type === 'profesional'
      ? buyer?.company_name || buyer?.name
      : [buyer?.name, buyer?.last_name].filter(Boolean).join(' ');
    const vehicle_info = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : '';
    const { buyers: _b, vehicles: _v, ...rest } = d;
    return { ...rest, seller_name, vehicle_info };
  });
}

export async function getVehiclePurchaseById(id: string): Promise<(VehiclePurchase & { seller?: any; vehicle?: any }) | null> {
  const { data, error } = await supabase
    .from('vehicle_purchases')
    .select('*, buyers!vehicle_purchases_seller_id_fkey(*), vehicles!vehicle_purchases_vehicle_id_fkey(id, brand, model, plate, vin, status, price_cash)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { buyers, vehicles, ...rest } = data as any;
  return { ...rest, seller: buyers, vehicle: vehicles };
}

export async function createVehiclePurchase(purchase: Partial<VehiclePurchase>, userId: string): Promise<VehiclePurchase> {
  const { data, error } = await supabase
    .from('vehicle_purchases')
    .insert({
      vehicle_id: purchase.vehicle_id!,
      seller_id: purchase.seller_id!,
      appraisal_id: purchase.appraisal_id || null,
      source_type: purchase.source_type || 'particular',
      requested_price: purchase.requested_price || 0,
      notes: purchase.notes || null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehiclePurchase;
}

export async function updateVehiclePurchase(id: string, updates: Partial<VehiclePurchase>, userId: string): Promise<VehiclePurchase> {
  const { data, error } = await supabase
    .from('vehicle_purchases')
    .update({ ...updates, updated_by: userId } as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehiclePurchase;
}

export async function updateVehiclePurchaseStatus(id: string, status: PurchaseStatus, userId: string, extras?: Partial<VehiclePurchase>): Promise<VehiclePurchase> {
  const updateData: any = { status, updated_by: userId, ...extras };
  if (status === 'comprado' && !updateData.purchase_date) {
    updateData.purchase_date = new Date().toISOString().split('T')[0];
  }
  const { data, error } = await supabase
    .from('vehicle_purchases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehiclePurchase;
}

// ── Vehicle Preparation Checklist ─────────────────────────

import type { VehiclePreparationItem } from './types';

export async function getPreparationItems(vehicleId: string): Promise<VehiclePreparationItem[]> {
  const { data, error } = await supabase
    .from('vehicle_preparation_items')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as VehiclePreparationItem[];
}

export async function togglePreparationItem(itemId: string, completed: boolean, userId: string): Promise<VehiclePreparationItem> {
  const { data, error } = await supabase
    .from('vehicle_preparation_items')
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
    })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehiclePreparationItem;
}

export async function updatePreparationItemNotes(itemId: string, notes: string): Promise<VehiclePreparationItem> {
  const { data, error } = await supabase
    .from('vehicle_preparation_items')
    .update({ notes })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as VehiclePreparationItem;
}

export async function getPreparationSummary(vehicleId: string): Promise<{ total: number; completed: number; requiredTotal: number; requiredCompleted: number; percent: number }> {
  const items = await getPreparationItems(vehicleId);
  const total = items.length;
  const completed = items.filter(i => i.is_completed).length;
  const requiredTotal = items.filter(i => i.is_required).length;
  const requiredCompleted = items.filter(i => i.is_required && i.is_completed).length;
  const percent = requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0;
  return { total, completed, requiredTotal, requiredCompleted, percent };
}

// ── Checklist ↔ Repair Order Integration ──────────────────

export async function linkRepairOrderToChecklistItem(itemId: string, repairOrderId: string): Promise<void> {
  const { error } = await supabase
    .from('vehicle_preparation_items')
    .update({ linked_repair_order_id: repairOrderId })
    .eq('id', itemId);
  if (error) throw error;
}

export async function createRepairOrderFromChecklist(
  itemId: string,
  vehicleId: string,
  supplierId: string,
  userId: string,
  purchaseId: string,
  description: string
): Promise<string> {
  const { data, error } = await supabase
    .from('repair_orders')
    .insert({
      vehicle_id: vehicleId,
      supplier_id: supplierId,
      status: 'abierta',
      observations: description,
      created_by: userId,
      source_module: 'vehicle_preparation',
      source_type: 'checklist_item',
      source_id: itemId,
      purchase_id: purchaseId,
    })
    .select('id')
    .single();
  if (error) throw error;
  const repairOrderId = data.id;

  await linkRepairOrderToChecklistItem(itemId, repairOrderId);
  return repairOrderId;
}

export async function getLinkedTasksForPurchase(purchaseId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, assigned_to_name, created_at')
    .eq('purchase_id', purchaseId)
    .eq('source_module', 'vehicle_preparation')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getLinkedRepairOrdersForPurchase(purchaseId: string) {
  const { data, error } = await supabase
    .from('repair_orders')
    .select('id, status, estimated_total, observations, created_at, suppliers!repair_orders_supplier_id_fkey(name, is_internal)')
    .eq('purchase_id', purchaseId)
    .eq('source_module', 'vehicle_preparation')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((d: any) => ({
    ...d,
    supplier_name: d.suppliers?.name || '',
    is_internal: d.suppliers?.is_internal ?? false,
  }));
}

// ── Purchase Contracts ──────────────────────────────────────

export async function getPurchaseContract(purchaseId: string) {
  const { data, error } = await supabase
    .from('vehicle_purchase_contracts')
    .select('*')
    .eq('purchase_id', purchaseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePurchaseContractHtml(contractId: string, html: string) {
  const { error } = await supabase
    .from('vehicle_purchase_contracts')
    .update({ html_content: html })
    .eq('id', contractId);
  if (error) throw error;
}
