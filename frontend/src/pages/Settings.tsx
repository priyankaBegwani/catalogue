import { useState, useEffect } from 'react';
import {
  Save, MessageCircle, Info, ExternalLink, CheckCircle, AlertCircle,
  Palette, Image, Type, Phone, ChevronDown, ChevronUp, ShoppingBag,
  Eye, EyeOff, TrendingUp, Users, Zap, Tag,
  Globe, Link, Trash2, Plus, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { Breadcrumb } from '../components';
import { TierModel } from '../types/pricing';
import { getPricingConfig, savePricingConfig } from '../utils/pricingTiers';
import { BrandManagement } from '../components/BrandManagement';
import { api, TenantDomain } from '../lib/api';
import { useTenant } from '../contexts/TenantContext';

export function Settings() {
  const { branding, settings, slug: currentSlug, features, updateBranding, updateSettings, updateSlug } = useTenant();

  // ── Branding state (loaded from TenantContext) ───────────────────────────
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e3473');
  const [secondaryColor, setSecondaryColor] = useState('#6366f1');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [brandingSaveStatus, setBrandingSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [brandingError, setBrandingError] = useState('');

  // ── Other settings state (loaded from TenantContext / saved to DB) ─────────
  const [tawkPropertyId, setTawkPropertyId] = useState('');
  const [tawkWidgetId, setTawkWidgetId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showPriceToCustomers, setShowPriceToCustomers] = useState(true);
  const [activePricingModel, setActivePricingModel] = useState<TierModel>('volume');
  const [otherSaveStatus, setOtherSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [otherError, setOtherError] = useState('');

  // ── Domain state ─────────────────────────────────────────────────────────
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainActionId, setDomainActionId] = useState<string | null>(null); // verifying or deleting
  const [domainMessage, setDomainMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Subdomain state ───────────────────────────────────────────────────────
  const [subdomainInput, setSubdomainInput] = useState('');
  const [showSubdomainWarning, setShowSubdomainWarning] = useState(false);
  const [subdomainSaving, setSubdomainSaving] = useState(false);
  const [subdomainMessage, setSubdomainMessage] = useState<{ type: 'success' | 'error'; text: string; newUrl?: string } | null>(null);

  // ── Section open state ────────────────────────────────────────────────────
  const [brandSectionOpen, setBrandSectionOpen] = useState(true);
  const [domainSectionOpen, setDomainSectionOpen] = useState(false);
  const [tawkSectionOpen, setTawkSectionOpen] = useState(false);
  const [catalogueSectionOpen, setCatalogueSectionOpen] = useState(false);
  const [pricingSectionOpen, setPricingSectionOpen] = useState(false);
  const [brandManagementSectionOpen, setBrandManagementSectionOpen] = useState(false);

  // ── Load branding from TenantContext ─────────────────────────────────────
  useEffect(() => {
    if (branding) {
      setBrandName(branding.business_name ?? '');
      setTagline(branding.tagline ?? '');
      setLogoUrl(branding.logo_url ?? '');
      setFaviconUrl(branding.favicon_url ?? '');
      setPrimaryColor(branding.primary_color);
      setSecondaryColor(branding.secondary_color);
      setAccentColor(branding.accent_color);
    }
  }, [branding]);

  // ── Load settings from TenantContext ─────────────────────────────────────
  useEffect(() => {
    if (settings) {
      setTawkPropertyId(settings.tawk_property_id ?? '');
      setTawkWidgetId(settings.tawk_widget_id ?? '');
      setWhatsappNumber(settings.whatsapp_number ?? '');
      setShowPriceToCustomers(settings.show_price_to_customers);
      setActivePricingModel(settings.pricing_active_model);
    }
  }, [settings]);

  // ── Load domains when section opens ──────────────────────────────────────
  useEffect(() => {
    if (domainSectionOpen) loadDomains();
  }, [domainSectionOpen]);

  const loadDomains = async () => {
    setDomainsLoading(true);
    try {
      const data = await api.getTenantDomains();
      setDomains(data);
    } catch {
      // non-critical
    } finally {
      setDomainsLoading(false);
    }
  };

  // ── Branding save → API ───────────────────────────────────────────────────
  const handleSaveBranding = async () => {
    if (!brandName.trim()) {
      setBrandingError('Business name is required');
      setBrandingSaveStatus('error');
      return;
    }
    setBrandingSaveStatus('saving');
    setBrandingError('');
    try {
      await api.updateTenantBranding({
        business_name: brandName.trim(),
        tagline: tagline.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        favicon_url: faviconUrl.trim() || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      });
      updateBranding({
        business_name: brandName.trim(),
        tagline: tagline.trim() || null,
        logo_url: logoUrl.trim() || null,
        favicon_url: faviconUrl.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      });
      setBrandingSaveStatus('success');
      setTimeout(() => setBrandingSaveStatus('idle'), 3000);
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : 'Failed to save branding');
      setBrandingSaveStatus('error');
    }
  };

  // ── Other settings save → DB ──────────────────────────────────────────────
  const handleSaveOther = async () => {
    if (whatsappNumber.trim() && !/^\+?[1-9]\d{1,14}$/.test(whatsappNumber.trim().replace(/[\s-]/g, ''))) {
      setOtherError('Please enter a valid WhatsApp number with country code (e.g., +1234567890)');
      setOtherSaveStatus('error');
      return;
    }
    setOtherSaveStatus('saving');
    setOtherError('');
    try {
      // Save pricing model without overwriting the tier details (those are edited in PricingTiers page)
      const currentConfig = getPricingConfig();
      await Promise.all([
        api.updateTenantSettings({
          whatsapp_number: whatsappNumber.trim() || null,
          tawk_property_id: tawkPropertyId.trim() || null,
          tawk_widget_id: tawkWidgetId.trim() || null,
          show_price_to_customers: showPriceToCustomers,
          pricing_active_model: activePricingModel,
        }),
        // Also update local pricing cache to reflect model change
        savePricingConfig({ ...currentConfig, activeModel: activePricingModel }),
      ]);
      updateSettings({
        whatsapp_number: whatsappNumber.trim() || null,
        tawk_property_id: tawkPropertyId.trim() || null,
        tawk_widget_id: tawkWidgetId.trim() || null,
        show_price_to_customers: showPriceToCustomers,
        pricing_active_model: activePricingModel,
      });
      setOtherSaveStatus('success');
      setTimeout(() => setOtherSaveStatus('idle'), 3000);
    } catch (err) {
      setOtherError(err instanceof Error ? err.message : 'Failed to save settings');
      setOtherSaveStatus('error');
    }
  };

  // ── Domain actions ────────────────────────────────────────────────────────
  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    setDomainMessage(null);
    try {
      const res = await api.addTenantDomain(newDomain.trim().toLowerCase());
      setDomains(prev => [...prev, res.data]);
      setNewDomain('');
      setDomainMessage({ type: 'success', text: res.message });
    } catch (err) {
      setDomainMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add domain' });
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setDomainActionId(domainId);
    setDomainMessage(null);
    try {
      const res = await api.verifyTenantDomain(domainId);
      setDomains(prev => prev.map(d => d.id === domainId ? { ...d, is_verified: true, verified_at: new Date().toISOString() } : d));
      setDomainMessage({ type: 'success', text: res.message });
    } catch (err) {
      setDomainMessage({ type: 'error', text: err instanceof Error ? err.message : 'Verification failed' });
    } finally {
      setDomainActionId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!window.confirm('Remove this custom domain?')) return;
    setDomainActionId(domainId);
    try {
      await api.deleteTenantDomain(domainId);
      setDomains(prev => prev.filter(d => d.id !== domainId));
    } catch (err) {
      setDomainMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to remove domain' });
    } finally {
      setDomainActionId(null);
    }
  };

  // ── Subdomain change ──────────────────────────────────────────────────────
  const handleSubdomainChange = async () => {
    if (!subdomainInput.trim()) return;
    setSubdomainSaving(true);
    setSubdomainMessage(null);
    try {
      const res = await api.updateTenantSubdomain(subdomainInput.trim().toLowerCase());
      updateSlug(subdomainInput.trim().toLowerCase());
      setSubdomainMessage({ type: 'success', text: res.message, newUrl: res.data.new_url });
      setShowSubdomainWarning(false);
    } catch (err) {
      setSubdomainMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update subdomain' });
    } finally {
      setSubdomainSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 pb-2 sm:pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb />
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-gray-600 text-lg">Configure your application settings</p>
        </div>

        {/* ── BRANDING CONFIGURATION ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button onClick={() => setBrandSectionOpen(!brandSectionOpen)} className="w-full">
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-semibold text-slate-800">Branding Configuration</h2>
                    <p className="text-slate-600 text-xs">Customize your brand identity and appearance</p>
                  </div>
                </div>
                {brandSectionOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </div>
            </div>
          </button>

          {brandSectionOpen && (
            <div className="p-6 space-y-6">
              {/* Business Name */}
              <div>
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Indie Craft"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Displayed in the app header and browser tab</p>
              </div>

              {/* Tagline */}
              <div>
                <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-2">
                  Tagline <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g., Premium Ethnic Wear"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Logo URL
                </label>
                <input
                  type="text"
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Absolute URL to your logo image</p>
                {logoUrl && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <img src={logoUrl} alt="Logo preview" className="h-16 w-auto object-contain" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                  </div>
                )}
              </div>

              {/* Favicon URL */}
              <div>
                <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Favicon URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="faviconUrl"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Small icon shown in browser tabs</p>
              </div>

              {/* Theme Colors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'primaryColor', label: 'Primary Color', value: primaryColor, setter: setPrimaryColor, hint: 'Buttons, links, headers' },
                  { id: 'secondaryColor', label: 'Secondary Color', value: secondaryColor, setter: setSecondaryColor, hint: 'Backgrounds, cards' },
                  { id: 'accentColor', label: 'Accent Color', value: accentColor, setter: setAccentColor, hint: 'Highlights, badges' },
                ].map(({ id, label, value, setter, hint }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      {label} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id={id}
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="h-12 w-14 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{hint}</p>
                  </div>
                ))}
              </div>

              {/* Color Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Theme Preview</h3>
                <div className="flex gap-3">
                  {[
                    { label: 'Primary', bg: primaryColor },
                    { label: 'Secondary', bg: secondaryColor },
                    { label: 'Accent', bg: accentColor },
                    { label: 'Gradient', bg: `linear-gradient(to right, ${primaryColor}, ${accentColor})` },
                  ].map(({ label, bg }) => (
                    <div
                      key={label}
                      className="flex-1 h-14 rounded-lg shadow-sm flex items-center justify-center text-white text-xs font-semibold"
                      style={{ background: bg }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  id="whatsappNumber"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g., +919876543210"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Include country code. Used for WhatsApp share links.</p>
              </div>

              {/* Branding save status */}
              {brandingSaveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Branding saved and applied.
                </div>
              )}
              {brandingSaveStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {brandingError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveBranding}
                  disabled={brandingSaveStatus === 'saving'}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    brandingSaveStatus === 'saving'
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:scale-105 text-white'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {brandingSaveStatus === 'saving' ? 'Saving…' : 'Save Branding'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── DOMAIN & SUBDOMAIN ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button onClick={() => setDomainSectionOpen(!domainSectionOpen)} className="w-full">
            <div className="bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-semibold text-slate-800">Domain & Subdomain</h2>
                    <p className="text-slate-600 text-xs">Manage your app URL and custom domain</p>
                  </div>
                </div>
                {domainSectionOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </div>
            </div>
          </button>

          {domainSectionOpen && (
            <div className="p-6 space-y-8">

              {/* ── Current subdomain ───────────────────────── */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Link className="w-4 h-4" /> Your App URL
                </h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <code className="flex-1 text-sm text-gray-700">
                    {currentSlug ? `https://${currentSlug}.${window.location.hostname.split('.').slice(-2).join('.')}` : '—'}
                  </code>
                  <button
                    onClick={() => { setSubdomainInput(currentSlug ?? ''); setShowSubdomainWarning(true); setSubdomainMessage(null); }}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                  >
                    Change
                  </button>
                </div>

                {showSubdomainWarning && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Changing your subdomain will change your app URL.</p>
                        <p className="text-xs text-amber-800 mt-1">Anyone using the old URL will not be able to access the app. Update any saved bookmarks or shared links after changing.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={subdomainInput}
                        onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="e.g., mybrand"
                        className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 text-sm bg-white"
                      />
                      <button
                        onClick={handleSubdomainChange}
                        disabled={subdomainSaving || !subdomainInput.trim() || subdomainInput === currentSlug}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {subdomainSaving ? 'Saving…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { setShowSubdomainWarning(false); setSubdomainMessage(null); }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-amber-700">3–30 characters, lowercase letters, numbers, and hyphens only.</p>
                  </div>
                )}

                {subdomainMessage && (
                  <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-sm ${
                    subdomainMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {subdomainMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div>
                      {subdomainMessage.text}
                      {subdomainMessage.newUrl && (
                        <div className="mt-1">
                          <a href={subdomainMessage.newUrl} className="underline font-medium">
                            Go to new URL →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Custom domains ──────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Custom Domains
                    {!features?.custom_domain && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">Enterprise plan required</span>
                    )}
                  </h3>
                  {domainsLoading && <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />}
                </div>

                {!features?.custom_domain ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                    Custom domains let you use <code>catalog.yourbrand.com</code> instead of your subdomain. Available on the Enterprise plan.
                  </div>
                ) : (
                  <>
                    {/* Add domain form */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="e.g., catalog.mybrand.com"
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                      />
                      <button
                        onClick={handleAddDomain}
                        disabled={addingDomain || !newDomain.trim()}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {addingDomain ? 'Adding…' : 'Add'}
                      </button>
                    </div>

                    {domainMessage && (
                      <div className={`mb-3 flex items-start gap-2 p-3 rounded-lg text-sm ${
                        domainMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                      }`}>
                        {domainMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        {domainMessage.text}
                      </div>
                    )}

                    {/* Domain list */}
                    {domains.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl">
                        No custom domains added yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {domains.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{d.domain}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {d.is_verified
                                  ? <span className="text-green-600 font-medium">✓ Verified</span>
                                  : <span className="text-amber-600">Pending verification — add a CNAME record pointing to our platform</span>
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!d.is_verified && (
                                <button
                                  onClick={() => handleVerifyDomain(d.id)}
                                  disabled={domainActionId === d.id}
                                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-cyan-400 text-cyan-700 rounded-lg hover:bg-cyan-50 disabled:opacity-50 transition-colors"
                                >
                                  {domainActionId === d.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                  Verify
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteDomain(d.id)}
                                disabled={domainActionId === d.id}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                                title="Remove domain"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                          To verify a domain, add a <code className="bg-blue-100 px-1 rounded">CNAME</code> record in your DNS settings pointing to our platform. DNS changes can take up to 24 hours to propagate.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── CATALOGUE SETTINGS ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button onClick={() => setCatalogueSectionOpen(!catalogueSectionOpen)} className="w-full">
            <div className="bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-semibold text-slate-800">Catalogue Settings</h2>
                    <p className="text-slate-600 text-xs">Configure catalogue display options</p>
                  </div>
                </div>
                {catalogueSectionOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </div>
            </div>
          </button>

          {catalogueSectionOpen && (
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {showPriceToCustomers ? <Eye className="w-5 h-5 text-green-600" /> : <EyeOff className="w-5 h-5 text-gray-600" />}
                      <h3 className="text-lg font-semibold text-gray-900">Price Visibility</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Control whether product prices are displayed to customers in the catalogue. When disabled, customers will need to contact you for pricing.
                    </p>
                    <span className="text-sm font-medium text-gray-700">
                      {showPriceToCustomers ? 'Prices are visible to customers' : 'Prices are hidden from customers'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPriceToCustomers(!showPriceToCustomers)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${showPriceToCustomers ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${showPriceToCustomers ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Admins always see prices regardless of this setting.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── PRICING TIER MODEL ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button onClick={() => setPricingSectionOpen(!pricingSectionOpen)} className="w-full">
            <div className="bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-semibold text-slate-800">Pricing Tier Model</h2>
                    <p className="text-slate-600 text-xs">Select which pricing tier model to use for discounts</p>
                  </div>
                </div>
                {pricingSectionOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </div>
            </div>
          </button>

          {pricingSectionOpen && (
            <div className="p-6 space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-indigo-800">Choose how discounts are calculated for your parties. Configure tiers in the Pricing Tiers page.</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { value: 'volume', icon: <TrendingUp className="w-5 h-5 text-amber-600" />, label: 'Volume-Based', badge: 'Automatic', badgeClass: 'bg-amber-100 text-amber-700', desc: 'Tiers automatically assigned based on monthly order count (Copper, Bronze, Silver, Gold, Platinum)' },
                  { value: 'relationship', icon: <Users className="w-5 h-5 text-blue-600" />, label: 'Relationship-Based', badge: 'Manual', badgeClass: 'bg-blue-100 text-blue-700', desc: 'Manually assign tiers based on business relationship (Standard, Trusted, Strategic)' },
                  { value: 'hybrid', icon: <Zap className="w-5 h-5 text-purple-600" />, label: 'Hybrid', badge: 'Auto + Override', badgeClass: 'bg-purple-100 text-purple-700', desc: 'Automatic tier based on monthly orders, but can be manually overridden for specific parties' },
                ].map(({ value, icon, label, badge, badgeClass, desc }) => (
                  <label
                    key={value}
                    className="relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                    style={{ borderColor: activePricingModel === value ? '#6366f1' : '#e5e7eb', backgroundColor: activePricingModel === value ? '#eef2ff' : 'white' }}
                  >
                    <input type="radio" name="pricingModel" value={value} checked={activePricingModel === value} onChange={(e) => setActivePricingModel(e.target.value as TierModel)} className="mt-1 h-4 w-4 text-indigo-600" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {icon}
                        <span className="font-semibold text-gray-900">{label}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${badgeClass}`}>{badge}</span>
                      </div>
                      <p className="text-sm text-gray-600">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Configure Tier Details</h3>
                  <p className="text-sm text-gray-600">Set discount percentages and thresholds for each tier</p>
                </div>
                <a href="/pricing-tiers" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                  Manage Tiers
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── BRAND MANAGEMENT ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button onClick={() => setBrandManagementSectionOpen(!brandManagementSectionOpen)} className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-md">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-semibold text-slate-800">Brand Management</h2>
                <p className="text-slate-600 text-xs">Configure product brands for designs</p>
              </div>
            </div>
            {brandManagementSectionOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {brandManagementSectionOpen && (
            <div className="px-6 pb-6">
              <BrandManagement />
            </div>
          )}
        </div>

        {/* ── TAWK.TO CHAT ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button onClick={() => setTawkSectionOpen(!tawkSectionOpen)} className="w-full">
            <div className="bg-gradient-to-br from-slate-50 via-fuchsia-50 to-pink-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-semibold text-slate-800">Tawk.to Chat Configuration</h2>
                    <p className="text-slate-600 text-xs">Configure customer support chat for retailers and guests</p>
                  </div>
                </div>
                {tawkSectionOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </div>
            </div>
          </button>

          {tawkSectionOpen && (
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Tawk.to integration is optional. Leave these fields empty if you don't want to use live chat support.</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">How to get your Tawk.to credentials:</h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Sign up or log in to <a href="https://www.tawk.to" target="_blank" rel="noopener noreferrer" className="underline">Tawk.to</a></li>
                      <li>Go to <strong>Administration → Channels → Chat Widget</strong></li>
                      <li>Click your property and select <strong>Direct Chat Link</strong></li>
                      <li>Copy the Property ID and Widget ID from the URL</li>
                      <li>URL format: <code className="bg-blue-100 px-1 rounded">https://embed.tawk.to/[PROPERTY_ID]/[WIDGET_ID]</code></li>
                    </ol>
                    <a href="https://dashboard.tawk.to" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm">
                      Open Tawk.to Dashboard <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-2">
                    Property ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="propertyId"
                    value={tawkPropertyId}
                    onChange={(e) => setTawkPropertyId(e.target.value)}
                    placeholder="e.g., 5f8a9b1c2d3e4f5g6h7i8j9k"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="widgetId" className="block text-sm font-medium text-gray-700 mb-2">
                    Widget ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="widgetId"
                    value={tawkWidgetId}
                    onChange={(e) => setTawkWidgetId(e.target.value)}
                    placeholder="e.g., default"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SAVE OTHER SETTINGS (non-branding) ─────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6 p-6">
          {otherSaveStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Settings saved successfully!</p>
            </div>
          )}
          {otherSaveStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">{otherError}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Save catalogue, pricing, Tawk.to and WhatsApp settings</p>
            <button
              onClick={handleSaveOther}
              disabled={otherSaveStatus === 'saving'}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                otherSaveStatus === 'saving' ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105'
              } text-white`}
            >
              <Save className="w-5 h-5" />
              {otherSaveStatus === 'saving' ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
