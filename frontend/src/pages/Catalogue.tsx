import { useState, useEffect, useRef } from 'react';
import { api, Design, DesignCategory, FabricType, SizeSet, UserProfile } from '../lib/api';
import { Eye, Package, Heart, ShoppingCart, ImageIcon, Filter, X, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2, ToggleLeft, ToggleRight, MessageCircle, CheckSquare, Square, Phone, MessageSquare, Sparkles, TrendingUp, Award, Zap, Truck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getWhatsAppUrl, useBranding } from '../hooks/useBranding';

export type DesignTag = 'new-arrival' | 'trending' | 'best-seller' | 'fast-repeat' | 'ready-to-ship' | 'low-stock';

interface FilterState {
  categories: string[];
  priceRange: { min: number; max: number };
  colors: string[];
  designNo: string;
  sortBy: 'name' | 'price_low' | 'price_high' | 'newest';
  tags: DesignTag[];
}

// Utility function to calculate design tags
function getDesignTags(design: Design): DesignTag[] {
  const tags: DesignTag[] = [];
  const now = new Date();
  const createdDate = new Date(design.created_at);
  const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  // New Arrival: Created within last 30 days
  if (daysSinceCreated <= 30) {
    tags.push('new-arrival');
  }

  // Best Seller: High order count (>= 20 orders)
  if (design.order_count && design.order_count >= 20) {
    tags.push('best-seller');
  }

  // Trending: Recent orders and good order count (>= 10 orders in last 60 days)
  if (design.order_count && design.order_count >= 10 && design.last_ordered_at) {
    const lastOrderDate = new Date(design.last_ordered_at);
    const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastOrder <= 60) {
      tags.push('trending');
    }
  }

  // Fast Repeat: Frequently reordered (>= 15 orders)
  if (design.order_count && design.order_count >= 15) {
    tags.push('fast-repeat');
  }

  // Ready to Ship: Marked as ready to ship or high stock
  if (design.is_ready_to_ship) {
    tags.push('ready-to-ship');
  } else if (design.design_colors) {
    const totalStock = design.design_colors.reduce((sum, color) => {
      if (typeof color.size_quantities === 'object' && color.size_quantities) {
        return sum + Object.values(color.size_quantities).reduce((s: number, qty: any) => s + (Number(qty) || 0), 0);
      }
      return sum + (color.stock_quantity || 0);
    }, 0);
    
    if (totalStock >= 100) {
      tags.push('ready-to-ship');
    }
    
    // Low Stock: Total stock < 20
    if (totalStock > 0 && totalStock < 20) {
      tags.push('low-stock');
    }
  }

  return tags;
}

// Tag configuration with colors and icons
const tagConfig: Record<DesignTag, { label: string; color: string; bgColor: string; icon: any }> = {
  'new-arrival': { 
    label: 'New Arrival', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100 border-blue-300',
    icon: Sparkles
  },
  'trending': { 
    label: 'Trending', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100 border-purple-300',
    icon: TrendingUp
  },
  'best-seller': { 
    label: 'Best Seller', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100 border-amber-300',
    icon: Award
  },
  'fast-repeat': { 
    label: 'Fast Repeat', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100 border-green-300',
    icon: Zap
  },
  'ready-to-ship': { 
    label: 'Ready to Ship', 
    color: 'text-teal-700', 
    bgColor: 'bg-teal-100 border-teal-300',
    icon: Truck
  },
  'low-stock': { 
    label: 'Low Stock', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100 border-red-300',
    icon: Package
  }
};

// Highlight tag presets - maps to existing filter logic
interface HighlightTag {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  filterPreset: Partial<FilterState>;
}

const highlightTags: HighlightTag[] = [
  {
    id: 'new-arrivals',
    label: 'New Arrivals',
    icon: Sparkles,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    filterPreset: {
      tags: ['new-arrival'],
      sortBy: 'newest'
    }
  },
  {
    id: 'best-sellers',
    label: 'Best Sellers',
    icon: Award,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    filterPreset: {
      tags: ['best-seller'],
      sortBy: 'newest'
    }
  },
  {
    id: 'trending',
    label: 'Trending Now',
    icon: TrendingUp,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    filterPreset: {
      tags: ['trending'],
      sortBy: 'newest'
    }
  },
  {
    id: 'ready-stock',
    label: 'Ready to Ship',
    icon: Truck,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    filterPreset: {
      tags: ['ready-to-ship'],
      sortBy: 'newest'
    }
  },
  {
    id: 'popular',
    label: 'Popular Picks',
    icon: Zap,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    filterPreset: {
      tags: ['fast-repeat'],
      sortBy: 'newest'
    }
  }
];

