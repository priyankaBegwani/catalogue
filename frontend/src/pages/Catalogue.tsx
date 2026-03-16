import { useState, useEffect, useRef, useMemo } from 'react';
import { api, Design, DesignCategory, FabricType, SizeSet, UserProfile, Brand, DesignStyle } from '../lib/api';
import { Eye, Package, Heart, ShoppingCart, ImageIcon, Filter, X, ZoomIn, ZoomOut, Maximize2, ToggleLeft, ToggleRight, MessageCircle, CheckSquare, Square, MessageSquare, Sparkles, TrendingUp, Award, Zap, Truck, Plus, Search, ArrowLeft, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getWhatsAppUrl, useBranding } from '../hooks/useBranding';
import { AddToCartModal } from '../components/AddToCartModal';
import { Breadcrumb } from '../components';
import {
  DesktopFiltersSidebar,
  FilterState,
  MobileFiltersSheet,
  getActiveFilterCount
} from '../components/CatalogueLikeFilters';

export type DesignTag = 'new-arrival' | 'trending' | 'best-seller' | 'fast-repeat' | 'ready-to-ship' | 'low-stock';

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
  const { user, isAdmin } = useAuth();
  const branding = useBranding();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [allDesigns, setAllDesigns] = useState<Design[]>([]); // For autocomplete - unfiltered
  const [filteredDesigns, setFilteredDesigns] = useState<Design[]>([]);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [styles, setStyles] = useState<DesignStyle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFabricType, setSelectedFabricType] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [showPriceToCustomers, setShowPriceToCustomers] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    brands: [],
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
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [addCartDesign, setAddCartDesign] = useState<Design | null>(null);
  const [addCartColorIndex, setAddCartColorIndex] = useState(0);
  const [masterSearch, setMasterSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [displayedDesigns, setDisplayedDesigns] = useState<Design[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const DESIGNS_PER_PAGE = 20;
  const [selectedCreatedMonth, setSelectedCreatedMonth] = useState<string>('');

  const availableCreatedMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    for (const design of designs) {
      if (!design.created_at) continue;
      const dt = new Date(design.created_at);
      if (Number.isNaN(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(dt);
      monthMap.set(key, label);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [designs]);

  useEffect(() => {
    loadCategories();
    loadFabricTypes();
    loadBrands();
    loadFiltersFromUrl();
    loadAllDesigns(); // Load all designs for autocomplete
    // Load price visibility setting
    const savedShowPrice = localStorage.getItem('show_price_to_customers') !== 'false';
    setShowPriceToCustomers(savedShowPrice);
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
  }, [selectedCategory, selectedFabricType, selectedBrand, selectedStyle]);

  useEffect(() => {
    loadStyles();
    // Reset style selection when category changes
    if (selectedStyle) {
      setSelectedStyle('');
    }
  }, [selectedCategory]);

  useEffect(() => {
    applyFilters();
  }, [designs, filters, masterSearch, categories, brands, fabricTypes, styles, selectedCreatedMonth]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setDisplayedDesigns(filteredDesigns.slice(0, DESIGNS_PER_PAGE));
    setHasMore(filteredDesigns.length > DESIGNS_PER_PAGE);
  }, [filteredDesigns]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore) {
          loadMoreDesigns();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, page, filteredDesigns]);

  const loadMoreDesigns = () => {
    const nextPage = page + 1;
    const startIndex = 0;
    const endIndex = nextPage * DESIGNS_PER_PAGE;
    const newDisplayedDesigns = filteredDesigns.slice(startIndex, endIndex);
    
    setDisplayedDesigns(newDisplayedDesigns);
    setPage(nextPage);
    setHasMore(endIndex < filteredDesigns.length);
  };

  // Generate autocomplete suggestions
  useEffect(() => {
    if (!masterSearch.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const debounceTimer = setTimeout(() => {
      const searchTerm = masterSearch.toLowerCase().trim();
      const suggestionSet = new Set<string>();

      // Use allDesigns for autocomplete to include all products, not just filtered ones
      const searchSource = allDesigns.length > 0 ? allDesigns : designs;
      searchSource.forEach(design => {
        // Add design numbers
        if (design.design_no?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.design_no);
        }
        
        // Add design names
        if (design.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.name);
        }
        
        // Add category names - check nested object
        if (design.category?.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.category.name);
        }
        
        // Add brand names - check nested object
        if (design.brand?.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.brand.name);
        }
        
        // Add fabric types - check both nested object and ID lookup
        if (design.fabric_type?.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.fabric_type.name);
        }
        // Also check fabricTypes array by ID
        if (design.fabric_type_id) {
          const fabricType = fabricTypes.find(f => f.id === design.fabric_type_id);
          if (fabricType?.name?.toLowerCase().includes(searchTerm)) {
            suggestionSet.add(fabricType.name);
          }
        }
        
        // Add color names
        design.design_colors?.forEach(color => {
          if (color.color_name?.toLowerCase().includes(searchTerm)) {
            suggestionSet.add(color.color_name);
          }
        });
      });

      const sortedSuggestions = Array.from(suggestionSet)
        .sort((a, b) => {
          // Prioritize exact starts
          const aStarts = a.toLowerCase().startsWith(searchTerm);
          const bStarts = b.toLowerCase().startsWith(searchTerm);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.localeCompare(b);
        })
        .slice(0, 8);

      console.log('🔍 Search term:', searchTerm);
      console.log('📊 Filtered designs:', designs.length);
      console.log('🌍 All designs (for autocomplete):', allDesigns.length);
      console.log('🏭 Fabric types loaded:', fabricTypes.length);
      console.log('💡 Suggestions generated:', sortedSuggestions);
      console.log('✅ Show dropdown:', sortedSuggestions.length > 0);
      
      setSuggestions(sortedSuggestions);
      setShowSuggestions(sortedSuggestions.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [masterSearch, designs, fabricTypes, allDesigns]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const loadBrands = async () => {
    try {
      const data = await api.getBrands();
      setBrands(data);
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  };

  const loadStyles = async () => {
    try {
      if (selectedCategory) {
        const data = await api.getDesignStyles(selectedCategory);
        setStyles(data);
      } else {
        const data = await api.getDesignStyles();
        setStyles(data);
      }
    } catch (err) {
      console.error('Failed to load styles:', err);
      setStyles([]);
    }
  };

  const loadAllDesigns = async () => {
    try {
      const data = await api.getDesigns(
        undefined, // No category filter
        undefined, // No fabric filter
        undefined, // No brand filter
        undefined, // No style filter
        true // Only fetch active designs for catalogue
      );
      setAllDesigns(data);
    } catch (err) {
      console.error('Failed to load all designs for autocomplete:', err);
    }
  };

  const loadDesigns = async () => {
    try {
      setLoading(true);
      const data = await api.getDesigns(
        selectedCategory || undefined,
        selectedFabricType || undefined,
        selectedBrand || undefined,
        selectedStyle || undefined,
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
    return design.price || 0;
  };

  const applyFilters = () => {
    let filtered = [...designs];

    // Master search - search across all fields
    if (masterSearch.trim()) {
      const searchTerm = masterSearch.toLowerCase().trim();
      filtered = filtered.filter(design => {
        // Search in design number
        if (design.design_no?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in design name
        if (design.name?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in description
        if (design.description?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in category name - check both nested object and ID lookup
        if (design.category?.name?.toLowerCase().includes(searchTerm)) return true;
        const category = categories.find(c => c.id === design.category_id);
        if (category?.name?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in brand name - check both nested object and ID lookup
        if (design.brand?.name?.toLowerCase().includes(searchTerm)) return true;
        const brand = brands.find(b => b.id === design.brand_id);
        if (brand?.name?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in fabric type - check both nested object and ID lookup
        if (design.fabric_type?.name?.toLowerCase().includes(searchTerm)) return true;
        const fabric = fabricTypes.find(f => f.id === design.fabric_type_id);
        if (fabric?.name?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in style name - check both nested object and ID lookup
        if (design.style?.name?.toLowerCase().includes(searchTerm)) return true;
        const style = styles.find(s => s.id === design.style_id);
        if (style?.name?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in color names
        if (design.design_colors?.some(color => 
          color.color_name?.toLowerCase().includes(searchTerm)
        )) return true;
        
        return false;
      });
    }

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

    // Filter by created month
    if (selectedCreatedMonth) {
      filtered = filtered.filter((design) => {
        if (!design.created_at) return false;
        const dt = new Date(design.created_at);
        if (Number.isNaN(dt.getTime())) return false;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedCreatedMonth;
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
      case 'popularity':
        filtered.sort((a, b) => {
          const aPopularity = (a.order_count || 0) + (a.views || 0) * 0.1;
          const bPopularity = (b.order_count || 0) + (b.views || 0) * 0.1;
          return bPopularity - aPopularity;
        });
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
      brands: [],
      priceRange: { min: 0, max: 100000 },
      colors: [],
      designNo: '',
      sortBy: 'newest',
      tags: []
    });
    setSelectedCategory('');
    setSelectedFabricType('');
    setSelectedBrand('');
    setSelectedStyle('');
    setSelectedCreatedMonth('');
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

  const activeFilterCount = getActiveFilterCount(filters, selectedFabricType, selectedBrand, selectedStyle, selectedCreatedMonth);

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
      // Use WhatsApp image if available, otherwise fall back to first color image
      const whatsappImage = design.whatsapp_image_url;
      const firstColor = design.design_colors?.[0];
      const fallbackImage = firstColor?.image_urls?.[0];
      const imageToUse = whatsappImage || fallbackImage;
      
      if (imageToUse) {
        thumbnailImages.push(imageToUse);
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
    // Use WhatsApp image if available, otherwise fall back to color images
    const whatsappImage = design.whatsapp_image_url;
    const selectedColorImages = selectedColor?.image_urls || [];
    const shareImage = whatsappImage || selectedColorImages[0];
    
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
        message += `💰 *Price:* ₹${design.price.toLocaleString()}/piece\n`;
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
      if (navigator.share && shareImage) {
        try {
          const imageUrl = shareImage;
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
        fallbackMessage += `💰 Price: ₹${design.price.toLocaleString()}/piece\n`;
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

  const openAddToCartModal = (design: Design, colorIndex: number) => {
    setAddCartDesign(design);
    setAddCartColorIndex(colorIndex);
    setShowAddToCartModal(true);
  };

  const closeAddToCartModal = () => {
    setShowAddToCartModal(false);
    setAddCartDesign(null);
    setAddCartColorIndex(0);
  };

  const handleCartSuccess = () => {
    // Dispatch custom event to notify TopBar to refresh cart count
    window.dispatchEvent(new CustomEvent('cartUpdated'));
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
    <>
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 lg:pb-6">
      {/* Breadcrumb and Search Bar - Inline on Desktop */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Breadcrumb />
        
        {/* Search Bar - Inline with Breadcrumb on Desktop */}
        <div className="relative sm:w-80 lg:w-96" ref={searchRef}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors duration-200" />
            </div>
            <input
              type="text"
              value={masterSearch}
              onChange={(e) => setMasterSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search products..."
              className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg bg-white shadow-sm hover:shadow focus:shadow-md focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-gray-400"
              autoComplete="off"
            />
            {masterSearch && (
              <button
                onClick={() => {
                  setMasterSearch('');
                  setShowSuggestions(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-primary border-opacity-20 rounded-xl shadow-2xl overflow-hidden z-[9999]">
              <div className="max-h-80 overflow-y-auto py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setMasterSearch(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-primary hover:bg-opacity-10 transition-colors duration-150 flex items-center gap-3 group"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {masterSearch && !showSuggestions && (
            <div className="mt-2 flex items-center gap-2 px-1 animate-fadeIn">
              {isSearching ? (
                <>
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500 font-medium">Searching...</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  <span className="text-xs text-gray-600 font-medium">
                    {filteredDesigns.length} result{filteredDesigns.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Floating WhatsApp Button for Mobile - Positioned higher to avoid bottom buttons */}
      <div className="fixed bottom-24 right-4 z-50 lg:hidden">
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

      {/* Tag Pills - Text Only (1-2 rows max) */}
      <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {highlightTags.map((tag) => {
              const isActive = filters.tags.some(t => tag.filterPreset.tags?.includes(t));
              
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleHighlightPreset(tag)}
                  className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? `${tag.color} ${tag.bgColor} ${tag.borderColor} border shadow-sm`
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

      <MobileFiltersSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
        fabricTypes={fabricTypes}
        brands={brands}
        styles={styles}
        availableColors={availableColors}
        filters={filters}
        setFilters={setFilters}
        selectedFabricType={selectedFabricType}
        setSelectedFabricType={setSelectedFabricType}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        selectedStyle={selectedStyle}
        setSelectedStyle={setSelectedStyle}
        selectedCreatedMonth={selectedCreatedMonth}
        setSelectedCreatedMonth={setSelectedCreatedMonth}
        availableCreatedMonths={availableCreatedMonths}
        onClearAll={clearFilters}
        showBrand={false}
        showStyle={true}
        showFabric={true}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <DesktopFiltersSidebar
          categories={categories}
          fabricTypes={fabricTypes}
          brands={brands}
          styles={styles}
          availableColors={availableColors}
          filters={filters}
          setFilters={setFilters}
          selectedFabricType={selectedFabricType}
          setSelectedFabricType={setSelectedFabricType}
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
          selectedCreatedMonth={selectedCreatedMonth}
          setSelectedCreatedMonth={setSelectedCreatedMonth}
          availableCreatedMonths={availableCreatedMonths}
          onClearAll={clearFilters}
          showBrand={false}
          showStyle={true}
          showFabric={true}
        />

        {/* Main Content */}
        <main className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Brand Tabs Header */}
            {brands.length > 0 && (
              <div className="border-b border-gray-200 bg-gray-50 px-3 sm:px-4 rounded-t-xl">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex items-end gap-2 overflow-x-auto scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setSelectedBrand('')}
                      className={`-mb-px px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                        !selectedBrand
                          ? 'border-primary text-gray-900 bg-white rounded-t-lg'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All Brands
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => setSelectedBrand(brand.id)}
                        className={`-mb-px px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                          selectedBrand === brand.id
                            ? 'border-primary text-gray-900 bg-white rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {brand.name}
                      </button>
                    ))}
                  </div>

                  {filteredDesigns.length > 0 && (
                    <div className="hidden sm:flex items-center pb-2">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                          checked={bulkSelectionMode}
                          onChange={() => {
                            const next = !bulkSelectionMode;
                            setBulkSelectionMode(next);
                            if (!next) {
                              clearSelection();
                            }
                          }}
                        />
                        <span>Select Designs</span>
                      </label>
                    </div>
                  )}
                </div>
              
              </div>
            )}

            {/* Enclosed Content */}
            <div className="p-3 sm:p-4">
              {/* Results Count & Share Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                {designs.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Showing {filteredDesigns.length} of {designs.length} designs
                  </div>
                )}

                {filteredDesigns.length > 0 && (activeFilterCount > 0 || filteredDesigns.length < designs.length) && (
                  <button
                    onClick={shareFilteredCatalogue}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Share Selection</span>
                  </button>
                )}
              </div>

              {/* Bulk Selection Controls */}
              {bulkSelectionMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-base sm:text-lg font-medium">No designs found matching your filters</p>
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
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {displayedDesigns.map((design) => (
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
                        setShowShareDialog(true);
                      }}
                      onAddToCart={openAddToCartModal}
                    />
                  ))}
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="col-span-full flex justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-500">Loading more designs...</span>
                  </div>
                </div>
              )}
              
              {/* End of Results */}
              {!hasMore && displayedDesigns.length > 0 && (
                <div className="col-span-full flex justify-center py-6">
                  <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
                    ✓ All {filteredDesigns.length} designs loaded
                  </div>
                </div>
              )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selectedDesign && (
        <DesignQuickView
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}

      {showAddToCartModal && addCartDesign && (
        <AddToCartModal
          isOpen={showAddToCartModal}
          onClose={closeAddToCartModal}
          onSuccess={handleCartSuccess}
          design={addCartDesign}
          selectedColorIndex={addCartColorIndex}
        />
      )}

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

      {/* Mobile Sort Sheet */}
      {showSortSheet && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={() => setShowSortSheet(false)}>
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Sort By</h2>
              <button onClick={() => setShowSortSheet(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {[
                { value: 'newest', label: 'Newly Added' },
                { value: 'popularity', label: 'Popularity' },
                { value: 'price_low', label: 'Price: Low to High' },
                { value: 'price_high', label: 'Price: High to Low' },
                { value: 'name', label: 'Name (A-Z)' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setFilters({ ...filters, sortBy: option.value as any });
                    setShowSortSheet(false);
                  }}
                  className={`w-full text-left px-4 py-3 transition-all ${
                    filters.sortBy === option.value
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
              <button
                onClick={() => setShowSortSheet(false)}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Bottom Fixed Filter & Sort Buttons - Two separate buttons */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-2xl">
        <div className="flex gap-2 p-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
          >
            <Filter className="w-5 h-5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-gray-900 text-xs px-2 py-0.5 rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSortSheet(!showSortSheet)}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-all"
          >
            <span>Sort</span>
          </button>
        </div>
      </div>
    </>
  );
}

interface DesignCardProps {
  design: Design;
  onQuickView: () => void;
  bulkSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onShareClick?: (design: Design) => void;
  onAddToCart?: (design: Design, colorIndex: number) => void;
}

function DesignCard({ design, onQuickView, bulkSelectionMode = false, isSelected = false, onToggleSelection, onShareClick, onAddToCart }: DesignCardProps) {
  const { user, isAdmin } = useAuth();
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const colorCount = design.design_colors?.length || 0;
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const selectedColorImages = selectedColor?.image_urls || [];
  const firstImage = selectedColorImages[currentImageIndex] || selectedColorImages[0];
  const isAuthenticated = !!user;
  const showPriceToCustomers = localStorage.getItem('show_price_to_customers') !== 'false';
  const shouldShowPrice = isAdmin || (isAuthenticated && showPriceToCustomers);

  // WhatsApp share function - direct share like design management page
  const shareOnWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Use WhatsApp image if available, otherwise use color images
      const whatsappImage = design.whatsapp_image_url;
      const imagesToShare = whatsappImage ? [whatsappImage] : selectedColorImages.slice(0, 1);
      
      // Generate catalogue link
      const catalogueLink = `${window.location.origin}/catalogue`;
      
      // Check if Web Share API is available and we have images
      if (navigator.share && imagesToShare.length > 0) {
        // Try to load and share actual images
        const imagePromises = imagesToShare.map(async (url) => {
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
          // Professional message with design number and catalogue link
          const shareText = `✨ *${design.name}*\n` +
            `📋 Design No: *${design.design_no}*\n\n` +
            `${design.description || 'Discover this beautiful design from our exclusive collection!'}\n\n` +
            `🎨 Available in ${colorCount} stunning color${colorCount > 1 ? 's' : ''}\n\n` +
            `👉 Explore our complete catalogue:\n${catalogueLink}\n\n` +
            `_We'd love to help you find the perfect design for your needs!_`;
          
          // Use Web Share API with actual images
          await navigator.share({
            title: `${design.name} - ${design.design_no}`,
            text: shareText,
            files: imageFiles
          });
          return;
        }
      }
      
      // Fallback to WhatsApp with professional message
      let message = `✨ *${design.name}*\n` +
        `📋 Design No: *${design.design_no}*\n\n` +
        `${design.description || 'Discover this beautiful design from our exclusive collection!'}\n\n` +
        `🎨 Available in ${colorCount} stunning color${colorCount > 1 ? 's' : ''}\n\n`;
      
      if (whatsappImage) {
        message += `📸 View Design:\n${whatsappImage}\n\n`;
      } else if (selectedColorImages.length > 0) {
        message += `📸 View Design:\n${selectedColorImages[0]}\n\n`;
      }
      
      message += `👉 Explore our complete catalogue:\n${catalogueLink}\n\n` +
        `_We'd love to help you find the perfect design for your needs!_`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Share failed:', error);
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
        if (onShareClick) {
          onShareClick(design);
        } else {
          shareOnWhatsApp(e as any);
        }
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
        className="relative bg-secondary overflow-hidden rounded-t-xl"
        onClick={onQuickView}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {firstImage ? (
          <div className="w-full h-40 sm:h-72 lg:h-80 flex items-center justify-center bg-white">
            <img
              src={firstImage}
              alt={design.name}
              className="w-full h-full object-cover sm:object-contain group-hover:scale-105 transition duration-500"
            />
          </div>
        ) : (
          <div className="w-full h-40 sm:h-72 lg:h-80 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon className="w-12 h-12 sm:w-20 sm:h-20 text-gray-400 mb-2" />
            <span className="text-xs sm:text-base text-gray-500 font-medium">{design.design_no}</span>
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
              onClick={(e) => {
                e.stopPropagation();
                if (onShareClick) {
                  onShareClick(design);
                } else {
                  shareOnWhatsApp(e as any);
                }
              }}
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

      <div className="p-2 sm:p-4" onClick={onQuickView}>
        {/* Design Code (Left) + Color Selection (Right) - Highest Priority */}
        <div className="flex items-start justify-between gap-1 sm:gap-3 mb-1.5 sm:mb-3">
          {/* Design Code - Visually Dominant */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
              {design.design_no}
            </h3>
          </div>

          {/* Color Swatches - Compact, Right Aligned */}
          {colorCount > 0 && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {design.design_colors?.slice(0, 3).map((color, index) => (
                  <button
                    key={color.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedColorIndex(index);
                    }}
                    className={`relative rounded-full transition-all ${
                      index === selectedColorIndex
                        ? 'ring-1 sm:ring-2 ring-gray-900 ring-offset-1'
                        : 'hover:ring-1 hover:ring-gray-400'
                    }`}
                    title={color.color_name}
                    aria-label={`Select ${color.color_name} color`}
                  >
                    <div
                      className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-gray-200"
                      style={{ backgroundColor: color.color_code || '#cccccc' }}
                    />
                  </button>
                ))}
                {colorCount > 3 && (
                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[9px] sm:text-[10px] text-gray-600 font-medium">
                    +{colorCount - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Product Name / Category - Secondary */}
        <div className="mb-1 sm:mb-2">
          <p className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-1">
            {design.name}
          </p>
          {design.category && (
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
              {design.category.name}
            </p>
          )}
        </div>

        {/* Key Attributes - Single Line with Bullet Separators */}
        <div className="hidden sm:flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600 mb-3">
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
          {shouldShowPrice && design.price ? (
            <span className="text-lg sm:text-xl font-bold text-primary">
              ₹{design.price.toLocaleString()}
            </span>
          ) : !isAuthenticated ? (
            <span className="text-sm text-gray-600 font-medium">
              🔐 Login to view price
            </span>
          ) : (
            <span className="text-sm text-gray-600 font-medium">
              💬 Contact for price
            </span>
          )}
          <span className="text-xs text-gray-500">MOQ: Contact</span>
        </div>
      </div>

      {/* Add to Cart Button - Appears on Hover */}
      {isAuthenticated && onAddToCart && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(design, selectedColorIndex);
            }}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-opacity-90 transition duration-200 flex items-center justify-center gap-2 text-sm shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      )}
    </div>
  );
}

interface DesignQuickViewProps {
  design: Design;
  onClose: () => void;
}

function DesignQuickView({ design: initialDesign, onClose }: DesignQuickViewProps) {
  const [currentDesign, setCurrentDesign] = useState(initialDesign);
  const [designHistory, setDesignHistory] = useState<Design[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin } = useAuth();
  const isAuthenticated = !!user;
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [setQuantities, setSetQuantities] = useState<Record<string, number>>({});
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [tempQuantity, setTempQuantity] = useState<number>(1);
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
  const [showSizeSelection, setShowSizeSelection] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [similarDesigns, setSimilarDesigns] = useState<Design[]>([]);
  
  const design = currentDesign;
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const selectedImage = selectedColor?.image_urls?.[selectedImageIndex];

  // Generate dynamic description based on selected color, style, and fabric
  const dynamicDescription = useMemo(() => {
    const colorName = selectedColor?.color_name || '';
    const styleName = design.style?.name || '';
    const fabricName = design.fabric_type?.name || '';
    const baseDescription = design.description || '';

    if (baseDescription.includes('**Product Details**') || baseDescription.includes('Product Details')) {
      let updatedDescription = baseDescription;

      if (colorName) {
        updatedDescription = updatedDescription.replace(/Colour:\s*[^\n]*/, `Colour: ${colorName}`);
      }

      if (fabricName) {
        updatedDescription = updatedDescription.replace(/Machine Weave [^\n]*/, `Machine Weave ${fabricName}`);
      }

      return updatedDescription;
    }

    const enhancements: string[] = [];
    if (colorName) enhancements.push(`Available in ${colorName}`);
    if (styleName) enhancements.push(`${styleName} style`);
    if (fabricName) enhancements.push(`Made with premium ${fabricName}`);

    if (enhancements.length > 0) {
      return `${baseDescription}\n\n${enhancements.join('. ')}.`;
    }

    return baseDescription;
  }, [design.description, design.style?.name, design.fabric_type?.name, selectedColor?.color_name]);

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

  // Load similar designs based on category and style
  useEffect(() => {
    const loadSimilarDesigns = async () => {
      try {
        const allDesigns = await api.getDesigns();
        const similar = allDesigns
          .filter(d => 
            d.id !== design.id && (
              (design.category && d.category?.id === design.category.id) ||
              (design.style && d.style?.id === design.style.id)
            )
          )
          .slice(0, 6);
        setSimilarDesigns(similar);
      } catch (err) {
        console.error('Failed to load similar designs:', err);
      }
    };
    loadSimilarDesigns();
  }, [design.id, design.category, design.style]);

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

  // Add size set with quantity
  const handleAddSizeSet = () => {
    if (!selectedSetId || tempQuantity <= 0) return;
    
    setSetQuantities(prev => ({
      ...prev,
      [selectedSetId]: (prev[selectedSetId] || 0) + tempQuantity
    }));
    
    // Reset selection
    setSelectedSetId('');
    setTempQuantity(1);
  };

  // Remove a size set completely
  const handleRemoveSizeSet = (setId: string) => {
    setSetQuantities(prev => {
      const { [setId]: _, ...rest } = prev;
      return rest;
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

  const handleViewSimilarDesign = (similarDesign: Design) => {
    setDesignHistory([...designHistory, currentDesign]);
    setCurrentDesign(similarDesign);
    setSelectedColorIndex(0);
    setSelectedImageIndex(0);
    setSizeQuantities({});
    setSetQuantities({});
    setShowSizeSelection(false);
    setShowDescription(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleGoBack = () => {
    if (designHistory.length > 0) {
      const previousDesign = designHistory[designHistory.length - 1];
      setCurrentDesign(previousDesign);
      setDesignHistory(designHistory.slice(0, -1));
      setSelectedColorIndex(0);
      setSelectedImageIndex(0);
      setSizeQuantities({});
      setSetQuantities({});
      setShowSizeSelection(false);
      setShowDescription(false);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-6xl my-auto h-full sm:max-h-[95vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Absolute positioned */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition shadow-lg"
          title="Close"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Back Button - Show when viewing similar design */}
        {designHistory.length > 0 && (
          <button
            onClick={handleGoBack}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-50 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition shadow-lg font-medium text-xs sm:text-sm"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        
        {/* Message Toast */}
        {message && (
          <div className={`mx-3 mt-14 sm:mt-3 p-2 rounded-lg text-xs sm:text-sm font-medium z-40 ${
            message.includes('Failed') || message.includes('Error')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Main Content - Scrollable */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 md:p-6 pb-8 pt-14 sm:pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                    className="overflow-hidden rounded-xl touch-none"
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
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex flex-col items-center justify-center min-h-[280px] border border-gray-200 py-12">
                  <ImageIcon className="w-20 h-20 sm:w-24 sm:h-24 text-gray-400 mb-4" />
                  <span className="text-base sm:text-lg text-gray-500 font-medium">{design.design_no}</span>
                </div>
                )}
              </div>

            {/* Right Column - Product Details */}
            <div className="space-y-4">
              {/* Design Info & Price */}
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">{design.name}</h2>
                <p className="text-xs sm:text-sm text-gray-500 mb-3">Design #{design.design_no}</p>
                
                {selectedColor && isAuthenticated && design.price && (
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-gray-900" style={{ fontSize: '1.25rem' }}>₹{design.price.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">per piece</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Exclusive of taxes</p>
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-4">
                    <p className="text-sm font-medium text-gray-700">Login to view pricing and place orders</p>
                  </div>
                )}
              </div>

              {/* Image Thumbnails */}
              {selectedColor && selectedColor.image_urls.length > 1 && (
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Product Images</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {selectedColor.image_urls.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all ${
                          selectedImageIndex === idx
                            ? 'ring-2 ring-primary shadow-md'
                            : 'ring-1 ring-gray-200 hover:ring-gray-300'
                        }`}
                      >
                        <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Variants */}
              {design.design_colors && design.design_colors.length > 0 && (
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
                          onClick={() => {
                            setSelectedColorIndex(index);
                            setSelectedImageIndex(0);
                          }}
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

              {/* Product Attributes */}
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
              {dynamicDescription && (
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
                      {dynamicDescription}
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Size Selection */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => setShowSizeSelection(!showSizeSelection)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="text-sm font-semibold text-gray-900">Select Sizes</span>
                    {totalItemsToAdd > 0 && (
                      <span className="text-xs font-semibold text-white bg-primary px-2 py-1 rounded-full">
                        {totalItemsToAdd}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${
                    showSizeSelection ? 'rotate-180' : 'rotate-0'
                  }`} />
                </button>

                {showSizeSelection && (
                  <div className="mt-3 space-y-4">

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
                /* Retailer: Size Set Selection with Dropdown */
                sizeSets.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-primary" />
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Size Sets</h3>
                      </div>
                      {totalItemsToAdd > 0 && (
                        <span className="text-xs font-medium text-white bg-primary px-2 py-0.5 rounded-full">
                          {totalItemsToAdd} total
                        </span>
                      )}
                    </div>

                    {/* Add Size Set Section */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                      <div className="space-y-2">
                        <select
                          value={selectedSetId}
                          onChange={(e) => setSelectedSetId(e.target.value)}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">Select a size set...</option>
                          {sizeSets.map((set) => (
                            <option key={set.id} value={set.id}>
                              {set.name} ({set.sizes.join(', ')})
                            </option>
                          ))}
                        </select>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Quantity:</label>
                            <input
                              type="number"
                              value={tempQuantity}
                              onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                              className="flex-1 text-center border-2 border-gray-300 rounded-lg py-1.5 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-primary"
                              min="1"
                              placeholder="1"
                            />
                          </div>
                          <button
                            onClick={handleAddSizeSet}
                            disabled={!selectedSetId || tempQuantity <= 0}
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Selected Size Sets List */}
                    {Object.keys(setQuantities).length > 0 && (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Selected Sets:</p>
                        {Object.entries(setQuantities).map(([setId, quantity]) => {
                          const sizeSet = sizeSets.find(s => s.id === setId);
                          if (!sizeSet) return null;
                          
                          return (
                            <div
                              key={setId}
                              className="p-3 rounded-lg border-2 border-primary bg-primary/5 shadow-sm"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 mr-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-gray-900">{sizeSet.name}</span>
                                    <span className="text-xs font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                                      {quantity} set{quantity > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 flex flex-wrap gap-1">
                                    {sizeSet.sizes.map((size, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-white rounded text-xs font-medium">
                                        {size}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateSetQuantity(setId, quantity - 1)}
                                      className="w-6 h-6 rounded bg-white hover:bg-gray-100 transition flex items-center justify-center text-gray-700 font-bold border border-gray-300"
                                    >
                                      −
                                    </button>
                                    <button
                                      onClick={() => updateSetQuantity(setId, quantity + 1)}
                                      className="w-6 h-6 rounded bg-white hover:bg-gray-100 transition flex items-center justify-center text-gray-700 font-bold border border-gray-300"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveSizeSet(setId)}
                                    className="text-red-500 hover:text-red-600 transition p-1"
                                    title="Remove"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedColor && (
                <div className="space-y-3">
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={handleAddToCart}
                        disabled={addingToCart || totalItemsToAdd === 0}
                        className="w-full bg-primary text-white py-3 sm:py-4 text-sm sm:text-base rounded-xl font-semibold hover:bg-primary/90 hover:shadow-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 shadow-lg"
                      >
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>
                          {addingToCart 
                            ? 'Adding to Cart...' 
                            : totalItemsToAdd === 0 
                            ? 'Select Sizes to Continue' 
                            : `Add ${totalItemsToAdd} Item${totalItemsToAdd > 1 ? 's' : ''} to Cart`}
                        </span>
                      </button>
                      <button
                        onClick={handleAddToWishlist}
                        disabled={addingToWishlist}
                        className="w-full bg-white ring-1 ring-gray-300 text-gray-700 py-2.5 sm:py-3.5 text-sm sm:text-base rounded-xl font-semibold hover:ring-primary hover:text-primary hover:shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{addingToWishlist ? 'Adding to Wishlist...' : 'Add to Wishlist'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <p className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2">Login to Place Order</p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                        Access pricing, add to cart, and manage your wishlist
                      </p>
                      <a
                        href="/login"
                        className="inline-block bg-primary text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/90 hover:shadow-lg transition-all"
                      >
                        Login / Sign Up
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Similar Designs Section */}
              {similarDesigns.length > 0 && (
                <div className="border-t border-gray-100 pt-4 sm:pt-5">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">View Similar Designs</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {similarDesigns.map((similarDesign) => {
                      const firstColor = similarDesign.design_colors?.[0];
                      const firstImage = firstColor?.image_urls?.[0];
                      
                      return (
                        <button
                          key={similarDesign.id}
                          onClick={() => handleViewSimilarDesign(similarDesign)}
                          className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                        >
                          {firstImage ? (
                            <img 
                              src={firstImage} 
                              alt={similarDesign.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs font-semibold text-white truncate">{similarDesign.name}</p>
                              <p className="text-xs text-white/80">#{similarDesign.design_no}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
