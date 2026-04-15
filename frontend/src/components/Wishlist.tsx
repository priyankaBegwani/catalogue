import { useState, useEffect } from 'react';
import { api, WishlistItem } from '../lib/api';
import { Heart, ShoppingCart, Trash2, ImageIcon } from 'lucide-react';

interface WishlistProps {
  isModal?: boolean;
  onUpdate?: () => void;
}

export function Wishlist({ isModal = false, onUpdate }: WishlistProps = {}) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const data = await api.getWishlist();
      console.log(`Wishlist items fetched (isModal: ${isModal}):`, data.length, data);
      setWishlistItems(data);
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (designId: string) => {
    try {
      setError(''); // Clear any previous errors
      const itemToRemove = wishlistItems.find(item => item.design_id === designId);
      
      await api.removeFromWishlist(designId);
      setWishlistItems(wishlistItems.filter(item => item.design_id !== designId));
      
      // Update counts and notify other components
      if (onUpdate) onUpdate();
      window.dispatchEvent(new Event('wishlistUpdated'));
      
      // Show success message
      if (itemToRemove) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successDiv.textContent = `${itemToRemove.design.name} removed from wishlist`;
        document.body.appendChild(successDiv);
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv);
          }
        }, 3000);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from wishlist');
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.design.design_colors || item.design.design_colors.length === 0) {
      setError('No color variants available');
      return;
    }

    const firstColor = item.design.design_colors[0];
    const firstSize = item.design.available_sizes[0] || '';

    try {
      setError(''); // Clear any previous errors
      await api.addToCart({
        design_id: item.design_id,
        color_id: firstColor.id,
        size: firstSize,
        quantity: 1,
      });
      
      // Remove from wishlist after successfully adding to cart
      await api.removeFromWishlist(item.design_id);
      setWishlistItems(wishlistItems.filter(wishlistItem => wishlistItem.design_id !== item.design_id));
      
      // Update counts and notify other components
      if (onUpdate) onUpdate();
      window.dispatchEvent(new Event('cartUpdated'));
      window.dispatchEvent(new Event('wishlistUpdated'));
      
      // Show success message
      setError(''); // Ensure no error is shown
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successDiv.textContent = `${item.design.name} moved to cart!`;
      document.body.appendChild(successDiv);
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <div className={isModal ? "" : "max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8"}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading wishlist...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? "" : "max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8"}>
      {!isModal && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">My Wishlist</h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mt-2">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
      )}

      {isModal && wishlistItems.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {wishlistItems.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-base sm:text-lg mb-2">Your wishlist is empty</p>
          <p className="text-gray-400 text-sm sm:text-base">Browse our collection and save your favorites!</p>
        </div>
      ) : isModal ? (
        // Modal view: List format similar to cart modal
        <div className="space-y-4">
          {wishlistItems.map((item) => (
            <WishlistItemRow
              key={item.id}
              item={item}
              onRemove={() => handleRemoveFromWishlist(item.design_id)}
              onAddToCart={() => handleAddToCart(item)}
            />
          ))}
        </div>
      ) : (
        // Page view: Card grid format
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {wishlistItems.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={() => handleRemoveFromWishlist(item.design_id)}
              onAddToCart={() => handleAddToCart(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WishlistItemRowProps {
  item: WishlistItem;
  onRemove: () => void;
  onAddToCart: () => void;
}

function WishlistItemRow({ item, onRemove, onAddToCart }: WishlistItemRowProps) {
  const design = item.design;
  
  if (!design) {
    return null;
  }
  
  const colorCount = design.design_colors?.length || 0;
  const inStockColors = design.design_colors?.filter((c) => c.in_stock).length || 0;
  const firstColorImages = design.design_colors?.[0]?.image_urls || [];
  const firstImage = firstColorImages[0] || design.whatsapp_image_url;
  const price = design.price || 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="flex-shrink-0">
        {firstImage ? (
          <div className="relative group">
            <img
              src={firstImage}
              alt={design.name}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200"></div>
          </div>
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500 font-medium">{design.design_no}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{design.name}</h3>
            <p className="text-sm font-medium text-primary uppercase tracking-wide">{design.design_no}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span>{colorCount} colors available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-600 font-medium">{inStockColors} in stock</span>
              </div>
            </div>
          </div>
          <div className="text-right ml-4">
            <div className="text-xl font-bold text-primary">₹{price.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">per piece</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={onAddToCart}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-opacity-90 transition-all shadow-sm hover:shadow"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Move to Cart</span>
        </button>
        <button
          onClick={onRemove}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
}

interface WishlistCardProps {
  item: WishlistItem;
  onRemove: () => void;
  onAddToCart: () => void;
}

function WishlistCard({ item, onRemove, onAddToCart }: WishlistCardProps) {
  const design = item.design;
  
  if (!design) {
    return null;
  }
  
  const colorCount = design.design_colors?.length || 0;
  const inStockColors = design.design_colors?.filter((c) => c.in_stock).length || 0;
  const firstColorImages = design.design_colors?.[0]?.image_urls || [];
  const firstImage = firstColorImages[0] || design.whatsapp_image_url;
  const price = design.price || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Image Section - Compact */}
      <div className="relative bg-gray-50 overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={design.name}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500 font-medium">{design.design_no}</span>
          </div>
        )}
        {/* Remove button - top right corner */}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
          title="Remove from wishlist"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      {/* Content Section - Compact and Clear */}
      <div className="p-3">
        {/* Design Number and Price */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              {design.design_no}
            </span>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5 line-clamp-1">{design.name}</h3>
          </div>
          <div className="ml-2 text-right">
            <span className="text-lg font-bold text-primary whitespace-nowrap">₹{price.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span>{colorCount} colors</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-green-600 font-medium">{inStockColors} in stock</span>
          </div>
        </div>

        {/* Action Button - Prominent */}
        <button
          onClick={onAddToCart}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Move to Cart</span>
        </button>
      </div>
    </div>
  );
}
