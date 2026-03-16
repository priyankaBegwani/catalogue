import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Brand, Design, DesignCategory, DesignStyle, FabricType } from '../lib/api';

export type DesignTag = 'new-arrival' | 'trending' | 'best-seller' | 'fast-repeat' | 'ready-to-ship' | 'low-stock';

export interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: { min: number; max: number };
  colors: string[];
  designNo: string;
  sortBy: 'name' | 'price_low' | 'price_high' | 'newest' | 'popularity';
  tags: DesignTag[];
}

export function getDesignTags(design: Design): DesignTag[] {
  const tags: DesignTag[] = [];
  const now = new Date();
  const createdDate = new Date(design.created_at);
  const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceCreated <= 30) {
    tags.push('new-arrival');
  }

  if (design.order_count && design.order_count >= 20) {
    tags.push('best-seller');
  }

  if (design.order_count && design.order_count >= 10 && design.last_ordered_at) {
    const lastOrderDate = new Date(design.last_ordered_at);
    const daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastOrder <= 60) {
      tags.push('trending');
    }
  }

  if (design.order_count && design.order_count >= 15) {
    tags.push('fast-repeat');
  }

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

    if (totalStock > 0 && totalStock < 20) {
      tags.push('low-stock');
    }
  }

  return tags;
}

const tagLabels: Record<DesignTag, string> = {
  'new-arrival': 'New Arrival',
  'trending': 'Trending',
  'best-seller': 'Best Seller',
  'fast-repeat': 'Fast Repeat',
  'ready-to-ship': 'Ready to Ship',
  'low-stock': 'Low Stock'
};

export function getActiveFilterCount(filters: FilterState, selectedFabricType: string, selectedBrand: string, selectedStyle: string, selectedCreatedMonth?: string) {
  return (
    filters.categories.length +
    filters.colors.length +
    filters.tags.length +
    (filters.designNo ? 1 : 0) +
    (filters.priceRange.min > 0 || filters.priceRange.max < 100000 ? 1 : 0) +
    (selectedFabricType ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedStyle ? 1 : 0) +
    (selectedCreatedMonth ? 1 : 0)
  );
}

