import { useState, useEffect } from 'react';
import { api, CartItem } from '../lib/api';
import { X, Trash2, Minus, Plus, ShoppingBag, ChevronDown, ChevronUp, Package, Download, MessageCircle } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { downloadCartPDF, getWhatsAppShareLink } from '../utils/pdfGenerator';
import { useAuth } from '../contexts/AuthContext';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCart();
    }
  }, [isOpen]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await api.getCart();
      setCartItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      setUpdatingItems(prev => new Set(prev).add(itemId));
      await api.updateCartItem(itemId, newQuantity);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdatingItems(prev => new Set(prev).add(itemId));
      await api.removeFromCart(itemId);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // Group cart items by design and color
  const groupedItems = cartItems.reduce((acc, item) => {
    const key = `${item.design.id}-${item.color.id}`;
    if (!acc[key]) {
      acc[key] = {
        design: item.design,
        color: item.color,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { design: any; color: any; items: CartItem[] }>);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueDesigns = Object.keys(groupedItems).length;

  const handleDownloadPDF = () => {
    const userInfo = user ? { name: user.full_name, email: user.email } : undefined;
    downloadCartPDF(cartItems, userInfo);
  };

  const handleWhatsAppShare = () => {
    const userInfo = user ? { name: user.full_name, email: user.email } : undefined;
    const whatsappLink = getWhatsAppShareLink(cartItems, userInfo);
    window.open(whatsappLink, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold text-primary">Shopping Cart</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          {cartItems.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>{uniqueDesigns} design{uniqueDesigns !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-gray-400">•</span>
              <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading cart...</div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <ShoppingBag className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mb-4" />
              <p className="text-gray-500 text-base sm:text-lg mb-2">Your cart is empty</p>
              <p className="text-gray-400 text-sm sm:text-base">Add some items to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedItems).map(([key, group]) => (
                <GroupedCartCard
                  key={key}
                  groupKey={key}
                  group={group}
                  isExpanded={expandedGroups.has(key)}
                  onToggle={() => toggleGroup(key)}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  updatingItems={updatingItems}
                />
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
            {/* Action Buttons */}
            <div className="space-y-2 sm:space-y-3">
              {/* Download PDF and WhatsApp Share Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
              
              {/* Info Text */}
              <p className="text-xs text-gray-600 text-center">
                Download PDF or share on WhatsApp to get quotes from us
              </p>
              
              {/* Checkout Button */}
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full bg-primary text-white py-3 sm:py-4 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          loadCart();
          onClose();
        }}
      />
    </div>
  );
}

interface GroupedCartCardProps {
  groupKey: string;
  group: {
    design: any;
    color: any;
    items: CartItem[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  updatingItems: Set<string>;
}

function GroupedCartCard({ groupKey, group, isExpanded, onToggle, onUpdateQuantity, onRemove, updatingItems }: GroupedCartCardProps) {
  const firstImage = group.color.image_urls?.[0];
  const totalQuantity = group.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = group.items.reduce((sum, item) => sum + (item.color.price * item.quantity), 0);
  const sizeSummary = group.items.map(item => `${item.size}(${item.quantity})`).join(', ');

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Compact Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition text-left"
      >
        <div className="flex-shrink-0 w-16 h-16 bg-secondary rounded-lg overflow-hidden">
          {firstImage ? (
            <img src={firstImage} alt={group.design.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{group.design.design_no}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{group.design.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
            {group.color.color_code && (
              <div className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: group.color.color_code }} />
            )}
            <span>{group.color.color_name}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 truncate">{sizeSummary}</div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-bold text-primary">₹{totalPrice.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{totalQuantity} items</div>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="space-y-2">
            {group.items.map((item) => {
              const isUpdating = updatingItems.has(item.id);
              return (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium text-gray-700 min-w-[50px]">Size {item.size}</span>
                    
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQuantity(item.id, item.quantity - 1);
                        }}
                        disabled={isUpdating || item.quantity <= 1}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQuantity(item.id, item.quantity + 1);
                        }}
                        disabled={isUpdating}
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      ₹{(item.color.price * item.quantity).toLocaleString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      disabled={isUpdating}
                      className="text-red-500 hover:text-red-600 transition disabled:opacity-50"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
