import { useEffect, useState, useRef } from 'react';
import { Design, api } from '../lib/api';
import { X, Package, Video, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, AlertCircle, ChevronDown } from 'lucide-react';

interface ViewDesignModalProps {
  design: Design;
  onClose: () => void;
  initialColorIndex?: number;
}

export function ViewDesignModal({ design, onClose, initialColorIndex = 0 }: ViewDesignModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState(initialColorIndex);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [updatingStock, setUpdatingStock] = useState(false);
  const [stockError, setStockError] = useState('');
  const [updatingActive, setUpdatingActive] = useState(false);
  const [activeError, setActiveError] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const selectedColor = design.design_colors?.[selectedColorIndex];

  const [currentInStock, setCurrentInStock] = useState<boolean>(selectedColor?.in_stock ?? false);
  const [currentIsActive, setCurrentIsActive] = useState<boolean>(design.is_active);

  useEffect(() => {
    setCurrentInStock(selectedColor?.in_stock ?? false);
  }, [selectedColor?.id, selectedColor?.in_stock]);

  useEffect(() => {
    setCurrentIsActive(design.is_active);
  }, [design.id, design.is_active]);

  // Reset image index when color changes
  const handleColorChange = (index: number) => {
    setSelectedColorIndex(index);
    setSelectedImageIndex(0);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(1, prev - 0.5);
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(1, Math.min(3, prev + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle stock status
  const handleToggleStock = async () => {
    if (!selectedColor) return;
    
    setUpdatingStock(true);
    setStockError('');
    
    try {
      await api.updateDesignColor(selectedColor.id, {
        in_stock: !currentInStock
      });
      setCurrentInStock((prev) => !prev);
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Failed to update stock status');
    } finally {
      setUpdatingStock(false);
    }
  };

  const handleToggleActive = async () => {
    setUpdatingActive(true);
    setActiveError('');

    try {
      await api.updateDesign(design.id, {
        is_active: !currentIsActive
      });
      setCurrentIsActive((prev) => !prev);
    } catch (err) {
      setActiveError(err instanceof Error ? err.message : 'Failed to update active status');
    } finally {
      setUpdatingActive(false);
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-6xl my-auto h-full sm:max-h-[95vh] overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
          
          {/* Close Button - Absolute positioned */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition shadow-lg"
            title="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Content - Scrollable */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-8 pt-14 sm:pt-4">
            {design.design_colors && design.design_colors.length > 0 ? (
              <div>
              {selectedColor && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left: Media Gallery */}
                  <div className="space-y-2 sm:space-y-3">
                    {/* Main Image with Inline Zoom */}
                    <div className="relative bg-secondary rounded-xl border border-gray-200 group">
                      {selectedColor.image_urls && selectedColor.image_urls.length > 0 ? (
                        <>
                          {/* Zoom Controls */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white bg-opacity-90 p-1 rounded-lg shadow-lg z-10">
                            <button
                              onClick={handleZoomIn}
                              disabled={zoomLevel >= 3}
                              className="p-2 sm:p-3 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Zoom in"
                            >
                              <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                            </button>
                            <div className="text-[10px] sm:text-xs font-medium text-gray-700 text-center px-1">
                              {Math.round(zoomLevel * 100)}%
                            </div>
                            <button
                              onClick={handleZoomOut}
                              disabled={zoomLevel <= 1}
                              className="p-2 sm:p-3 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Zoom out"
                            >
                              <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                            </button>
                            {zoomLevel > 1 && (
                              <button
                                onClick={handleResetZoom}
                                className="p-2 sm:p-3 hover:bg-gray-100 rounded transition border-t border-gray-200"
                                title="Reset zoom"
                              >
                                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                              </button>
                            )}
                          </div>
                          
                          {/* Image Container */}
                          <div 
                            className="overflow-hidden rounded-xl touch-none"
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onContextMenu={(e) => e.preventDefault()}
                            style={{ 
                              cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                              touchAction: 'none',
                              userSelect: 'none'
                            }}
                          >
                            <img
                              src={selectedColor.image_urls[selectedImageIndex]}
                              alt={selectedColor.color_name}
                              className="w-full object-contain transition-transform duration-200 select-none"
                              style={{
                                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                                transformOrigin: 'center center'
                              }}
                              draggable={false}
                            />
                          </div>
                          
                          {zoomLevel > 1 && (
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded-full">
                              <span className="hidden sm:inline">Scroll to zoom • Drag to pan</span>
                              <span className="sm:hidden">Pinch to zoom • Drag to pan</span>
                            </div>
                          )}
                          
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
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">{design.name}</h2>
                      <p className="text-xs sm:text-sm text-gray-500 mb-3">Design #{design.design_no}</p>

                      {design.price && (
                        <div className="mb-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-gray-900" style={{ fontSize: '1.25rem' }}>₹{design.price.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">per piece</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">Exclusive of taxes</p>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleStock();
                            }}
                            disabled={updatingStock || !selectedColor}
                            role="switch"
                            aria-checked={currentInStock}
                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors border ${
                              currentInStock
                                ? 'bg-green-600 border-green-600'
                                : 'bg-gray-200 border-gray-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={currentInStock ? 'Mark as out of stock' : 'Mark as in stock'}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                currentInStock ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-semibold ${currentInStock ? 'text-green-700' : 'text-gray-600'}`}>
                            {updatingStock ? 'Updating…' : currentInStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleActive();
                            }}
                            disabled={updatingActive}
                            role="switch"
                            aria-checked={currentIsActive}
                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors border ${
                              currentIsActive
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-gray-200 border-gray-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={currentIsActive ? 'Mark as inactive' : 'Mark as active'}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                currentIsActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-semibold ${currentIsActive ? 'text-blue-700' : 'text-gray-600'}`}>
                            {updatingActive ? 'Updating…' : currentIsActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {(stockError || activeError) && (
                        <div className="mt-2 space-y-2">
                          {stockError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{stockError}</span>
                            </div>
                          )}
                          {activeError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{activeError}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedColor.image_urls && selectedColor.image_urls.length > 1 && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Product Images</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {selectedColor.image_urls.map((url, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all ${
                                selectedImageIndex === index
                                  ? 'ring-2 ring-primary shadow-md'
                                  : 'ring-1 ring-gray-200 hover:ring-gray-300'
                              }`}
                            >
                              <img src={url} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {design.design_colors && design.design_colors.length > 1 && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Available Colors ({design.design_colors.length})</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {design.design_colors.map((color, index) => {
                            let colorSizeQuantities = color.size_quantities;
                            if (typeof colorSizeQuantities === 'string') {
                              try {
                                colorSizeQuantities = JSON.parse(colorSizeQuantities);
                              } catch (e) {
                                colorSizeQuantities = undefined;
                              }
                            }
                            const colorTotalStock = colorSizeQuantities 
                              ? Object.values(colorSizeQuantities).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0)
                              : 0;

                            return (
                              <button
                                key={color.id}
                                onClick={() => handleColorChange(index)}
                                className={`p-2 rounded-lg transition-all text-left ${
                                  selectedColorIndex === index
                                    ? 'ring-2 ring-primary bg-primary/5'
                                    : 'ring-1 ring-gray-200 hover:ring-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {color.color_code && (
                                    <div
                                      className="w-4 h-4 rounded-full shadow-sm ring-1 ring-white flex-shrink-0"
                                      style={{ backgroundColor: color.color_code }}
                                    />
                                  )}
                                  <span className="text-xs font-semibold text-gray-900 truncate">{color.color_name}</span>
                                </div>
                                <span className={`text-xs font-medium ${colorTotalStock > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {colorTotalStock > 0 ? `${colorTotalStock} pcs` : 'On order'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {design.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          <span className="font-medium">Category:</span>
                          <span>{design.category.name}</span>
                        </span>
                      )}
                      {design.style && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          <span className="font-medium">Style:</span>
                          <span>{design.style.name}</span>
                        </span>
                      )}
                      {design.fabric_type && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                          <span className="font-medium">Fabric:</span>
                          <span>{design.fabric_type.name}</span>
                        </span>
                      )}
                      {selectedColor && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                          <span className="font-medium">Color:</span>
                          <span>{selectedColor.color_name}</span>
                        </span>
                      )}
                    </div>

                    {/* Collapsible Product Description */}
                    {design.description && (
                      <div className="border-t border-gray-100 pt-4">
                        <button
                          onClick={() => setShowDescription(!showDescription)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                        >
                          <span className="text-sm font-semibold text-gray-900">Product Details</span>
                          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${
                            showDescription ? 'rotate-180' : 'rotate-0'
                          }`} />
                        </button>
                        {showDescription && (
                          <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line p-3 bg-gray-50 rounded-lg">
                            {design.description}
                          </div>
                        )}
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
