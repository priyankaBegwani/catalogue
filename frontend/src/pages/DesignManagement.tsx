import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api, Design, DesignColor, Brand, DesignStyle, DesignCategory, FabricType } from '../lib/api';
import { Plus, Trash2, ImageIcon, Package, MessageCircle, CheckSquare, Square, Search, X, Filter, Archive, Upload, Pencil } from 'lucide-react';
import { AddDesignModal, ImportDesignsModal, ViewDesignModal, ErrorAlert, Breadcrumb } from '../components';
import {
  DesktopFiltersSidebar,
  DesignTag,
  FilterState,
  MobileFiltersSheet,
  getActiveFilterCount,
  getDesignTags
} from '../components/CatalogueLikeFilters';

const COMPUTED_TAG_LABELS: Record<DesignTag, string> = {
  'new-arrival': 'New Arrival',
  'trending': 'Trending',
  'best-seller': 'Best Seller',
  'fast-repeat': 'Fast Repeat',
  'ready-to-ship': 'Ready to Ship',
  'low-stock': 'Low Stock'
};

const getDesignInactiveRank = (design: Design) => {
  const colorCount = design.design_colors?.length || 0;
  const allColorsInactive = colorCount > 0 && (design.design_colors?.every(color => color.is_active === false || color.in_stock === false) ?? false);
  return !design.is_archived && (!design.is_active || allColorsInactive) ? 1 : 0;
};

