import { useState, useEffect, useRef } from 'react';
import { api, Design, DesignCategory, FabricType, SizeSet, UserProfile } from '../lib/api';
import { Eye, Package, Heart, ShoppingCart, ImageIcon, Filter, X, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2, ToggleLeft, ToggleRight, Download, MessageCircle, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FilterState {
  categories: string[];
  priceRange: { min: number; max: number };
  colors: string[];
  designNo: string;
  stockStatus: 'all' | 'in_stock' | 'out_of_stock';
  sortBy: 'name' | 'price_low' | 'price_high' | 'newest';
}

export function Catalogue() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFabricType, setSelectedFabricType] = useState<string>('');
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: { min: 0, max: 100000 },
    colors: [],
    designNo: '',
    stockStatus: 'all',
    sortBy: 'newest'
  });
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);

  useEffect(() => {
    loadCategories();
    loadFabricTypes();
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [selectedCategory, selectedFabricType]);

  useEffect(() => {
    applyFilters();
  }, [designs, filters]);

  useEffect(() => {
    // Extract unique colors from all designs
    const colors = new Set<string>();
    designs.forEach(design => {
      design.design_colors?.forEach(color => {
        if (color.color_name) colors.add(color.color_name);
      });
    });
    setAvailableColors(Array.from(colors).sort());
  }, [designs]);

  const loadCategories = async () => {
    try {
      const data = await api.getDesignCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  };

  const loadFabricTypes = async () => {
    try {
      const data = await api.getFabricTypes();
      setFabricTypes(data);
    } catch (err) {
      console.error('Failed to load fabric types:', err);
    }
  };

  const loadDesigns = async () => {
    try {
      setLoading(true);
      const data = await api.getDesigns(
        selectedCategory || undefined,
        selectedFabricType || undefined,
        true // Only fetch active designs for catalogue
      );
      setDesigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const getTotalStock = (design: Design) => {
    let total = 0;
    design.design_colors?.forEach(color => {
      let sizeQuantities = color.size_quantities;
      if (typeof sizeQuantities === 'string') {
        try {
          sizeQuantities = JSON.parse(sizeQuantities);
        } catch (e) {
          return;
        }
      }
      if (sizeQuantities) {
        total += Object.values(sizeQuantities).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0);
      }
    });
    return total;
  };

  const getMinPrice = (design: Design) => {
    if (!design.design_colors || design.design_colors.length === 0) return 0;
    return Math.min(...design.design_colors.map(c => c.price));
  };

  const applyFilters = () => {
    let filtered = [...designs];

    // Filter by categories
    if (filters.categories.length > 0) {
      filtered = filtered.filter(d => 
        d.category && filters.categories.includes(d.category.id)
      );
    }

    // Filter by price range
    filtered = filtered.filter(d => {
      const minPrice = getMinPrice(d);
      return minPrice >= filters.priceRange.min && minPrice <= filters.priceRange.max;
    });

    // Filter by colors
    if (filters.colors.length > 0) {
      filtered = filtered.filter(d => 
        d.design_colors?.some(c => filters.colors.includes(c.color_name))
      );
    }

    // Filter by design number
    if (filters.designNo.trim()) {
      filtered = filtered.filter(d => 
        d.design_no.toLowerCase().includes(filters.designNo.toLowerCase())
      );
    }

    // Filter by stock status
    if (filters.stockStatus !== 'all') {
      filtered = filtered.filter(d => {
        const stock = getTotalStock(d);
        return filters.stockStatus === 'in_stock' ? stock > 0 : stock === 0;
      });
    }

    // Sort
    switch (filters.sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_low':
        filtered.sort((a, b) => getMinPrice(a) - getMinPrice(b));
        break;
      case 'price_high':
        filtered.sort((a, b) => getMinPrice(b) - getMinPrice(a));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredDesigns(filtered);
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const toggleColorFilter = (color: string) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: { min: 0, max: 100000 },
      colors: [],
      designNo: '',
      stockStatus: 'all',
      sortBy: 'newest'
    });
  };

  const activeFilterCount = 
    filters.categories.length + 
    filters.colors.length + 
    (filters.designNo ? 1 : 0) + 
    (filters.stockStatus !== 'all' ? 1 : 0) +
    (filters.priceRange.min > 0 || filters.priceRange.max < 100000 ? 1 : 0);

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
    const allIds = filteredDesigns.map(d => d.id);
    setSelectedDesigns(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedDesigns(new Set());
  };

  const shareBulkOnWhatsApp = async () => {
    if (selectedDesigns.size === 0) return;
    
    try {
      const selectedDesignsData = filteredDesigns.filter(d => selectedDesigns.has(d.id));
      
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

  const generatePDF = async () => {
    try {
      setGeneratingPDF(true);
      
      // Create a new PDF document
      const doc = new jsPDF();
      let currentPage = 1;
      
      // Add title page
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Indie Craft Collection - Catalogue', 105, 40, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 55, { align: 'center' });
      doc.text(`Total Designs: ${filteredDesigns.length}`, 105, 65, { align: 'center' });
      
      // Add a new page for first design
      doc.addPage();
      currentPage++;
      
      // Process each design
      for (let designIndex = 0; designIndex < filteredDesigns.length; designIndex++) {
        const design = filteredDesigns[designIndex];
        
        // Skip if no colors
        if (!design.design_colors || design.design_colors.length === 0) {
          continue;
        }
        
        // Process each color of the design
        for (let colorIndex = 0; colorIndex < design.design_colors.length; colorIndex++) {
          const color = design.design_colors[colorIndex];
          
          // Add new page for each color (except first color of first design)
          if (designIndex > 0 || colorIndex > 0) {
            doc.addPage();
            currentPage++;
          }
          
          // Compact professional catalogue layout
          // Header section with design info
          doc.setFontSize(22);
          doc.setFont('helvetica', 'bold');
          doc.text(design.name, 105, 20, { align: 'center' });
          
          // Design number in top right
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`Design No: ${design.design_no}`, 190, 15, { align: 'right' });
          
          // Add elegant divider
          doc.setDrawColor(150, 150, 150);
          doc.setLineWidth(1);
          doc.line(30, 30, 180, 30);
          
          // Compact product info section
          let yPos = 40;
          
          // Color name and price in same line
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(`Color: ${color.color_name}`, 25, yPos);
          doc.text(`₹${color.price.toLocaleString()}`, 175, yPos, { align: 'right' });
          
          yPos += 12;
          
          // Product details in single line
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const detailsLine = `${design.category?.name || 'N/A'} | ${design.style?.name || 'N/A'} | ${design.fabric_type?.name || 'N/A'}`;
          doc.text(detailsLine, 25, yPos);
          
          yPos += 15;
          
          // Description in a highlighted box
          if (design.description) {
            // Draw subtle background for description
            doc.setFillColor(250, 250, 250);
            doc.setDrawColor(220, 220, 220);
            doc.rect(25, yPos, 160, 40, 'FD');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            doc.text('Description:', 30, yPos + 8);
            
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(design.description, 150);
            doc.text(lines, 30, yPos + 18);
            
            yPos += 50;
            doc.setTextColor(0, 0, 0);
          } else {
            yPos += 20;
          }
          
          // Images - Load and add actual images
          if (color.image_urls && color.image_urls.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Product Images:', 20, yPos);
            yPos += 15;
            
            // Load images and add them to PDF
            const maxImagesPerPage = 4;
            const imageSize = 80; // Increased from 60 to 80
            const spacing = 20; // Increased spacing for larger images
            const cols = 2;
            
            for (let imgIndex = 0; imgIndex < Math.min(color.image_urls.length, maxImagesPerPage); imgIndex++) {
              const row = Math.floor(imgIndex / cols);
              const col = imgIndex % cols;
              const x = 20 + col * (imageSize + spacing);
              const y = yPos + row * (imageSize + spacing);
              
              try {
                // Load image from URL
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  img.src = color.image_urls[imgIndex];
                });
                
                // Add image to PDF
                if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  ctx?.drawImage(img, 0, 0);
                  
                  const imgData = canvas.toDataURL('image/jpeg', 0.8);
                  doc.addImage(imgData, 'JPEG', x, y, imageSize, imageSize);
                } else {
                  // Fallback to placeholder
                  doc.setDrawColor(200, 200, 200);
                  doc.rect(x, y, imageSize, imageSize, 'D');
                  doc.setFontSize(8);
                  doc.text(`Image ${imgIndex + 1}`, x + 2, y + imageSize - 5);
                }
              } catch (error) {
                console.warn('Failed to load image:', color.image_urls[imgIndex], error);
                // Fallback to placeholder
                doc.setDrawColor(200, 200, 200);
                doc.rect(x, y, imageSize, imageSize, 'D');
                doc.setFontSize(8);
                doc.text(`Image ${imgIndex + 1}`, x + 2, y + imageSize - 5);
              }
            }
            
            // If more images than can fit, add note
            if (color.image_urls.length > maxImagesPerPage) {
              doc.setFontSize(10);
              doc.text(`... and ${color.image_urls.length - maxImagesPerPage} more images`, 20, yPos + 140);
            }
          }
          
          // Add footer
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text(`Page ${currentPage} - ${design.name} (${color.color_name})`, 105, 280, { align: 'center' });
        }
      }
      
      // Save PDF
      doc.save(`catalogue_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">Indie Craft Collection</h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">Discover our premium collection of ethnic wear</p>
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
              onClick={generatePDF}
              disabled={generatingPDF || filteredDesigns.length === 0}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {generatingPDF ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
        
        {/* Bulk Selection Controls */}
        {bulkSelectionMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedDesigns.size} of {filteredDesigns.length} designs selected
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
      </div>

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-primary transition"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className={`lg:block lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden'}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary-dark font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Sort By */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>

              {/* Categories */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category.id)}
                        onChange={() => toggleCategoryFilter(category.id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Min Price</label>
                    <input
                      type="number"
                      value={filters.priceRange.min}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, min: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="₹0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Max Price</label>
                    <input
                      type="number"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, max: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="₹100000"
                    />
                  </div>
                </div>
              </div>

              {/* Colors */}
              {availableColors.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Colors</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableColors.map((color) => (
                      <label key={color} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.colors.includes(color)}
                          onChange={() => toggleColorFilter(color)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">{color}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Fabric Type */}
              {fabricTypes.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Fabric Type</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {fabricTypes.map((fabricType) => (
                      <label key={fabricType.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={selectedFabricType === fabricType.id}
                          onChange={() => setSelectedFabricType(fabricType.id)}
                          className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">{fabricType.name}</span>
                      </label>
                    ))}
                    {selectedFabricType && (
                      <button
                        onClick={() => setSelectedFabricType('')}
                        className="text-xs text-primary hover:text-primary-dark mt-2"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Design Number Search */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Design Number</h3>
                <input
                  type="text"
                  value={filters.designNo}
                  onChange={(e) => setFilters({ ...filters, designNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Search by design no..."
                />
              </div>

              {/* Stock Status */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Stock Status</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filters.stockStatus === 'all'}
                      onChange={() => setFilters({ ...filters, stockStatus: 'all' })}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">All Items</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filters.stockStatus === 'in_stock'}
                      onChange={() => setFilters({ ...filters, stockStatus: 'in_stock' })}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">In Stock</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filters.stockStatus === 'out_of_stock'}
                      onChange={() => setFilters({ ...filters, stockStatus: 'out_of_stock' })}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Out of Stock</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Quick Category Filters */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-full font-medium transition ${
                selectedCategory === ''
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
              }`}
            >
              All Designs
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-full font-medium transition ${
                  selectedCategory === category.id
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredDesigns.length} of {designs.length} designs
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading designs...</div>
            </div>
          ) : filteredDesigns.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-gray-500 text-base sm:text-lg">No designs found matching your filters</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary hover:text-primary-dark font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredDesigns.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onQuickView={() => setSelectedDesign(design)}
                  bulkSelectionMode={bulkSelectionMode}
                  isSelected={selectedDesigns.has(design.id)}
                  onToggleSelection={() => toggleDesignSelection(design.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedDesign && (
        <DesignQuickView
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}
    </div>
  );
}

interface DesignCardProps {
  design: Design;
  onQuickView: () => void;
  bulkSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function DesignCard({ design, onQuickView, bulkSelectionMode = false, isSelected = false, onToggleSelection }: DesignCardProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const colorCount = design.design_colors?.length || 0;
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const selectedColorImages = selectedColor?.image_urls || [];
  const firstImage = selectedColorImages[currentImageIndex] || selectedColorImages[0];

  // WhatsApp share function
  const shareOnWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Check if Web Share API is available and we have images
      if (navigator.share && selectedColorImages.length > 0) {
        // Try to load and share actual images
        const imagePromises = selectedColorImages.slice(0, 2).map(async (url) => {
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
      
      if (selectedColorImages.length > 0) {
        const imageList = selectedColorImages.slice(0, 3).join('\n');
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
    if (selectedColorImages.length > 1) {
      slideshowIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % selectedColorImages.length);
      }, 3000); // Change image every 3 seconds

      return () => {
        if (slideshowIntervalRef.current) {
          clearInterval(slideshowIntervalRef.current);
        }
      };
    }
  }, [selectedColorImages.length]);

  // Reset image index when color changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedColorIndex]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition duration-300 group cursor-pointer relative">
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
      
      <div
        className="relative aspect-w-3 aspect-h-4 bg-secondary overflow-hidden"
        onClick={onQuickView}
      >
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

        {/* Slideshow Indicators */}
        {selectedColorImages.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
            {selectedColorImages.map((_, index) => (
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

        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition duration-300 flex items-center justify-center">
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition duration-300">
            <button
              onClick={shareOnWhatsApp}
              className="bg-green-500 text-white px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-full font-semibold flex items-center space-x-2 shadow-lg hover:bg-green-600 transition"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={onQuickView}
              className="bg-white text-primary px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-full font-semibold flex items-center space-x-2 shadow-lg hover:bg-primary hover:text-white transition"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Quick View</span>
              <span className="sm:hidden">View</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-5" onClick={onQuickView}>
        <div className="mb-2 sm:mb-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1 line-clamp-1">{design.name}</h3>
          {design.description && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{design.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
              ₹{selectedColor?.price.toLocaleString() || '0'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          {/* Color Swatches */}
          {colorCount > 0 && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {design.design_colors?.slice(0, 6).map((color, index) => (
                  <button
                    key={color.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColorIndex(index);
                    }}
                    className={`relative group/color ${
                      index === selectedColorIndex
                        ? 'scale-110 shadow-lg'
                        : 'hover:scale-105'
                    } rounded-full transition-all duration-200`}
                    title={color.color_name}
                  >
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: color.color_code || '#cccccc' }}
                    />
                    {/* Selection Indicator */}
                    {index === selectedColorIndex && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-sm" />
                      </div>
                    )}
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none z-10">
                      {color.color_name}
                    </div>
                  </button>
                ))}
                {colorCount > 6 && (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] sm:text-[10px] text-gray-600 font-medium">
                    +{colorCount - 6}
                  </div>
                )}
              </div>
            </div>
          )}

         
        </div>
      </div>
    </div>
  );
}

interface DesignQuickViewProps {
  design: Design;
  onClose: () => void;
}

function DesignQuickView({ design, onClose }: DesignQuickViewProps) {
  const { isAdmin } = useAuth();
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [setQuantities, setSetQuantities] = useState<Record<string, number>>({});
  const [sizeSets, setSizeSets] = useState<SizeSet[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [message, setMessage] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'individual' | 'sets'>('individual'); // Admin toggle state
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const selectedImage = selectedColor?.image_urls?.[selectedImageIndex];

  // Load user profile and size sets
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const profile = await api.getProfile();
        setUserProfile(profile);
        
        console.log('User profile loaded:', profile);
        
        // Load size sets if user is a retailer or admin
        if (profile.role === 'retailer' || profile.role === 'admin') {
          console.log('Loading size sets for retailer/admin...');
          const sets = await api.getSizeSets();
          console.log('Size sets loaded:', sets);
          setSizeSets(sets);
        } else {
          console.log('User is not a retailer/admin, role:', profile.role);
        }
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    };
    loadUserData();
  }, []);

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

  // Get stock for a size
  const getStockForSize = (size: string) => {
    if (!parsedSizeQuantities) return 0;
    return parsedSizeQuantities[size as keyof typeof parsedSizeQuantities] || 0;
  };

  // If available_sizes is empty but we have size_quantities, extract sizes from there
  const effectiveAvailableSizes = design.available_sizes && design.available_sizes.length > 0
    ? design.available_sizes
    : parsedSizeQuantities 
    ? Object.keys(parsedSizeQuantities).filter(size => parsedSizeQuantities[size as keyof typeof parsedSizeQuantities] !== undefined)
    : [];

  // Reset quantities when color changes
  useEffect(() => {
    setSizeQuantities({});
    setSetQuantities({});
  }, [selectedColorIndex]);

  // Reset zoom and pan when image changes
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [selectedImageIndex, selectedColorIndex]);

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(1, Math.min(3, prev + delta)));
  };

  // Handle mouse drag for panning
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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(1, prev - 0.25);
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

  // Update quantity for a specific size (guest users)
  const updateSizeQuantity = (size: string, quantity: number) => {
    // Allow any positive quantity - no stock restrictions
    const validQuantity = Math.max(0, quantity);
    
    setSizeQuantities(prev => {
      if (validQuantity === 0) {
        const { [size]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [size]: validQuantity };
    });
  };

  // Update quantity for a size set (retailer users)
  const updateSetQuantity = (setId: string, quantity: number) => {
    const validQuantity = Math.max(0, quantity);
    
    setSetQuantities(prev => {
      if (validQuantity === 0) {
        const { [setId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [setId]: validQuantity };
    });
  };

  // Calculate total items to add
  const isRetailer = userProfile?.role === 'retailer';
  const useSetMode = (isAdmin && viewMode === 'sets') || (isRetailer && !isAdmin);
  const totalItemsToAdd = useSetMode
    ? Object.values(setQuantities).reduce((sum, qty) => sum + qty, 0)
    : Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0);

  // Debug logging
  console.log('Quick View Debug:', {
    designName: design.name,
    userProfile: userProfile,
    isRetailer: isRetailer,
    sizeSets: sizeSets,
    sizeSetCount: sizeSets.length,
    originalAvailableSizes: design.available_sizes,
    effectiveAvailableSizes: effectiveAvailableSizes,
    effectiveAvailableSizesLength: effectiveAvailableSizes?.length,
    sizeQuantities,
    setQuantities,
    totalItemsToAdd,
    selectedColor: selectedColor?.color_name,
    parsedSizeQuantities
  });

  const handleAddToCart = async () => {
    if (!selectedColor || totalItemsToAdd === 0) return;

    try {
      setAddingToCart(true);
      
      if (useSetMode) {
        // Set mode: Add each size set with quantity to cart
        for (const [setId, quantity] of Object.entries(setQuantities)) {
          if (quantity > 0) {
            await api.addToCart({
              design_id: design.id,
              color_id: selectedColor.id,
              size_set_id: setId,
              quantity: quantity,
            });
          }
        }
        setMessage(`Added ${totalItemsToAdd} set(s) to cart!`);
        setSetQuantities({}); // Reset after successful add
      } else {
        // Individual mode: Add each size with quantity to cart
        for (const [size, quantity] of Object.entries(sizeQuantities)) {
          if (quantity > 0) {
            await api.addToCart({
              design_id: design.id,
              color_id: selectedColor.id,
              size: size,
              quantity: quantity,
            });
          }
        }
        setMessage(`Added ${totalItemsToAdd} item(s) to cart!`);
        setSizeQuantities({}); // Reset after successful add
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to add to cart');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = async () => {
    try {
      setAddingToWishlist(true);
      await api.addToWishlist(design.id);
      setMessage('Added to wishlist!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to add to wishlist');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setAddingToWishlist(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary truncate">{design.name}</h2>
              <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-1 sm:mt-2">
                <p className="text-xs sm:text-sm text-gray-600">Design No: {design.design_no}</p>
                {design.category && (
                  <span className="text-xs font-medium px-2 sm:px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full">
                    {design.category.name}
                  </span>
                )}
                {design.fabric_type && (
                  <span className="text-xs font-medium px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {design.fabric_type.name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition text-2xl sm:text-3xl leading-none ml-2 flex-shrink-0"
            >
              ×
            </button>
          </div>
          {message && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
              message.includes('Failed') || message.includes('Error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Images and Color Variants */}
            <div className="space-y-4">
              {/* Main Image with Inline Zoom */}
              {selectedImage ? (
                <div className="relative bg-secondary rounded-xl border border-gray-200">
                  {/* Zoom Controls */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white bg-opacity-90 p-1 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                      className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom in (or use mouse wheel)"
                    >
                      <ZoomIn className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="text-[10px] font-medium text-gray-700 text-center px-1">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 1}
                      className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4 text-gray-700" />
                    </button>
                    {zoomLevel > 1 && (
                      <button
                        onClick={handleResetZoom}
                        className="p-2 hover:bg-gray-100 rounded transition border-t border-gray-200"
                        title="Reset zoom"
                      >
                        <Maximize2 className="w-4 h-4 text-gray-700" />
                      </button>
                    )}
                  </div>
                  
                  {/* Image Container */}
                  <div 
                    className="h-[350px] sm:h-[450px] overflow-hidden rounded-xl"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                  >
                    <img
                      src={selectedImage}
                      alt={selectedColor?.color_name}
                      className="w-full h-full object-cover transition-transform duration-200 select-none"
                      style={{
                        transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                    />
                  </div>
                  
                  {zoomLevel > 1 && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded-full">
                      Scroll to zoom • Drag to pan
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-w-3 aspect-h-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex flex-col items-center justify-center h-[350px] sm:h-[450px] border border-gray-200">
                  <ImageIcon className="w-20 h-20 sm:w-24 sm:h-24 text-gray-400 mb-4" />
                  <span className="text-base sm:text-lg text-gray-500 font-medium">{design.design_no}</span>
                </div>
              )}

              {/* Image Thumbnails */}
              {selectedColor && selectedColor.image_urls.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {selectedColor.image_urls.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                        selectedImageIndex === idx
                          ? 'border-primary ring-2 ring-primary ring-opacity-30'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Color Variants */}
              {design.design_colors && design.design_colors.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Colors</h3>
                  <div className="grid grid-cols-2 gap-2">
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
                          onClick={() => {
                            setSelectedColorIndex(index);
                            setSelectedImageIndex(0);
                          }}
                          className={`p-3 rounded-lg border-2 transition text-left ${
                            selectedColorIndex === index
                              ? 'border-primary bg-primary bg-opacity-5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {color.color_code && (
                              <div
                                className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-300"
                                style={{ backgroundColor: color.color_code }}
                              />
                            )}
                            <span className="text-sm font-semibold text-gray-900 truncate">{color.color_name}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className={colorTotalStock > 0 ? 'text-green-600' : 'text-red-600'}>
                              {colorTotalStock > 0 ? `${colorTotalStock} in stock` : 'Out of stock'}
                            </span>
                            <span className="font-bold text-primary">₹{color.price.toLocaleString()}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Product Details */}
            <div>
              {/* Price */}
              {selectedColor && (
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">₹{selectedColor.price.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">per piece</span>
                  </div>
                </div>
              )}

              {/* Description */}
              {design.description && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{design.description}</p>
                </div>
              )}

              {/* Size Selection */}
              {/* Admin Toggle for View Mode */}
              {isAdmin && sizeSets.length > 0 && effectiveAvailableSizes && effectiveAvailableSizes.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">View Mode:</span>
                    <button
                      onClick={() => {
                        setViewMode(viewMode === 'individual' ? 'sets' : 'individual');
                        // Reset quantities when switching modes
                        setSizeQuantities({});
                        setSetQuantities({});
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                        viewMode === 'sets'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary'
                      }`}
                    >
                      {viewMode === 'sets' ? (
                        <>
                          <ToggleRight className="w-5 h-5" />
                          <span>Sets Mode</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5" />
                          <span>Individual Sizes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {(isAdmin && viewMode === 'sets') || (isRetailer && !isAdmin) ? (
                /* Retailer: Size Set Selection */
                sizeSets.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">Select Size Sets</h3>
                      </div>
                      {totalItemsToAdd > 0 && (
                        <span className="text-xs sm:text-sm font-medium text-primary bg-primary bg-opacity-10 px-2 py-1 rounded">
                          {totalItemsToAdd} set(s) selected
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {sizeSets.map((sizeSet) => {
                        const currentQty = setQuantities[sizeSet.id] || 0;
                        
                        return (
                          <div
                            key={sizeSet.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                              currentQty > 0
                                ? 'border-primary bg-primary bg-opacity-5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm sm:text-base font-semibold text-gray-900">{sizeSet.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({sizeSet.sizes.join(', ')})
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateSetQuantity(sizeSet.id, currentQty - 1)}
                                disabled={currentQty === 0}
                                className="w-8 h-8 rounded-lg bg-secondary hover:bg-gray-300 transition disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg"
                              >
                                −
                              </button>
                              <span className="text-base font-semibold w-8 text-center">{currentQty}</span>
                              <button
                                onClick={() => updateSetQuantity(sizeSet.id, currentQty + 1)}
                                className="w-8 h-8 rounded-lg bg-secondary hover:bg-gray-300 transition flex items-center justify-center font-bold text-lg"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                /* Guest: Per-Size Selection */
                effectiveAvailableSizes && effectiveAvailableSizes.length > 0 ? (
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">Select Size & Quantity</h3>
                      </div>
                      {totalItemsToAdd > 0 && (
                        <span className="text-xs sm:text-sm font-medium text-primary bg-primary bg-opacity-10 px-2 py-1 rounded">
                          {totalItemsToAdd} item(s) selected
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {effectiveAvailableSizes.map((size) => {
                        const stockForSize = getStockForSize(size);
                        const currentQty = sizeQuantities[size] || 0;
                        
                        return (
                          <div
                            key={size}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                              currentQty > 0
                                ? 'border-primary bg-primary bg-opacity-5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm sm:text-base font-semibold text-gray-900">{size}</span>
                                  <span className={`text-xs ${stockForSize > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {stockForSize > 0 ? `${stockForSize} in stock` : 'Available on order'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateSizeQuantity(size, currentQty - 1)}
                                disabled={currentQty === 0}
                                className="w-8 h-8 rounded-lg bg-secondary hover:bg-gray-300 transition disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg"
                              >
                                −
                              </button>
                              <span className="text-base font-semibold w-8 text-center">{currentQty}</span>
                              <button
                                onClick={() => updateSizeQuantity(size, currentQty + 1)}
                                className="w-8 h-8 rounded-lg bg-secondary hover:bg-gray-300 transition flex items-center justify-center font-bold text-lg"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 sm:mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No sizes available for this design. Please contact support or check back later.
                    </p>
                  </div>
                )
              )}

              {selectedColor && (
                <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart || totalItemsToAdd === 0}
                    className="w-full bg-primary text-white py-3 sm:py-4 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>
                      {addingToCart 
                        ? 'Adding...' 
                        : totalItemsToAdd === 0 
                        ? 'Select Size & Quantity' 
                        : `Add ${totalItemsToAdd} Item(s) to Cart`}
                    </span>
                  </button>
                  <button
                    onClick={handleAddToWishlist}
                    disabled={addingToWishlist}
                    className="w-full bg-white border-2 border-primary text-primary py-3 sm:py-4 text-sm sm:text-base rounded-lg font-semibold hover:bg-primary hover:text-white transition flex items-center justify-center space-x-2"
                  >
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{addingToWishlist ? 'Adding...' : 'Add to Wishlist'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
