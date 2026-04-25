import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompanySettings, updateCompanySettings } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Upload, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['company-settings'], queryFn: getCompanySettings });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    company_name: '', tax_id: '', address: '', city: '', postal_code: '', province: '', phone: '', email: '', legal_text: '', iban: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        tax_id: settings.tax_id || '',
        address: settings.address || '',
        city: settings.city || '',
        postal_code: settings.postal_code || '',
        province: settings.province || '',
        phone: settings.phone || '',
        email: settings.email || '',
        legal_text: settings.legal_text || '',
        iban: (settings as any).iban || '',
      });
      setLogoUrl((settings as any).logo_url || null);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: '❌ Solo se permiten imágenes', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo/company-logo.${ext}`;

      // Remove old logo files
      const { data: existing } = await supabase.storage.from('company-assets').list('logo');
      if (existing && existing.length > 0) {
        await supabase.storage.from('company-assets').remove(existing.map(f => `logo/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage.from('company-assets').createSignedUrl(path, 60 * 60 * 24 * 365);
      const newUrl = urlData?.signedUrl || null;

      if (newUrl && settings) {
        await updateCompanySettings({ logo_url: newUrl } as any);
        setLogoUrl(newUrl);
        qc.invalidateQueries({ queryKey: ['company-settings'] });
        toast({ title: '✅ Logo actualizado' });
      }
    } catch (err: any) {
      toast({ title: '❌ Error subiendo logo', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCompanySettings(form as any);
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast({ title: '✅ Datos de empresa actualizados' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Datos de Empresa</h1>
        <p className="text-sm text-muted-foreground">Datos del emisor para facturas y documentos fiscales</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Logo de Empresa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
            ) : (
              <div className="h-16 w-16 rounded-lg border border-dashed flex items-center justify-center bg-muted">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1" /> {uploading ? 'Subiendo...' : 'Subir logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG o SVG. Máx 2MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Información Fiscal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Razón Social</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label>NIF / CIF</Label><Input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dirección</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Dirección</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Población</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>Código Postal</Label><Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} /></div>
            <div><Label>Provincia</Label><Input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Contacto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Datos Bancarios</CardTitle></CardHeader>
        <CardContent>
          <div><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="ES00 0000 0000 0000 0000 0000" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Texto Legal</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.legal_text} onChange={e => setForm(f => ({ ...f, legal_text: e.target.value }))} placeholder="Texto legal para el pie de las facturas..." className="min-h-[80px]" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