export function DesignManagement() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<Design[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [styles, setStyles] = useState<DesignStyle[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedFabricType, setSelectedFabricType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCreatedMonth, setSelectedCreatedMonth] = useState<string>('');
  const searchRef = useRef<HTMLDivElement>(null);
  const [displayedDesigns, setDisplayedDesigns] = useState<Design[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const DESIGNS_PER_PAGE = 20;

  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 100000 },
    colors: [],
    designNo: '',
    sortBy: 'newest',
    tags: [],
    workTypes: [],
    occasions: [],
    collections: [],
    designMonthYear: ''
  });
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

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

  const loadDesigns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDesigns();
      setDesigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const data = await api.getBrands();
      setBrands(data);
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getDesignCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const loadFabricTypes = useCallback(async () => {
    try {
      const data = await api.getFabricTypes();
      setFabricTypes(data);
    } catch (err) {
      console.error('Failed to load fabric types:', err);
    }
  }, []);

  const loadStyles = useCallback(async () => {
    try {
      // Load all styles from all categories in parallel for admin view
      const categories = await api.getDesignCategories();
      const styleArrays = await Promise.all(
        categories.map(category => api.getDesignStyles(category.id))
      );
      setStyles(styleArrays.flat());
    } catch (err) {
      console.error('Failed to load styles:', err);
    }
  }, []);

  useEffect(() => {
    loadDesigns();
    loadCategories();
    loadFabricTypes();
    loadBrands();
    loadStyles();
  }, [loadDesigns, loadCategories, loadFabricTypes, loadBrands, loadStyles]);

  useEffect(() => {
    const colors = new Set<string>();
    designs.forEach(design => {
      design.design_colors?.forEach(color => {
        if (color.color_name) colors.add(color.color_name);
      });
    });
    setAvailableColors(Array.from(colors).sort());
  }, [designs]);

  const getCombinedDesignTags = useCallback((design: Design) => {
    const computedTags = getDesignTags(design).map(tag => COMPUTED_TAG_LABELS[tag]);
    const manualTags = (design.tags || []).map(tag => tag.trim()).filter(Boolean);
    return Array.from(new Set([...computedTags, ...manualTags]));
  }, []);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    designs.forEach((design) => {
      getCombinedDesignTags(design).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [designs, getCombinedDesignTags]);

  const availableWorkTypes = useMemo(() => {
    const values = new Set<string>();
    designs.forEach((design) => {
      if (design.work_type) values.add(design.work_type);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [designs]);

  const availableOccasions = useMemo(() => {
    const values = new Set<string>();
    designs.forEach((design) => {
      if (design.occasion) values.add(design.occasion);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [designs]);

  const availableCollections = useMemo(() => {
    const values = new Set<string>();
    designs.forEach((design) => {
      if (design.collection) values.add(design.collection);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [designs]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setDisplayedDesigns(filteredDesigns.slice(0, DESIGNS_PER_PAGE));
    setHasMore(filteredDesigns.length > DESIGNS_PER_PAGE);
  }, [filteredDesigns]);

  const loadMoreDesigns = useCallback(() => {
    const nextPage = page + 1;
    const startIndex = 0;
    const endIndex = nextPage * DESIGNS_PER_PAGE;
    const newDisplayedDesigns = filteredDesigns.slice(startIndex, endIndex);

    setDisplayedDesigns(newDisplayedDesigns);
    setPage(nextPage);
    setHasMore(endIndex < filteredDesigns.length);
  }, [DESIGNS_PER_PAGE, filteredDesigns, page]);

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
  }, [hasMore, loadMoreDesigns]);

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

      designs.forEach(design => {
        // Add design numbers
        if (design.design_no?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.design_no);
        }

        // Add design names
        if (design.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.name);
        }

        // Add category names
        if (design.category?.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.category.name);
        }

        // Add brand names
        if (design.brand?.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.brand.name);
        }

        // Add fabric types - check nested object
        if (design.fabric_type?.name?.toLowerCase().includes(searchTerm)) {
          suggestionSet.add(design.fabric_type.name);
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

      setSuggestions(sortedSuggestions);
      setShowSuggestions(sortedSuggestions.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [masterSearch, designs]);

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
    // Apply filters
    let filtered = [...designs];

    // Master search - search across all fields (applied first for best results)
    if (masterSearch.trim()) {
      const searchTerm = masterSearch.toLowerCase().trim();
      filtered = filtered.filter(design => {
        // Search in design number
        if (design.design_no?.toLowerCase().includes(searchTerm)) return true;

        // Search in design name
        if (design.name?.toLowerCase().includes(searchTerm)) return true;

        // Search in description
        if (design.description?.toLowerCase().includes(searchTerm)) return true;

        // Search in category name - check nested object
        if (design.category?.name?.toLowerCase().includes(searchTerm)) return true;

        // Search in brand name - check both nested object and ID lookup
        if (design.brand?.name?.toLowerCase().includes(searchTerm)) return true;
        const brand = brands.find(b => b.id === design.brand_id);
        if (brand?.name?.toLowerCase().includes(searchTerm)) return true;

        // Search in fabric type - check nested object
        if (design.fabric_type?.name?.toLowerCase().includes(searchTerm)) return true;

        // Search in style name - check both nested object and ID lookup
        if (design.style?.name?.toLowerCase().includes(searchTerm)) return true;
        const style = styles.find(s => s.id === design.style_id);
        if (style?.name?.toLowerCase().includes(searchTerm)) return true;

        // Search in color names
        if (design.design_colors?.some(color => color.color_name?.toLowerCase().includes(searchTerm))) return true;

        return false;
      });
    }

    // Apply brand filter
    if (selectedBrand) {
      filtered = filtered.filter(d => d.brand_id === selectedBrand);
    }

    // Apply style filter
    if (selectedStyle) {
      filtered = filtered.filter(d => d.style_id === selectedStyle);
    }

    if (selectedFabricType) {
      filtered = filtered.filter(d => d.fabric_type_id === selectedFabricType);
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(d => d.category && filters.categories.includes(d.category.id));
    }

    filtered = filtered.filter(d => {
      const minPrice = getMinPrice(d);
      return minPrice >= filters.priceRange.min && minPrice <= filters.priceRange.max;
    });

    if (filters.colors.length > 0) {
      filtered = filtered.filter(d => d.design_colors?.some(c => filters.colors.includes(c.color_name)));
    }

    if (filters.designNo.trim()) {
      filtered = filtered.filter(d => d.design_no.toLowerCase().includes(filters.designNo.toLowerCase()));
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(d => {
        const designTags = getCombinedDesignTags(d);
        return filters.tags.some(tag => designTags.includes(tag));
      });
    }

    if (filters.workTypes.length > 0) {
      filtered = filtered.filter((d) => !!d.work_type && filters.workTypes.includes(d.work_type));
    }

    if (filters.occasions.length > 0) {
      filtered = filtered.filter((d) => !!d.occasion && filters.occasions.includes(d.occasion));
    }

    if (filters.collections.length > 0) {
      filtered = filtered.filter((d) => !!d.collection && filters.collections.includes(d.collection));
    }

    if (filters.designMonthYear) {
      filtered = filtered.filter((d) => {
        if (!d.design_month_year) return false;
        const raw = String(d.design_month_year);
        const match = raw.match(/^(\d{4})-(\d{2})/);
        if (!match) return false;
        return `${match[1]}-${match[2]}` === filters.designMonthYear;
      });
    }

    filtered = filtered.filter((design) => (activeTab === 'active' ? !design.is_archived : design.is_archived === true));

    if (selectedCreatedMonth) {
      filtered = filtered.filter((design) => {
        if (!design.created_at) return false;
        const dt = new Date(design.created_at);
        if (Number.isNaN(dt.getTime())) return false;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedCreatedMonth;
      });
    }

    const applyInactiveOrdering = (items: Design[]) => {
      if (activeTab !== 'active') return items;
      return items.sort((a, b) => getDesignInactiveRank(a) - getDesignInactiveRank(b));
    };

    // Apply sort
    switch (filters.sortBy) {
      case 'name':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    filtered = applyInactiveOrdering(filtered);

    setFilteredDesigns(filtered);
  }, [designs, selectedBrand, selectedStyle, selectedFabricType, masterSearch, brands, styles, activeTab, filters, selectedCreatedMonth]);

  useEffect(() => {
    setSelectedDesigns(new Set());
    setBulkSelectionMode(false);
  }, [activeTab]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await api.deleteDesign(id);
      await loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design');
    }
  }, [loadDesigns]);

  const handleClearArchived = useCallback(async () => {
    if (selectedDesigns.size === 0) return;
    const confirmed = window.confirm(`Permanently delete ${selectedDesigns.size} archived design(s)? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const idsToDelete = Array.from(selectedDesigns);
      for (const id of idsToDelete) {
        await api.deleteDesign(id);
      }
      setSelectedDesigns(new Set());
      setBulkSelectionMode(false);
      await loadDesigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear archived designs');
    }
  }, [selectedDesigns, loadDesigns]);

  const handleViewDesign = useCallback((design: Design, colorIndex: number = 0) => {
    setSelectedDesign(design);
    setSelectedColorIndex(colorIndex);
    setShowViewModal(true);
  }, []);

  const handleEditDesign = useCallback((design: Design) => {
    setEditingDesign(design);
    setShowAddModal(true);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  }, []);

  const mergeDesignColorsIntoState = useCallback((
    designId: string,
    updatedColors: DesignColor[],
    designUpdates?: Partial<Design>
  ) => {
    const applyUpdates = (design: Design) => {
      const nextColors = design.design_colors?.map(color => {
        const updatedColor = updatedColors.find(item => item.id === color.id);
        return updatedColor ? { ...color, ...updatedColor } : color;
      });

      return {
        ...design,
        ...designUpdates,
        design_colors: nextColors
      };
    };

    setDesigns(prev => prev.map(design => (
      design.id === designId ? applyUpdates(design) : design
    )));
    setSelectedDesign(prev => (
      prev && prev.id === designId ? applyUpdates(prev) : prev
    ));
    setEditingDesign(prev => (
      prev && prev.id === designId ? applyUpdates(prev) : prev
    ));
  }, []);

  const handleDeactivate = useCallback(async (design: Design) => {
    try {
      const colorIds = design.design_colors?.map(c => c.id) || [];
      const updatedDesign = await api.updateDesign(design.id, { is_active: false });
      const updatedColors = await Promise.all(colorIds.map(id => api.updateDesignColor(id, { is_active: false })));
      mergeDesignColorsIntoState(design.id, updatedColors, {
        is_active: updatedDesign.is_active,
        is_archived: updatedDesign.is_archived
      });
      showToast(`"${design.name}" deactivated — toggle to reactivate or archive it`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate design');
    }
  }, [mergeDesignColorsIntoState, showToast]);

  const handleReactivate = useCallback(async (design: Design) => {
    try {
      const colorIds = design.design_colors?.map(c => c.id) || [];
      const updatedDesign = await api.updateDesign(design.id, { is_active: true });
      const updatedColors = await Promise.all(colorIds.map(id => api.updateDesignColor(id, { is_active: true })));
      mergeDesignColorsIntoState(design.id, updatedColors, {
        is_active: updatedDesign.is_active,
        is_archived: updatedDesign.is_archived
      });
      showToast(`"${design.name}" is now active`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate design');
    }
  }, [mergeDesignColorsIntoState, showToast]);

  const handleArchive = useCallback(async (design: Design) => {
    try {
      const colorIds = design.design_colors?.map(c => c.id) || [];
      const updatedDesign = await api.updateDesign(design.id, { is_archived: true, is_active: false });
      const updatedColors = await Promise.all(colorIds.map(id => api.updateDesignColor(id, { is_active: false })));
      mergeDesignColorsIntoState(design.id, updatedColors, {
        is_active: updatedDesign.is_active,
        is_archived: updatedDesign.is_archived
      });
      showToast(`"${design.name}" moved to Archived`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive design');
    }
  }, [mergeDesignColorsIntoState, showToast]);

  const handleUnarchive = useCallback(async (design: Design) => {
    try {
      const colorIds = design.design_colors?.map(c => c.id) || [];
      const updatedDesign = await api.updateDesign(design.id, { is_archived: false, is_active: true });
      const updatedColors = await Promise.all(colorIds.map(id => api.updateDesignColor(id, { is_active: true })));
      mergeDesignColorsIntoState(design.id, updatedColors, {
        is_active: updatedDesign.is_active,
        is_archived: updatedDesign.is_archived
      });
      showToast(`"${design.name}" restored to All Designs`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unarchive design');
    }
  }, [mergeDesignColorsIntoState, showToast]);

  const handleDeactivateColors = useCallback(async (design: Design, colorIds: string[]) => {
    try {
      const updatedColors = await Promise.all(colorIds.map(id => api.updateDesignColor(id, { is_active: false })));
      const remainingActiveColors =
        design.design_colors?.some(color => !colorIds.includes(color.id) && color.is_active !== false) ?? false;
      let designUpdates: Partial<Design> | undefined;
      if (!remainingActiveColors) {
        const updatedDesign = await api.updateDesign(design.id, { is_active: false });
        designUpdates = {
          is_active: updatedDesign.is_active,
          is_archived: updatedDesign.is_archived
        };
      }
      mergeDesignColorsIntoState(design.id, updatedColors, designUpdates);
      showToast(`${colorIds.length} color(s) deactivated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update colors');
    }
  }, [mergeDesignColorsIntoState, showToast]);

  const handleReactivateColors = useCallback(async (design: Design, colorIds: string[]) => {
    try {
      const updatedColors = await Promise.all(colorIds.map(id => api.updateDesignColor(id, { is_active: true })));
      let designUpdates: Partial<Design> | undefined;
      if (colorIds.length > 0 && !design.is_archived) {
        const updatedDesign = await api.updateDesign(design.id, { is_active: true });
        designUpdates = {
          is_active: updatedDesign.is_active,
          is_archived: updatedDesign.is_archived
        };
      }
      mergeDesignColorsIntoState(design.id, updatedColors, designUpdates);
      showToast(`${colorIds.length} color(s) reactivated`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update colors');
    }
  }, [mergeDesignColorsIntoState, showToast]);

  const getMinPrice = (design: Design) => {
    return design.price || 0;
  };

  const clearAllFilters = useCallback(() => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 100000 },
      colors: [],
      designNo: '',
      sortBy: 'newest',
      tags: [],
      workTypes: [],
      occasions: [],
      collections: [],
      designMonthYear: ''
    });
    setSelectedBrand('');
    setSelectedStyle('');
    setSelectedFabricType('');
    setSelectedCreatedMonth('');
  }, []);

  const activeFilterCount = getActiveFilterCount(filters, selectedFabricType, selectedBrand, selectedStyle, selectedCreatedMonth);

  const toggleDesignSelection = useCallback((designId: string) => {
    setSelectedDesigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(designId)) {
        newSet.delete(designId);
      } else {
        newSet.add(designId);
      }
      return newSet;
    });
  }, []);

  const selectAllDesigns = useCallback(() => {
    const allIds = filteredDesigns.map(d => d.id);
    setSelectedDesigns(new Set(allIds));
  }, [filteredDesigns]);

  const clearSelection = useCallback(() => {
    setSelectedDesigns(new Set());
  }, []);

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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-2">
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Breadcrumb />

        <div className="relative w-full sm:w-80 lg:w-96" ref={searchRef}>
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
              className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md focus:shadow-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-gray-400"
              autoComplete="off"
            />
            {masterSearch && (
              <button
                onClick={() => {
                  setMasterSearch('');
                  setShowSuggestions(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-primary border-opacity-20 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 9999 }}>
              <div className="max-h-80 overflow-y-auto py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setMasterSearch(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm sm:text-base hover:bg-primary hover:bg-opacity-10 transition-colors duration-150 flex items-center gap-3 group"
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {masterSearch && !showSuggestions && (
            <div className="mt-3 flex items-center justify-between px-1 animate-fadeIn">
              <div className="flex items-center gap-2">
                {isSearching ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs sm:text-sm text-gray-500 font-medium">Searching...</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">
                      {filteredDesigns.length} result{filteredDesigns.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-gray-500 hidden sm:inline">
                Searching for: <span className="font-semibold text-gray-700">&quot;{masterSearch}&quot;</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Add Design and Import buttons at top */}
      <div className="sm:hidden mb-4 flex gap-2">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 flex items-center justify-center space-x-2 bg-primary text-white px-4 py-2.5 text-sm rounded-lg font-semibold hover:bg-opacity-90 transition duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Add Design</span>
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2.5 text-sm rounded-lg font-semibold hover:bg-green-700 transition duration-200"
        >
          <Upload className="w-4 h-4" />
          <span>Import</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <DesktopFiltersSidebar
          categories={categories}
          fabricTypes={fabricTypes}
          brands={brands}
          styles={styles}
          availableColors={availableColors}
          availableTags={availableTags}
          availableWorkTypes={availableWorkTypes}
          availableOccasions={availableOccasions}
          availableCollections={availableCollections}
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
          onClearAll={clearAllFilters}
          showBrand={true}
          showStyle={true}
          showFabric={true}
        />

        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-3 sm:px-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className={`-mb-px px-4 py-3 text-sm font-semibold border-b-2 transition ${
                      activeTab === 'active'
                        ? 'border-primary text-gray-900 bg-white rounded-t-lg'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All Designs
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('archived')}
                    className={`-mb-px px-4 py-3 text-sm font-semibold border-b-2 transition ${
                      activeTab === 'archived'
                        ? 'border-primary text-gray-900 bg-white rounded-t-lg'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Archived Designs
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 mb-[7px]">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-1.5 text-sm rounded-lg font-semibold hover:bg-green-700 transition duration-200"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center space-x-2 bg-primary text-white px-3 py-1.5 text-sm rounded-lg font-semibold hover:bg-opacity-90 transition duration-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Design</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {/* Select Designs Checkbox - Desktop only - Only show when designs exist */}
              {filteredDesigns.length > 0 && (
                <div className="hidden sm:flex justify-end mb-4">
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

              {/* Bulk Selection Controls */}
              {bulkSelectionMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
                    {activeTab === 'archived' ? (
                      <button
                        onClick={handleClearArchived}
                        disabled={selectedDesigns.size === 0}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Archived ({selectedDesigns.size})
                      </button>
                    ) : (
                      <button
                        onClick={shareBulkOnWhatsApp}
                        disabled={selectedDesigns.size === 0}
                        className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Share Selected ({selectedDesigns.size})
                      </button>
                    )}
                  </div>
                </div>
              )}

              <ErrorAlert message={error} onDismiss={() => setError('')} className="mb-6" />

              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-gray-600">Loading designs...</div>
                </div>
              ) : filteredDesigns.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <p className="text-gray-500 text-base sm:text-lg">
                    {activeTab === 'archived'
                      ? 'No archived designs found.'
                      : 'No designs found. Create your first design!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {displayedDesigns.map((design) => (
                    <DesignCard
                      key={design.id}
                      design={design}
                      onView={(colorIndex) => handleViewDesign(design, colorIndex)}
                      onEdit={() => handleEditDesign(design)}
                      onDelete={() => handleDelete(design.id)}
                      onDeactivate={() => handleDeactivate(design)}
                      onReactivate={() => handleReactivate(design)}
                      onArchive={() => handleArchive(design)}
                      onUnarchive={() => handleUnarchive(design)}
                      onDeactivateColors={(colorIds) => handleDeactivateColors(design, colorIds)}
                      onReactivateColors={(colorIds) => handleReactivateColors(design, colorIds)}
                      bulkSelectionMode={bulkSelectionMode}
                      isSelected={selectedDesigns.has(design.id)}
                      onToggleSelection={() => toggleDesignSelection(design.id)}
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
              )}
            </div>
          </div>
        </div>
      </div>

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

      {showImportModal && (
        <ImportDesignsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
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
        />
      )}

      <MobileFiltersSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
        fabricTypes={fabricTypes}
        brands={brands}
        styles={styles}
        availableColors={availableColors}
        availableTags={availableTags}
        availableWorkTypes={availableWorkTypes}
        availableOccasions={availableOccasions}
        availableCollections={availableCollections}
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
        onClearAll={clearAllFilters}
        showBrand={true}
        showStyle={true}
        showFabric={true}
      />

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

      {/* Mobile: Bottom Fixed Buttons - Select, Filter & Sort */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-2xl ${(showAddModal || showImportModal || showViewModal) ? 'hidden' : ''}`}>
        <div className="flex gap-2 p-3">
          <button
            onClick={() => setBulkSelectionMode(!bulkSelectionMode)}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
          >
            {bulkSelectionMode ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
            <span>{bulkSelectionMode ? 'Selection On' : 'Select'}</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-primary-dark transition-all"
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-primary text-xs px-2 py-0.5 rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSortSheet(!showSortSheet)}
            className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-600 transition-all"
          >
            <span>Sort</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface DesignCardProps {
  design: Design;
  onView: (colorIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDeactivateColors: (colorIds: string[]) => void;
  onReactivateColors: (colorIds: string[]) => void;
  bulkSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function DesignCard({ design, onView, onEdit, onDelete, onDeactivate, onReactivate, onArchive, onUnarchive, onDeactivateColors, onReactivateColors, bulkSelectionMode = false, isSelected = false, onToggleSelection }: DesignCardProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showColorManager, setShowColorManager] = useState(false);
  const [pendingColorIds, setPendingColorIds] = useState<Set<string>>(new Set());

  const isArchived = design.is_archived === true;
  const colorCount = design.design_colors?.length || 0;
  const allColorsInactive = colorCount > 0 && (design.design_colors?.every(color => color.is_active === false || color.in_stock === false) ?? false);
  const isInactive = !isArchived && (!design.is_active || allColorsInactive);
  const selectedColor = design.design_colors?.[selectedColorIndex];
  const imageUrls = selectedColor?.image_urls || [];
  const displayImage = imageUrls[currentImageIndex];

  // WhatsApp share function
  const shareOnWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Use WhatsApp image if available, otherwise use color images
      const whatsappImage = design.whatsapp_image_url;
      const imagesToShare = whatsappImage ? [whatsappImage] : imageUrls.slice(0, 2);
      
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
  const selectedColorInactive = selectedColor?.is_active === false || selectedColor?.in_stock === false;
  const selectedColorOutOfStock = selectedColor?.in_stock === false;
  const activeToggleIsGray = isArchived || isInactive || selectedColorInactive;
  const cardIsDimmed = isArchived || isInactive || selectedColorInactive;

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-200 group relative ${
      isArchived ? 'border-orange-300 bg-orange-50/40 opacity-70' :
      isInactive ? 'border-red-400 bg-gray-100 opacity-80 saturate-75' :
      selectedColorInactive ? 'border-red-300 bg-gray-50/80' :
      'border-gray-200'
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
        className={`relative bg-gray-50 overflow-hidden aspect-[4/5] group ${
          isInactive || isArchived ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={() => { if (!isInactive && !isArchived) onView(selectedColorIndex); }}
      >
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt={design.name}
              className={`w-full h-full object-cover transition-transform duration-300 ${
                cardIsDimmed ? 'grayscale-[0.7] brightness-90' : 'group-hover:scale-105'
              }`}
            />
            {/* Slideshow Indicators */}
            {imageUrls.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                {imageUrls.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500 font-medium">{design.design_no}</span>
          </div>
        )}
        {/* Status Badge */}
        {isArchived && (
          <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium z-10">
            Archived
          </div>
        )}
        {isInactive && (
          <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium z-10">
            Inactive
          </div>
        )}
        {!isInactive && !isArchived && selectedColorOutOfStock && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium z-10">
            Out of Stock
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
            <h3 className={`text-xs font-bold truncate leading-tight flex-1 ${
              cardIsDimmed ? 'text-gray-500' : 'text-gray-900'
            }`}>
              {design.name}
            </h3>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ml-2 ${
              cardIsDimmed ? 'text-gray-400' : 'text-primary'
            }`}>
              {design.design_no}
            </span>
          </div>
        </div>

        {/* Color Patches */}
        {colorCount > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {design.design_colors?.slice(0, 6).map((color, index) => (
                <button
                  key={color.id}
                  type="button"
                  disabled={isInactive || isArchived}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isInactive || isArchived) return;
                    handleColorChange(index);
                  }}
                  className={`relative group/color rounded-full transition-all duration-200 ${
                    isInactive || isArchived
                      ? ''
                      : selectedColorIndex === index
                      ? ''
                      : 'hover:scale-105'
                  } ${color.is_active === false || color.in_stock === false ? 'opacity-70' : ''}`}
                  title={color.color_name}
                >
                  <div
                    className={`w-5 h-5 rounded-full shadow-sm ${
                      color.is_active === false || color.in_stock === false
                        ? selectedColorIndex === index
                          ? 'border-2 border-red-500'
                          : 'border border-red-300'
                        : selectedColorIndex === index
                          ? 'border-2 border-black'
                          : 'border border-white'
                    }`}
                    style={{
                      backgroundColor: color.is_active === false || color.in_stock === false ? '#d1d5db' : (color.color_code || '#cccccc'),
                      filter: color.is_active === false || color.in_stock === false ? 'grayscale(100%)' : 'none'
                    }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none z-10">
                    {color.color_name}{color.in_stock === false ? ' • Out of Stock' : ''}
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
          <div className={`mb-2 p-1.5 rounded border ${
            selectedColorInactive
              ? 'bg-gray-100 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-bold ${selectedColorInactive ? 'text-gray-500' : 'text-primary'}`}>₹{design.price}</span>
              <div className="flex items-center gap-2">
                {selectedColorOutOfStock && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Out of Stock
                  </span>
                )}
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${
                  selectedColorInactive ? 'text-gray-400' : selectedColorStock > 0 ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  <Package className="w-2.5 h-2.5" />
                  {selectedColorStock}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-1 relative">

          {/* ── ACTIVE design: Edit | Toggle (opens menu) | Delete ── */}
          {!isInactive && !isArchived && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={shareOnWhatsApp}
                className="px-2 py-1 border border-green-300 text-green-600 rounded hover:bg-green-50 transition"
                title="Share on WhatsApp"
              >
                <MessageCircle className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="px-2 py-1 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </button>
               <button type="button" onClick={onDelete}
                className="px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setShowActionMenu(prev => !prev)}
                className={`shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  activeToggleIsGray
                    ? 'justify-start border-gray-300 bg-gray-300 hover:bg-gray-400'
                    : 'justify-end border-green-400 bg-green-500 hover:bg-green-600'
                }`}
                title="Deactivate / Archive"
              >
                <span className="mx-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
              </button>
             
            </div>
          )}

          {/* ── INACTIVE design: Reactivate toggle | Archive button ── */}
          {isInactive && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onReactivate}
                className="shrink-0 inline-flex h-5 w-9 items-center justify-start rounded-full border border-gray-300 bg-gray-300 hover:bg-green-500 hover:border-green-400 transition-colors focus:outline-none"
                title="Reactivate design"
              >
                <span className="mx-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
              </button>
              <button type="button" onClick={onArchive}
                className="flex-1 py-1 border border-orange-300 text-orange-600 rounded hover:bg-orange-50 transition text-[10px] font-medium flex items-center justify-center gap-1">
                <Archive className="w-3 h-3" /> Archive
              </button>
            </div>
          )}

          {/* ── ARCHIVED design: Restore | Delete ── */}
          {isArchived && (
            <div className="flex gap-1">
              <button type="button" onClick={onUnarchive}
                className="flex-1 py-1 border border-green-300 text-green-700 rounded hover:bg-green-50 transition text-[10px] font-medium">
                Restore
              </button>
              <button type="button" onClick={onDelete}
                className="px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Action Menu (active design) ── */}
          {showActionMenu && !isInactive && !isArchived && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-gray-200 z-30 overflow-hidden">
              <button type="button"
                onClick={() => { onDeactivate(); setShowActionMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                Deactivate design
              </button>
              <button type="button"
                onClick={() => { onArchive(); setShowActionMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                <Archive className="w-3 h-3 text-orange-500 shrink-0" />
                Archive design
              </button>
              <button type="button"
                onClick={() => { setShowColorManager(true); setShowActionMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                Manage colors
              </button>
            </div>
          )}

          {/* Click-away backdrop */}
          {showActionMenu && (
            <div className="fixed inset-0 z-20" onClick={() => setShowActionMenu(false)} />
          )}

          {/* ── Color Manager Panel ── */}
          {showColorManager && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-gray-200 z-30 p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-700">Manage Colors</span>
                <button type="button" onClick={() => { setShowColorManager(false); setPendingColorIds(new Set()); }}
                  className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {design.design_colors?.map(color => {
                  const colorActive = color.is_active !== false && color.in_stock !== false;
                  const isPending = pendingColorIds.has(color.id);
                  return (
                    <div key={color.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
                          style={{ backgroundColor: color.color_code || '#ccc' }} />
                        <span className={`text-[10px] truncate ${colorActive ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                          {color.color_name}{color.in_stock === false ? ' (Out of Stock)' : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingColorIds(prev => {
                          const next = new Set(prev);
                          if (next.has(color.id)) next.delete(color.id);
                          else next.add(color.id);
                          return next;
                        })}
                        className={`shrink-0 inline-flex h-4 w-7 items-center rounded-full border transition-colors ${
                          !colorActive
                            ? 'justify-start bg-gray-300 border-gray-300'
                            : isPending
                              ? 'justify-start bg-gray-300 border-gray-300'
                              : 'justify-end bg-green-500 border-green-400'
                        }`}
                      >
                        <span className="mx-0.5 h-3 w-3 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {pendingColorIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const toDeactivate = Array.from(pendingColorIds).filter(id => {
                      const c = design.design_colors?.find(c => c.id === id);
                      return c?.is_active !== false;
                    });
                    const toReactivate = Array.from(pendingColorIds).filter(id => {
                      const c = design.design_colors?.find(c => c.id === id);
                      return c?.is_active === false;
                    });
                    if (toDeactivate.length) onDeactivateColors(toDeactivate);
                    if (toReactivate.length) onReactivateColors(toReactivate);
                    setShowColorManager(false);
                    setPendingColorIds(new Set());
                  }}
                  className="mt-2 w-full py-1 bg-primary text-white rounded text-[10px] font-semibold hover:bg-primary/90 transition"
                >
                  Apply ({pendingColorIds.size})
                </button>
              )}
            </div>
          )}

          {/* Click-away backdrop for color manager */}
          {showColorManager && (
            <div className="fixed inset-0 z-20" onClick={() => { setShowColorManager(false); setPendingColorIds(new Set()); }} />
          )}
        </div>
      </div>
    </div>
  );
}