function toggleArrayValue(current: string[], value: string) {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

export function DesktopFiltersSidebar({
  categories,
  fabricTypes,
  brands,
  styles,
  availableColors,
  filters,
  setFilters,
  selectedFabricType,
  setSelectedFabricType,
  selectedBrand,
  setSelectedBrand,
  selectedStyle,
  setSelectedStyle,
  selectedCreatedMonth,
  setSelectedCreatedMonth,
  availableCreatedMonths,
  onClearAll,
  showBrand,
  showStyle,
  showFabric
}: {
  categories: DesignCategory[];
  fabricTypes: FabricType[];
  brands: Brand[];
  styles: DesignStyle[];
  availableColors: string[];
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  selectedFabricType: string;
  setSelectedFabricType: (next: string) => void;
  selectedBrand: string;
  setSelectedBrand: (next: string) => void;
  selectedStyle: string;
  setSelectedStyle: (next: string) => void;
  selectedCreatedMonth: string;
  setSelectedCreatedMonth: (next: string) => void;
  availableCreatedMonths: Array<{ value: string; label: string }>;
  onClearAll: () => void;
  showBrand: boolean;
  showStyle: boolean;
  showFabric: boolean;
}) {
  const activeCount = getActiveFilterCount(filters, selectedFabricType, selectedBrand, selectedStyle, selectedCreatedMonth);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="hidden lg:block lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </h2>
          {activeCount > 0 && (
            <button onClick={onClearAll} className="text-sm text-primary hover:text-primary-dark font-medium">
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="newest">Newly Added</option>
              <option value="popularity">Popularity</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {categories.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
              >
                <span>Categories {filters.categories.length > 0 && `(${filters.categories.length})`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.categories ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.categories && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category.id)}
                        onChange={() => setFilters({ ...filters, categories: toggleArrayValue(filters.categories, category.id) })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
            >
              <span>Price Range {(filters.priceRange.min > 0 || filters.priceRange.max < 100000) && '(1)'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.price && (
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
            )}
          </div>

          {availableColors.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
              >
                <span>Colors {filters.colors.length > 0 && `(${filters.colors.length})`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.colors ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.colors && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableColors.map((color) => (
                    <label key={color} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.colors.includes(color)}
                        onChange={() => setFilters({ ...filters, colors: toggleArrayValue(filters.colors, color) })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{color}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => toggleSection('tags')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
            >
              <span>Tags {filters.tags.length > 0 && `(${filters.tags.length})`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.tags ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.tags && (
              <div className="space-y-2">
                {(Object.keys(tagLabels) as DesignTag[]).map((tag) => (
                  <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={() => setFilters({ ...filters, tags: toggleArrayValue(filters.tags, tag) as DesignTag[] })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{tagLabels[tag]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {showFabric && fabricTypes.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => toggleSection('fabric')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
              >
                <span>Fabric Type {selectedFabricType && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.fabric ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.fabric && (
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
                    <button onClick={() => setSelectedFabricType('')} className="text-xs text-primary hover:text-primary-dark mt-2">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showBrand && brands.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => toggleSection('brand')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
              >
                <span>Brand {selectedBrand && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.brand && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brands.map((brand) => (
                    <label key={brand.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedBrand === brand.id}
                        onChange={() => setSelectedBrand(brand.id)}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{brand.name}</span>
                    </label>
                  ))}
                  {selectedBrand && (
                    <button onClick={() => setSelectedBrand('')} className="text-xs text-primary hover:text-primary-dark mt-2">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showStyle && styles.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => toggleSection('style')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
              >
                <span>Style {selectedStyle && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.style ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.style && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {styles.map((style) => (
                    <label key={style.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedStyle === style.id}
                        onChange={() => setSelectedStyle(style.id)}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{style.name}</span>
                    </label>
                  ))}
                  {selectedStyle && (
                    <button onClick={() => setSelectedStyle('')} className="text-xs text-primary hover:text-primary-dark mt-2">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {availableCreatedMonths && availableCreatedMonths.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => toggleSection('month')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
              >
                <span>Created Month {selectedCreatedMonth && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.month ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.month && (
                <div>
                  <input
                    type="month"
                    value={selectedCreatedMonth}
                    onChange={(e) => setSelectedCreatedMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {selectedCreatedMonth && (
                    <button 
                      onClick={() => setSelectedCreatedMonth('')} 
                      className="text-xs text-primary hover:text-primary-dark mt-2"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => toggleSection('designNo')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-primary transition"
            >
              <span>Design Number {filters.designNo && '(1)'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.designNo ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.designNo && (
              <input
                type="text"
                value={filters.designNo}
                onChange={(e) => setFilters({ ...filters, designNo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Search by design no..."
              />
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileFiltersSheet({
  isOpen,
  onClose,
  categories,
  fabricTypes,
  brands,
  styles,
  availableColors,
  filters,
  setFilters,
  selectedFabricType,
  setSelectedFabricType,
  selectedBrand,
  setSelectedBrand,
  selectedStyle,
  setSelectedStyle,
  selectedCreatedMonth,
  setSelectedCreatedMonth,
  availableCreatedMonths,
  onClearAll,
  showBrand,
  showStyle,
  showFabric
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: DesignCategory[];
  fabricTypes: FabricType[];
  brands: Brand[];
  styles: DesignStyle[];
  availableColors: string[];
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  selectedFabricType: string;
  setSelectedFabricType: (next: string) => void;
  selectedBrand: string;
  setSelectedBrand: (next: string) => void;
  selectedStyle: string;
  setSelectedStyle: (next: string) => void;
  selectedCreatedMonth: string;
  setSelectedCreatedMonth: (next: string) => void;
  availableCreatedMonths: Array<{ value: string; label: string }>;
  onClearAll: () => void;
  showBrand: boolean;
  showStyle: boolean;
  showFabric: boolean;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {categories.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
              >
                <span>Categories {filters.categories.length > 0 && `(${filters.categories.length})`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.categories ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.categories && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category.id)}
                        onChange={() => setFilters({ ...filters, categories: toggleArrayValue(filters.categories, category.id) })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
            >
              <span>Price Range {(filters.priceRange.min > 0 || filters.priceRange.max < 100000) && '(1)'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.price && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Min</label>
                  <input
                    type="number"
                    value={filters.priceRange.min}
                    onChange={(e) => setFilters({
                      ...filters,
                      priceRange: { ...filters.priceRange, min: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
                    placeholder="₹0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Max</label>
                  <input
                    type="number"
                    value={filters.priceRange.max}
                    onChange={(e) => setFilters({
                      ...filters,
                      priceRange: { ...filters.priceRange, max: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
                    placeholder="₹100000"
                  />
                </div>
              </div>
            )}
          </div>

          {availableColors.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
              >
                <span>Colors {filters.colors.length > 0 && `(${filters.colors.length})`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.colors ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.colors && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableColors.map((color) => (
                    <label key={color} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.colors.includes(color)}
                        onChange={() => setFilters({ ...filters, colors: toggleArrayValue(filters.colors, color) })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{color}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => toggleSection('tags')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
            >
              <span>Tags {filters.tags.length > 0 && `(${filters.tags.length})`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.tags ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.tags && (
              <div className="space-y-2">
                {(Object.keys(tagLabels) as DesignTag[]).map((tag) => (
                  <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={() => setFilters({ ...filters, tags: toggleArrayValue(filters.tags, tag) as DesignTag[] })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{tagLabels[tag]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {showFabric && fabricTypes.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => toggleSection('fabric')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
              >
                <span>Fabric Type {selectedFabricType && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.fabric ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.fabric && (
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
                    <button onClick={() => setSelectedFabricType('')} className="text-xs text-primary hover:text-primary-dark mt-2">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showBrand && brands.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => toggleSection('brand')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
              >
                <span>Brand {selectedBrand && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.brand ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.brand && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brands.map((brand) => (
                    <label key={brand.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedBrand === brand.id}
                        onChange={() => setSelectedBrand(brand.id)}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{brand.name}</span>
                    </label>
                  ))}
                  {selectedBrand && (
                    <button onClick={() => setSelectedBrand('')} className="text-xs text-primary hover:text-primary-dark mt-2">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showStyle && styles.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => toggleSection('style')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
              >
                <span>Style {selectedStyle && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.style ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.style && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {styles.map((style) => (
                    <label key={style.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedStyle === style.id}
                        onChange={() => setSelectedStyle(style.id)}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{style.name}</span>
                    </label>
                  ))}
                  {selectedStyle && (
                    <button onClick={() => setSelectedStyle('')} className="text-xs text-primary hover:text-primary-dark mt-2">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {availableCreatedMonths && availableCreatedMonths.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => toggleSection('month')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
              >
                <span>Created Month {selectedCreatedMonth && '(1)'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.month ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.month && (
                <div>
                  <input
                    type="month"
                    value={selectedCreatedMonth}
                    onChange={(e) => setSelectedCreatedMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {selectedCreatedMonth && (
                    <button 
                      onClick={() => setSelectedCreatedMonth('')} 
                      className="text-xs text-primary hover:text-primary-dark mt-2"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => toggleSection('designNo')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2"
            >
              <span>Design Number {filters.designNo && '(1)'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.designNo ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.designNo && (
              <input
                type="text"
                value={filters.designNo}
                onChange={(e) => setFilters({ ...filters, designNo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Search by design no..."
              />
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={onClearAll}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
