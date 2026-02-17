import { useState, useEffect, useRef } from 'react';
import { api, DesignCategory, DesignStyle, FabricType, Design } from '../lib/api';
import { uploadDesignImage } from '../lib/storage';
import { X, Plus, Trash2, Upload, Video, MessageCircle } from 'lucide-react';

interface AddDesignModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editingDesign?: Design | null;
}

interface ColorData {
  color_name: string;
  color_code: string;
  price: number | '';
  in_stock: boolean;
  stock_quantity: number;
  size_quantities: {
    S: number;
    M: number;
    L: number;
    XL: number;
    XXL: number;
    XXXL: number;
  };
  image_urls: string[];
  video_urls: string[];
  uploadingImages: File[];
  uploadingVideos: File[];
}

export function AddDesignModal({ onClose, onSuccess, editingDesign }: AddDesignModalProps) {
  const [formData, setFormData] = useState({
    design_no: '',
    name: '',
    description: '',
    category_id: '',
    style_id: '',
    fabric_type_id: '',
    available_sizes: [] as string[],
    whatsapp_image_url: '',
  });
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [styles, setStyles] = useState<DesignStyle[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [colors, setColors] = useState<ColorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingWhatsAppImage, setUploadingWhatsAppImage] = useState(false);
  const [error, setError] = useState('');
  const prevCategoryRef = useRef<string>('');
  const colorNameRefs = useRef<Array<HTMLInputElement | null>>([]);
  const colorPriceRefs = useRef<Array<HTMLInputElement | null>>([]);
  const sizeInputRefs = useRef<Array<Record<string, HTMLInputElement | null>>>([]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const colorsSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollInputIntoView = (element: HTMLElement | null) => {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const focusNextField = (index: number, currentField: 'name' | 'price') => {
    if (currentField === 'name') {
      const priceInput = colorPriceRefs.current[index];
      if (priceInput) {
        priceInput.focus();
        scrollInputIntoView(priceInput);
      }
    } else if (currentField === 'price') {
      const sizeInputs = sizeInputRefs.current[index];
      const firstSizeInput = sizeInputs ? sizeInputs['S'] : null;
      if (firstSizeInput) {
        firstSizeInput.focus();
        scrollInputIntoView(firstSizeInput);
      }
    }
  };

  useEffect(() => {
    colorNameRefs.current = colorNameRefs.current.slice(0, colors.length);
    colorPriceRefs.current = colorPriceRefs.current.slice(0, colors.length);
    sizeInputRefs.current = sizeInputRefs.current.slice(0, colors.length);
  }, [colors.length]);

  useEffect(() => {
    loadCategories();
    loadFabricTypes();
    if (editingDesign) {
      console.log('Editing design:', editingDesign);
      console.log('Design colors:', editingDesign.design_colors);
      
      // Pre-populate form with existing design data
      setFormData({
        design_no: editingDesign.design_no,
        name: editingDesign.name,
        description: editingDesign.description || '',
        category_id: editingDesign.category_id || '',
        fabric_type_id: editingDesign.fabric_type_id || '',
        available_sizes: editingDesign.available_sizes || [],
        whatsapp_image_url: editingDesign.whatsapp_image_url || '',
      });
      prevCategoryRef.current = editingDesign.category_id || '';
      // Load styles for the editing design's category
      if (editingDesign.category_id) {
        loadStyles(editingDesign.category_id).then(() => {
          // Ensure style_id is set after styles are loaded
          setFormData(prev => ({
            ...prev,
            style_id: editingDesign.style_id || ''
          }));
        });
      }
      // Pre-populate colors
      if (editingDesign.design_colors) {
        const mappedColors = editingDesign.design_colors.map(color => {
          console.log('Color size_quantities:', color.color_name, color.size_quantities);
          
          // Parse size_quantities if it's a string (from database)
          let sizeQuantities = color.size_quantities;
          if (typeof sizeQuantities === 'string') {
            try {
              sizeQuantities = JSON.parse(sizeQuantities);
            } catch (e) {
              console.error('Failed to parse size_quantities:', e);
              sizeQuantities = undefined;
            }
          }
          
          return {
            color_name: color.color_name,
            color_code: color.color_code || '#000000',
            price: typeof color.price === 'number' ? color.price : 0,
            in_stock: color.in_stock,
            stock_quantity: color.stock_quantity,
            size_quantities: sizeQuantities || {
              S: 0,
              M: 0,
              L: 0,
              XL: 0,
              XXL: 0,
              XXXL: 0
            },
            image_urls: color.image_urls || [],
            video_urls: color.video_urls || [],
            uploadingImages: [],
            uploadingVideos: []
          };
        });
        console.log('Mapped colors:', mappedColors);
        setColors(mappedColors);
      }
    }
  }, [editingDesign]);

  const loadCategories = async () => {
    try {
      const data = await api.getDesignCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadStyles = async (categoryId: string) => {
    try {
      const data = await api.getDesignStyles(categoryId);
      setStyles(data);
    } catch (err) {
      console.error('Failed to load styles:', err);
      setStyles([]);
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

  // Load styles when category changes
  useEffect(() => {
    if (formData.category_id) {
      loadStyles(formData.category_id);
      // Only reset style_id if category actually changed (not on initial load)
      if (
        prevCategoryRef.current &&
        prevCategoryRef.current !== formData.category_id
      ) {
        setFormData(prev => ({ ...prev, style_id: '' }));
      }
    } else {
      setStyles([]);
      setFormData(prev => ({ ...prev, style_id: '' }));
    }

    prevCategoryRef.current = formData.category_id;
  }, [formData.category_id]);

  const handleAddSize = () => {
    if (sizeInput.trim() && !formData.available_sizes.includes(sizeInput.trim())) {
      setFormData({
        ...formData,
        available_sizes: [...formData.available_sizes, sizeInput.trim()]
      });
      setSizeInput('');
    }
  };

  const handleRemoveSize = (size: string) => {
    setFormData({
      ...formData,
      available_sizes: formData.available_sizes.filter(s => s !== size)
    });
  };

  const createEmptyColor = (): ColorData => ({
    color_name: '',
    color_code: '#000000',
    price: '',
    in_stock: true,
    stock_quantity: 0,
    size_quantities: {
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
      XXXL: 0
    },
    image_urls: [],
    video_urls: [],
    uploadingImages: [],
    uploadingVideos: []
  });

  const handleAddColor = () => {
    const newColorIndex = colors.length;
    setColors(prev => [...prev, createEmptyColor()]);

    setTimeout(() => {
      // Keep the user in the "Colors" area (especially on mobile) by scrolling the modal form container.
      const formEl = formRef.current;
      const colorsSection = colorsSectionRef.current;
      if (formEl && colorsSection) {
        const top = colorsSection.offsetTop - formEl.offsetTop;
        formEl.scrollTo({ top, behavior: 'smooth' });
      }

      const nameInput = colorNameRefs.current[newColorIndex];
      if (nameInput) {
        // Avoid browser auto-scrolling the entire page on focus.
        nameInput.focus({ preventScroll: true });
      }
    }, 0);
  };

  const handleRemoveColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
    colorNameRefs.current.splice(index, 1);
    colorPriceRefs.current.splice(index, 1);
    sizeInputRefs.current.splice(index, 1);
  };

  // Handle WhatsApp image upload
  const handleWhatsAppImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setUploadingWhatsAppImage(true);
      const url = await uploadDesignImage(file, formData.design_no || 'temp', 'whatsapp');
      setFormData(prev => ({ ...prev, whatsapp_image_url: url }));
    } catch (err) {
      setError('Failed to upload WhatsApp image');
    } finally {
      setUploadingWhatsAppImage(false);
    }
  };

  const handleColorChange = (index: number, field: keyof ColorData, value: any) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], [field]: value };
    setColors(newColors);
  };

  const handleImageSelect = (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newColors = [...colors];
    const existingFiles = newColors[index].uploadingImages || [];
    newColors[index].uploadingImages = [...existingFiles, ...Array.from(files)];
    setColors(newColors);
  };

  const handleVideoSelect = (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newColors = [...colors];
    const existingFiles = newColors[index].uploadingVideos || [];
    // Limit to 1 video per color
    newColors[index].uploadingVideos = [files[0]];
    setColors(newColors);
  };

  const handleRemoveUploadingImage = (colorIndex: number, fileIndex: number) => {
    const newColors = [...colors];
    newColors[colorIndex].uploadingImages = newColors[colorIndex].uploadingImages.filter(
      (_, i) => i !== fileIndex
    );
    setColors(newColors);
  };

  const handleRemoveUploadingVideo = (colorIndex: number) => {
    const newColors = [...colors];
    newColors[colorIndex].uploadingVideos = [];
    setColors(newColors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadingImages(true);

    try {
      const baseDesignData = {
        design_no: formData.design_no,
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id || undefined,
        style_id: formData.style_id || undefined,
        fabric_type_id: formData.fabric_type_id || undefined,
        available_sizes: formData.available_sizes,
        whatsapp_image_url: formData.whatsapp_image_url || undefined
      };

      const colorsWithImages = await Promise.all(
        colors.map(async (color) => {
          const uploadedImageUrls: string[] = [];
          const uploadedVideoUrls: string[] = [];

          for (const file of color.uploadingImages) {
            try {
              const url = await uploadDesignImage(file, formData.design_no, color.color_name);
              uploadedImageUrls.push(url);
            } catch (err) {
              console.error('Image upload error:', err);
            }
          }

          for (const file of color.uploadingVideos) {
            try {
              const url = await uploadDesignImage(file, formData.design_no, color.color_name);
              uploadedVideoUrls.push(url);
            } catch (err) {
              console.error('Video upload error:', err);
            }
          }

          return {
            color_name: color.color_name,
            color_code: color.color_code || undefined,
            price: typeof color.price === 'number' ? color.price : 0,
            in_stock: color.in_stock,
            stock_quantity: color.stock_quantity,
            size_quantities: color.size_quantities,
            image_urls: [...color.image_urls, ...uploadedImageUrls],
            video_urls: [...(color.video_urls || []), ...uploadedVideoUrls]
          };
        })
      );

      setUploadingImages(false);

      if (editingDesign) {
        // Update design basic info
        await api.updateDesign(editingDesign.id, baseDesignData);
        
        // Update colors if they exist
        if (colors.length > 0) {
          for (let i = 0; i < colors.length; i++) {
            const color = colorsWithImages[i];
            const existingColor = editingDesign.design_colors?.[i];
            
            if (existingColor) {
              // Update existing color
              await api.updateDesignColor(existingColor.id, {
                color_name: color.color_name,
                color_code: color.color_code,
                price: color.price,
                in_stock: color.in_stock,
                stock_quantity: color.stock_quantity,
                size_quantities: color.size_quantities,
                image_urls: color.image_urls
              });
            } else {
              // Add new color
              await api.addDesignColor(editingDesign.id, color);
            }
          }
        }
      } else {
        await api.createDesign({
          ...baseDesignData,
          colors: colorsWithImages
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingDesign ? 'update' : 'create'} design`);
      setLoading(false);
      setUploadingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-4xl my-4 sm:my-8">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">{editingDesign ? 'Edit Design' : 'Add New Design'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(100vh-150px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Design Number *
              </label>
              <input
                type="text"
                value={formData.design_no}
                onChange={(e) => setFormData({ ...formData, design_no: e.target.value })}
                required
                disabled={!!editingDesign}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="e.g., IND-001"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Design Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Premium Kurta"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    category_id: newCategory,
                    style_id: newCategory === prev.category_id ? prev.style_id : ''
                  }));
                }}
                required
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Style
              </label>
              <select
                value={formData.style_id}
                onChange={(e) => setFormData({ ...formData, style_id: e.target.value })}
                disabled={!formData.category_id}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a style</option>
                {styles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
              {!formData.category_id && (
                <p className="text-xs text-gray-500 mt-1">Select a category first</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Fabric Type
            </label>
            <select
              value={formData.fabric_type_id}
              onChange={(e) => setFormData({ ...formData, fabric_type_id: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a fabric type</option>
              {fabricTypes.map((fabricType) => (
                <option key={fabricType.id} value={fabricType.id}>
                  {fabricType.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Brief description of the design"
            />
          </div>

          {/* WhatsApp Sharing Image */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  WhatsApp Sharing Image
                </label>
                <p className="text-xs text-gray-600">
                  Upload a single image to be used when sharing this design on WhatsApp
                </p>
              </div>
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>

            <div className="space-y-3">
              {formData.whatsapp_image_url ? (
                <div className="relative inline-block">
                  <img
                    src={formData.whatsapp_image_url}
                    alt="WhatsApp sharing preview"
                    className="w-full max-w-xs h-48 object-contain rounded-lg border-2 border-green-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, whatsapp_image_url: '' }))}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition shadow-lg"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-green-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-100 transition">
                  <Upload className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Upload WhatsApp Image</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleWhatsAppImageUpload(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={uploadingWhatsAppImage}
                  />
                  {uploadingWhatsAppImage && (
                    <span className="text-xs text-green-600 mt-2">Uploading...</span>
                  )}
                </label>
              )}
            </div>
          </div>

          <div ref={colorsSectionRef}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Colors</label>
              <button
                type="button"
                onClick={handleAddColor}
                className="flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base text-primary hover:text-opacity-80 transition"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Add Color</span>
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {colors.map((color, index) => (
                <div key={index} className="p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900">Color #{index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(index)}
                      className="text-red-600 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Color Name *
                      </label>
                      <input
                        type="text"
                        value={color.color_name}
                        onChange={(e) => handleColorChange(index, 'color_name', e.target.value)}
                        onBlur={() => focusNextField(index, 'name')}
                        required
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="e.g., Navy Blue"
                        ref={(el) => {
                          colorNameRefs.current[index] = el || null;
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Color Code
                      </label>
                      <input
                        type="color"
                        value={color.color_code}
                        onChange={(e) => handleColorChange(index, 'color_code', e.target.value)}
                        className="w-full h-10 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        value={color.price}
                        onChange={(e) =>
                          handleColorChange(index, 'price', parseFloat(e.target.value) || 0)
                        }
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                        ref={(el) => {
                          colorPriceRefs.current[index] = el || null;
                        }}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="flex items-center space-x-2 text-xs font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={color.in_stock}
                          onChange={(e) => handleColorChange(index, 'in_stock', e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>In Stock</span>
                      </label>
                    </div>
                  </div>

                  {/* Size-specific quantities */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Quantity by Size
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const).map((size) => (
                        <div key={size}>
                          <label className="block text-xs text-gray-600 mb-1 text-center font-medium">
                            {size}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={color.size_quantities?.[size] ?? ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              const numValue = value === '' ? 0 : parseInt(value);
                              handleColorChange(index, 'size_quantities', {
                                ...color.size_quantities,
                                [size]: numValue
                              });
                            }}
                            placeholder="0"
                            className="w-full px-2 py-2 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            ref={(el) => {
                              if (!sizeInputRefs.current[index]) {
                                sizeInputRefs.current[index] = {};
                              }
                              sizeInputRefs.current[index][size] = el;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Images & Videos
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Images</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImageSelect(index, e.target.files)}
                          className="hidden"
                        />
                      </label>
                      <label className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 transition">
                        <Video className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-gray-600">Video</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleVideoSelect(index, e.target.files)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {color.uploadingImages.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Images:</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {color.uploadingImages.map((file, fileIndex) => (
                            <div key={fileIndex} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${fileIndex + 1}`}
                                className="w-full h-16 sm:h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadingImage(index, fileIndex)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {color.uploadingVideos.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">Video:</p>
                        <div className="relative group inline-block">
                          <video
                            src={URL.createObjectURL(color.uploadingVideos[0])}
                            className="w-full max-w-xs h-32 object-cover rounded-lg border border-purple-200"
                            controls
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveUploadingVideo(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="mt-1 text-xs text-gray-500">
                            {color.uploadingVideos[0].name} ({(color.uploadingVideos[0].size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {colors.length >0 &&
             <div className="flex items-center justify-between mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700"></label>
              <button
                type="button"
                onClick={handleAddColor}
                className="flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base text-primary hover:text-opacity-80 transition"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Add Color</span>
              </button>
            </div>
}
          </div>

          <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {loading
                ? uploadingImages
                  ? 'Uploading Media...'
                  : editingDesign ? 'Updating...' : 'Creating...'
                : editingDesign ? 'Edit Design' : 'Create Design'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
