import { useState, useEffect } from 'react';
import { Save, MessageCircle, Info, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

export function Settings() {
  const [tawkPropertyId, setTawkPropertyId] = useState('');
  const [tawkWidgetId, setTawkWidgetId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Load current settings from localStorage
    const savedPropertyId = localStorage.getItem('tawk_property_id') || '';
    const savedWidgetId = localStorage.getItem('tawk_widget_id') || '';
    
    setTawkPropertyId(savedPropertyId);
    setTawkWidgetId(savedWidgetId);
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      // Validate inputs
      if (!tawkPropertyId.trim() || !tawkWidgetId.trim()) {
        setErrorMessage('Both Property ID and Widget ID are required');
        setSaveStatus('error');
        return;
      }

      // Save to localStorage
      localStorage.setItem('tawk_property_id', tawkPropertyId.trim());
      localStorage.setItem('tawk_widget_id', tawkWidgetId.trim());

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

        {/* Tawk.to Configuration Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Tawk.to Chat Configuration</h2>
                <p className="text-blue-100 text-sm">Configure customer support chat for retailers and guests</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Info Box */}
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

            {/* Status Messages */}
            {saveStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">Settings saved successfully!</p>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  saveStatus === 'saving'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105'
                } text-white`}
              >
                <Save className="w-5 h-5" />
                {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Important Notes:</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>The chat widget will only appear for <strong>retailers and guest users</strong>, not for admins</li>
                <li>Changes will take effect after page reload</li>
                <li>You can customize the chat widget appearance in your Tawk.to dashboard</li>
                <li>User information (name, email, role) will be automatically sent to Tawk.to</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
