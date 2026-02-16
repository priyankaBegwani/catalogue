import { useState } from 'react';
import { Design, api } from '../lib/api';
import { X, Package, Tag, Video, Image as ImageIcon, ZoomIn, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';

interface ViewDesignModalProps {
  design: Design;
  onClose: () => void;
  onUpdate: () => void;
  initialColorIndex?: number;
}

export function ViewDesignModal({ design, onClose, onUpdate, initialColorIndex = 0 }: ViewDesignModalProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(initialColorIndex);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [stockError, setStockError] = useState('');
  const selectedColor = design.design_colors?.[selectedColorIndex];
  
  // Parse size_quantities if it's a string (from database)
  let parsedSizeQuantities = selectedColor?.size_quantities;
  if (typeof parsedSizeQuantities === 'string') {
    try {
      parsedSizeQuantities = JSON.parse(parsedSizeQuantities);
    } catch (e) {
      console.error('Failed to parse size_quantities:', e);
      parsedSizeQuantities = undefined;
    }
  }

  // Calculate total stock
  const getTotalStock = () => {
    if (!parsedSizeQuantities) return 0;
    return Object.values(parsedSizeQuantities).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0);
  };

  // Reset image index when color changes
  const handleColorChange = (index: number) => {
    setSelectedColorIndex(index);
    setSelectedImageIndex(0);
  };

  // Toggle stock status
  const handleToggleStock = async () => {
    if (!selectedColor) return;
    
    setUpdatingStock(true);
    setStockError('');
    
    try {
      await api.updateDesignColor(selectedColor.id, {
        in_stock: !selectedColor.in_stock
      });
      await onUpdate();
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Failed to update stock status');
    } finally {
      setUpdatingStock(false);
    }
  };

  // Navigate images
  const nextImage = () => {
    if (selectedColor?.image_urls) {
      setSelectedImageIndex((prev) => 
        prev < selectedColor.image_urls.length - 1 ? prev + 1 : 0
      );
    }
  };

  const prevImage = () => {
    if (selectedColor?.image_urls) {
      setSelectedImageIndex((prev) => 
        prev > 0 ? prev - 1 : selectedColor.image_urls.length - 1
      );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-2 sm:p-4 z-50" onClick={onClose}>
        <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">{design.name}</h2>
                <span className="text-sm text-gray-500">({design.design_no})</span>
                {!design.is_active && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                {design.category && (
                  <span className="px-2 py-1 bg-primary bg-opacity-10 text-primary text-xs font-medium rounded">
                    {design.category.name}
                  </span>
                )}
                {design.style && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {design.style.name}
                  </span>
                )}
                {design.fabric_type && (
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">
                    {design.fabric_type.name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {design.design_colors && design.design_colors.length > 0 ? (
            <div>
                {/* Color Selector */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-primary" />
                    Colors ({design.design_colors.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {design.design_colors.map((color, index) => (
                      <button
                        key={color.id}
                        onClick={() => handleColorChange(index)}
                        className={`px-3 py-2 rounded-lg border-2 transition-all ${
                          selectedColorIndex === index
                            ? 'border-primary bg-primary bg-opacity-10 shadow-md scale-105'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color.color_code || '#cccccc' }}
                          />
                          <span className={`text-sm font-medium ${
                            selectedColorIndex === index ? 'text-primary' : 'text-gray-700'
                          }`}>
                            {color.color_name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              {selectedColor && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left: Media Gallery */}
                  <div className="space-y-3">
                    {/* Main Image with Navigation */}
                    <div className="relative bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden group">
                      {selectedColor.image_urls && selectedColor.image_urls.length > 0 ? (
                        <>
                          <div className="bg-white flex items-center justify-center p-4" style={{ minHeight: '400px', maxHeight: '600px' }}>
                            <img
                              src={selectedColor.image_urls[selectedImageIndex]}
                              alt={selectedColor.color_name}
                              className="w-full h-full object-contain cursor-zoom-in"
                              style={{ maxHeight: '592px' }}
                              onClick={() => setShowImageZoom(true)}
                            />
                          </div>
                          
                          {/* Zoom Button */}
                          <button
                            onClick={() => setShowImageZoom(true)}
                            className="absolute top-3 right-3 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-lg shadow-lg transition opacity-0 group-hover:opacity-100"
                            title="Zoom image"
                          >
                            <ZoomIn className="w-5 h-5 text-gray-700" />
                          </button>
                          
                          {/* Navigation Arrows */}
                          {selectedColor.image_urls.length > 1 && (
                            <>
                              <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg transition opacity-0 group-hover:opacity-100"
                              >
                                <ChevronLeft className="w-5 h-5 text-gray-700" />
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg transition opacity-0 group-hover:opacity-100"
                              >
                                <ChevronRight className="w-5 h-5 text-gray-700" />
                              </button>
                              
                              {/* Image Counter */}
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs font-medium">
                                {selectedImageIndex + 1} / {selectedColor.image_urls.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="aspect-[3/4] flex flex-col items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-gray-300 mb-2" />
                          <p className="text-gray-400 text-sm">No image available</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnails */}
                    {selectedColor.image_urls && selectedColor.image_urls.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {selectedColor.image_urls.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 overflow-hidden transition-all ${
                              selectedImageIndex === index
                                ? 'border-primary ring-2 ring-primary ring-opacity-30'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Video */}
                    {selectedColor.video_urls && selectedColor.video_urls.length > 0 && (
                      <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-700">Product Video</span>
                        </div>
                        <video
                          src={selectedColor.video_urls[0]}
                          controls
                          className="w-full rounded-lg"
                          style={{ maxHeight: '300px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: Details */}
                  <div className="space-y-4">
                    {/* Price Card */}
                    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Unit Price</p>
                            <p className="text-3xl sm:text-4xl font-bold text-gray-900">₹{selectedColor.price.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Total Stock</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <Package className="w-5 h-5 text-primary" />
                              <span className="text-2xl font-bold text-primary">{getTotalStock()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stock Status & Toggle */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              selectedColor.in_stock ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`} />
                            <span className="text-sm font-semibold text-gray-700">
                              {selectedColor.in_stock ? 'Available' : 'Out of Stock'}
                            </span>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            selectedColor.in_stock 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedColor.in_stock ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <button
                          onClick={handleToggleStock}
                          disabled={updatingStock}
                          className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${
                            selectedColor.in_stock 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {updatingStock ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5" />
                              <span>{selectedColor.in_stock ? 'Mark as Out of Stock' : 'Mark as In Stock'}</span>
                            </>
                          )}
                        </button>
                        
                        {stockError && (
                          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{stockError}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Color Info */}
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                      <div className="flex items-center gap-3">
                        {selectedColor.color_code && (
                          <div
                            className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                            style={{ backgroundColor: selectedColor.color_code }}
                          />
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Color</p>
                          <p className="text-base font-bold text-gray-900">{selectedColor.color_name}</p>
                          {selectedColor.color_code && (
                            <p className="text-xs font-mono text-gray-500 mt-1">{selectedColor.color_code}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Size Stock Grid */}
                    {parsedSizeQuantities && design.available_sizes.length > 0 && (
                      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-gradient-to-r from-gray-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                              <Package className="w-4 h-4 text-primary" />
                              Inventory by Size
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                              <span>Total:</span>
                              <span className="text-base font-bold text-primary">{getTotalStock()}</span>
                              <span>units</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                            {design.available_sizes.map((size) => {
                              const quantity = parsedSizeQuantities?.[size as keyof typeof parsedSizeQuantities] || 0;
                              return (
                                <div
                                  key={size}
                                  className={`relative p-3 rounded-lg border-2 text-center transition-all group ${
                                    quantity > 0 
                                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:border-green-400 hover:shadow-lg' 
                                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">{size}</div>
                                  <div className={`text-xl font-bold ${
                                    quantity > 0 ? 'text-green-600' : 'text-gray-400'
                                  }`}>
                                    {quantity}
                                  </div>
                                  {quantity > 0 && (
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No color variants</p>
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="flex justify-end px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {showImageZoom && selectedColor?.image_urls && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowImageZoom(false)}
        >
          <button
            onClick={() => setShowImageZoom(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition p-2 bg-black bg-opacity-50 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedColor.image_urls[selectedImageIndex]}
              alt={selectedColor.color_name}
              className="max-w-full max-h-[90vh] object-contain"
            />
            
            {selectedColor.image_urls.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-3 rounded-full shadow-xl transition"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-3 rounded-full shadow-xl transition"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {selectedImageIndex + 1} / {selectedColor.image_urls.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
