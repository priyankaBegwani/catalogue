import { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { api, Design, SizeSet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface AddToCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  design: Design;
  selectedColorIndex?: number;
}

interface SizeQuantity {
  size: string;
  quantity: number;
  available: number;
}

export function AddToCartModal({ isOpen, onClose, design, selectedColorIndex = 0 }: AddToCartModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState<SizeQuantity[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [sizeSets, setSizeSets] = useState<SizeSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'individual' | 'sets'>('individual');

  const selectedColor = design.design_colors?.[selectedColorIndex];

  useEffect(() => {
    if (isOpen && selectedColor) {
      loadSizeData();
    }
  }, [isOpen, selectedColor]);

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

  const setQuantity = (size: string, quantity: number) => {
    setSizeQuantities(prev => prev.map(item => {
      if (item.size === size) {
        const validQuantity = Math.max(0, quantity);
        return { ...item, quantity: validQuantity };
      }
      return item;
    }));
  };

  useEffect(() => {
    const total = sizeQuantities.reduce((sum, item) => sum + item.quantity, 0);
    setTotalQuantity(total);
  }, [sizeQuantities]);

  const applySizeSet = () => {
    const selectedSet = sizeSets.find(set => set.id === selectedSetId);
    if (!selectedSet) return;

    // For size sets, we'll set quantity 1 for each size in the set
    setSizeQuantities(prev => prev.map(item => {
      const isInSet = selectedSet.sizes.includes(item.size);
      const quantity = isInSet ? 1 : 0;
      return { ...item, quantity };
    }));
  };

  const clearQuantities = () => {
    setSizeQuantities(prev => prev.map(item => ({ ...item, quantity: 0 })));
  };

  const handleAddToCart = async () => {
    if (!user) {
      setError('Please login to add items to cart');
      return;
    }

    if (totalQuantity === 0) {
      setError('Please select at least one size');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const itemsToAdd = sizeQuantities.filter(item => item.quantity > 0);
      
      // Add each item to cart individually
      for (const item of itemsToAdd) {
        await api.addToCart({
          design_id: design.id,
          color_id: selectedColor?.id || '',
          size: item.size,
          quantity: item.quantity
        });
      }
      
      setSuccess(true);
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
    setError('');
    setSuccess(false);
    setSelectedSetId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeIn">
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
        <div className="p-4">
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
                    <p className="text-sm text-gray-600">₹{selectedColor.price.toLocaleString()}/piece</p>
                  </div>
                </div>
              )}

              {/* View Mode Toggle for Size Sets */}
              {sizeSets.length > 0 && (
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Select Size Set</label>
                    <button
                      onClick={clearQuantities}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                  <select
                    value={selectedSetId}
                    onChange={(e) => {
                      setSelectedSetId(e.target.value);
                      if (e.target.value) {
                        applySizeSet();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Choose a size set...</option>
                    {sizeSets.map(set => (
                      <option key={set.id} value={set.id}>
                        {set.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Show quantity controls for selected size set */}
                  {selectedSetId && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-600 mb-2">Adjust quantities for each size:</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sizeQuantities
                          .filter(item => {
                            const selectedSet = sizeSets.find(set => set.id === selectedSetId);
                            return selectedSet?.sizes.includes(item.size);
                          })
                          .map((item) => (
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
                                  onChange={(e) => setQuantity(item.size, parseInt(e.target.value) || 0)}
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
                            onChange={(e) => setQuantity(item.size, parseInt(e.target.value) || 0)}
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
