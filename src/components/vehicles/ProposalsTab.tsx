import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBuyers, getBuyerById, getProposals, createProposal, getCompanySettings, getSignedDocumentUrl, createFinanceSimulation, generateFinanceProposalPdfFromProposal, getVehicleImages } from '@/lib/supabase-api';
import type { Proposal } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, formatKm } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Printer, Mail, History, FileText, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { supabase } from '@/integrations/supabase/client';
import { FinanceComparatorSection, type FinanceSelection } from '@/components/vehicles/FinanceComparatorSection';
import { DocumentPreviewDialog, type DocumentAction } from '@/components/documents/DocumentPreviewDialog';
import type { Vehicle, Buyer, CompanySettings } from '@/lib/types';

type ProposalType = 'compra' | 'pago';

function calcTotal(vehicle: Vehicle): number {
  return (vehicle.pvp_base - vehicle.discount) * (1 + vehicle.tax_rate / 100) - (vehicle.pvp_base - vehicle.discount) * vehicle.irpf_rate / 100;
}

// ── Document Components ───────────────────────────────────

function CompanyHeader({ company, logoUrl }: { company: CompanySettings; logoUrl: string | null }) {
  return (
    <div className="flex items-start gap-4 mb-4">
      {logoUrl && (
        <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
      )}
      <div className="flex-1">
        <h3 className="font-bold text-base">{company.company_name}</h3>
        <p className="text-xs text-muted-foreground">CIF: {company.tax_id}</p>
        {company.address && <p className="text-xs text-muted-foreground">{company.address}{company.city ? `, ${company.city}` : ''}{company.postal_code ? ` ${company.postal_code}` : ''}{company.province ? ` (${company.province})` : ''}</p>}
        {company.phone && <p className="text-xs text-muted-foreground">Tel: {company.phone}</p>}
        {company.email && <p className="text-xs text-muted-foreground">{company.email}</p>}
      </div>
    </div>
  );
}

function VehiclePhotoGallery({ imageUrls }: { imageUrls: string[] }) {
  if (!imageUrls.length) return null;
  return (
    <>
      <Separator />
      <div>
        <h3 className="font-semibold mb-2">Fotografías</h3>
        <div className="flex gap-2 overflow-hidden">
          {imageUrls.map((url, i) => (
            <img key={i} src={url} alt={`Foto ${i + 1}`} className="h-28 w-auto rounded object-cover border" />
          ))}
        </div>
      </div>
    </>
  );
}

