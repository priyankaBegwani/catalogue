import { useState, useEffect } from 'react';
import { Save, Info, Award, TrendingUp, Users, Zap, Edit2, Plus, Trash2 } from 'lucide-react';
import { PricingTierConfig, VolumeTier, RelationshipTier, TierModel } from '../types/pricing';
import { getPricingConfig, savePricingConfig } from '../utils/pricingTiers';

export function PricingTiers() {
  const [config, setConfig] = useState<PricingTierConfig>(getPricingConfig());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [editingVolumeTier, setEditingVolumeTier] = useState<string | null>(null);
  const [editingRelationshipTier, setEditingRelationshipTier] = useState<string | null>(null);

  const handleSave = () => {
    setSaveStatus('saving');
    try {
      savePricingConfig(config);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateVolumeTier = (tierId: string, updates: Partial<VolumeTier>) => {
    setConfig(prev => ({
      ...prev,
      volumeTiers: prev.volumeTiers.map(tier =>
        tier.id === tierId ? { ...tier, ...updates } : tier
      )
    }));
  };

  const updateRelationshipTier = (tierId: string, updates: Partial<RelationshipTier>) => {
    setConfig(prev => ({
      ...prev,
      relationshipTiers: prev.relationshipTiers.map(tier =>
        tier.id === tierId ? { ...tier, ...updates } : tier
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Pricing Tiers Management
          </h1>
          <p className="text-gray-600 text-lg">Configure discount tiers for your customers</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">About Pricing Tiers</h3>
              <p className="text-sm text-blue-800">
                Configure three different pricing models: Volume-Based (automatic based on order count), 
                Relationship-Based (manual assignment), and Hybrid (automatic with manual override). 
                Select the active model in Settings page.
              </p>
            </div>
          </div>
        </div>

        {/* Volume-Based Tiers */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Volume-Based Tiers</h2>
                <p className="text-amber-100 text-sm">Automatic tier assignment based on monthly order volume</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {config.volumeTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: '4px', borderLeftColor: tier.color }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: tier.color }}
                        >
                          {tier.name[0]}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                          {tier.discountPercentage}% OFF
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
                      
                      {editingVolumeTier === tier.id ? (
                        <div className="space-y-3 mt-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Min Monthly Orders
                              </label>
                              <input
                                type="number"
                                value={tier.minMonthlyOrders}
                                onChange={(e) => updateVolumeTier(tier.id, { minMonthlyOrders: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Max Monthly Orders
                              </label>
                              <input
                                type="number"
                                value={tier.maxMonthlyOrders || ''}
                                onChange={(e) => updateVolumeTier(tier.id, { 
                                  maxMonthlyOrders: e.target.value ? parseInt(e.target.value) : null 
                                })}
                                placeholder="No limit"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Discount Percentage
                            </label>
                            <input
                              type="number"
                              value={tier.discountPercentage}
                              onChange={(e) => updateVolumeTier(tier.id, { discountPercentage: parseFloat(e.target.value) })}
                              min="0"
                              max="100"
                              step="0.5"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={tier.description}
                              onChange={(e) => updateVolumeTier(tier.id, { description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <button
                            onClick={() => setEditingVolumeTier(null)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Done Editing
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium">
                            {tier.minMonthlyOrders} - {tier.maxMonthlyOrders || '∞'} orders/month
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {editingVolumeTier !== tier.id && (
                      <button
                        onClick={() => setEditingVolumeTier(tier.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Relationship-Based Tiers */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Relationship-Based Tiers</h2>
                <p className="text-blue-100 text-sm">Manual tier assignment based on business relationship</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {config.relationshipTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: '4px', borderLeftColor: tier.color }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: tier.color }}
                        >
                          <Award className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                          {tier.discountPercentage}% OFF
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
                      
                      {editingRelationshipTier === tier.id ? (
                        <div className="space-y-3 mt-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Discount Percentage
                            </label>
                            <input
                              type="number"
                              value={tier.discountPercentage}
                              onChange={(e) => updateRelationshipTier(tier.id, { discountPercentage: parseFloat(e.target.value) })}
                              min="0"
                              max="100"
                              step="0.5"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={tier.description}
                              onChange={(e) => updateRelationshipTier(tier.id, { description: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Benefits (one per line)
                            </label>
                            <textarea
                              value={tier.benefits.join('\n')}
                              onChange={(e) => updateRelationshipTier(tier.id, { 
                                benefits: e.target.value.split('\n').filter(b => b.trim()) 
                              })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <button
                            onClick={() => setEditingRelationshipTier(null)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Done Editing
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Benefits:</p>
                          <ul className="space-y-1">
                            {tier.benefits.map((benefit, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {editingRelationshipTier !== tier.id && (
                      <button
                        onClick={() => setEditingRelationshipTier(tier.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hybrid Model Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Hybrid Model</h2>
                <p className="text-purple-100 text-sm">Automatic tier with manual override capability</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-2">How Hybrid Model Works</h3>
                  <ul className="text-sm text-purple-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>System automatically assigns volume-based tiers based on monthly order count</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>Admins can manually override the automatic tier for specific parties</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>Manual overrides remain in effect until removed or tier is recalculated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>Uses the same volume tiers configured above</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-6">
          {saveStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Pricing tiers saved successfully!</p>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <Info className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">Failed to save pricing tiers</p>
            </div>
          )}

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
              {saveStatus === 'saving' ? 'Saving...' : 'Save Pricing Tiers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
