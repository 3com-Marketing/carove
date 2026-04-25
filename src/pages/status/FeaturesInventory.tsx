import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, AlertCircle, Clock, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FeatureStatus = 'Completado' | 'Parcial' | 'Pendiente';

interface Feature {
  name: string;
  status: FeatureStatus;
  percent: number;
}

interface Module {
  id: string;
  title: string;
  percent: number;
  icon: string;
  features: Feature[];
}

const modules: Module[] = [
  {
    id: 'a', title: 'Gestión de Identidad y Seguridad', percent: 100, icon: '🔐',
    features: [
      { name: 'Login obligatorio (autenticación)', status: 'Completado', percent: 100 },
      { name: 'Roles: Vendedor, Postventa, Administrador', status: 'Completado', percent: 100 },
      { name: 'Control de permisos RBAC por rol', status: 'Completado', percent: 100 },
      { name: 'Trazabilidad (audit_logs) con usuario y fecha', status: 'Completado', percent: 100 },
      { name: 'Protección del último administrador (trigger DB)', status: 'Completado', percent: 100 },
      { name: 'Bloqueo de auto-modificación de rol', status: 'Completado', percent: 100 },
      { name: 'Cierre de sesión automático al desactivar usuario', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'b', title: 'Panel de Control (Dashboard)', percent: 100, icon: '📊',
    features: [
      { name: 'Dashboard dinámico por rol (Admin/Vendedor/Postventa)', status: 'Completado', percent: 100 },
      { name: 'KPIs: Disponibles, Reservados, Reparación, Vendidos', status: 'Completado', percent: 100 },
      { name: 'Alertas ITV por vencer', status: 'Completado', percent: 100 },
      { name: 'Alertas días en stock (>90 días)', status: 'Completado', percent: 100 },
      { name: 'Alertas gasto elevado vs precio compra', status: 'Completado', percent: 100 },
      { name: 'Últimas ventas', status: 'Completado', percent: 100 },
      { name: 'Sistema de notificaciones in-app (campana)', status: 'Completado', percent: 100 },
      { name: 'Control Operativo Admin (7 bloques: KPIs, comerciales, alertas, postventa, clientes, métricas, auditoría)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'c', title: 'Stock Global (Grid de Vehículos)', percent: 100, icon: '🚗',
    features: [
      { name: 'Grid de alta densidad con estados por colores', status: 'Completado', percent: 100 },
      { name: 'Pestañas: Disponibles, Todos, Reparaciones, Histórico', status: 'Completado', percent: 100 },
      { name: 'Filtro por matrícula, marca, modelo, VIN', status: 'Completado', percent: 100 },
      { name: 'Filtro por centro (ubicación)', status: 'Completado', percent: 100 },
      { name: 'Filtro por rango de precio', status: 'Completado', percent: 100 },
      { name: 'Filtro por estado (badges clicables)', status: 'Completado', percent: 100 },
      { name: 'Columnas financieras (Coste, Gasto, Beneficio, PVP)', status: 'Completado', percent: 100 },
      { name: 'Vista responsive móvil (cards)', status: 'Completado', percent: 100 },
      { name: 'Filtro por fecha exposición y lotes', status: 'Completado', percent: 100 },
      { name: 'Toggle mostrar/ocultar bajas', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'd', title: 'Ficha Maestra del Vehículo', percent: 95, icon: '📋',
    features: [
      { name: 'Datos técnicos completos (VIN, motor, KM, color, extras)', status: 'Completado', percent: 100 },
      { name: 'Vinculación con Datos Maestros (Marca → Modelo → Versión)', status: 'Completado', percent: 100 },
      { name: 'Fechas: 1ª/2ª matriculación, garantía, ITV', status: 'Completado', percent: 100 },
      { name: 'Checklist: 2ª llave, ficha técnica, permiso, manual', status: 'Completado', percent: 100 },
      { name: 'Cambio de estado dinámico con validaciones', status: 'Completado', percent: 100 },
      { name: 'Centro / ubicación física por sucursal', status: 'Completado', percent: 100 },
      { name: 'Edición inline de campos', status: 'Completado', percent: 100 },
      { name: 'Borrado lógico (dar de baja)', status: 'Completado', percent: 100 },
      { name: 'Cambio automático cambio/lote (toggle)', status: 'Parcial', percent: 50 },
    ],
  },
  {
    id: 'e', title: 'Módulo Económico y Precios', percent: 100, icon: '💰',
    features: [
      { name: 'PVP Base, IGIC/IVA, IRPF configurables', status: 'Completado', percent: 100 },
      { name: 'Descuento aplicado', status: 'Completado', percent: 100 },
      { name: 'Precios: Profesionales, Financiado, Contado', status: 'Completado', percent: 100 },
      { name: 'Cálculo automático coste total y beneficio neto', status: 'Completado', percent: 100 },
      { name: 'Comparativa de mercado con IA (precio medio, mediana, percentiles)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'f', title: 'CRM Comprador / Clientes', percent: 100, icon: '👤',
    features: [
      { name: 'Ficha completa: particulares y empresas', status: 'Completado', percent: 100 },
      { name: 'DNI/CIF, dirección fiscal, IBAN, régimen IVA', status: 'Completado', percent: 100 },
      { name: 'Doble rol: comprador y/o vendedor', status: 'Completado', percent: 100 },
      { name: 'Canal de captación configurable', status: 'Completado', percent: 100 },
      { name: 'Código cliente automático', status: 'Completado', percent: 100 },
      { name: 'Población, CP, Provincia (campos separados)', status: 'Completado', percent: 100 },
      { name: 'Timeline unificado de actividad postventa', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'g', title: 'Gastos y Rentabilidad', percent: 95, icon: '📈',
    features: [
      { name: 'Relación 1:N vehículo-gastos con categorías', status: 'Completado', percent: 100 },
      { name: 'Selector taller/acreedor vinculado a maestros', status: 'Completado', percent: 100 },
      { name: 'Cálculo automático de impuestos (base ↔ total)', status: 'Completado', percent: 100 },
      { name: 'Vehículo de cortesía (matrícula, entrega, devolución)', status: 'Completado', percent: 100 },
      { name: 'Recálculo automático total gastos → beneficio (trigger)', status: 'Completado', percent: 100 },
      { name: 'Sincronización automática gasto de seguro', status: 'Completado', percent: 100 },
      { name: 'Alerta margen en riesgo', status: 'Parcial', percent: 50 },
    ],
  },
  {
    id: 'h', title: 'Gestor Documental', percent: 100, icon: '📁',
    features: [
      { name: 'Repositorio cloud con clasificación por categorías', status: 'Completado', percent: 100 },
      { name: 'Subida y eliminación de archivos', status: 'Completado', percent: 100 },
      { name: 'Previsualización PDF con conversión a imágenes', status: 'Completado', percent: 100 },
      { name: 'Impresión directa (1 clic)', status: 'Completado', percent: 100 },
      { name: 'Editar nombre/categoría de documento existente', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'i', title: 'Galería de Imágenes', percent: 100, icon: '🖼️',
    features: [
      { name: 'Subida múltiple con thumbnails automáticos', status: 'Completado', percent: 100 },
      { name: 'Reordenación drag & drop', status: 'Completado', percent: 100 },
      { name: 'Marcado de imagen principal', status: 'Completado', percent: 100 },
      { name: 'Toggle público/privado por imagen', status: 'Completado', percent: 100 },
      { name: 'Mejora de imágenes con IA (retoque profesional)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'j', title: 'Propuestas Comerciales', percent: 90, icon: '📝',
    features: [
      { name: 'Propuesta de compra (PDF con galería de fotos)', status: 'Completado', percent: 100 },
      { name: 'Información de pago con IBAN', status: 'Completado', percent: 100 },
      { name: 'Propuesta de financiación (PDF 2 páginas: resumen + amortización)', status: 'Completado', percent: 100 },
      { name: 'Histórico con reconstrucción fiel (snapshot)', status: 'Completado', percent: 100 },
      { name: 'Envío directo por email', status: 'Completado', percent: 100 },
      { name: 'Aceptación → reserva automática + simulación financiera', status: 'Completado', percent: 100 },
      { name: 'Editor de texto enriquecido para personalizar', status: 'Pendiente', percent: 0 },
    ],
  },
  {
    id: 'k', title: 'Gestión Comercial', percent: 100, icon: '📞',
    features: [
      { name: 'Dashboard comercial personalizado por rol', status: 'Completado', percent: 100 },
      { name: 'Registro actividades (llamadas, visitas, emails, WhatsApp)', status: 'Completado', percent: 100 },
      { name: 'Timeline cronológico de actividad por cliente', status: 'Completado', percent: 100 },
      { name: 'Botones de actividad rápida', status: 'Completado', percent: 100 },
      { name: 'Seguimiento con fechas de próximo contacto', status: 'Completado', percent: 100 },
      { name: 'Registro de actividades con filtros avanzados', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'k2', title: 'Demandas de Clientes', percent: 100, icon: '🎯',
    features: [
      { name: 'Registro de preferencias (marcas, presupuesto, km, combustible, año)', status: 'Completado', percent: 100 },
      { name: 'Nivel de intención (exploratoria, interesado, decidido)', status: 'Completado', percent: 100 },
      { name: 'Indicador permuta y necesidad financiación', status: 'Completado', percent: 100 },
      { name: 'Matching automático con IA (notificación coincidencia media/alta)', status: 'Completado', percent: 100 },
      { name: 'Ciclo de vida: Activa → En seguimiento → Negociación → Convertida/Cancelada', status: 'Completado', percent: 100 },
      { name: 'Conversión a venta con tiempo de cierre', status: 'Completado', percent: 100 },
      { name: 'Inmutabilidad (solo cancelar con motivo)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'k3', title: 'Financiación', percent: 100, icon: '🏦',
    features: [
      { name: 'Catálogo: Entidades → Productos → Modelos de plazo (TIN, coeficiente)', status: 'Completado', percent: 100 },
      { name: 'Simulación financiera con cálculo de cuota mensual', status: 'Completado', percent: 100 },
      { name: 'Cuadro de amortización (sistema francés)', status: 'Completado', percent: 100 },
      { name: 'Comparador de financiación (múltiples simulaciones)', status: 'Completado', percent: 100 },
      { name: 'Aprobación restringida a administradores', status: 'Completado', percent: 100 },
      { name: 'Generación PDF propuesta financiación (2 páginas)', status: 'Completado', percent: 100 },
      { name: 'Calendario visual de cuotas', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'l', title: 'Notas', percent: 100, icon: '💬',
    features: [
      { name: 'Muro de comentarios inmutable por vehículo', status: 'Completado', percent: 100 },
      { name: 'Autor y fecha automáticos', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'm', title: 'Seguros', percent: 100, icon: '🛡️',
    features: [
      { name: 'Aseguradora vinculada a catálogo', status: 'Completado', percent: 100 },
      { name: 'Control de vigencia (fecha inicio/fin con validación)', status: 'Completado', percent: 100 },
      { name: 'Sincronización automática gasto de seguro', status: 'Completado', percent: 100 },
      { name: 'Auditoría de cambios en seguros', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'n', title: 'Reservas', percent: 100, icon: '📅',
    features: [
      { name: 'Creación con fecha expiración y señal', status: 'Completado', percent: 100 },
      { name: 'Estados: activa, expirada, cancelada, convertida', status: 'Completado', percent: 100 },
      { name: 'Paso automático vehículo a "Reservado"', status: 'Completado', percent: 100 },
      { name: 'Contrato de reserva (generación PDF)', status: 'Completado', percent: 100 },
      { name: 'Alertas de vencimiento (Edge Function programada)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'o', title: 'Pipeline de Ventas', percent: 100, icon: '🏷️',
    features: [
      { name: 'Vista Kanban con drag & drop entre columnas', status: 'Completado', percent: 100 },
      { name: 'Vista tabla alternativa', status: 'Completado', percent: 100 },
      { name: 'OperativeBadge (alertas reparación/tránsito)', status: 'Completado', percent: 100 },
      { name: 'Indicador días en stock', status: 'Completado', percent: 100 },
      { name: 'Cálculo automático impuestos en venta', status: 'Completado', percent: 100 },
      { name: 'Bloqueo venta vehículos en tránsito o baja', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'p', title: 'Facturación', percent: 100, icon: '🧾',
    features: [
      { name: 'Series de factura configurables (normales y rectificativas)', status: 'Completado', percent: 100 },
      { name: 'Numeración secuencial automática al emitir', status: 'Completado', percent: 100 },
      { name: 'Ciclo: Borrador → Emitida → Rectificada/Anulada', status: 'Completado', percent: 100 },
      { name: 'Inmutabilidad fiscal tras emisión', status: 'Completado', percent: 100 },
      { name: 'Facturas rectificativas con referencia obligatoria', status: 'Completado', percent: 100 },
      { name: 'Cadena hash (preparación VeriFactu)', status: 'Completado', percent: 100 },
      { name: 'Generación PDF de facturas', status: 'Completado', percent: 100 },
      { name: 'Libro IGIC / IVA', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'q', title: 'Cobros y Pagos', percent: 100, icon: '💳',
    features: [
      { name: 'Cobros por factura y señal de reserva', status: 'Completado', percent: 100 },
      { name: 'Métodos: efectivo, tarjeta, transferencia, financiado', status: 'Completado', percent: 100 },
      { name: 'Devoluciones (refund)', status: 'Completado', percent: 100 },
      { name: 'Inmutabilidad de pagos registrados', status: 'Completado', percent: 100 },
      { name: 'Actualización automática estado factura (pendiente/parcial/cobrada)', status: 'Completado', percent: 100 },
      { name: 'Pagos a proveedores con control de estado', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'r', title: 'Tesorería', percent: 100, icon: '🏦',
    features: [
      { name: 'Caja: movimientos automáticos desde cobros/pagos/gastos', status: 'Completado', percent: 100 },
      { name: 'Inmutabilidad movimientos generados por sistema', status: 'Completado', percent: 100 },
      { name: 'Movimientos manuales con restricción financiera', status: 'Completado', percent: 100 },
      { name: 'Cuentas bancarias (CRUD)', status: 'Completado', percent: 100 },
      { name: 'Conciliación bancaria (caja ↔ banco)', status: 'Completado', percent: 100 },
      { name: 'Gastos operativos (alquiler, luz, etc.)', status: 'Completado', percent: 100 },
      { name: 'Dashboard de tesorería con saldos', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 's', title: 'Contabilidad', percent: 100, icon: '📒',
    features: [
      { name: 'Plan contable configurable', status: 'Completado', percent: 100 },
      { name: 'Libro Diario con asientos automáticos (ventas, cobros, gastos, anulaciones)', status: 'Completado', percent: 100 },
      { name: 'Libro Mayor por cuenta', status: 'Completado', percent: 100 },
      { name: 'Asientos inmutables (corrección por ajuste)', status: 'Completado', percent: 100 },
      { name: 'Cuenta de Pérdidas y Ganancias', status: 'Completado', percent: 100 },
      { name: 'Balance de Situación', status: 'Completado', percent: 100 },
      { name: 'Resumen contable', status: 'Completado', percent: 100 },
      { name: 'Modelos fiscales (impuestos)', status: 'Completado', percent: 100 },
      { name: 'Informe de margen por vehículo', status: 'Completado', percent: 100 },
      { name: 'Cierre de ejercicio', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 't', title: 'Traspasos entre Sucursales', percent: 100, icon: '🔄',
    features: [
      { name: 'Solicitud con validación automática (origen = ubicación actual)', status: 'Completado', percent: 100 },
      { name: 'Flujo: Solicitado → Enviado → Recibido / Cancelado', status: 'Completado', percent: 100 },
      { name: 'Bloqueo operativo de vehículos en tránsito', status: 'Completado', percent: 100 },
      { name: 'Actualización automática de centro al recibir', status: 'Completado', percent: 100 },
      { name: 'Soporte admin sin sucursal asignada', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'u', title: 'Órdenes de Reparación', percent: 100, icon: '🔩',
    features: [
      { name: 'Creación con proveedor, categorías y presupuesto', status: 'Completado', percent: 100 },
      { name: 'Estados: abierta → presupuestada → aprobada → en ejecución → finalizada', status: 'Completado', percent: 100 },
      { name: 'Validación cierre: requiere factura con importe y PDF', status: 'Completado', percent: 100 },
      { name: 'Facturas de proveedor con generación automática gasto + asiento', status: 'Completado', percent: 100 },
      { name: 'Inmutabilidad factura proveedor tras pagos', status: 'Completado', percent: 100 },
      { name: 'Anulación con reversión contable automática', status: 'Completado', percent: 100 },
      { name: 'Bloqueo apertura para vehículos en tránsito', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'v2', title: 'Módulo de Postventa', percent: 100, icon: '🤝',
    features: [
      { name: 'Dashboard dedicado de postventa', status: 'Completado', percent: 100 },
      { name: 'Seguimientos post-venta automáticos (7, 30, 180 días)', status: 'Completado', percent: 100 },
      { name: 'Gestión de incidencias', status: 'Completado', percent: 100 },
      { name: 'Control de garantías', status: 'Completado', percent: 100 },
      { name: 'Reparaciones con control de repuestos', status: 'Completado', percent: 100 },
      { name: 'Revisiones programadas', status: 'Completado', percent: 100 },
      { name: 'Reclamaciones', status: 'Completado', percent: 100 },
      { name: 'Incidencias de financiación', status: 'Completado', percent: 100 },
      { name: 'Score de Salud del Cliente (Satisfecho/Neutro/Sensible/En Riesgo)', status: 'Completado', percent: 100 },
      { name: 'Coste Postventa consolidado por vehículo y cliente', status: 'Completado', percent: 100 },
      { name: 'Estadísticas del módulo', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'v', title: 'Maestros y Configuración', percent: 100, icon: '🏢',
    features: [
      { name: 'CRUD Talleres / Acreedores', status: 'Completado', percent: 100 },
      { name: 'CRUD Aseguradoras', status: 'Completado', percent: 100 },
      { name: 'Gestión de Usuarios (invitación por email, roles, sucursal)', status: 'Completado', percent: 100 },
      { name: 'Datos de Empresa (NIF, dirección, IBAN, logo, texto legal)', status: 'Completado', percent: 100 },
      { name: 'Series de Facturación (CRUD)', status: 'Completado', percent: 100 },
      { name: 'Datos Maestros Vehículos (Marcas → Modelos → Versiones → Segmentos)', status: 'Completado', percent: 100 },
      { name: 'Canales de Captación (CRUD)', status: 'Completado', percent: 100 },
      { name: 'Entidades, Productos y Modelos de Financiación', status: 'Completado', percent: 100 },
      { name: 'Mi Perfil (nombre, rol, sucursal)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'w2', title: 'Marketing', percent: 100, icon: '📣',
    features: [
      { name: 'Generador de imágenes con IA (retoque profesional)', status: 'Completado', percent: 100 },
      { name: 'Publicaciones para redes sociales con preview multi-plataforma', status: 'Completado', percent: 100 },
      { name: 'Generación de textos con IA para redes', status: 'Completado', percent: 100 },
      { name: 'Email Marketing: editor visual por bloques (drag & drop)', status: 'Completado', percent: 100 },
      { name: 'Listas de contactos con importación de clientes', status: 'Completado', percent: 100 },
      { name: 'Generación de contenido email con IA', status: 'Completado', percent: 100 },
      { name: 'Vista previa responsive de email', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'w3', title: 'Gestor de Tareas', percent: 100, icon: '✅',
    features: [
      { name: 'Tablero Kanban con drag & drop (4 columnas)', status: 'Completado', percent: 100 },
      { name: 'Vista lista alternativa', status: 'Completado', percent: 100 },
      { name: 'Asignación a usuarios del equipo', status: 'Completado', percent: 100 },
      { name: 'Prioridades (baja/media/alta/urgente) con indicadores', status: 'Completado', percent: 100 },
      { name: 'Fechas límite con alertas de vencimiento', status: 'Completado', percent: 100 },
      { name: 'Vinculación opcional a vehículos y/o clientes', status: 'Completado', percent: 100 },
      { name: 'Hilo de comentarios por tarea', status: 'Completado', percent: 100 },
      { name: 'Actualización en tiempo real (WebSocket)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'x', title: 'Documentos IA (Smart Documents)', percent: 100, icon: '🤖',
    features: [
      { name: 'Subida de PDF para extracción automática', status: 'Completado', percent: 100 },
      { name: 'Extracción de datos con IA (facturas proveedor)', status: 'Completado', percent: 100 },
      { name: 'Vinculación automática a vehículo y gasto', status: 'Completado', percent: 100 },
      { name: 'Flujo de revisión y confirmación', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'y', title: 'Asistente IA (Module Scout)', percent: 100, icon: '🧠',
    features: [
      { name: 'Conversación guiada para definir módulos', status: 'Completado', percent: 100 },
      { name: 'Clasificación por complejidad (S/M/L/XL)', status: 'Completado', percent: 100 },
      { name: 'Estimación de presupuesto y plazo', status: 'Completado', percent: 100 },
      { name: 'Persistencia de solicitudes en BD', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'z', title: 'Histórico y Auditoría', percent: 100, icon: '📚',
    features: [
      { name: 'Registro de acciones con audit_logs', status: 'Completado', percent: 100 },
      { name: 'Filtrado por tabla, acción y fecha', status: 'Completado', percent: 100 },
      { name: 'Vista detallada de cambios (old/new)', status: 'Completado', percent: 100 },
    ],
  },
  {
    id: 'aa', title: 'UX y Experiencia', percent: 100, icon: '✨',
    features: [
      { name: 'Responsive (tablets / móvil)', status: 'Completado', percent: 100 },
      { name: 'Previsualización documentos sin cerrar ficha', status: 'Completado', percent: 100 },
      { name: 'Alertas en dashboard (ITV, stock, margen)', status: 'Completado', percent: 100 },
      { name: 'Notificaciones in-app (campana con alertas)', status: 'Completado', percent: 100 },
    ],
  },
];

function computeModulePercent(mod: Module) {
  const total = mod.features.length;
  if (total === 0) return 0;
  const completed = mod.features.filter(f => f.status === 'Completado').length;
  const partial = mod.features.filter(f => f.status === 'Parcial').length;
  return Math.round(((completed + partial * 0.5) / total) * 100);
}

function computeOverallPercent(mods: Module[]) {
  const total = mods.reduce((s, m) => s + m.features.length, 0);
  const completed = mods.reduce((s, m) => s + m.features.filter(f => f.status === 'Completado').length, 0);
  const partial = mods.reduce((s, m) => s + m.features.filter(f => f.status === 'Parcial').length, 0);
  return Math.round(((completed + partial * 0.5) / total) * 100);
}

function statusIcon(status: FeatureStatus) {
  switch (status) {
    case 'Completado': return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case 'Parcial': return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'Pendiente': return <Clock className="h-4 w-4 text-muted-foreground/50 shrink-0" />;
  }
}

function statusBadge(status: FeatureStatus) {
  const map: Record<FeatureStatus, string> = {
    Completado: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    Parcial: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    Pendiente: 'bg-muted text-muted-foreground border-border',
  };
  return <Badge className={cn('text-[10px] font-medium', map[status])}>{status}</Badge>;
}

function progressColor(percent: number) {
  if (percent === 100) return '[&>div]:bg-emerald-500';
  if (percent >= 90) return '[&>div]:bg-sky-500';
  if (percent >= 80) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-orange-500';
}

function ModuleCard({ mod }: { mod: Module }) {
  const [open, setOpen] = useState(false);
  const completed = mod.features.filter(f => f.status === 'Completado').length;
  const partial = mod.features.filter(f => f.status === 'Parcial').length;
  const pending = mod.features.filter(f => f.status === 'Pendiente').length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{mod.icon}</span>
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">{mod.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {completed} completadas · {partial > 0 ? `${partial} parciales · ` : ''}{pending > 0 ? `${pending} pendientes` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  'text-xl font-bold tabular-nums',
                  mod.percent === 100 ? 'text-emerald-600' : mod.percent >= 90 ? 'text-sky-600' : 'text-amber-600'
                )}>
                  {mod.percent}%
                </span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
              </div>
            </div>
            <Progress value={mod.percent} className={cn('h-2 mt-2', progressColor(mod.percent))} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="divide-y divide-border/50">
              {mod.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-2 first:pt-0">
                  {statusIcon(f.status)}
                  <span className={cn('flex-1 text-sm', f.status === 'Pendiente' && 'text-muted-foreground')}>
                    {f.name}
                  </span>
                  {statusBadge(f.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function FeaturesInventory() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const computedModules = useMemo(() => 
    modules.map(m => ({ ...m, percent: computeModulePercent(m) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey]
  );

  const totalFeatures = computedModules.reduce((s, m) => s + m.features.length, 0);
  const completedFeatures = computedModules.reduce((s, m) => s + m.features.filter(f => f.status === 'Completado').length, 0);
  const partialFeatures = computedModules.reduce((s, m) => s + m.features.filter(f => f.status === 'Parcial').length, 0);
  const pendingFeatures = computedModules.reduce((s, m) => s + m.features.filter(f => f.status === 'Pendiente').length, 0);
  const OVERALL_PERCENT = computeOverallPercent(computedModules);

  const handleRefresh = () => {
    setSpinning(true);
    setRefreshKey(k => k + 1);
    toast.success('Funcionalidades actualizadas', {
      description: `${computedModules.length} módulos recalculados`,
    });
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Inventario de Funcionalidades</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Estado actual del desarrollo según el briefing de referencia.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
          <RefreshCw className={cn('h-4 w-4', spinning && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Global progress card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progreso general del proyecto</p>
              <p className="text-4xl font-bold text-primary tabular-nums">{OVERALL_PERCENT}%</p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{completedFeatures} completadas</span>
              <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-amber-500" />{partialFeatures} parciales</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground/50" />{pendingFeatures} pendientes</span>
            </div>
          </div>
          <Progress value={OVERALL_PERCENT} className={cn('h-3', progressColor(OVERALL_PERCENT))} />
          <p className="text-xs text-muted-foreground mt-2">{totalFeatures} funcionalidades documentadas en {computedModules.length} módulos</p>
        </CardContent>
      </Card>

      {/* Module cards */}
      <div className="grid gap-3">
        {computedModules.map(mod => <ModuleCard key={mod.id} mod={mod} />)}
      </div>
    </div>
  );
}
