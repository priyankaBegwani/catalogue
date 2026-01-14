import { useState, useEffect } from 'react';
import { api, WishlistItem } from '../lib/api';
import { Heart, ShoppingCart, Trash2, Eye, ImageIcon } from 'lucide-react';

interface WishlistProps {
  isModal?: boolean;
  onClose?: () => void;
  onUpdate?: () => void;
}

export function Wishlist({ isModal = false, onClose, onUpdate }: WishlistProps = {}) {
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
      setWishlistItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (designId: string) => {
    try {
      await api.removeFromWishlist(designId);
      setWishlistItems(wishlistItems.filter(item => item.design_id !== designId));
      if (onUpdate) onUpdate();
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
      await api.addToCart({
        design_id: item.design_id,
        color_id: firstColor.id,
        size: firstSize,
        quantity: 1,
      });
      alert('Added to cart!');
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
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${isModal ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} sm:gap-6`}>
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

interface WishlistCardProps {
  item: WishlistItem;
  onRemove: () => void;
  onAddToCart: () => void;
}

function WishlistCard({ item, onRemove, onAddToCart }: WishlistCardProps) {
  const design = item.design;
  const colorCount = design.design_colors?.length || 0;
  const inStockColors = design.design_colors?.filter((c) => c.in_stock).length || 0;
  const firstColorImages = design.design_colors?.[0]?.image_urls || [];
  const firstImage = firstColorImages[0];
  const minPrice = design.design_colors && design.design_colors.length > 0
    ? Math.min(...design.design_colors.map(c => c.price))
    : 0;
  const maxPrice = design.design_colors && design.design_colors.length > 0
    ? Math.max(...design.design_colors.map(c => c.price))
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition duration-300 group relative">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 transition"
      >
        <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 fill-current" />
      </button>

      <div className="relative aspect-w-3 aspect-h-4 bg-secondary overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={design.name}
            className="w-full h-48 sm:h-64 lg:h-72 object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 lg:h-72 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon className="w-16 h-16 sm:w-20 sm:h-20 text-gray-400 mb-3" />
            <span className="text-sm sm:text-base text-gray-500 font-medium">{design.design_no}</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
        <div className="mb-2 sm:mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {design.design_no}
            </span>
            {design.category && (
              <span className="text-xs font-medium px-2 py-1 bg-primary bg-opacity-10 text-primary rounded truncate max-w-[120px]">
                {design.category.name}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1 line-clamp-1">{design.name}</h3>
          {design.description && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{design.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            {minPrice === maxPrice ? (
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">₹{minPrice.toLocaleString()}</span>
            ) : (
              <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                ₹{minPrice.toLocaleString()} - ₹{maxPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Colors:</span>
            <span className="font-medium">{colorCount} variants</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Available:</span>
            <span className="font-medium text-green-600">{inStockColors} in stock</span>
          </div>
        </div>

        <button
          onClick={onAddToCart}
          className="w-full bg-primary text-white py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition flex items-center justify-center space-x-2"
        >
          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
}