function ProposalCompraDoc({ vehicle, buyer, company, logoUrl, financeData, imageUrls = [] }: { vehicle: Vehicle; buyer: Buyer; company: CompanySettings | null; logoUrl: string | null; financeData?: FinanceSelection | null; imageUrls?: string[] }) {
  return (
    <div className="proposal-content space-y-5 p-6 bg-card border rounded-lg text-sm">
      {company && <CompanyHeader company={company} logoUrl={logoUrl} />}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold tracking-tight">PROPUESTA DE COMPRA</h2>
        <p className="text-muted-foreground text-xs">{new Date().toLocaleDateString('es-ES')}</p>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold mb-2">Datos del Vehículo</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">Marca / Modelo</span><span className="font-medium">{vehicle.brand} {vehicle.model} {vehicle.version}</span>
          <span className="text-muted-foreground">Matrícula</span><span className="font-mono font-medium">{vehicle.plate}</span>
          <span className="text-muted-foreground">VIN</span><span className="font-mono">{vehicle.vin}</span>
          <span className="text-muted-foreground">Color</span><span className="capitalize">{vehicle.color}</span>
          <span className="text-muted-foreground">Motor</span><span className="capitalize">{vehicle.engine_type} · {vehicle.displacement} cc · {vehicle.horsepower} CV</span>
          <span className="text-muted-foreground">Cambio</span><span className="capitalize">{vehicle.transmission}</span>
          <span className="text-muted-foreground">Kilómetros</span><span>{formatKm(vehicle.km_entry)}</span>
          <span className="text-muted-foreground">1ª Matriculación</span><span>{formatDate(vehicle.first_registration)}</span>
          <span className="text-muted-foreground">ITV</span><span>{formatDate(vehicle.itv_date)}</span>
        </div>
      </div>
      <VehiclePhotoGallery imageUrls={imageUrls} />
      <Separator />
      <div>
        <h3 className="font-semibold mb-2">Equipamiento y Documentación</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">2ª Llave</span><span>{vehicle.has_second_key ? '✅ Sí' : '❌ No'}</span>
          <span className="text-muted-foreground">Ficha Técnica</span><span>{vehicle.has_technical_sheet ? '✅ Sí' : '❌ No'}</span>
          <span className="text-muted-foreground">Permiso Circulación</span><span>{vehicle.has_circulation_permit ? '✅ Sí' : '❌ No'}</span>
          <span className="text-muted-foreground">Manual</span><span>{vehicle.has_manual ? '✅ Sí' : '❌ No'}</span>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold mb-2">Datos del Cliente</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">Nombre</span><span className="font-medium">{buyer.name}</span>
          {buyer.dni && <><span className="text-muted-foreground">DNI/NIF</span><span>{buyer.dni}</span></>}
          {buyer.address && <><span className="text-muted-foreground">Dirección</span><span>{buyer.address}{buyer.city ? `, ${buyer.city}` : ''}{buyer.postal_code ? ` ${buyer.postal_code}` : ''}</span></>}
          {buyer.phone && <><span className="text-muted-foreground">Teléfono</span><span>{buyer.phone}</span></>}
          {buyer.email && <><span className="text-muted-foreground">Email</span><span>{buyer.email}</span></>}
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold mb-2">Precios</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-muted-foreground">PVP Base</span><span className="font-semibold">{formatCurrency(vehicle.pvp_base)}</span>
          <span className="text-muted-foreground">Precio Contado</span><span className="font-semibold">{formatCurrency(vehicle.price_cash)}</span>
          <span className="text-muted-foreground">Precio Financiado</span><span className="font-semibold">{formatCurrency(vehicle.price_financed)}</span>
          <span className="text-muted-foreground">Impuesto</span><span>{vehicle.tax_type.toUpperCase()} {vehicle.tax_rate}%</span>
          {vehicle.discount > 0 && (
            <><span className="text-muted-foreground">Descuento</span><span className="text-destructive font-semibold">-{formatCurrency(vehicle.discount)}</span></>
          )}
          <span className="text-muted-foreground font-semibold">Total</span><span className="font-bold text-base">{formatCurrency(calcTotal(vehicle))}</span>
        </div>
      </div>
      {/* Financing section - only in PDF, no commission/flag */}
      {financeData && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold mb-2">Financiación</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <span className="text-muted-foreground">Entrada</span><span className="font-semibold">{formatCurrency(financeData.down_payment)}</span>
              <span className="text-muted-foreground">Importe financiado</span><span className="font-semibold">{formatCurrency(financeData.financed_amount)}</span>
              <span className="text-muted-foreground">Entidad / Producto</span><span>{financeData.entity_name} — {financeData.product_name}</span>
              <span className="text-muted-foreground">TIN</span><span>{financeData.tin}%</span>
              <span className="text-muted-foreground">Plazo</span><span>{financeData.term_months} meses</span>
              <span className="text-muted-foreground">Cuota mensual</span><span className="font-bold">{formatCurrency(financeData.monthly_payment)}</span>
              <span className="text-muted-foreground">Total financiación</span><span className="font-semibold">{formatCurrency(financeData.total_financed)}</span>
            </div>
          </div>
        </>
      )}
      <Separator />
      <div className="text-center text-[10px] text-muted-foreground pt-2">
        {company?.legal_text ? (
          <p>{company.legal_text}</p>
        ) : (
          <>
            <p>Centro: {vehicle.center} · Propuesta válida durante 7 días naturales</p>
            <p>Este documento es orientativo y no constituye un compromiso contractual.</p>
          </>
        )}
      </div>
    </div>
  );
}

