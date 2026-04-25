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

interface ColorSelection {
  colorId: string;
  colorIndex: number;
  sizeQuantities: SizeQuantity[];
  selectedSets: Map<string, number>;
}

export function AddToCartModal({ isOpen, onClose, onSuccess, design, selectedColorIndex = 0 }: AddToCartModalProps) {
  const { user, isAdmin, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [colorSelections, setColorSelections] = useState<Map<string, ColorSelection>>(new Map());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set([design.design_colors?.[selectedColorIndex]?.id || '']));
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [sizeSets, setSizeSets] = useState<SizeSet[]>([]);
  // Admin users always have access to individual sizes, other users need can_order_individual_sizes enabled
  const canOrderIndividualSizes = isAdmin || (user?.can_order_individual_sizes ?? false);
  const [viewMode, setViewMode] = useState<'individual' | 'sets'>(canOrderIndividualSizes ? 'individual' : 'sets');
  const [partyDiscount, setPartyDiscount] = useState<string | null>(null);
  const displayPrice = typeof design.price === 'number' ? design.price : null;
  const discountedPrice = displayPrice !== null && partyDiscount 
    ? calculateDiscountedPrice(displayPrice, partyDiscount) 
    : displayPrice;

  useEffect(() => {
    if (isOpen) {
      loadSizeData();
      loadPartyDiscount();
    }
  }, [isOpen, selectedColors, user]);

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
      const newColorSelections = new Map<string, ColorSelection>();
      
      // Create color selections for each selected color
      for (const colorId of selectedColors) {
        const colorIndex = design.design_colors?.findIndex(c => c.id === colorId) ?? -1;
        const color = design.design_colors?.[colorIndex];
        
        if (color) {
          // Parse size quantities from the color
          let sizeData: Record<string, number> = {};
          if (color.size_quantities) {
            if (typeof color.size_quantities === 'string') {
              sizeData = JSON.parse(color.size_quantities);
            } else {
              sizeData = color.size_quantities;
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

          newColorSelections.set(colorId, {
            colorId,
            colorIndex,
            sizeQuantities: sizes,
            selectedSets: new Map()
          });
        }
      }
      
      setColorSelections(newColorSelections);

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

  const updateQuantity = (colorId: string, size: string, delta: number) => {
    setColorSelections(prev => {
      const newSelections = new Map(prev);
      const colorSelection = newSelections.get(colorId);
      if (colorSelection) {
        const updatedSizes = colorSelection.sizeQuantities.map(item => {
          if (item.size === size) {
            const newQuantity = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
        newSelections.set(colorId, { ...colorSelection, sizeQuantities: updatedSizes });
      }
      return newSelections;
    });
  };

  const updateSizeQuantity = (colorId: string, size: string, quantity: number) => {
    setColorSelections(prev => {
      const newSelections = new Map(prev);
      const colorSelection = newSelections.get(colorId);
      if (colorSelection) {
        const updatedSizes = colorSelection.sizeQuantities.map(item => {
          if (item.size === size) {
            const validQuantity = Math.max(0, quantity);
            return { ...item, quantity: validQuantity };
          }
          return item;
        });
        newSelections.set(colorId, { ...colorSelection, sizeQuantities: updatedSizes });
      }
      return newSelections;
    });
  };

  useEffect(() => {
    let total = 0;
    
    for (const colorSelection of colorSelections.values()) {
      if (viewMode === 'sets') {
        // In set mode, sum all selected set quantities for this color
        total += Array.from(colorSelection.selectedSets.values()).reduce((sum, qty) => sum + qty, 0);
      } else {
        // In individual mode, sum all size quantities for this color
        total += colorSelection.sizeQuantities.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
    
    setTotalQuantity(total);
  }, [colorSelections, viewMode]);

  const updateSetQuantity = (colorId: string, setId: string, quantity: number) => {
    setColorSelections(prev => {
      const newSelections = new Map(prev);
      const colorSelection = newSelections.get(colorId);
      if (colorSelection) {
        const newSets = new Map(colorSelection.selectedSets);
        if (quantity > 0) {
          newSets.set(setId, quantity);
        } else {
          newSets.delete(setId);
        }
        newSelections.set(colorId, { ...colorSelection, selectedSets: newSets });
      }
      return newSelections;
    });
  };

  const clearQuantities = (colorId?: string) => {
    setColorSelections(prev => {
      const newSelections = new Map(prev);
      
      if (colorId) {
        // Clear quantities for specific color
        const colorSelection = newSelections.get(colorId);
        if (colorSelection) {
          const clearedSizes = colorSelection.sizeQuantities.map(item => ({ ...item, quantity: 0 }));
          newSelections.set(colorId, { 
            ...colorSelection, 
            sizeQuantities: clearedSizes, 
            selectedSets: new Map() 
          });
        }
      } else {
        // Clear quantities for all colors
        for (const [id, colorSelection] of newSelections.entries()) {
          const clearedSizes = colorSelection.sizeQuantities.map(item => ({ ...item, quantity: 0 }));
          newSelections.set(id, { 
            ...colorSelection, 
            sizeQuantities: clearedSizes, 
            selectedSets: new Map() 
          });
        }
      }
      
      return newSelections;
    });
  };

  const toggleColorSelection = (colorId: string) => {
    setSelectedColors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(colorId)) {
        newSet.delete(colorId);
        // Also remove from color selections
        setColorSelections(prevSelections => {
          const newSelections = new Map(prevSelections);
          newSelections.delete(colorId);
          return newSelections;
        });
      } else {
        newSet.add(colorId);
      }
      return newSet;
    });
  };

  const handleAddToCart = async () => {
    if (!hasPermission('catalogue', 'order')) {
      setError('You do not have permission to place orders');
      return;
    }

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
      // Process each selected color
      for (const [colorId, colorSelection] of colorSelections.entries()) {
        if (viewMode === 'sets' && colorSelection.selectedSets.size > 0) {
          // Add multiple size sets to cart for this color
          for (const [setId, quantity] of colorSelection.selectedSets.entries()) {
            await api.addToCart({
              design_id: design.id,
              color_id: colorId,
              size_set_id: setId,
              quantity: quantity
            });
          }
        } else {
          // Add individual sizes to cart for this color
          const itemsToAdd = colorSelection.sizeQuantities.filter(item => item.quantity > 0);
          
          for (const item of itemsToAdd) {
            await api.addToCart({
              design_id: design.id,
              color_id: colorId,
              size: item.size,
              quantity: item.quantity
            });
          }
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
    setColorSelections(new Map());
    setSelectedColors(new Set([design.design_colors?.[selectedColorIndex]?.id || '']));
    setTotalQuantity(0);
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
              {/* Color Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Select Colors</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {design.design_colors?.map((color, index) => (
                    <button
                      key={color.id}
                      onClick={() => toggleColorSelection(color.id)}
                      className={`relative p-2 rounded-lg border-2 transition ${
                        selectedColors.has(color.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border border-gray-300 mx-auto mb-1"
                        style={{ backgroundColor: color.color_code || '#cccccc' }}
                      />
                      <p className="text-xs text-center text-gray-700 truncate">{color.color_name}</p>
                      {selectedColors.has(color.id) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Price Info */}
                {displayPrice !== null && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {partyDiscount ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-400 line-through">₹{displayPrice.toLocaleString()}</p>
                        <p className="text-sm font-semibold text-green-600">₹{discountedPrice?.toLocaleString()}/piece</p>
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {getDiscountPercentage(partyDiscount)}% OFF
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">₹{displayPrice.toLocaleString()}/piece</p>
                    )}
                  </div>
                )}
              </div>

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

              {/* Per-Color Size/Set Selection */}
              {selectedColors.size > 0 && (
                <div className="mb-4 space-y-4">
                  {Array.from(selectedColors).map(colorId => {
                    const colorSelection = colorSelections.get(colorId);
                    const color = design.design_colors?.find(c => c.id === colorId);
                    if (!color || !colorSelection) return null;

                    return (
                      <div key={colorId} className="border border-gray-200 rounded-lg p-4">
                        {/* Color Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.color_code || '#cccccc' }}
                          />
                          <span className="font-medium text-gray-900">{color.color_name}</span>
                          <button
                            onClick={() => clearQuantities(colorId)}
                            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        </div>

                        {/* Size Sets for this color */}
                        {viewMode === 'sets' && sizeSets.length > 0 && (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {sizeSets.map((set) => {
                              const isSelected = colorSelection.selectedSets.has(set.id);
                              const currentQty = colorSelection.selectedSets.get(set.id) || 1;
                              return (
                                <div key={set.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    id={`${colorId}-set-${set.id}`}
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateSetQuantity(colorId, set.id, 1);
                                      } else {
                                        updateSetQuantity(colorId, set.id, 0);
                                      }
                                    }}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  />
                                  <label htmlFor={`${colorId}-set-${set.id}`} className="flex-1 cursor-pointer">
                                    <span className="font-medium">{set.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">({set.sizes.join(', ')})</span>
                                  </label>
                                  {isSelected && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => updateSetQuantity(colorId, set.id, Math.max(1, currentQty - 1))}
                                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-8 text-center text-sm font-semibold">{currentQty}</span>
                                      <button
                                        onClick={() => updateSetQuantity(colorId, set.id, currentQty + 1)}
                                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Individual Sizes for this color */}
                        {viewMode === 'individual' && (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {colorSelection.sizeQuantities.map((item) => (
                              <div key={item.size} className="flex items-center gap-2 text-sm">
                                <div className="flex-1">
                                  <span className="font-medium">{item.size}</span>
                                  <span className="text-xs text-gray-500 ml-2">({item.available} available)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateQuantity(colorId, item.size, -1)}
                                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateSizeQuantity(colorId, item.size, parseInt(e.target.value) || 0)}
                                    className="w-12 text-center border border-gray-300 rounded py-0.5 text-sm focus:ring-1 focus:ring-primary"
                                    min="0"
                                  />
                                  <button
                                    onClick={() => updateQuantity(colorId, item.size, 1)}
                                    className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