export function Catalogue() {
  const { user } = useAuth();
  const branding = useBranding();
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
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: { min: 0, max: 100000 },
    colors: [],
    designNo: '',
    sortBy: 'newest',
    tags: []
  });
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUserMessage, setShareUserMessage] = useState('');
  const [shareType, setShareType] = useState<'catalogue' | 'design' | null>(null);
  const [pendingShareDesign, setPendingShareDesign] = useState<Design | null>(null);

  useEffect(() => {
    loadCategories();
    loadFabricTypes();
    loadFiltersFromUrl();
  }, []);

  // Load filters from URL parameters (for shared links)
  const loadFiltersFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    
    const categories = params.get('categories')?.split(',').filter(Boolean) || [];
    const colors = params.get('colors')?.split(',').filter(Boolean) || [];
    const tags = params.get('tags')?.split(',').filter(Boolean) as DesignTag[] || [];
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const designNo = params.get('designNo') || '';
    const sortBy = params.get('sortBy') as FilterState['sortBy'] || 'newest';
    
    if (categories.length > 0 || colors.length > 0 || tags.length > 0 || minPrice || maxPrice || designNo) {
      setFilters({
        categories,
        colors,
        tags,
        priceRange: {
          min: minPrice ? Number(minPrice) : 0,
          max: maxPrice ? Number(maxPrice) : 100000
        },
        designNo,
        sortBy
      });
    }
  };

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

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(d => {
        const designTags = getDesignTags(d);
        return filters.tags.some(tag => designTags.includes(tag));
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

  const toggleTagFilter = (tag: DesignTag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      priceRange: { min: 0, max: 100000 },
      colors: [],
      designNo: '',
      sortBy: 'newest',
      tags: []
    });
  };

  // Toggle highlight tag preset - allows multiple selection
  const toggleHighlightPreset = (highlightTag: HighlightTag) => {
    const presetTags = highlightTag.filterPreset.tags || [];
    const isCurrentlyActive = presetTags.some(tag => filters.tags.includes(tag));
    
    if (isCurrentlyActive) {
      // Remove the preset tags
      setFilters(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => !presetTags.includes(tag))
      }));
    } else {
      // Add the preset tags
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, ...presetTags],
        sortBy: highlightTag.filterPreset.sortBy || prev.sortBy
      }));
    }
  };

  const activeFilterCount = 
    filters.categories.length + 
    filters.colors.length + 
    filters.tags.length + 
    (filters.designNo ? 1 : 0) +
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

  // Generate shareable URL with current filter parameters
  const generateShareableUrl = () => {
    const params = new URLSearchParams();
    
    if (filters.categories.length > 0) {
      params.set('categories', filters.categories.join(','));
    }
    if (filters.colors.length > 0) {
      params.set('colors', filters.colors.join(','));
    }
    if (filters.tags.length > 0) {
      params.set('tags', filters.tags.join(','));
    }
    if (filters.priceRange.min > 0) {
      params.set('minPrice', filters.priceRange.min.toString());
    }
    if (filters.priceRange.max < 100000) {
      params.set('maxPrice', filters.priceRange.max.toString());
    }
    if (filters.designNo) {
      params.set('designNo', filters.designNo);
    }
    if (filters.sortBy !== 'newest') {
      params.set('sortBy', filters.sortBy);
    }
    
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  // Generate filter summary for WhatsApp message (excluding internal data)
  const generateFilterSummary = () => {
    const summary: string[] = [];
    
    // Categories
    if (filters.categories.length > 0) {
      const categoryNames = categories
        .filter(c => filters.categories.includes(c.id))
        .map(c => c.name)
        .join(', ');
      if (categoryNames) {
        summary.push(`📁 *Categories:* ${categoryNames}`);
      }
    }
    
    // Fabric Types
    if (selectedFabricType) {
      const fabric = fabricTypes.find(f => f.id === selectedFabricType);
      if (fabric) {
        summary.push(`🧵 *Fabric:* ${fabric.name}`);
      }
    }
    
    // Price Range
    if (filters.priceRange.min > 0 || filters.priceRange.max < 100000) {
      summary.push(`💰 *Price Range:* ₹${filters.priceRange.min.toLocaleString()} - ₹${filters.priceRange.max.toLocaleString()}`);
    }
    
    // Colors
    if (filters.colors.length > 0) {
      summary.push(`🎨 *Colors:* ${filters.colors.join(', ')}`);
    }
    
    // Tags
    if (filters.tags.length > 0) {
      const tagLabels = filters.tags.map(tag => {
        const config = tagConfig[tag];
        return config ? config.label : tag;
      }).join(', ');
      summary.push(`✨ *Collections:* ${tagLabels}`);
    }
    
    // Design Number Search
    if (filters.designNo) {
      summary.push(`🔍 *Design Search:* ${filters.designNo}`);
    }
    
    return summary;
  };

  // Open share dialog for filtered catalogue
  const shareFilteredCatalogue = () => {
    setShareType('catalogue');
    setShareUserMessage('');
    setShowShareDialog(true);
  };

  // Execute catalogue share with optional user message
  const executeFilteredCatalogueShare = () => {
    const shareableUrl = generateShareableUrl();
    
    // Warm greeting message
    let message = `✨ *Hello!* ✨\n\n`;
    message += `We're excited to share our beautiful collection with you! 🎉\n\n`;
    message += `Explore *${filteredDesigns.length} stunning design${filteredDesigns.length !== 1 ? 's' : ''}* handpicked just for you from our exclusive catalogue.\n\n`;
    
    // Get 3-4 thumbnail images from different designs
    const thumbnailCount = Math.min(4, filteredDesigns.length);
    const thumbnailImages: string[] = [];
    
    for (let i = 0; i < thumbnailCount && i < filteredDesigns.length; i++) {
      const design = filteredDesigns[i];
      const firstColor = design.design_colors?.[0];
      if (firstColor?.image_urls && firstColor.image_urls.length > 0) {
        thumbnailImages.push(firstColor.image_urls[0]);
      }
    }
    
    // Add thumbnail images
    if (thumbnailImages.length > 0) {
      message += `📸 *Preview of our designs:*\n`;
      thumbnailImages.forEach((imageUrl, index) => {
        message += `${imageUrl}\n`;
      });
      message += `\n`;
    }
    
    message += `🔗 *Click here to explore the full catalogue:*\n${shareableUrl}\n\n`;
    message += `💡 Browse all designs, view details, and find your perfect match!\n`;
    message += `🔐 Login to view prices and place orders.\n\n`;
    
    // Add user's optional message/query
    if (shareUserMessage.trim()) {
      message += `💬 *Your Message:*\n${shareUserMessage.trim()}\n\n`;
    }
    
    message += `📱 *Have questions? We're here to help!*\n`;
    message += `Feel free to reach out for pricing, bulk orders, or any inquiries. 😊`;
    
    const whatsappUrl = getWhatsAppUrl(message);
    window.open(whatsappUrl, '_blank');
    
    // Close dialog and reset
    setShowShareDialog(false);
    setShareUserMessage('');
    setShareType(null);
  };

  // Execute design share with optional user message
  const executeDesignShare = async () => {
    if (!pendingShareDesign) return;
    
    const design = pendingShareDesign;
    const selectedColor = design.design_colors?.[0];
    const colorCount = design.design_colors?.length || 0;
    const selectedColorImages = selectedColor?.image_urls || [];
    
    try {
      const productLink = `${window.location.origin}/catalogue?design=${design.id}`;
      
      let message = `✨ *${design.name}*\n\n`;
      message += `📋 *Design Code:* ${design.design_no}\n`;
      
      if (design.fabric_type) {
        message += `🧵 *Fabric:* ${design.fabric_type.name}\n`;
      }
      
      if (design.category) {
        message += `📁 *Category:* ${design.category.name}\n`;
      }
      
      if (selectedColor) {
        message += `💰 *Price:* ₹${selectedColor.price.toLocaleString()}/piece\n`;
      }
      
      message += `🎨 *Colors Available:* ${colorCount} variant${colorCount > 1 ? 's' : ''}\n`;
      message += `📦 *MOQ:* Contact for details\n`;
      
      if (design.description) {
        message += `\n📝 ${design.description}\n`;
      }
      
      message += `\n🔗 *View Product:*\n${productLink}\n`;
      
      // Add user's optional message/query
      if (shareUserMessage.trim()) {
        message += `\n💬 *My Query:*\n${shareUserMessage.trim()}\n`;
      }
      
      message += `\n📱 *Interested? Contact us for more details!*`;
      
      // Try Web Share API with image
      if (navigator.share && selectedColorImages.length > 0) {
        try {
          const imageUrl = selectedColorImages[0];
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], `${design.design_no}.jpg`, { type: 'image/jpeg' });
          
          await navigator.share({
            title: `${design.name} - ${design.design_no}`,
            text: message,
            files: [file]
          });
          
          // Close dialog and reset
          setShowShareDialog(false);
          setShareUserMessage('');
          setShareType(null);
          setPendingShareDesign(null);
          return;
        } catch (shareError) {
          console.warn('Web Share API failed, falling back to WhatsApp URL:', shareError);
        }
      }
      
      // Fallback to WhatsApp URL
      if (selectedColorImages.length > 0) {
        message += `\n\n📸 *Product Image:*\n${selectedColorImages[0]}`;
      }
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sharing:', error);
      
      const productLink = `${window.location.origin}/catalogue?design=${design.id}`;
      let fallbackMessage = `✨ *${design.name}*\n\n`;
      fallbackMessage += `📋 Design Code: ${design.design_no}\n`;
      if (design.fabric_type) {
        fallbackMessage += `🧵 Fabric: ${design.fabric_type.name}\n`;
      }
      if (selectedColor) {
        fallbackMessage += `💰 Price: ₹${selectedColor.price.toLocaleString()}/piece\n`;
      }
      if (shareUserMessage.trim()) {
        fallbackMessage += `\n💬 My Query:\n${shareUserMessage.trim()}\n`;
      }
      fallbackMessage += `\n🔗 View: ${productLink}\n`;
      fallbackMessage += `\n💬 Contact us for more details!`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fallbackMessage)}`;
      window.open(whatsappUrl, '_blank');
    }
    
    // Close dialog and reset
    setShowShareDialog(false);
    setShareUserMessage('');
    setShareType(null);
    setPendingShareDesign(null);
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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
      {/* Floating WhatsApp Button for Mobile */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <button
          onClick={() => {
            // Share first visible design or selected designs
            if (selectedDesigns.size > 0) {
              shareBulkOnWhatsApp();
            } else if (filteredDesigns.length > 0) {
              const firstDesign = filteredDesigns[0];
              const shareEvent = { stopPropagation: () => {} } as React.MouseEvent;
              const mockShareFunc = async (e: React.MouseEvent) => {
                e.stopPropagation();
                try {
                  const selectedColor = firstDesign.design_colors?.[0];
                  const selectedColorImages = selectedColor?.image_urls || [];
                  let message = `*${firstDesign.name}* (${firstDesign.design_no})\n\n` +
                    `${firstDesign.description || 'Beautiful design from our collection!'}\n\n` +
                    `🎨 Colors: ${firstDesign.design_colors?.length || 0} variants\n\n`;
                  
                  if (selectedColorImages.length > 0) {
                    const imageList = selectedColorImages.slice(0, 3).join('\n');
                    message += `📸 Images:\n${imageList}\n\n`;
                  }
                  
                  message += `Check out our catalogue for more designs!`;
                  
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                } catch (error) {
                  console.error('Error sharing:', error);
                }
              };
              mockShareFunc(shareEvent);
            }
          }}
          className="bg-green-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-green-600 transition-all hover:scale-110 flex items-center justify-center min-w-[56px] min-h-[56px]"
          title="Quick share"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">{branding.brandName} Collection</h1>
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
                <MessageSquare className="w-4 h-4" />
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

              {/* Tags */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="space-y-2">
                  {(Object.keys(tagConfig) as DesignTag[]).map((tag) => {
                    const config = tagConfig[tag];
                    const Icon = config.icon;
                    return (
                      <label key={tag} className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag)}
                          onChange={() => toggleTagFilter(tag)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className={`inline-flex items-center gap-1.5 text-sm ${config.color} group-hover:opacity-80 transition`}>
                          <Icon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

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
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Highlight Strip - Tag Pills */}
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              {highlightTags.map((tag) => {
                const Icon = tag.icon;
                const isActive = filters.tags.some(t => tag.filterPreset.tags?.includes(t));
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleHighlightPreset(tag)}
                    className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? `${tag.color} ${tag.bgColor} ${tag.borderColor} border shadow-md`
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
              {filters.tags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

        

          {/* Results Count & Share Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="text-sm text-gray-600">
              Showing {filteredDesigns.length} of {designs.length} designs
            </div>
            
            {(activeFilterCount > 0 || filteredDesigns.length < designs.length) && (
              <button
                onClick={shareFilteredCatalogue}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share Selection</span>
              </button>
            )}
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
                  onShareClick={(design) => {
                    setPendingShareDesign(design);
                    setShareType('design');
                    setShareUserMessage('');
                    setShowShareDialog(true);
                  }}
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

      {/* Share Dialog with Optional Message */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {shareType === 'catalogue' ? 'Share Catalogue Selection' : 'Share Design'}
                </h3>
                <button
                  onClick={() => {
                    setShowShareDialog(false);
                    setShareUserMessage('');
                    setShareType(null);
                    setPendingShareDesign(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                  aria-label="Close dialog"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  {shareType === 'catalogue' 
                    ? 'Add an optional message or query before sharing the filtered catalogue.'
                    : 'Add an optional message or query before sharing this design.'}
                </p>
                
                <label htmlFor="shareMessage" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message (Optional)
                </label>
                <textarea
                  id="shareMessage"
                  value={shareUserMessage}
                  onChange={(e) => setShareUserMessage(e.target.value)}
                  placeholder="e.g., I'm interested in bulk orders, What's the delivery time?, Looking for custom colors..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {shareUserMessage.length}/500 characters
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowShareDialog(false);
                    setShareUserMessage('');
                    setShareType(null);
                    setPendingShareDesign(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (shareType === 'catalogue') {
                      executeFilteredCatalogueShare();
                    } else if (shareType === 'design') {
                      executeDesignShare();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
  onShareClick?: (design: Design) => void;
}

function DesignCard({ design, onQuickView, bulkSelectionMode = false, isSelected = false, onToggleSelection, onShareClick }: DesignCardProps) {
  const { user } = useAuth();
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const colorCount = design.design_colors?.length || 0;
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const selectedColorImages = selectedColor?.image_urls || [];
  const firstImage = selectedColorImages[currentImageIndex] || selectedColorImages[0];
  const isAuthenticated = !!user;

  // WhatsApp share function - opens dialog for user message
  const shareOnWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShareClick?.(design);
  };

  // Legacy fallback for direct share (not used with dialog)
  const directShareOnWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Generate product link (adjust domain as needed)
      const productLink = `${window.location.origin}/catalogue?design=${design.id}`;
      
      // Build comprehensive message
      let message = `✨ *${design.name}*\n\n`;
      message += `📋 *Design Code:* ${design.design_no}\n`;
      
      if (design.fabric_type) {
        message += `🧵 *Fabric:* ${design.fabric_type.name}\n`;
      }
      
      if (design.category) {
        message += `📁 *Category:* ${design.category.name}\n`;
      }
      
      if (selectedColor) {
        message += `💰 *Price:* ₹${selectedColor.price.toLocaleString()}/piece\n`;
      }
      
      message += `🎨 *Colors Available:* ${colorCount} variant${colorCount > 1 ? 's' : ''}\n`;
      
      // MOQ (Minimum Order Quantity) - you can adjust this based on your business logic
      message += `📦 *MOQ:* Contact for details\n`;
      
      if (design.description) {
        message += `\n📝 ${design.description}\n`;
      }
      
      message += `\n🔗 *View Product:*\n${productLink}\n`;
      message += `\n💬 *Interested? Contact us for more details!*`;
      
      // Check if Web Share API is available and we have images
      if (navigator.share && selectedColorImages.length > 0) {
        // Try to load and share actual images with the message
        try {
          const imageUrl = selectedColorImages[0];
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], `${design.design_no}.jpg`, { type: 'image/jpeg' });
          
          // Use Web Share API with image and text
          await navigator.share({
            title: `${design.name} - ${design.design_no}`,
            text: message,
            files: [file]
          });
          return;
        } catch (shareError) {
          console.warn('Web Share API failed, falling back to WhatsApp URL:', shareError);
        }
      }
      
      // Fallback to WhatsApp Web/App with image URL
      if (selectedColorImages.length > 0) {
        // Include first image URL in the message
        message += `\n\n📸 *Product Image:*\n${selectedColorImages[0]}`;
      }
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error('Error sharing:', error);
      
      // Final fallback - simple message with essential info
      const productLink = `${window.location.origin}/catalogue?design=${design.id}`;
      let fallbackMessage = `✨ *${design.name}*\n\n`;
      fallbackMessage += `📋 Design Code: ${design.design_no}\n`;
      if (design.fabric_type) {
        fallbackMessage += `🧵 Fabric: ${design.fabric_type.name}\n`;
      }
      if (selectedColor) {
        fallbackMessage += `💰 Price: ₹${selectedColor.price.toLocaleString()}/piece\n`;
      }
      fallbackMessage += `\n🔗 View: ${productLink}\n`;
      fallbackMessage += `\n💬 Contact us for more details!`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fallbackMessage)}`;
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

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    const deltaTime = Date.now() - touchStart.time;
    
    // Check if it's a swipe (fast movement, mostly horizontal)
    if (deltaTime < 300 && Math.abs(deltaX) > 50 && deltaY < 50) {
      if (deltaX > 0) {
        // Swipe right - Quick View
        onQuickView();
      } else {
        // Swipe left - Share
        shareOnWhatsApp(e as any);
      }
    }
    
    setTouchStart(null);
  };

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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

        {/* Design Tags - Myntra Style Badges */}
        {(() => {
          const designTags = getDesignTags(design);
          const priorityOrder: DesignTag[] = ['best-seller', 'trending', 'new-arrival', 'fast-repeat', 'ready-to-ship', 'low-stock'];
          const sortedTags = designTags.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
          const displayTags = sortedTags.slice(0, 2);
          
          return displayTags.length > 0 ? (
            <div className="absolute bottom-2 right-2 z-10 flex flex-wrap gap-1">
              {displayTags.map((tag) => {
                const config = tagConfig[tag];
                return (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-white text-gray-800 text-[10px] font-semibold rounded shadow-sm border border-gray-200"
                  >
                    {config.label}
                  </span>
                );
              })}
            </div>
          ) : null;
        })()}

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

        <div className="absolute inset-0 bg-black bg-opacity-0 sm:group-hover:bg-opacity-20 transition duration-300 flex items-center justify-center">
          <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition duration-300">
            <button
              onClick={shareOnWhatsApp}
              className="bg-green-500 text-white w-11 h-11 sm:w-12 sm:h-12 sm:px-4 sm:py-3 text-sm sm:text-base rounded-full font-semibold flex items-center justify-center shadow-lg hover:bg-green-600 transition min-w-[44px] min-h-[44px]"
              title="Swipe left or tap to share"
            >
              <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
              
            </button>
            <button
              onClick={onQuickView}
              className="bg-white text-primary w-11 h-11 sm:w-12 sm:h-12 sm:px-4 sm:py-3 text-sm sm:text-base rounded-full font-semibold flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition min-w-[44px] min-h-[44px]"
              title="Swipe right or tap to view"
            >
              <Eye className="w-5 h-5 sm:w-5 sm:h-5" />
             
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4" onClick={onQuickView}>
        {/* Design Code (Left) + Color Selection (Right) - Highest Priority */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Design Code - Visually Dominant */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
              {design.design_no}
            </h3>
          </div>

          {/* Color Swatches - Compact, Right Aligned */}
          {colorCount > 0 && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1">
                {design.design_colors?.slice(0, 5).map((color, index) => (
                  <button
                    key={color.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColorIndex(index);
                    }}
                    className={`relative rounded-full transition-all ${
                      index === selectedColorIndex
                        ? 'ring-2 ring-gray-900 ring-offset-1'
                        : 'hover:ring-1 hover:ring-gray-400'
                    }`}
                    title={color.color_name}
                    aria-label={`Select ${color.color_name} color`}
                  >
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-gray-200"
                      style={{ backgroundColor: color.color_code || '#cccccc' }}
                    />
                  </button>
                ))}
                {colorCount > 5 && (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-medium">
                    +{colorCount - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Product Name / Category - Secondary */}
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-700 line-clamp-1">
            {design.name}
          </p>
          {design.category && (
            <p className="text-xs text-gray-500 mt-0.5">
              {design.category.name}
            </p>
          )}
        </div>

        {/* Key Attributes - Single Line with Bullet Separators */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600 mb-3">
          {design.fabric_type && (
            <span>{design.fabric_type.name}</span>
          )}
          {design.fabric_type && design.style && (
            <span className="text-gray-400">•</span>
          )}
          {design.style && (
            <span>{design.style.name}</span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-between">
          {isAuthenticated && selectedColor?.price ? (
            <span className="text-lg sm:text-xl font-bold text-primary">
              ₹{selectedColor.price.toLocaleString()}
            </span>
          ) : (
            <span className="text-sm text-gray-600 font-medium">
              🔐 Login to view price
            </span>
          )}
          <span className="text-xs text-gray-500">MOQ: Contact</span>
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
  const { user, isAdmin } = useAuth();
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
  const [touchDistance, setTouchDistance] = useState(0);
  const [isTouchZooming, setIsTouchZooming] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'sets'>('individual'); // Admin toggle state
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const selectedImage = selectedColor?.image_urls?.[selectedImageIndex];
  const isAuthenticated = !!user;

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
    setIsTouchZooming(false);
    setTouchDistance(0);
  }, [selectedImageIndex, selectedColorIndex]);

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start for pinch zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 2) {
      setIsTouchZooming(true);
      setTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - panPosition.x, 
        y: e.touches[0].clientY - panPosition.y 
      });
    }
  };

  // Handle touch move for pinch zoom and pan
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 2 && isTouchZooming) {
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / touchDistance;
      const newZoom = Math.max(1, Math.min(3, zoomLevel * scale));
      setZoomLevel(newZoom);
      setTouchDistance(currentDistance);
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsTouchZooming(false);
    setTouchDistance(0);
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if it's a trackpad pinch gesture (ctrlKey or metaKey + wheel)
    if (e.ctrlKey || e.metaKey) {
      // Trackpad pinch zoom - treat as zoom
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(1, Math.min(3, prev + delta)));
    } else {
      // Regular mouse wheel zoom
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(1, Math.min(3, prev + delta)));
    }
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

  // Simplified zoom controls
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[96vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200 bg-gradient-to-r from-primary to-blue-600 text-white flex items-center justify-between">
          <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-bold truncate">{design.name}</h2>
            <span className="text-xs sm:text-sm opacity-90 hidden sm:inline">#{design.design_no}</span>
            {design.category && (
              <span className="text-xs px-2 py-0.5 bg-white bg-opacity-20 rounded-full hidden md:inline">
                {design.category.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition flex-shrink-0 ml-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Message Toast */}
        {message && (
          <div className={`mx-3 mt-2 p-2 rounded-lg text-xs sm:text-sm font-medium ${
            message.includes('Failed') || message.includes('Error')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Left Column - Images */}
              <div className="space-y-2 sm:space-y-3">
                {/* Main Image with Inline Zoom */}
                {selectedImage ? (
                <div className="relative bg-secondary rounded-xl border border-gray-200">
                  {/* Zoom Controls */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white bg-opacity-90 p-1 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                      className="p-2 sm:p-3 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom in (or use mouse wheel/pinch)"
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
                      title="Zoom out (or use pinch)"
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
                    className="h-[280px] sm:h-[320px] lg:h-[380px] overflow-hidden rounded-xl touch-none"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ 
                      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      KhtmlUserSelect: 'none'
                    }}
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
                      <span className="hidden sm:inline">Scroll to zoom • Drag to pan</span>
                      <span className="sm:hidden">Pinch to zoom • Drag to pan</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-w-3 aspect-h-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex flex-col items-center justify-center h-[280px] sm:h-[320px] lg:h-[380px] border border-gray-200">
                  <ImageIcon className="w-20 h-20 sm:w-24 sm:h-24 text-gray-400 mb-4" />
                  <span className="text-base sm:text-lg text-gray-500 font-medium">{design.design_no}</span>
                </div>
                )}

                {/* Image Thumbnails - Horizontal Scroll */}
                {selectedColor && selectedColor.image_urls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedColor.image_urls.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition ${
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

                {/* Color Variants - Compact */}
                {design.design_colors && design.design_colors.length > 0 && (
                  <div className="border-t border-gray-200 pt-2 sm:pt-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Colors ({design.design_colors.length})</h3>
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
                            className={`p-2 rounded-lg border-2 transition text-left ${
                              selectedColorIndex === index
                                ? 'border-primary bg-primary bg-opacity-5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {color.color_code && (
                                <div
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-300 flex-shrink-0"
                                  style={{ backgroundColor: color.color_code }}
                                />
                              )}
                              <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{color.color_name}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={colorTotalStock > 0 ? 'text-green-600' : 'text-red-600'}>
                                {colorTotalStock > 0 ? `${colorTotalStock}` : 'Out'}
                              </span>
                              {isAuthenticated && color.price ? (
                                <span className="font-bold text-primary">₹{color.price.toLocaleString()}</span>
                              ) : (
                                <span className="text-xs text-gray-500">🔐 Login</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            {/* Right Column - Product Details */}
            <div className="space-y-3">
              {/* Price & Description Combined */}
              <div className="bg-gradient-to-br from-primary/5 to-blue-50 rounded-lg p-3 border border-primary/20">
                {selectedColor && (
                  <div className="flex items-baseline gap-2 mb-2">
                    {isAuthenticated && selectedColor.price ? (
                      <>
                        <span className="text-2xl sm:text-3xl font-bold text-primary">₹{selectedColor.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-600">per piece</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-700">🔐 Login to view price</span>
                      </div>
                    )}
                  </div>
                )}
                {design.description && (
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-2">{design.description}</p>
                )}
              </div>

              {/* Admin Toggle for View Mode - Compact */}
              {isAdmin && sizeSets.length > 0 && effectiveAvailableSizes && effectiveAvailableSizes.length > 0 && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-medium text-gray-700">View:</span>
                  <button
                    onClick={() => {
                      setViewMode(viewMode === 'individual' ? 'sets' : 'individual');
                      setSizeQuantities({});
                      setSetQuantities({});
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      viewMode === 'sets'
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-300 text-gray-700'
                    }`}
                  >
                    {viewMode === 'sets' ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Sets</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Individual</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {(isAdmin && viewMode === 'sets') || (isRetailer && !isAdmin) ? (
                /* Retailer: Size Set Selection */
                sizeSets.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-primary" />
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Size Sets</h3>
                      </div>
                      {totalItemsToAdd > 0 && (
                        <span className="text-xs font-medium text-white bg-primary px-2 py-0.5 rounded-full">
                          {totalItemsToAdd}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {sizeSets.map((sizeSet) => {
                        const currentQty = setQuantities[sizeSet.id] || 0;
                        
                        return (
                          <div
                            key={sizeSet.id}
                            className={`flex items-center justify-between p-2 rounded-lg border transition ${
                              currentQty > 0
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{sizeSet.name}</div>
                              <div className="text-xs text-gray-500 truncate">{sizeSet.sizes.join(', ')}</div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateSetQuantity(sizeSet.id, currentQty - 1)}
                                disabled={currentQty === 0}
                                className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 transition disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                              >
                                −
                              </button>
                              <span className="text-sm font-semibold w-6 text-center">{currentQty}</span>
                              <button
                                onClick={() => updateSetQuantity(sizeSet.id, currentQty + 1)}
                                className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center font-bold"
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
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-primary" />
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Sizes</h3>
                      </div>
                      {totalItemsToAdd > 0 && (
                        <span className="text-xs font-medium text-white bg-primary px-2 py-0.5 rounded-full">
                          {totalItemsToAdd}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {effectiveAvailableSizes.map((size) => {
                        const stockForSize = getStockForSize(size);
                        const currentQty = sizeQuantities[size] || 0;
                        
                        return (
                          <div
                            key={size}
                            className={`flex items-center justify-between p-2 rounded-lg border transition ${
                              currentQty > 0
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm sm:text-base font-semibold text-gray-900">{size}</span>
                                  <span className={`text-xs ${stockForSize > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {stockForSize > 0 ? `${stockForSize} in stock` : 'Available on order'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateSizeQuantity(size, currentQty - 1)}
                                disabled={currentQty === 0}
                                className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 transition disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                              >
                                −
                              </button>
                              <span className="text-sm font-semibold w-6 text-center">{currentQty}</span>
                              <button
                                onClick={() => updateSizeQuantity(size, currentQty + 1)}
                                className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center font-bold"
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
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      No sizes available. Contact support.
                    </p>
                  </div>
                )
              )}

              {/* Action Buttons - Compact */}
              {selectedColor && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={handleAddToCart}
                        disabled={addingToCart || totalItemsToAdd === 0}
                        className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-2.5 sm:py-3 text-sm rounded-lg font-semibold hover:shadow-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          {addingToCart 
                            ? 'Adding...' 
                            : totalItemsToAdd === 0 
                            ? 'Select Size' 
                            : `Add ${totalItemsToAdd} to Cart`}
                        </span>
                      </button>
                      <button
                        onClick={handleAddToWishlist}
                        disabled={addingToWishlist}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-2 sm:py-2.5 text-sm rounded-lg font-medium hover:border-primary hover:text-primary transition flex items-center justify-center gap-2"
                      >
                        <Heart className="w-4 h-4" />
                        <span>{addingToWishlist ? 'Adding...' : 'Wishlist'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">🔐 Login Required</p>
                        <p className="text-xs text-yellow-800 mb-3">
                          Please login to view prices, add to cart, or save to wishlist.
                        </p>
                        <a
                          href="/login"
                          className="inline-block bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition"
                        >
                          Login / Sign Up
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
    
  );
}
