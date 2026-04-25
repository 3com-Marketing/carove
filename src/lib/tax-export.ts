// ── AEAT / ATC URLs ──────────────────────────────────────
export const AEAT_URLS: Record<string, { url: string; label: string }> = {
  '303': { url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-303-iva-autoliquidacion.html', label: 'Presentar en AEAT' },
  '420': { url: 'https://sede.gobiernocanarias.org/tributos/jsf/publico/presentacion/inicio.jsp', label: 'Presentar en ATC' },
  '349': { url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-349-declaracion-recapitulativa.html', label: 'Presentar en AEAT' },
  '369': { url: 'https://sede.agenciatributaria.gob.es/Sede/iva/modelo-369-iva-regimen-importacion.html', label: 'Presentar en AEAT' },
  '130': { url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-130-irpf-estimacion-directa.html', label: 'Presentar en AEAT' },
  '115': { url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-115-retenciones-alquileres.html', label: 'Presentar en AEAT' },
  '111': { url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-111-retenciones-irpf.html', label: 'Presentar en AEAT' },
  '190': { url: 'https://sede.agenciatributaria.gob.es/Sede/irpf/modelo-190-resumen-anual-retenciones.html', label: 'Presentar en AEAT' },
  '200': { url: 'https://sede.agenciatributaria.gob.es/Sede/impuesto-sociedades/modelo-200-impuesto-sociedades.html', label: 'Presentar en AEAT' },
};

// ── Deadline helpers ─────────────────────────────────────
export function getFilingDeadline(
  periodType: string,
  year: number,
  quarter: number | null,
): { start: Date; end: Date; label: string } | null {
  if (periodType === 'trimestral' && quarter) {
    const map: Record<number, { start: Date; end: Date; label: string }> = {
      1: { start: new Date(year, 3, 1), end: new Date(year, 3, 20), label: `1–20 abril ${year}` },
      2: { start: new Date(year, 6, 1), end: new Date(year, 6, 20), label: `1–20 julio ${year}` },
      3: { start: new Date(year, 9, 1), end: new Date(year, 9, 20), label: `1–20 octubre ${year}` },
      4: { start: new Date(year + 1, 0, 1), end: new Date(year + 1, 0, 30), label: `1–30 enero ${year + 1}` },
    };
    return map[quarter] || null;
  }
  if (periodType === 'anual') {
    return {
      start: new Date(year + 1, 0, 1),
      end: new Date(year + 1, 6, 25),
      label: `Enero–25 julio ${year + 1}`,
    };
  }
  return null;
}

// ── TXT Export functions ─────────────────────────────────

function pad(val: string | number, len: number, char = ' '): string {
  return String(val).padEnd(len, char);
}

function numField(val: number, len: number): string {
  const sign = val >= 0 ? '+' : '-';
  return sign + Math.abs(Math.round(val * 100)).toString().padStart(len - 1, '0');
}

function formatCurrency(val: number): string {
  return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function headerLine(modelCode: string, nif: string, year: number, quarter: number | null, companyName: string): string {
  return [
    `<T${modelCode}0>`,
    `NIF: ${nif}`,
    `Razón social: ${companyName}`,
    `Ejercicio: ${year}`,
    quarter ? `Periodo: ${quarter}T` : 'Periodo: 0A (anual)',
    `Fecha generación: ${new Date().toLocaleDateString('es-ES')}`,
  ].join('\n');
}

export function exportTaxModel303(
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number,
  companyName: string,
): string {
  const result = (data.salesTax || 0) - (data.expensesTax || 0);
  return [
    headerLine('303', nif, year, quarter, companyName),
    '',
    '=== IVA DEVENGADO (Repercutido) ===',
    `[01] Base imponible: ${formatCurrency(data.salesBase || 0)}`,
    `[03] Cuota: ${formatCurrency(data.salesTax || 0)}`,
    '',
    '=== IVA DEDUCIBLE (Soportado) ===',
    `[28] Base imponible: ${formatCurrency(data.expensesBase || 0)}`,
    `[29] Cuota: ${formatCurrency(data.expensesTax || 0)}`,
    '',
    '=== RESULTADO ===',
    `[64] Resultado: ${formatCurrency(result)}`,
    result >= 0 ? '[69] A ingresar' : '[70] A compensar',
    `Importe: ${formatCurrency(Math.abs(result))}`,
    '',
    `</T3030>`,
  ].join('\n');
}

export function exportTaxModel420(
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number,
  companyName: string,
): string {
  const result = (data.salesTax || 0) - (data.expensesTax || 0);
  return [
    headerLine('420', nif, year, quarter, companyName),
    '',
    '=== IGIC DEVENGADO (Repercutido) ===',
    `[01] Base imponible: ${formatCurrency(data.salesBase || 0)}`,
    `[03] Cuota: ${formatCurrency(data.salesTax || 0)}`,
    '',
    '=== IGIC DEDUCIBLE (Soportado) ===',
    `[28] Base imponible: ${formatCurrency(data.expensesBase || 0)}`,
    `[29] Cuota: ${formatCurrency(data.expensesTax || 0)}`,
    '',
    '=== RESULTADO ===',
    `[64] Resultado: ${formatCurrency(result)}`,
    `Importe: ${formatCurrency(Math.abs(result))}`,
    '',
    `</T4200>`,
  ].join('\n');
}

export function exportTaxModel130(
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number,
  companyName: string,
): string {
  const income = data.income || 0;
  const expenses = data.expenses || 0;
  const profit = income - expenses;
  const payment = profit > 0 ? profit * 0.2 : 0;
  return [
    headerLine('130', nif, year, quarter, companyName),
    '',
    '=== ACTIVIDADES ECONÓMICAS ===',
    `[01] Ingresos computables: ${formatCurrency(income)}`,
    `[02] Gastos deducibles: ${formatCurrency(expenses)}`,
    `[03] Rendimiento neto: ${formatCurrency(profit)}`,
    `[04] 20% s/ rendimiento: ${formatCurrency(payment)}`,
    '',
    '=== RESULTADO ===',
    `[07] A ingresar: ${formatCurrency(payment)}`,
    '',
    `</T1300>`,
  ].join('\n');
}

export function exportTaxModel111(
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number,
  companyName: string,
): string {
  return [
    headerLine('111', nif, year, quarter, companyName),
    '',
    '=== RETENCIONES E INGRESOS A CUENTA ===',
    `[01] Nº perceptores: ${data.retentionCount || 0}`,
    `[02] Base retenciones: ${formatCurrency(data.retentionBase || 0)}`,
    `[03] Retenciones: ${formatCurrency(data.retentionAmount || 0)}`,
    '',
    '=== RESULTADO ===',
    `[28] A ingresar: ${formatCurrency(data.retentionAmount || 0)}`,
    '',
    `</T1110>`,
  ].join('\n');
}

export function exportTaxModel349(
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number,
  companyName: string,
): string {
  return [
    headerLine('349', nif, year, quarter, companyName),
    '',
    '=== OPERACIONES INTRACOMUNITARIAS ===',
    `[01] Nº operaciones: ${data.intraOpsCount || 0}`,
    `[02] Base imponible total: ${formatCurrency(data.intraOpsBase || 0)}`,
    '',
    `</T3490>`,
  ].join('\n');
}

export function exportTaxModel115(
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number,
  companyName: string,
): string {
  return [
    headerLine('115', nif, year, quarter, companyName),
    '',
    '=== RETENCIONES CAPITAL INMOBILIARIO ===',
    `[01] Nº arrendadores: ${data.rentalCount || 0}`,
    `[02] Base retenciones: ${formatCurrency(data.rentalBase || 0)}`,
    `[03] Retenciones: ${formatCurrency(data.rentalRetention || 0)}`,
    '',
    '=== RESULTADO ===',
    `[28] A ingresar: ${formatCurrency(data.rentalRetention || 0)}`,
    '',
    `</T1150>`,
  ].join('\n');
}

export function exportTaxModel190(
  data: Record<string, number>,
  nif: string,
  year: number,
  _quarter: number | null,
  companyName: string,
): string {
  const lines = [
    headerLine('190', nif, year, null, companyName),
    '',
    '=== RESUMEN ANUAL RETENCIONES ===',
  ];
  for (let q = 1; q <= 4; q++) {
    lines.push(`  T${q}: Base ${formatCurrency(data[`q${q}Base`] || 0)} | Retención ${formatCurrency(data[`q${q}Retention`] || 0)}`);
  }
  lines.push('', `[01] Total base: ${formatCurrency(data.totalAnnualBase || 0)}`);
  lines.push(`[02] Total retenciones: ${formatCurrency(data.totalAnnualRetention || 0)}`);
  lines.push('', `</T1900>`);
  return lines.join('\n');
}

export function exportTaxModel200(
  data: Record<string, number>,
  nif: string,
  year: number,
  _quarter: number | null,
  companyName: string,
): string {
  const profit = (data.annualIncome || 0) - (data.annualExpenses || 0);
  const taxBase = Math.max(profit, 0);
  const quota = taxBase * 0.25;
  return [
    headerLine('200', nif, year, null, companyName),
    '',
    '=== RESULTADO DEL EJERCICIO ===',
    `[01] Ingresos: ${formatCurrency(data.annualIncome || 0)}`,
    `[02] Gastos: ${formatCurrency(data.annualExpenses || 0)}`,
    `[03] Resultado: ${formatCurrency(profit)}`,
    '',
    '=== LIQUIDACIÓN ===',
    `[04] Base imponible: ${formatCurrency(taxBase)}`,
    `[05] Tipo impositivo: 25%`,
    `[06] Cuota íntegra: ${formatCurrency(quota)}`,
    '',
    `</T2000>`,
  ].join('\n');
}

export function exportGenericTaxModel(
  data: Record<string, number>,
  modelCode: string,
  nif: string,
  year: number,
  quarter: number | null,
  companyName: string,
): string {
  return [
    headerLine(modelCode, nif, year, quarter, companyName),
    '',
    '=== DATOS DEL PERIODO ===',
    `Total base: ${formatCurrency(data.totalBase || 0)}`,
    `Total impuesto: ${formatCurrency(data.totalTax || 0)}`,
    '',
    `</T${modelCode}0>`,
  ].join('\n');
}

// ── Download helper ──────────────────────────────────────
export function downloadTxtFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Main export dispatcher ───────────────────────────────
export function generateTaxFileTXT(
  modelCode: string,
  data: Record<string, number>,
  nif: string,
  year: number,
  quarter: number | null,
  companyName: string,
): string {
  const q = quarter || 0;
  switch (modelCode) {
    case '303': return exportTaxModel303(data, nif, year, q, companyName);
    case '420': return exportTaxModel420(data, nif, year, q, companyName);
    case '130': return exportTaxModel130(data, nif, year, q, companyName);
    case '111': return exportTaxModel111(data, nif, year, q, companyName);
    case '349': return exportTaxModel349(data, nif, year, q, companyName);
    case '115': return exportTaxModel115(data, nif, year, q, companyName);
    case '190': return exportTaxModel190(data, nif, year, quarter, companyName);
    case '200': return exportTaxModel200(data, nif, year, quarter, companyName);
    default: return exportGenericTaxModel(data, modelCode, nif, year, quarter, companyName);
  }
}
