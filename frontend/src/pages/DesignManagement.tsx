import { useState, useEffect, useRef } from 'react';
import { api, Design } from '../lib/api';
import { Plus, Trash2, ImageIcon, Package, MessageCircle, CheckSquare, Square } from 'lucide-react';
import { AddDesignModal, ViewDesignModal } from '../components';

export function DesignManagement() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    try {
      setLoading(true);
      const data = await api.getDesigns();
      setDesigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await api.deleteDesign(id);
      await loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  };

  const handleViewDesign = (design: Design, colorIndex: number = 0) => {
    setSelectedDesign(design);
    setSelectedColorIndex(colorIndex);
    setShowViewModal(true);
  };

  const handleEditDesign = (design: Design) => {
    setEditingDesign(design);
    setShowAddModal(true);
  };

  const handleToggleActive = async (design: Design) => {
    try {
      await api.updateDesign(design.id, { is_active: !design.is_active });
      await loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update design status');
    }
  };

  const getMinPrice = (design: Design) => {
    if (!design.design_colors || design.design_colors.length === 0) return 0;
    return Math.min(...design.design_colors.map(c => c.price));
  };

  const toggleDesignSelection = (designId: string) => {
    setSelectedDesigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(designId)) {
        newSet.delete(designId);
      } else {
        newSet.add(designId);
      }
      return newSet;
    });
  };

  const selectAllDesigns = () => {
    const allIds = designs.map(d => d.id);
    setSelectedDesigns(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedDesigns(new Set());
  };

  const shareBulkOnWhatsApp = async () => {
    if (selectedDesigns.size === 0) return;
    
    try {
      const selectedDesignsData = designs.filter(d => selectedDesigns.has(d.id));
      
      let message = `*🛍️ Check out these ${selectedDesigns.size} beautiful designs from our collection!*\n\n`;
      
      selectedDesignsData.forEach((design, index) => {
        const minPrice = getMinPrice(design);
        const colorCount = design.design_colors?.length || 0;
        message += `${index + 1}. *${design.name}* (${design.design_no})\n`;
        message += `   💰 Starting from ₹${minPrice.toLocaleString()}\n`;
        message += `   🎨 ${colorCount} color variants\n`;
        if (design.description) {
          message += `   📝 ${design.description.substring(0, 100)}${design.description.length > 100 ? '...' : ''}\n`;
        }
        message += `\n`;
      });
      
      message += `📱 Contact us for orders and more details!\n`;
      message += `🔗 Browse our full catalogue for more amazing designs!`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sharing bulk designs:', error);
      alert('Failed to share designs. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading designs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Design Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage product designs and color variants</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBulkSelectionMode(!bulkSelectionMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              bulkSelectionMode 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {bulkSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {bulkSelectionMode ? 'Selection Mode' : 'Select Designs'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition duration-200 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add Design</span>
          </button>
        </div>
      </div>
      
      {/* Bulk Selection Controls */}
      {bulkSelectionMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedDesigns.size} of {designs.length} designs selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAllDesigns}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <span className="text-blue-300">|</span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
            <button
              onClick={shareBulkOnWhatsApp}
              disabled={selectedDesigns.size === 0}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-4 h-4" />
              Share Selected ({selectedDesigns.size})
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {designs.map((design) => (
          <DesignCard
            key={design.id}
            design={design}
            onView={(colorIndex) => handleViewDesign(design, colorIndex)}
            onEdit={() => handleEditDesign(design)}
            onDelete={() => handleDelete(design.id)}
            onToggleActive={() => handleToggleActive(design)}
            bulkSelectionMode={bulkSelectionMode}
            isSelected={selectedDesigns.has(design.id)}
            onToggleSelection={() => toggleDesignSelection(design.id)}
          />
        ))}
      </div>

      {designs.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <p className="text-gray-500 text-base sm:text-lg">No designs found. Create your first design!</p>
        </div>
      )}

      {showAddModal && (
        <AddDesignModal
          editingDesign={editingDesign}
          onClose={() => {
            setShowAddModal(false);
            setEditingDesign(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingDesign(null);
            loadDesigns();
          }}
        />
      )}

      {showViewModal && selectedDesign && (
        <ViewDesignModal
          design={selectedDesign}
          initialColorIndex={selectedColorIndex}
          onClose={() => {
            setShowViewModal(false);
            setSelectedDesign(null);
          }}
          onUpdate={() => {
            loadDesigns();
          }}
        />
      )}
    </div>
  );
}

interface DesignCardProps {
  design: Design;
  onView: (colorIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  bulkSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function DesignCard({ design, onView, onEdit, onDelete, onToggleActive, bulkSelectionMode = false, isSelected = false, onToggleSelection }: DesignCardProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const colorCount = design.design_colors?.length || 0;
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const imageUrls = selectedColor?.image_urls || [];
  const displayImage = imageUrls[currentImageIndex];

  // WhatsApp share function
  const shareOnWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Check if Web Share API is available and we have images
      if (navigator.share && imageUrls.length > 0) {
        // Try to load and share actual images
        const imagePromises = imageUrls.slice(0, 2).map(async (url) => {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], `design-${design.design_no}.jpg`, { type: 'image/jpeg' });
            return file;
          } catch (error) {
            console.warn('Failed to load image:', url);
            return null;
          }
        });
        
        const imageFiles = (await Promise.all(imagePromises)).filter(file => file !== null);
        
        if (imageFiles.length > 0) {
          // Use Web Share API with actual images
          await navigator.share({
            title: `${design.name} (${design.design_no})`,
            text: `${design.description || 'Beautiful design from our collection!'}\n\n🎨 Colors: ${colorCount} variants\n\nCheck out our catalogue for more designs!`,
            files: imageFiles
          });
          return;
        }
      }
      
      // Fallback to WhatsApp with image URLs
      let message = `*${design.name}* (${design.design_no})\n\n` +
        `${design.description || 'Beautiful design from our collection!'}\n\n` +
        `🎨 Colors: ${colorCount} variants\n\n`;
      
      if (imageUrls.length > 0) {
        const imageList = imageUrls.slice(0, 3).join('\n');
        message += `📸 Images:\n${imageList}\n\n`;
      }
      
      message += `Check out our catalogue for more designs!`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sharing:', error);
      // Final fallback to text-only WhatsApp
      const message = `*${design.name}* (${design.design_no})\n\n` +
        `${design.description || 'Beautiful design from our collection!'}\n\n` +
        `🎨 Colors: ${colorCount} variants\n\n` +
        `Check out our catalogue for more designs!`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Auto-play slideshow
  useEffect(() => {
    if (imageUrls.length > 1) {
      slideshowIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
      }, 3000); // Change image every 3 seconds

      return () => {
        if (slideshowIntervalRef.current) {
          clearInterval(slideshowIntervalRef.current);
        }
      };
    }
  }, [imageUrls.length]);

  // Reset image index when color changes
  const handleColorChange = (index: number) => {
    setSelectedColorIndex(index);
    setCurrentImageIndex(0);
  };

  // Calculate total stock from size quantities
  const getTotalStock = (color: any) => {
    let sizeQuantities = color.size_quantities;
    if (typeof sizeQuantities === 'string') {
      try {
        sizeQuantities = JSON.parse(sizeQuantities);
      } catch (e) {
        return 0;
      }
    }
    if (!sizeQuantities) return 0;
    return Object.values(sizeQuantities).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0);
  };

  const selectedColorStock = selectedColor ? getTotalStock(selectedColor) : 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-200 group relative ${
      design.is_active ? 'border-gray-200' : 'border-red-300 opacity-75'
    }`}>
      {/* Bulk Selection Checkbox */}
      {bulkSelectionMode && (
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection?.();
            }}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-primary border-primary'
                : 'bg-white border-gray-300 hover:border-primary'
            }`}
          >
            {isSelected && (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      )}
      
      {/* Image Section - E-commerce Standard with Slideshow */}
      <div 
        className="relative bg-gray-50 overflow-hidden aspect-[4/5] cursor-pointer group"
        onClick={() => onView(selectedColorIndex)}
      >
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt={design.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Slideshow Indicators */}
            {imageUrls.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                {imageUrls.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-4'
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Quick View Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={shareOnWhatsApp}
                  className="bg-green-500 text-white px-2 py-1.5 rounded-full text-xs font-semibold shadow-lg hover:bg-green-600 transition flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  Share
                </button>
                <button
                  onClick={() => onView(selectedColorIndex)}
                  className="bg-white text-primary px-2 py-1.5 rounded-full text-xs font-semibold shadow-lg hover:bg-primary hover:text-white transition"
                >
                  Quick View
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500 font-medium">{design.design_no}</span>
          </div>
        )}
        {!design.is_active && (
          <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium z-10">
            Inactive
          </div>
        )}
        {/* Category Badge */}
        {design.category && (
          <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-primary text-[10px] px-1.5 py-0.5 rounded font-semibold z-10">
            {design.category.name}
          </div>
        )}
      </div>

      {/* Content Section - Ultra Compact */}
      <div className="p-2">
        {/* Header */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between truncate">
            <h3 className="text-xs font-bold text-gray-900 truncate leading-tight flex-1">
              {design.name}
            </h3>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide ml-2">
              {design.design_no}
            </span>
          </div>
        </div>

        {/* Design Description */}
        {design.description && (
          <div className="mb-2">
            <p className="text-[10px] text-gray-600 line-clamp-2 leading-tight">
              {design.description}
            </p>
          </div>
        )}

        {/* Color Patches */}
        {colorCount > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {design.design_colors?.slice(0, 6).map((color, index) => (
                <button
                  key={color.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleColorChange(index);
                  }}
                  className={`relative group/color rounded-full transition-all duration-200 ${
                    selectedColorIndex === index
                      ? 'scale-110 shadow-lg'
                      : 'hover:scale-105'
                  }`}
                  title={color.color_name}
                >
                  <div
                    className="w-5 h-5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: color.color_code || '#cccccc' }}
                  />
                  {/* Selection Indicator */}
                  {selectedColorIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none z-10">
                    {color.color_name}
                  </div>
                </button>
              ))}
              {colorCount > 6 && (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-600 font-medium">
                  +{colorCount - 6}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Color Details */}
        {selectedColor && (
          <div className="mb-2 p-1.5 bg-gray-50 rounded border border-gray-200">
          
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">₹{selectedColor.price}</span>
              <span className={`text-[10px] font-medium flex items-center gap-0.5 ${
                selectedColorStock > 0 ? 'text-gray-600' : 'text-gray-400'
              }`}>
                <Package className="w-2.5 h-2.5" />
                {selectedColorStock}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons - Minimal */}
        <div className="space-y-1">
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="flex-1 py-1 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition text-[10px] font-medium"
            >
              Edit
            </button>
            <button
              onClick={onToggleActive}
              className={`flex-1 py-1 rounded text-[10px] font-medium transition ${
                design.is_active
                  ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                  : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
              }`}
            >
              {design.is_active ? 'Active' : 'Inactive'}
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
