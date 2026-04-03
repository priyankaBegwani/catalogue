import { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { api, Design, SizeSet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { calculateDiscountedPrice, getDiscountPercentage } from '../utils/discountCalculator';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  design: Design;
  selectedColorIndex?: number;
}

interface SizeQuantity {
  size: string;
  quantity: number;
  available: number;
}

export function AddToCartModal({ isOpen, onClose, onSuccess, design, selectedColorIndex = 0 }: AddToCartModalProps) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [sizeSets, setSizeSets] = useState<SizeSet[]>([]);
  const [selectedSets, setSelectedSets] = useState<Map<string, number>>(new Map());
  // Admin users always have access to individual sizes, other users need can_order_individual_sizes enabled
  const canOrderIndividualSizes = isAdmin || (user?.can_order_individual_sizes ?? false);
  const [viewMode, setViewMode] = useState<'individual' | 'sets'>(canOrderIndividualSizes ? 'individual' : 'sets');
  const [partyDiscount, setPartyDiscount] = useState<string | null>(null);

  const selectedColor = design.design_colors?.[selectedColorIndex];
  const displayPrice = typeof design.price === 'number' ? design.price : null;
  const discountedPrice = displayPrice !== null && partyDiscount 
    ? calculateDiscountedPrice(displayPrice, partyDiscount) 
    : displayPrice;

  useEffect(() => {
    if (isOpen && selectedColor) {
      loadSizeData();
      loadPartyDiscount();
    }
  }, [isOpen, selectedColor, user]);

  const loadPartyDiscount = async () => {
    try {
      if (user?.party_id) {
        const party = await api.getPartyById(user.party_id);
        setPartyDiscount(party.default_discount || null);
      } else {
        setPartyDiscount(null);
      }
    } catch (err) {
      console.error('Failed to load party discount:', err);
      setPartyDiscount(null);
    }
  };

  const loadSizeData = async () => {
    try {
      // Parse size quantities from the selected color
      let sizeData: Record<string, number> = {};
      if (selectedColor?.size_quantities) {
        if (typeof selectedColor.size_quantities === 'string') {
          sizeData = JSON.parse(selectedColor.size_quantities);
        } else {
          sizeData = selectedColor.size_quantities;
        }
      }

      // Convert to array format
      const sizes: SizeQuantity[] = Object.entries(sizeData).map(([size, available]) => ({
        size,
        quantity: 0,
        available
      })).sort((a, b) => {
        // Sort sizes in a logical order (S, M, L, XL, etc.)
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'FREE'];
        const aIndex = sizeOrder.indexOf(a.size.toUpperCase());
        const bIndex = sizeOrder.indexOf(b.size.toUpperCase());
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        return a.size.localeCompare(b.size);
      });

      setSizeQuantities(sizes);

      // Load size sets for authenticated users
      if (user) {
        try {
          const sets = await api.getSizeSets();
          setSizeSets(sets);
        } catch (err) {
          console.error('Failed to load size sets:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load size data:', err);
      setError('Failed to load size information');
    }
  };

  const updateQuantity = (size: string, delta: number) => {
    setSizeQuantities(prev => prev.map(item => {
      if (item.size === size) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const updateSizeQuantity = (size: string, quantity: number) => {
    setSizeQuantities(prev => prev.map(item => {
      if (item.size === size) {
        const validQuantity = Math.max(0, quantity);
        return { ...item, quantity: validQuantity };
      }
      return item;
    }));
  };

  useEffect(() => {
    if (viewMode === 'sets') {
      // In set mode, sum all selected set quantities
      const total = Array.from(selectedSets.values()).reduce((sum, qty) => sum + qty, 0);
      setTotalQuantity(total);
    } else {
      // In individual mode, sum all size quantities
      const total = sizeQuantities.reduce((sum, item) => sum + item.quantity, 0);
      setTotalQuantity(total);
    }
  }, [sizeQuantities, selectedSets, viewMode]);

  const updateSetQuantity = (setId: string, quantity: number) => {
    setSelectedSets(prev => {
      const newMap = new Map(prev);
      if (quantity > 0) {
        newMap.set(setId, quantity);
      } else {
        newMap.delete(setId);
      }
      return newMap;
    });
  };

  const clearQuantities = () => {
    setSizeQuantities(prev => prev.map(item => ({ ...item, quantity: 0 })));
    setSelectedSets(new Map());
  };

  const handleAddToCart = async () => {
    if (!user) {
      setError('Please login to add items to cart');
      return;
    }

    if (totalQuantity === 0) {
      setError(viewMode === 'sets' ? 'Please enter set quantity' : 'Please select at least one size');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (viewMode === 'sets' && selectedSets.size > 0) {
        // Add multiple size sets to cart
        for (const [setId, quantity] of selectedSets.entries()) {
          await api.addToCart({
            design_id: design.id,
            color_id: selectedColor?.id || '',
            size_set_id: setId,
            quantity: quantity
          });
        }
      } else {
        // Add individual sizes to cart
        const itemsToAdd = sizeQuantities.filter(item => item.quantity > 0);
        
        for (const item of itemsToAdd) {
          await api.addToCart({
            design_id: design.id,
            color_id: selectedColor?.id || '',
            size: item.size,
            quantity: item.quantity
          });
        }
      }
      
      setSuccess(true);
      
      // Notify parent to refresh cart count
      if (onSuccess) {
        onSuccess();
      }
      
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSizeQuantities(prev => prev.map(item => ({ ...item, quantity: 0 })));
    setTotalQuantity(0);
    setSelectedSets(new Map());
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Quick Add to Cart</h2>
              <p className="text-sm text-gray-600">{design.design_no}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Added to Cart!</h3>
              <p className="text-gray-600">
                {totalQuantity} item{totalQuantity > 1 ? 's' : ''} added to your cart
              </p>
            </div>
          ) : (
            <>
              {/* Color Info */}
              {selectedColor && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300"
                    style={{ backgroundColor: selectedColor.color_code || '#cccccc' }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedColor.color_name}</p>
                    {displayPrice !== null ? (
                      <div className="flex items-center gap-2">
                        {partyDiscount ? (
                          <>
                            <p className="text-sm text-gray-400 line-through">₹{displayPrice.toLocaleString()}</p>
                            <p className="text-sm font-semibold text-green-600">₹{discountedPrice?.toLocaleString()}/piece</p>
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              {getDiscountPercentage(partyDiscount)}% OFF
                            </span>
                          </>
                        ) : (
                          <p className="text-sm text-gray-600">₹{displayPrice.toLocaleString()}/piece</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Price not available</p>
                    )}
                  </div>
                </div>
              )}

              {/* View Mode Toggle for Size Sets - Only visible for users with individual size permission */}
              {sizeSets.length > 0 && canOrderIndividualSizes && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <button
                      onClick={() => setViewMode('individual')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                        viewMode === 'individual'
                          ? 'bg-white text-primary border border-primary'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Individual Sizes
                    </button>
                    <button
                      onClick={() => setViewMode('sets')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                        viewMode === 'sets'
                          ? 'bg-white text-primary border border-primary'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Size Sets
                    </button>
                  </div>
                </div>
              )}

              {/* Size Sets View */}
              {viewMode === 'sets' && sizeSets.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Available Size Sets</label>
                    <button
                      onClick={clearQuantities}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {/* Compact checkbox list */}
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {sizeSets.map((set) => {
                      const isSelected = selectedSets.has(set.id);
                      const currentQty = selectedSets.get(set.id) || 1;
                      return (
                        <div key={set.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`set-${set.id}`}
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateSetQuantity(set.id, 1);
                              } else {
                                updateSetQuantity(set.id, 0);
                              }
                            }}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`set-${set.id}`} className="flex-1 text-sm cursor-pointer">
                            <span className="font-medium text-gray-900">{set.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({set.sizes.join(', ')})</span>
                          </label>
                          {isSelected && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateSetQuantity(set.id, Math.max(1, currentQty - 1))}
                                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={currentQty}
                                onChange={(e) => updateSetQuantity(set.id, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 text-center border border-gray-300 rounded py-0.5 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-transparent"
                                min="1"
                              />
                              <button
                                onClick={() => updateSetQuantity(set.id, currentQty + 1)}
                                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Sets Summary */}
                  {selectedSets.size > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-900 mb-2">Selected Sets ({selectedSets.size})</div>
                      <div className="space-y-1">
                        {Array.from(selectedSets.entries()).map(([setId, qty]) => {
                          const set = sizeSets.find(s => s.id === setId);
                          if (!set) return null;
                          return (
                            <div key={setId} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">{set.name}</span>
                              <span className="font-semibold text-blue-900">{qty} set{qty > 1 ? 's' : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Individual Sizes View */}
              {viewMode === 'individual' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Select Sizes & Quantities</label>
                    <button
                      onClick={clearQuantities}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sizeQuantities.map((item) => (
                      <div key={item.size} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{item.size}</span>
                            <span className="text-xs text-gray-500">Available: {item.available}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.size, -1)}
                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateSizeQuantity(item.size, parseInt(e.target.value) || 0)}
                            className="w-16 text-center border border-gray-300 rounded-lg py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            min="0"
                          />
                          <button
                            onClick={() => updateQuantity(item.size, 1)}
                            className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Total and Action */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">Total Items:</span>
                  <span className="text-lg font-semibold text-gray-900">{totalQuantity}</span>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={loading || totalQuantity === 0}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add {totalQuantity} Item{totalQuantity > 1 ? 's' : ''} to Cart
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