function ProposalPagoDoc({ vehicle, company, logoUrl, imageUrls = [] }: { vehicle: Vehicle; company: CompanySettings | null; logoUrl: string | null; imageUrls?: string[] }) {
  return (
    <div className="proposal-content space-y-5 p-6 bg-card border rounded-lg text-sm">
      {company && <CompanyHeader company={company} logoUrl={logoUrl} />}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold tracking-tight">INFORMACIÓN DE PAGO</h2>
        <p className="text-muted-foreground text-xs">{new Date().toLocaleDateString('es-ES')}</p>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold mb-2">Vehículo</h3>
        <p className="text-xs">{vehicle.brand} {vehicle.model} {vehicle.version} · {vehicle.plate}</p>
      </div>
      <VehiclePhotoGallery imageUrls={imageUrls} />
      <Separator />
      {company?.iban && (
        <>
          <div>
            <h3 className="font-semibold mb-2">Datos de Pago</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <span className="text-muted-foreground">IBAN</span><span className="font-mono font-medium">{company.iban}</span>
              <span className="text-muted-foreground">Concepto</span><span>Reserva {vehicle.brand} {vehicle.model} {vehicle.plate}</span>
            </div>
          </div>
          <Separator />
        </>
      )}
      <div>
        <h3 className="font-semibold mb-2">Desglose de Pago</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span>Precio base</span><span>{formatCurrency(vehicle.pvp_base)}</span></div>
          {vehicle.discount > 0 && (
            <div className="flex justify-between text-destructive"><span>Descuento</span><span>-{formatCurrency(vehicle.discount)}</span></div>
          )}
          <div className="flex justify-between"><span>{vehicle.tax_type.toUpperCase()} ({vehicle.tax_rate}%)</span><span>{formatCurrency((vehicle.pvp_base - vehicle.discount) * vehicle.tax_rate / 100)}</span></div>
          {vehicle.irpf_rate > 0 && (
            <div className="flex justify-between"><span>IRPF ({vehicle.irpf_rate}%)</span><span>-{formatCurrency((vehicle.pvp_base - vehicle.discount) * vehicle.irpf_rate / 100)}</span></div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL A PAGAR</span>
            <span>{formatCurrency(calcTotal(vehicle))}</span>
          </div>
        </div>
      </div>
      <Separator />
      <div className="text-center text-[10px] text-muted-foreground pt-2">
        <p>Centro: {vehicle.center}</p>
        <p>Este documento es orientativo. Los importes pueden variar según forma de pago.</p>
      </div>
    </div>
  );
}

// ── HTML builder for print window ─────────────────────────

function buildProposalHtml(vehicle: Vehicle, buyer: Buyer | null, company: CompanySettings | null, logoUrl: string | null, proposal: Proposal, imageUrls: string[] = []): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtCur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const total = calcTotal(vehicle);
  const isCompra = proposal.proposal_type === 'compra';
  const title = isCompra ? 'PROPUESTA DE COMPRA' : 'INFORMACIÓN DE PAGO';
  const dateStr = new Date(proposal.created_at).toLocaleDateString('es-ES');

  const photosHtml = imageUrls.length > 0 ? `
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
    <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Fotografías</h3>
    <div style="display:flex;gap:8px;overflow:hidden;">
      ${imageUrls.map(url => `<img src="${esc(url)}" alt="Foto" style="height:100px;width:auto;border-radius:4px;object-fit:cover;border:1px solid #e5e5e5;">`).join('')}
    </div>
  ` : '';

  const logoHtml = logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-height:60px;">` : '';
  const companyHtml = company ? `
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;">
      ${logoHtml}
      <div>
        <div style="font-weight:700;font-size:14px;">${esc(company.company_name)}</div>
        <div style="font-size:10px;color:#666;">CIF: ${esc(company.tax_id)}</div>
        ${company.address ? `<div style="font-size:10px;color:#666;">${esc(company.address)}${company.city ? ', ' + esc(company.city) : ''}${company.postal_code ? ' ' + esc(company.postal_code) : ''}${company.province ? ' (' + esc(company.province) + ')' : ''}</div>` : ''}
        ${company.phone ? `<div style="font-size:10px;color:#666;">Tel: ${esc(company.phone)}</div>` : ''}
        ${company.email ? `<div style="font-size:10px;color:#666;">${esc(company.email)}</div>` : ''}
      </div>
    </div>
  ` : '';

  let bodyContent = '';

  if (isCompra && buyer) {
    const financeHtml = (proposal.monthly_payment && proposal.financed_amount) ? `
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Financiación</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:11px;">
        <span style="color:#666;">Entrada</span><span style="font-weight:600;">${fmtCur(proposal.down_payment || 0)}</span>
        <span style="color:#666;">Importe financiado</span><span style="font-weight:600;">${fmtCur(proposal.financed_amount)}</span>
        <span style="color:#666;">Cuota mensual</span><span style="font-weight:700;">${fmtCur(proposal.monthly_payment)}</span>
        <span style="color:#666;">Total financiación</span><span style="font-weight:600;">${fmtCur(proposal.total_financed || 0)}</span>
      </div>
    ` : '';

    bodyContent = `
      <div style="text-align:center;margin-bottom:8px;">
        <h2 style="font-size:16px;font-weight:700;">${title}</h2>
        <div style="font-size:11px;color:#666;">${dateStr}</div>
      </div>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Datos del Vehículo</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:11px;">
        <span style="color:#666;">Marca / Modelo</span><span style="font-weight:500;">${esc(vehicle.brand)} ${esc(vehicle.model)} ${esc(vehicle.version)}</span>
        <span style="color:#666;">Matrícula</span><span style="font-family:monospace;font-weight:500;">${esc(vehicle.plate)}</span>
        <span style="color:#666;">VIN</span><span style="font-family:monospace;">${esc(vehicle.vin)}</span>
        <span style="color:#666;">Color</span><span>${esc(vehicle.color)}</span>
        <span style="color:#666;">Motor</span><span>${esc(vehicle.engine_type)} · ${vehicle.displacement} cc · ${vehicle.horsepower} CV</span>
        <span style="color:#666;">Cambio</span><span>${esc(vehicle.transmission)}</span>
        <span style="color:#666;">Kilómetros</span><span>${formatKm(vehicle.km_entry)}</span>
        <span style="color:#666;">1ª Matriculación</span><span>${formatDate(vehicle.first_registration)}</span>
        <span style="color:#666;">ITV</span><span>${formatDate(vehicle.itv_date)}</span>
      </div>
      ${photosHtml}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Datos del Cliente</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:11px;">
        <span style="color:#666;">Nombre</span><span style="font-weight:500;">${esc(buyer.name)}</span>
        ${buyer.dni ? `<span style="color:#666;">DNI/NIF</span><span>${esc(buyer.dni)}</span>` : ''}
        ${buyer.address ? `<span style="color:#666;">Dirección</span><span>${esc(buyer.address)}${buyer.city ? ', ' + esc(buyer.city) : ''}${buyer.postal_code ? ' ' + esc(buyer.postal_code) : ''}</span>` : ''}
        ${buyer.phone ? `<span style="color:#666;">Teléfono</span><span>${esc(buyer.phone)}</span>` : ''}
        ${buyer.email ? `<span style="color:#666;">Email</span><span>${esc(buyer.email)}</span>` : ''}
      </div>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Precios</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:11px;">
        <span style="color:#666;">PVP Base</span><span style="font-weight:600;">${fmtCur(vehicle.pvp_base)}</span>
        <span style="color:#666;">Precio Contado</span><span style="font-weight:600;">${fmtCur(vehicle.price_cash)}</span>
        <span style="color:#666;">Precio Financiado</span><span style="font-weight:600;">${fmtCur(vehicle.price_financed)}</span>
        <span style="color:#666;">Impuesto</span><span>${vehicle.tax_type.toUpperCase()} ${vehicle.tax_rate}%</span>
        ${vehicle.discount > 0 ? `<span style="color:#666;">Descuento</span><span style="color:#dc2626;font-weight:600;">-${fmtCur(vehicle.discount)}</span>` : ''}
        <span style="color:#666;font-weight:600;">Total</span><span style="font-weight:700;font-size:13px;">${fmtCur(total)}</span>
      </div>
      ${financeHtml}
    `;
  } else {
    // Pago doc
    const ibanHtml = company?.iban ? `
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Datos de Pago</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;font-size:11px;">
        <span style="color:#666;">IBAN</span><span style="font-family:monospace;font-weight:500;">${esc(company.iban)}</span>
        <span style="color:#666;">Concepto</span><span>Reserva ${esc(vehicle.brand)} ${esc(vehicle.model)} ${esc(vehicle.plate)}</span>
      </div>
    ` : '';

    bodyContent = `
      <div style="text-align:center;margin-bottom:8px;">
        <h2 style="font-size:16px;font-weight:700;">${title}</h2>
        <div style="font-size:11px;color:#666;">${dateStr}</div>
      </div>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Vehículo</h3>
      <div style="font-size:11px;">${esc(vehicle.brand)} ${esc(vehicle.model)} ${esc(vehicle.version)} · ${esc(vehicle.plate)}</div>
      ${photosHtml}
      ${ibanHtml}
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;">Desglose de Pago</h3>
      <div style="font-size:11px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Precio base</span><span>${fmtCur(vehicle.pvp_base)}</span></div>
        ${vehicle.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#dc2626;"><span>Descuento</span><span>-${fmtCur(vehicle.discount)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${vehicle.tax_type.toUpperCase()} (${vehicle.tax_rate}%)</span><span>${fmtCur((vehicle.pvp_base - vehicle.discount) * vehicle.tax_rate / 100)}</span></div>
        ${vehicle.irpf_rate > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>IRPF (${vehicle.irpf_rate}%)</span><span>-${fmtCur((vehicle.pvp_base - vehicle.discount) * vehicle.irpf_rate / 100)}</span></div>` : ''}
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:8px 0;">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;"><span>TOTAL A PAGAR</span><span>${fmtCur(total)}</span></div>
      </div>
    `;
  }

  const legalHtml = company?.legal_text
    ? `<div style="text-align:center;font-size:9px;color:#aaa;margin-top:16px;">${esc(company.legal_text)}</div>`
    : `<div style="text-align:center;font-size:9px;color:#aaa;margin-top:16px;">Centro: ${esc(vehicle.center)} · Este documento es orientativo.</div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title} - ${esc(vehicle.plate)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; color: #1a1a1a; }
  .print-btn { position: fixed; top: 16px; right: 16px; background: #111; color: #fff; border: none; padding: 8px 20px; font-size: 13px; border-radius: 6px; cursor: pointer; z-index: 1000; }
  .print-btn:hover { background: #333; }
  @media print { .print-btn { display: none !important; } body { padding: 1rem; } }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
${companyHtml}
${bodyContent}
${legalHtml}
<div style="font-size:9px;color:#bbb;margin-top:12px;">Generado por: ${esc(proposal.created_by_name)} · ${dateStr}</div>
</body></html>`;
}

// ── Main Component ────────────────────────────────────────

export function ProposalsTab({ vehicle }: { vehicle: Vehicle }) {
  const [proposalType, setProposalType] = useState<ProposalType>('compra');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState<{ type: ProposalType; buyerId: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [acceptBuyerId, setAcceptBuyerId] = useState('');
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const [financeSelection, setFinanceSelection] = useState<FinanceSelection | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [financePdfLoading, setFinancePdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const canAccept = role === 'vendedor' || role === 'administrador';
  const isAvailable = vehicle.status === 'disponible';

  const { data: buyers = [] } = useQuery({ queryKey: ['buyers'], queryFn: getBuyers });
  const { data: proposals = [] } = useQuery({ queryKey: ['proposals', vehicle.id], queryFn: () => getProposals(vehicle.id) });
  const { data: company } = useQuery({ queryKey: ['company-settings'], queryFn: getCompanySettings });

  // Get buyer for generated proposal
  const { data: selectedBuyer } = useQuery({
    queryKey: ['buyer', generatedProposal?.buyerId],
    queryFn: () => getBuyerById(generatedProposal!.buyerId),
    enabled: !!generatedProposal?.buyerId,
  });

  // Get signed logo URL
  const { data: logoUrl } = useQuery({
    queryKey: ['company-logo', company?.logo_url],
    queryFn: async () => {
      if (!company?.logo_url) return null;
      if (company.logo_url.startsWith('http')) return company.logo_url;
      try {
        return await getSignedDocumentUrl(company.logo_url, 'company-assets');
      } catch { return null; }
    },
    enabled: !!company?.logo_url,
  });

  // Get vehicle images (first 4, primary first)
  const { data: vehicleImages = [] } = useQuery({
    queryKey: ['vehicle-images', vehicle.id],
    queryFn: () => getVehicleImages(vehicle.id),
  });
  const imageUrls = vehicleImages
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.order_index - b.order_index)
    .slice(0, 4)
    .map((img: any) => img.original_url);

  const handleGenerate = async () => {
    if (!selectedBuyerId || !user) return;
    setGenerating(true);
    try {
      const buyer = buyers.find(b => b.id === selectedBuyerId);
      const financeData = financeEnabled && financeSelection && proposalType === 'compra' ? {
        down_payment: financeSelection.down_payment,
        financed_amount: financeSelection.financed_amount,
        finance_term_model_id: financeSelection.term_model_id,
        monthly_payment: financeSelection.monthly_payment,
        total_financed: financeSelection.total_financed,
        commission_estimated: financeSelection.commission_estimated,
        internal_flag: financeSelection.internal_flag,
      } : {};
      await createProposal({
        vehicle_id: vehicle.id,
        proposal_type: proposalType,
        buyer_id: selectedBuyerId,
        buyer_name: buyer?.name || '',
        buyer_iban: buyer?.iban || null,
        total_amount: calcTotal(vehicle),
        created_by: user.id,
        created_by_name: profile?.full_name || user.email || '',
        ...financeData,
      });
      qc.invalidateQueries({ queryKey: ['proposals', vehicle.id] });
      setGeneratedProposal({ type: proposalType, buyerId: selectedBuyerId });
      toast({ title: '✅ Propuesta generada y guardada en el historial' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const title = generatedProposal?.type === 'compra' ? 'Propuesta de Compra' : 'Información de Pago';
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title} - ${vehicle.plate}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 2rem; color: #1a1a1a; }
  h2 { font-size: 1.25rem; text-align: center; }
  h3 { font-size: 0.875rem; margin-top: 1rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 1.5rem; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 1rem 0; }
  .bold { font-weight: 600; }
  .mono { font-family: monospace; }
  .muted { color: #666; }
  .small { font-size: 0.75rem; }
  .center { text-align: center; }
  img { max-height: 60px; }
  @media print { body { padding: 1rem; } }
</style></head><body>${content.innerHTML}</body></html>`;
    setPreviewHtml(html);
    setPreviewSrc(undefined);
    setPreviewTitle(`Vista previa — ${title}`);
    setPreviewProposal(null);
    setPreviewOpen(true);
  };

  const handleSendEmail = async () => {
    if (!generatedProposal || !selectedBuyer) return;
    if (!selectedBuyer.email) {
      toast({ title: 'Sin email', description: 'Este cliente no tiene email configurado.', variant: 'destructive' });
      return;
    }
    const content = printRef.current;
    if (!content) return;
    setSendingEmail(true);
    try {
      const title = generatedProposal.type === 'compra' ? 'Propuesta de Compra' : 'Información de Pago';
      const subject = `${title} — ${vehicle.brand} ${vehicle.model} ${vehicle.plate}`;
      const html = `<html><head><style>body{font-family:system-ui,sans-serif;padding:2rem;color:#1a1a1a;}h2{font-size:1.25rem;text-align:center;}h3{font-size:0.875rem;margin-top:1rem;}hr{border:none;border-top:1px solid #e5e5e5;margin:1rem 0;}img{max-height:60px;}</style></head><body>${content.innerHTML}</body></html>`;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-proposal-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ html, to: selectedBuyer.email, subject }),
      });

      if (res.status === 503) {
        toast({ title: 'Servicio no configurado', description: 'El servicio de envío de email no está configurado. Contacte al administrador.', variant: 'destructive' });
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || 'Error al enviar');
      } else {
        toast({ title: '✅ Email enviado', description: `Propuesta enviada a ${selectedBuyer.email}` });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleView = async (proposal: Proposal) => {
    try {
      let buyer: Buyer | null = null;
      if (proposal.buyer_id) {
        buyer = await getBuyerById(proposal.buyer_id);
      }
      const html = buildProposalHtml(vehicle, buyer, company || null, logoUrl || null, proposal, imageUrls);
      const title = proposal.proposal_type === 'compra' ? 'Propuesta de Compra' : 'Información de Pago';
      setPreviewHtml(html);
      setPreviewSrc(undefined);
      setPreviewTitle(`Vista previa — ${title}`);
      setPreviewProposal(proposal);
      setPreviewOpen(true);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleViewFinancePdf = async (proposal: Proposal) => {
    setFinancePdfLoading(true);
    try {
      const html = await generateFinanceProposalPdfFromProposal(proposal.id);
      setPreviewHtml(html);
      setPreviewSrc(undefined);
      setPreviewTitle('Vista previa — Propuesta de Financiación');
      setPreviewProposal(proposal);
      setPreviewOpen(true);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setFinancePdfLoading(false);
    }
  };

  const handleAccept = async (proposal: Proposal) => {
    if (!proposal.buyer_id) return;

    // If proposal has financing, create finance_simulation
    if (proposal.finance_term_model_id && user) {
      try {
        await createFinanceSimulation({
          vehicle_id: vehicle.id,
          buyer_id: proposal.buyer_id,
          term_model_id: proposal.finance_term_model_id,
          tin_used: 0,
          coefficient_used: 0,
          financed_amount: proposal.financed_amount || 0,
          adjusted_capital: proposal.financed_amount || 0,
          down_payment: proposal.down_payment || 0,
          monthly_payment: proposal.monthly_payment || 0,
          total_estimated: proposal.total_financed || 0,
          term_months_used: 0,
          additional_rate_used: 0,
          entity_name_snapshot: '',
          product_name_snapshot: '',
          status: 'simulacion_interna' as any,
          created_by: user.id,
        });
      } catch (e: any) {
        console.error('Error creating finance simulation from proposal:', e);
      }
    }

    setAcceptBuyerId(proposal.buyer_id);
    setReservationDialogOpen(true);
  };

  const handleReservationConfirm = () => {
    setReservationDialogOpen(false);
    setAcceptBuyerId('');
    qc.invalidateQueries({ queryKey: ['vehicles'] });
    qc.invalidateQueries({ queryKey: ['reservations'] });
    toast({ title: '✅ Reserva creada desde propuesta' });
  };

  return (
    <div className="space-y-4">
      {/* Block A: Nueva Propuesta */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Nueva Propuesta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente *</label>
              <Select value={selectedBuyerId || '_none'} onValueChange={v => setSelectedBuyerId(v === '_none' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Seleccionar cliente</SelectItem>
                  {buyers.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.dni ? ` — ${b.dni}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
              <Select value={proposalType} onValueChange={v => setProposalType(v as ProposalType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Propuesta de Compra</SelectItem>
                  <SelectItem value="pago">Información de Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleGenerate} disabled={!selectedBuyerId || generating}>
              {generating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              <FileText className="h-3 w-3 mr-1" /> Generar Propuesta
            </Button>
          </div>

          {/* Finance Comparator - only for compra type */}
          {proposalType === 'compra' && (
            <FinanceComparatorSection
              totalPrice={calcTotal(vehicle)}
              onSelectionChange={setFinanceSelection}
              enabled={financeEnabled}
              onEnabledChange={setFinanceEnabled}
            />
          )}
        </CardContent>
      </Card>

      {/* Block B: Documento Renderizado - only for NEW proposals */}
      {generatedProposal && selectedBuyer && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm">
                {generatedProposal.type === 'compra' ? 'Propuesta de Compra' : 'Información de Pago'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-3 w-3 mr-1" /> Imprimir
                </Button>
                <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={sendingEmail}>
                  {sendingEmail ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                  Enviar por Email
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={printRef}>
              {generatedProposal.type === 'compra' ? (
                <ProposalCompraDoc vehicle={vehicle} buyer={selectedBuyer} company={company || null} logoUrl={logoUrl || null} financeData={financeEnabled ? financeSelection : null} imageUrls={imageUrls} />
              ) : (
                <ProposalPagoDoc vehicle={vehicle} company={company || null} logoUrl={logoUrl || null} imageUrls={imageUrls} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block C: Historial */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Historial de Propuestas ({proposals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no se han generado propuestas para este vehículo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Generado por</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.proposal_type === 'compra' ? 'Propuesta Compra' : 'Info. Pago'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{p.buyer_name || '—'}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(p.total_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.created_by_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleView(p)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Ver
                        </Button>
                        {p.finance_term_model_id && p.monthly_payment && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleViewFinancePdf(p)}
                          >
                            <FileText className="h-3 w-3 mr-1" /> PDF
                          </Button>
                        )}
                        {p.proposal_type === 'compra' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={!p.buyer_id || !isAvailable || !canAccept}
                                    onClick={() => handleAccept(p)}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Aceptar
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {(!p.buyer_id || !isAvailable || !canAccept) && (
                                <TooltipContent>
                                  {!p.buyer_id
                                    ? 'Propuesta sin cliente vinculado'
                                    : !isAvailable
                                      ? 'El vehículo no está disponible'
                                      : 'Sin permisos para aceptar'}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) { setPreviewHtml(''); setPreviewSrc(undefined); setPreviewProposal(null); }
        }}
        title={previewTitle}
        html={previewHtml}
        src={previewSrc}
        actions={[
          ...(previewProposal?.finance_term_model_id && previewProposal?.monthly_payment ? [{
            icon: 'pdf' as const,
            tooltip: 'PDF Financiación',
            onClick: () => previewProposal && handleViewFinancePdf(previewProposal),
            loading: financePdfLoading,
          }] : []),
          {
            icon: 'printer' as const,
            tooltip: 'Imprimir',
            onClick: () => {
              const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="' + previewTitle + '"]');
              try { iframe?.contentWindow?.print(); } catch { window.print(); }
            },
          },
          {
            icon: 'eye' as const,
            tooltip: 'Abrir en nueva pestaña',
            onClick: () => {
              if (previewSrc) {
                window.open(previewSrc, '_blank');
              } else if (previewHtml) {
                const w = window.open('', '_blank');
                if (w) { w.document.write(previewHtml); w.document.close(); }
              }
            },
          },
        ]}
      />

      {/* ReservationDialog for Accept action */}
      <ReservationDialog
        vehicle={vehicle}
        open={reservationDialogOpen}
        onConfirm={handleReservationConfirm}
        onCancel={() => { setReservationDialogOpen(false); setAcceptBuyerId(''); }}
        defaultBuyerId={acceptBuyerId}
      />
    </div>
  );
}
