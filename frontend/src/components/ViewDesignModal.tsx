import { useState } from 'react';
import { Design } from '../lib/api';
import { X, Package, Tag, Info, Video, Image as ImageIcon } from 'lucide-react';

interface ViewDesignModalProps {
  design: Design;
  onClose: () => void;
  onUpdate: () => void;
  initialColorIndex?: number;
}

export function ViewDesignModal({ design, onClose, initialColorIndex = 0 }: ViewDesignModalProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(initialColorIndex);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 truncate">{design.name}</h2>
              <span className="text-xs text-gray-500">({design.design_no})</span>
              {!design.is_active && (
                <span className="px-1 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-1 mt-0.5">
              {design.category && (
                <span className="px-1 py-0.5 bg-primary bg-opacity-10 text-primary text-[10px] font-medium rounded">
                  {design.category.name}
                </span>
              )}
              {design.style && (
                <span className="px-1 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded">
                  {design.style.name}
                </span>
              )}
              {design.fabric_type && (
                <span className="px-1 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded">
                  {design.fabric_type.name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - No Scroll */}
        <div className="p-4">
          {design.design_colors && design.design_colors.length > 0 ? (
            <div>
              {/* Color Selector - Compact */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[10px] font-semibold text-gray-700 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-primary" />
                    Colors ({design.design_colors.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {design.design_colors.map((color, index) => (
                    <button
                      key={color.id}
                      onClick={() => handleColorChange(index)}
                      className={`px-1.5 py-0.5 rounded border transition-all ${
                        selectedColorIndex === index
                          ? 'border-primary bg-primary bg-opacity-5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: color.color_code || '#cccccc' }}
                        />
                        <span className={`text-[10px] font-medium ${
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
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
                  {/* Left: Media - 2 columns */}
                  <div className="lg:col-span-2 space-y-1.5">
                    {/* Main Image - Compact */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      {selectedColor.image_urls && selectedColor.image_urls.length > 0 ? (
                        <div className="aspect-[2/3] bg-white flex items-center justify-center p-2">
                          <img
                            src={selectedColor.image_urls[selectedImageIndex]}
                            alt={selectedColor.color_name}
                            className="max-w-full max-h-full object-contain cursor-pointer"
                            onClick={() => window.open(selectedColor.image_urls[selectedImageIndex], '_blank')}
                          />
                        </div>
                      ) : (
                        <div className="aspect-[2/3] flex flex-col items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300 mb-0.5" />
                          <p className="text-gray-400 text-[10px]">No image</p>
                        </div>
                      )}
                    </div>

                    {/* Thumbnails - Compact */}
                    {selectedColor.image_urls && selectedColor.image_urls.length > 1 && (
                      <div className="flex gap-0.5 overflow-x-auto">
                        {selectedColor.image_urls.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`flex-shrink-0 w-10 h-10 rounded border-2 overflow-hidden transition ${
                              selectedImageIndex === index
                                ? 'border-primary'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img src={url} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Video - Compact */}
                    {selectedColor.video_urls && selectedColor.video_urls.length > 0 && (
                      <div className="bg-purple-50 rounded-lg border border-purple-200 p-1.5">
                        <div className="flex items-center gap-0.5 mb-0.5">
                          <Video className="w-2.5 h-2.5 text-purple-600" />
                          <span className="text-[10px] font-semibold text-purple-700">Video</span>
                        </div>
                        <video
                          src={selectedColor.video_urls[0]}
                          controls
                          className="w-full rounded"
                          style={{ maxHeight: '120px' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: Details - 3 columns */}
                  <div className="lg:col-span-3 space-y-1.5">
                    {/* Price & Stock - Ultra Compact */}
                    <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] opacity-90">Price</p>
                          <p className="text-lg font-bold">₹{selectedColor.price.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold mb-0.5 ${
                            selectedColor.in_stock ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'
                          }`}>
                            {selectedColor.in_stock ? 'In Stock' : 'Out'}
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px] opacity-90 justify-end">
                            <Package className="w-2.5 h-2.5" />
                            <span><strong>{getTotalStock()}</strong> units</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Info & Quick Stats - Compact */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white rounded-lg border border-gray-200 p-1.5">
                        <div className="flex items-center gap-1">
                          {selectedColor.color_code && (
                            <div
                              className="w-3 h-3 rounded border border-gray-300"
                              style={{ backgroundColor: selectedColor.color_code }}
                            />
                          )}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-900">{selectedColor.color_name}</p>
                            {selectedColor.color_code && (
                              <p className="text-[9px] font-mono text-gray-500">{selectedColor.color_code}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-1.5">
                        <p className="text-[10px] text-gray-600 mb-0.5">Available Sizes</p>
                        <div className="flex flex-wrap gap-0.5">
                          {design.available_sizes.map((size) => {
                            const quantity = parsedSizeQuantities?.[size as keyof typeof parsedSizeQuantities] || 0;
                            return (
                              <span
                                key={size}
                                className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                                  quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {size}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Size Stock - Compact Grid */}
                    {parsedSizeQuantities && design.available_sizes.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-[10px] font-semibold text-gray-700 flex items-center gap-0.5">
                            <Package className="w-2.5 h-2.5 text-primary" />
                            Size-wise Stock
                          </h4>
                          <span className="text-[10px] text-gray-500">Total: {getTotalStock()}</span>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                          {design.available_sizes.map((size) => {
                            const quantity = parsedSizeQuantities?.[size as keyof typeof parsedSizeQuantities] || 0;
                            return (
                              <div
                                key={size}
                                className={`p-1.5 rounded border text-center transition-all hover:shadow-sm ${
                                  quantity > 0 
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="text-[10px] font-bold text-gray-700">{size}</div>
                                <div className={`text-xs font-bold ${
                                  quantity > 0 ? 'text-green-700' : 'text-gray-400'
                                }`}>
                                  {quantity}
                                </div>
                              </div>
                            );
                          })}
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

        {/* Footer - Compact */}
        <div className="flex justify-end px-4 py-2.5 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
