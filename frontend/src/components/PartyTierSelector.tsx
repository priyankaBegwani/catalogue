import { useState, useEffect } from 'react';
import { Award, TrendingUp, Zap, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { getPricingConfig, calculateVolumeTier } from '../utils/pricingTiers';
import { TierModel, VolumeTier, RelationshipTier } from '../types/pricing';

interface PartyTierSelectorProps {
  partyId?: string;
  volumeTierId?: string;
  relationshipTierId?: string;
  hybridAutoTierId?: string;
  hybridManualOverride?: boolean;
  hybridOverrideTierId?: string;
  monthlyOrderCount?: number;
  onTierChange: (tierData: {
    volumeTierId?: string;
    relationshipTierId?: string;
    hybridAutoTierId?: string;
    hybridManualOverride?: boolean;
    hybridOverrideTierId?: string;
  }) => void;
}

export function PartyTierSelector({
  partyId,
  volumeTierId,
  relationshipTierId,
  hybridAutoTierId,
  hybridManualOverride = false,
  hybridOverrideTierId,
  monthlyOrderCount = 0,
  onTierChange
}: PartyTierSelectorProps) {
  const [config, setConfig] = useState(getPricingConfig());
  const [selectedVolumeTier, setSelectedVolumeTier] = useState(volumeTierId || '');
  const [selectedRelationshipTier, setSelectedRelationshipTier] = useState(relationshipTierId || '');
  const [autoTier, setAutoTier] = useState(hybridAutoTierId || '');
  const [manualOverride, setManualOverride] = useState(hybridManualOverride);
  const [overrideTier, setOverrideTier] = useState(hybridOverrideTierId || '');

  useEffect(() => {
    setConfig(getPricingConfig());
  }, []);

  useEffect(() => {
    // Calculate auto tier based on monthly order count
    if (config.activeModel === 'volume' || config.activeModel === 'hybrid') {
      const calculatedTier = calculateVolumeTier(monthlyOrderCount, config.volumeTiers);
      if (calculatedTier) {
        setAutoTier(calculatedTier.id);
        if (config.activeModel === 'volume') {
          setSelectedVolumeTier(calculatedTier.id);
          onTierChange({ volumeTierId: calculatedTier.id });
        } else if (config.activeModel === 'hybrid' && !manualOverride) {
          onTierChange({ 
            hybridAutoTierId: calculatedTier.id,
            hybridManualOverride: false 
          });
        }
      }
    }
  }, [monthlyOrderCount, config.activeModel, config.volumeTiers, manualOverride]);

  const handleVolumeTierChange = (tierId: string) => {
    setSelectedVolumeTier(tierId);
    onTierChange({ volumeTierId: tierId });
  };

  const handleRelationshipTierChange = (tierId: string) => {
    setSelectedRelationshipTier(tierId);
    onTierChange({ relationshipTierId: tierId });
  };

  const handleOverrideToggle = () => {
    const newOverride = !manualOverride;
    setManualOverride(newOverride);
    
    if (newOverride) {
      onTierChange({
        hybridAutoTierId: autoTier,
        hybridManualOverride: true,
        hybridOverrideTierId: overrideTier || autoTier
      });
    } else {
      onTierChange({
        hybridAutoTierId: autoTier,
        hybridManualOverride: false,
        hybridOverrideTierId: undefined
      });
    }
  };

  const handleOverrideTierChange = (tierId: string) => {
    setOverrideTier(tierId);
    onTierChange({
      hybridAutoTierId: autoTier,
      hybridManualOverride: true,
      hybridOverrideTierId: tierId
    });
  };

  const getTierInfo = (tierId: string, tiers: (VolumeTier | RelationshipTier)[]) => {
    return tiers.find(t => t.id === tierId);
  };

  const getDiscountDisplay = (tierId: string, tiers: (VolumeTier | RelationshipTier)[]) => {
    const tier = getTierInfo(tierId, tiers);
    return tier ? `${tier.discountPercentage}% OFF` : 'No discount';
  };

  if (config.activeModel === 'volume') {
    const currentTier = getTierInfo(selectedVolumeTier, config.volumeTiers);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Volume-Based Tier</h3>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
            Automatic
          </span>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Orders: <span className="font-semibold text-gray-900">{monthlyOrderCount}</span></p>
              {currentTier && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: currentTier.color }}
                  >
                    {currentTier.name[0]}
                  </div>
                  <span className="font-bold text-gray-900">{currentTier.name}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                    {currentTier.discountPercentage}% OFF
                  </span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-600">
            {currentTier?.description || 'Tier automatically assigned based on monthly order volume'}
          </p>
        </div>
      </div>
    );
  }

  if (config.activeModel === 'relationship') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Relationship-Based Tier</h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            Manual
          </span>
        </div>

        <div className="space-y-2">
          {config.relationshipTiers.map((tier) => (
            <label
              key={tier.id}
              className="relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md"
              style={{
                borderColor: selectedRelationshipTier === tier.id ? tier.color : '#e5e7eb',
                backgroundColor: selectedRelationshipTier === tier.id ? `${tier.color}10` : 'white'
              }}
            >
              <input
                type="radio"
                name="relationshipTier"
                value={tier.id}
                checked={selectedRelationshipTier === tier.id}
                onChange={(e) => handleRelationshipTierChange(e.target.value)}
                className="mt-1 h-4 w-4"
                style={{ accentColor: tier.color }}
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4" style={{ color: tier.color }} />
                  <span className="font-semibold text-gray-900">{tier.name}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                    {tier.discountPercentage}% OFF
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{tier.description}</p>
                <div className="text-xs text-gray-500">
                  <p className="font-medium mb-1">Benefits:</p>
                  <ul className="space-y-0.5">
                    {tier.benefits.slice(0, 2).map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-green-600">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (config.activeModel === 'hybrid') {
    const currentAutoTier = getTierInfo(autoTier, config.volumeTiers);
    const currentOverrideTier = getTierInfo(overrideTier, config.volumeTiers);
    const effectiveTier = manualOverride ? currentOverrideTier : currentAutoTier;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Hybrid Tier</h3>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
            Auto + Override
          </span>
        </div>

        {/* Auto-assigned Tier */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Auto-Assigned Tier</p>
            <span className="text-xs text-gray-500">Based on {monthlyOrderCount} orders/month</span>
          </div>
          {currentAutoTier && (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: currentAutoTier.color }}
              >
                {currentAutoTier.name[0]}
              </div>
              <span className="font-bold text-gray-900">{currentAutoTier.name}</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                {currentAutoTier.discountPercentage}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Manual Override Toggle */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {manualOverride ? <ToggleRight className="w-5 h-5 text-purple-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
              <span className="font-medium text-gray-900">Manual Override</span>
            </div>
            <button
              onClick={handleOverrideToggle}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                manualOverride
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {manualOverride ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {manualOverride && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Select Override Tier:</p>
              {config.volumeTiers.map((tier) => (
                <label
                  key={tier.id}
                  className="relative flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-sm"
                  style={{
                    borderColor: overrideTier === tier.id ? tier.color : '#e5e7eb',
                    backgroundColor: overrideTier === tier.id ? `${tier.color}10` : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="overrideTier"
                    value={tier.id}
                    checked={overrideTier === tier.id}
                    onChange={(e) => handleOverrideTierChange(e.target.value)}
                    className="h-4 w-4"
                    style={{ accentColor: tier.color }}
                  />
                  <div className="ml-3 flex items-center gap-2 flex-1">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.name[0]}
                    </div>
                    <span className="font-medium text-gray-900">{tier.name}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                      {tier.discountPercentage}% OFF
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Effective Tier Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Effective Tier: {effectiveTier?.name || 'None'}
              </p>
              <p className="text-xs text-blue-800">
                {manualOverride 
                  ? 'Using manual override tier. Disable override to use auto-assigned tier.'
                  : 'Using auto-assigned tier based on monthly orders.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
