import { useState, useEffect } from 'react';
import { Save, MessageCircle, Info, ExternalLink, CheckCircle, AlertCircle, Palette, Image, Type, Phone, ChevronDown, ChevronUp, ShoppingBag, Eye, EyeOff, TrendingUp, Users, Zap } from 'lucide-react';
import { TierModel } from '../types/pricing';
import { getPricingConfig, savePricingConfig } from '../utils/pricingTiers';

export function Settings() {
  const [tawkPropertyId, setTawkPropertyId] = useState('');
  const [tawkWidgetId, setTawkWidgetId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e3473');
  const [secondaryColor, setSecondaryColor] = useState('#6366f1');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showPriceToCustomers, setShowPriceToCustomers] = useState(true);
  const [activePricingModel, setActivePricingModel] = useState<TierModel>('volume');
  
  const [brandSectionOpen, setBrandSectionOpen] = useState(true);
  const [tawkSectionOpen, setTawkSectionOpen] = useState(false);
  const [catalogueSectionOpen, setCatalogueSectionOpen] = useState(false);
  const [pricingSectionOpen, setPricingSectionOpen] = useState(false);

  useEffect(() => {
    // Load current settings from localStorage
    const savedPropertyId = localStorage.getItem('tawk_property_id') || '';
    const savedWidgetId = localStorage.getItem('tawk_widget_id') || '';
    const savedBrandName = localStorage.getItem('brand_name') || 'Indie Craft';
    const savedLogoUrl = localStorage.getItem('logo_url') || '/Logo indie.png';
    const savedPrimaryColor = localStorage.getItem('primary_color') || '#1e3473';
    const savedSecondaryColor = localStorage.getItem('secondary_color') || '#6366f1';
    const savedWhatsappNumber = localStorage.getItem('whatsapp_number') || '';
    const savedShowPrice = localStorage.getItem('show_price_to_customers') !== 'false';
    const pricingConfig = getPricingConfig();
    
    setTawkPropertyId(savedPropertyId);
    setTawkWidgetId(savedWidgetId);
    setBrandName(savedBrandName);
    setLogoUrl(savedLogoUrl);
    setPrimaryColor(savedPrimaryColor);
    setSecondaryColor(savedSecondaryColor);
    setWhatsappNumber(savedWhatsappNumber);
    setShowPriceToCustomers(savedShowPrice);
    setActivePricingModel(pricingConfig.activeModel);
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      // Validate branding inputs
      if (!brandName.trim()) {
        setErrorMessage('Brand name is required');
        setSaveStatus('error');
        return;
      }

      if (!logoUrl.trim()) {
        setErrorMessage('Logo URL is required');
        setSaveStatus('error');
        return;
      }

      // Validate WhatsApp number format if provided
      if (whatsappNumber.trim() && !/^\+?[1-9]\d{1,14}$/.test(whatsappNumber.trim().replace(/[\s-]/g, ''))) {
        setErrorMessage('Please enter a valid WhatsApp number with country code (e.g., +1234567890)');
        setSaveStatus('error');
        return;
      }

      // Save branding settings to localStorage
      localStorage.setItem('brand_name', brandName.trim());
      localStorage.setItem('logo_url', logoUrl.trim());
      localStorage.setItem('primary_color', primaryColor);
      localStorage.setItem('secondary_color', secondaryColor);
      localStorage.setItem('whatsapp_number', whatsappNumber.trim());

      // Save Tawk.to settings if provided
      if (tawkPropertyId.trim() && tawkWidgetId.trim()) {
        localStorage.setItem('tawk_property_id', tawkPropertyId.trim());
        localStorage.setItem('tawk_widget_id', tawkWidgetId.trim());
      }
      
      // Save catalogue settings
      localStorage.setItem('show_price_to_customers', showPriceToCustomers.toString());
      
      // Save pricing model
      const pricingConfig = getPricingConfig();
      pricingConfig.activeModel = activePricingModel;
      savePricingConfig(pricingConfig);

      setSaveStatus('success');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

      // Show reload prompt
      if (window.confirm('Settings saved! The page needs to reload for changes to take effect. Reload now?')) {
        window.location.reload();
      }
    } catch (error) {
      setErrorMessage('Failed to save settings');
      setSaveStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-gray-600 text-lg">Configure your application settings</p>
        </div>

        {/* Branding Configuration Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button
            onClick={() => setBrandSectionOpen(!brandSectionOpen)}
            className="w-full"
          >
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
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
            {/* Brand Name */}
            <div>
              <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Indie Craft"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">This name will appear throughout the application</p>
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Logo URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="e.g., /Logo indie.png or https://example.com/logo.png"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Path to your logo image (relative or absolute URL)</p>
              {logoUrl && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">Logo Preview:</p>
                  <img src={logoUrl} alt="Logo preview" className="h-16 w-auto object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }} />
                </div>
              )}
            </div>

            {/* Theme Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Primary Color <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-12 w-16 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#1e3473"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main brand color for buttons, links, etc.</p>
              </div>

              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Secondary Color <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-12 w-16 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#6366f1"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Accent color for highlights and gradients</p>
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
                placeholder="e.g., +1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91 for India). This will be used for WhatsApp share links.</p>
            </div>

            {/* Color Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Theme Preview:</h3>
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[120px]">
                  <div 
                    className="h-16 rounded-lg shadow-md flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div 
                    className="h-16 rounded-lg shadow-md flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Secondary
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div 
                    className="h-16 rounded-lg shadow-md flex items-center justify-center text-white font-semibold"
                    style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                  >
                    Gradient
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Catalogue Settings Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button
            onClick={() => setCatalogueSectionOpen(!catalogueSectionOpen)}
            className="w-full"
          >
            <div className="bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div>
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
              {/* Price Visibility Toggle */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {showPriceToCustomers ? <Eye className="w-5 h-5 text-green-600" /> : <EyeOff className="w-5 h-5 text-gray-600" />}
                      <h3 className="text-lg font-semibold text-gray-900">Price Visibility</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Control whether product prices are displayed to customers in the catalogue. When disabled, customers will need to contact you for pricing information.
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        {showPriceToCustomers ? 'Prices are visible to customers' : 'Prices are hidden from customers'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPriceToCustomers(!showPriceToCustomers)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                      showPriceToCustomers ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        showPriceToCustomers ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1">Note:</h3>
                    <p className="text-sm text-blue-800">
                      This setting affects all customers viewing the catalogue. Admins will always see prices regardless of this setting.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Tier Model Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button
            onClick={() => setPricingSectionOpen(!pricingSectionOpen)}
            className="w-full"
          >
            <div className="bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
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
              {/* Info Box */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-indigo-900 mb-1">About Pricing Models</h3>
                    <p className="text-sm text-indigo-800">
                      Choose how discounts are calculated for your parties. You can configure the tiers in the Pricing Tiers page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-4">
                {/* Volume-Based Model */}
                <label className="relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    borderColor: activePricingModel === 'volume' ? '#6366f1' : '#e5e7eb',
                    backgroundColor: activePricingModel === 'volume' ? '#eef2ff' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="pricingModel"
                    value="volume"
                    checked={activePricingModel === 'volume'}
                    onChange={(e) => setActivePricingModel(e.target.value as TierModel)}
                    className="mt-1 h-4 w-4 text-indigo-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-gray-900">Volume-Based</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                        Automatic
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Tiers automatically assigned based on monthly order count (Copper, Bronze, Silver, Gold, Platinum)
                    </p>
                  </div>
                </label>

                {/* Relationship-Based Model */}
                <label className="relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    borderColor: activePricingModel === 'relationship' ? '#6366f1' : '#e5e7eb',
                    backgroundColor: activePricingModel === 'relationship' ? '#eef2ff' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="pricingModel"
                    value="relationship"
                    checked={activePricingModel === 'relationship'}
                    onChange={(e) => setActivePricingModel(e.target.value as TierModel)}
                    className="mt-1 h-4 w-4 text-indigo-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Relationship-Based</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        Manual
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Manually assign tiers based on business relationship (Standard, Trusted, Strategic)
                    </p>
                  </div>
                </label>

                {/* Hybrid Model */}
                <label className="relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    borderColor: activePricingModel === 'hybrid' ? '#6366f1' : '#e5e7eb',
                    backgroundColor: activePricingModel === 'hybrid' ? '#eef2ff' : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="pricingModel"
                    value="hybrid"
                    checked={activePricingModel === 'hybrid'}
                    onChange={(e) => setActivePricingModel(e.target.value as TierModel)}
                    className="mt-1 h-4 w-4 text-indigo-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">Hybrid</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        Auto + Override
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Automatic tier based on monthly orders, but can be manually overridden for specific parties
                    </p>
                  </div>
                </label>
              </div>

              {/* Link to Pricing Tiers Management */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Configure Tier Details</h3>
                    <p className="text-sm text-gray-600">
                      Set discount percentages and thresholds for each tier
                    </p>
                  </div>
                  <a
                    href="/pricing-tiers"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    Manage Tiers
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tawk.to Configuration Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <button
            onClick={() => setTawkSectionOpen(!tawkSectionOpen)}
            className="w-full"
          >
            <div className="bg-gradient-to-br from-slate-50 via-fuchsia-50 to-pink-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
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
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800">Tawk.to integration is optional. Leave these fields empty if you don't want to use live chat support.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">How to get your Tawk.to credentials:</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Sign up or log in to <a href="https://www.tawk.to" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Tawk.to</a></li>
                    <li>Go to <strong>Administration → Channels → Chat Widget</strong></li>
                    <li>Click on your property and select <strong>Direct Chat Link</strong></li>
                    <li>Copy the Property ID and Widget ID from the URL</li>
                    <li>The URL format is: <code className="bg-blue-100 px-1 rounded">https://embed.tawk.to/[PROPERTY_ID]/[WIDGET_ID]</code></li>
                  </ol>
                  <a 
                    href="https://dashboard.tawk.to" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Open Tawk.to Dashboard
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Form Fields */}
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

        {/* Save Button - Always Visible */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6 p-6">
          {/* Status Messages */}
          {saveStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Settings saved successfully!</p>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                saveStatus === 'saving'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105'
              } text-white`}
            >
              <Save className="w-5 h-5" />
              {saveStatus === 'saving' ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
