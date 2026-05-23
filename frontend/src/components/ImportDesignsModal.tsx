import { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet, FileUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api, DesignCategory, DesignStyle, FabricType, Brand } from '../lib/api';
import { TransformDataModal } from './TransformDataModal';

interface ImportDesignsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  design_no: string;
  name: string;
  description: string;
  department: string;
  category: string;
  style: string;
  fabric_type: string;
  brand: string;
  price: number;
  available_sizes: string;
  color_name: string;
  color_code: string;
  stock_quantity: number;
  size_S: number;
  size_M: number;
  size_L: number;
  size_XL: number;
  size_XXL: number;
  size_XXXL: number;
  work_type: string;
  occasion: string;
  collection: string;
  design_month_year: string;
  tags: string;
  in_stock: string;
}

export function ImportDesignsModal({ onClose, onSuccess }: ImportDesignsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [styles, setStyles] = useState<DesignStyle[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, stylesData, fabricTypesData, brandsData] = await Promise.all([
          api.getDesignCategories(),
          api.getDesignStyles(),
          api.getFabricTypes(),
          api.getBrands()
        ]);
        setCategories(categoriesData);
        setStyles(stylesData);
        setFabricTypes(fabricTypesData);
        setBrands(brandsData);
      } catch (err) {
        console.error('Failed to load dropdown data:', err);
      }
    };
    loadData();
  }, []);

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        design_no: 'IND-001',
        name: 'Premium Cotton Kurta',
        description: 'High quality cotton kurta with modern design',
        department: 'mens',
        category: 'Kurta',
        style: 'Casual',
        fabric_type: 'Cotton',
        brand: 'Brand Name',
        price: 1500,
        available_sizes: 'S,M,L,XL,XXL,XXXL',
        color_name: 'White',
        color_code: '#FFFFFF',
        stock_quantity: 100,
        size_S: 10,
        size_M: 20,
        size_L: 30,
        size_XL: 20,
        size_XXL: 15,
        size_XXXL: 5,
        work_type: 'plain',
        occasion: 'casual',
        collection: 'summer collection',
        design_month_year: '2024-01-01',
        tags: 'cotton, casual, summer',
        in_stock: 'TRUE'
      },
      {
        design_no: 'IND-001',
        name: 'Premium Cotton Kurta',
        description: 'High quality cotton kurta with modern design',
        department: 'mens',
        category: 'Kurta',
        style: 'Casual',
        fabric_type: 'Cotton',
        brand: 'Brand Name',
        price: 1500,
        available_sizes: 'S,M,L,XL,XXL,XXXL',
        color_name: 'Blue',
        color_code: '#0000FF',
        stock_quantity: 80,
        size_S: 8,
        size_M: 15,
        size_L: 25,
        size_XL: 18,
        size_XXL: 10,
        size_XXXL: 4,
        work_type: 'printed',
        occasion: 'daily wear',
        collection: 'summer collection',
        design_month_year: '2024-01-01',
        tags: 'cotton, printed, summer',
        in_stock: 'TRUE'
      },
      {
        design_no: 'IND-002',
        name: 'Designer Sherwani',
        description: 'Elegant sherwani for special occasions',
        department: 'mens',
        category: 'Sherwani',
        style: 'Formal',
        fabric_type: 'Silk',
        brand: 'Brand Name',
        price: 5000,
        available_sizes: 'M,L,XL,XXL',
        color_name: 'Golden',
        color_code: '#FFD700',
        stock_quantity: 50,
        size_S: 0,
        size_M: 10,
        size_L: 15,
        size_XL: 15,
        size_XXL: 10,
        size_XXXL: 0,
        work_type: 'emboidered',
        occasion: 'wedding',
        collection: 'winter collection',
        design_month_year: '2024-02-01',
        tags: 'silk, wedding, festive',
        in_stock: 'FALSE'
      }
    ];

    // Prepare dropdown values
    const categoryNames = categories.map(c => c.name).join(', ');
    const styleNames = styles.map(s => s.name).join(', ');
    const fabricTypeNames = fabricTypes.map(f => f.name).join(', ');
    const brandNames = brands.map(b => b.name).join(', ');

    const allowedValuesData = [
      {
        column_name: 'department',
        allowed_values: 'mens, boys',
        notes: 'Use exactly one of these values'
      },
      {
        column_name: 'category',
        allowed_values: categoryNames || 'No categories available',
        notes: 'Must match existing category name exactly'
      },
      {
        column_name: 'style',
        allowed_values: styleNames || 'No styles available',
        notes: 'Optional, but must match existing style name exactly if provided'
      },
      {
        column_name: 'fabric_type',
        allowed_values: fabricTypeNames || 'No fabric types available',
        notes: 'Optional, but must match existing fabric type name exactly if provided'
      },
      {
        column_name: 'brand',
        allowed_values: brandNames || 'No brands available',
        notes: 'Optional, but must match existing brand name exactly if provided'
      },
      {
        column_name: 'available_sizes',
        allowed_values: 'S,M,L,XL,XXL,XXXL',
        notes: 'Comma-separated values without extra spaces if possible'
      },
      {
        column_name: 'design_no',
        allowed_values: 'Any unique design number',
        notes: 'Repeat the same design_no in multiple rows for multiple colors of one design'
      },
      {
        column_name: 'color_code',
        allowed_values: 'Hex color code such as #FFFFFF',
        notes: 'Include the # prefix'
      },
      {
        column_name: 'price',
        allowed_values: 'Whole number or decimal',
        notes: 'Example: 1500'
      },
      {
        column_name: 'stock_quantity and size columns',
        allowed_values: 'Non-negative numbers',
        notes: 'Use 0 if not applicable'
      },
      {
        column_name: 'work_type',
        allowed_values: 'plain, printed, emboidered, chikankari, shaded, handwork',
        notes: 'Optional. Must be one of the allowed values exactly'
      },
      {
        column_name: 'occasion',
        allowed_values: 'festive, casual, wedding, office wear, daily wear',
        notes: 'Optional. Must be one of the allowed values exactly'
      },
      {
        column_name: 'collection',
        allowed_values: 'summer collection, winter collection, puja collection, eid collection',
        notes: 'Optional. Must match one of the allowed values exactly'
      },
      {
        column_name: 'design_month_year',
        allowed_values: 'YYYY-MM-01 format',
        notes: 'Optional. First day of the design month. Example: 2024-01-01 for January 2024'
      },
      {
        column_name: 'tags',
        allowed_values: 'Comma-separated tags',
        notes: 'Optional. Separate multiple tags with commas. Example: festive, wedding, silk'
      },
      {
        column_name: 'in_stock',
        allowed_values: 'TRUE, FALSE',
        notes: 'Required. Use TRUE for in stock, FALSE for out of stock'
      }
    ];

    const instructionsData = [
      {
        step: 1,
        instruction: 'Fill the Designs sheet only. Do not rename the headers.'
      },
      {
        step: 2,
        instruction: 'Use one row per color. Repeat design details for each additional color of the same design.'
      },
      {
        step: 3,
        instruction: 'For category, style, fabric_type, and brand, use names that already exist in the app.'
      },
      {
        step: 4,
        instruction: 'Use department values only from the Allowed Values sheet.'
      },
      {
        step: 5,
        instruction: 'Available sizes should be comma-separated, for example S,M,L,XL.'
      },
      {
        step: 6,
        instruction: 'Keep numeric fields as numbers only, without currency symbols or text.'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const allowedValuesSheet = XLSX.utils.json_to_sheet(allowedValuesData);
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Designs');
    XLSX.utils.book_append_sheet(workbook, allowedValuesSheet, 'Allowed Values');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // design_no
      { wch: 25 }, // name
      { wch: 40 }, // description
      { wch: 12 }, // department
      { wch: 15 }, // category
      { wch: 15 }, // style
      { wch: 15 }, // fabric_type
      { wch: 15 }, // brand
      { wch: 10 }, // price
      { wch: 20 }, // available_sizes
      { wch: 15 }, // color_name
      { wch: 12 }, // color_code
      { wch: 15 }, // stock_quantity
      { wch: 8 },  // size_S
      { wch: 8 },  // size_M
      { wch: 8 },  // size_L
      { wch: 8 },  // size_XL
      { wch: 8 },  // size_XXL
      { wch: 8 },  // size_XXXL
      { wch: 15 }, // work_type
      { wch: 15 }, // occasion
      { wch: 20 }, // collection
      { wch: 18 }, // design_month_year
      { wch: 25 }, // tags
      { wch: 10 }  // in_stock
    ];

    allowedValuesSheet['!cols'] = [
      { wch: 28 },
      { wch: 40 },
      { wch: 60 }
    ];

    instructionsSheet['!cols'] = [
      { wch: 10 },
      { wch: 90 }
    ];

    // Add data validations (dropdowns) to the Designs sheet
    // Note: xlsx library has limited support for data validation, but we'll add it where possible
    if (!worksheet['!dataValidation']) {
      worksheet['!dataValidation'] = [];
    }

    // Add dropdown for department column (column D, index 3)
    // Apply to rows 2-1000 (row 1 is header)
    for (let row = 2; row <= 1000; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 3 }); // department is column D (index 3)
      if (!worksheet['!dataValidation']) worksheet['!dataValidation'] = [];
      worksheet['!dataValidation'].push({
        sqref: cellRef,
        type: 'list',
        formula1: '"mens,boys"',
        allowBlank: true,
        showDropDown: true
      });
    }

    // Add dropdown for category column (column E, index 4)
    if (categories.length > 0) {
      const categoryList = categories.map(c => c.name).join(',');
      for (let row = 2; row <= 1000; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 4 });
        worksheet['!dataValidation'].push({
          sqref: cellRef,
          type: 'list',
          formula1: `"${categoryList}"`,
          allowBlank: true,
          showDropDown: true
        });
      }
    }

    // Add dropdown for style column (column F, index 5)
    if (styles.length > 0) {
      const styleList = styles.map(s => s.name).join(',');
      for (let row = 2; row <= 1000; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 5 });
        worksheet['!dataValidation'].push({
          sqref: cellRef,
          type: 'list',
          formula1: `"${styleList}"`,
          allowBlank: true,
          showDropDown: true
        });
      }
    }

    // Add dropdown for fabric_type column (column G, index 6)
    if (fabricTypes.length > 0) {
      const fabricList = fabricTypes.map(f => f.name).join(',');
      for (let row = 2; row <= 1000; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 6 });
        worksheet['!dataValidation'].push({
          sqref: cellRef,
          type: 'list',
          formula1: `"${fabricList}"`,
          allowBlank: true,
          showDropDown: true
        });
      }
    }

    // Add dropdown for brand column (column H, index 7)
    if (brands.length > 0) {
      const brandList = brands.map(b => b.name).join(',');
      for (let row = 2; row <= 1000; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 7 });
        worksheet['!dataValidation'].push({
          sqref: cellRef,
          type: 'list',
          formula1: `"${brandList}"`,
          allowBlank: true,
          showDropDown: true
        });
      }
    }

    // Add dropdown for work_type column (column T, index 19)
    const workTypeList = 'plain,printed,emboidered,chikankari,shaded,handwork';
    for (let row = 2; row <= 1000; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 19 });
      worksheet['!dataValidation'].push({
        sqref: cellRef,
        type: 'list',
        formula1: `"${workTypeList}"`,
        allowBlank: true,
        showDropDown: true
      });
    }

    // Add dropdown for occasion column (column U, index 20)
    const occasionList = 'festive,casual,wedding,office wear,daily wear';
    for (let row = 2; row <= 1000; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 20 });
      worksheet['!dataValidation'].push({
        sqref: cellRef,
        type: 'list',
        formula1: `"${occasionList}"`,
        allowBlank: true,
        showDropDown: true
      });
    }

    // Add dropdown for collection column (column V, index 21)
    const collectionList = 'summer collection,winter collection,puja collection,eid collection';
    for (let row = 2; row <= 1000; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 21 });
      worksheet['!dataValidation'].push({
        sqref: cellRef,
        type: 'list',
        formula1: `"${collectionList}"`,
        allowBlank: true,
        showDropDown: true
      });
    }

    // Add dropdown for in_stock column (column Y, index 24)
    const inStockList = 'TRUE,FALSE';
    for (let row = 2; row <= 1000; row++) {
      const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 24 });
      worksheet['!dataValidation'].push({
        sqref: cellRef,
        type: 'list',
        formula1: `"${inStockList}"`,
        allowBlank: false,
        showDropDown: true
      });
    }

    XLSX.writeFile(workbook, 'design_import_template.xlsx');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setSuccess('');
    setPreviewData([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet);
      
      if (jsonData.length === 0) {
        setError('The Excel file is empty');
        return;
      }

      setPreviewData(jsonData.slice(0, 5)); // Show first 5 rows as preview
    } catch (err) {
      setError('Failed to read Excel file. Please ensure it\'s a valid Excel file.');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

      // Group rows by design_no to handle multiple colors per design
      const designsMap = new Map<string, any>();

      for (const row of jsonData) {
        if (!row.design_no || !row.name) {
          continue; // Skip invalid rows
        }

        if (!designsMap.has(row.design_no)) {
          designsMap.set(row.design_no, {
            design_no: row.design_no,
            name: row.name,
            description: row.description || '',
            department: row.department || undefined,
            category_id: row.category || undefined,
            style_id: row.style || undefined,
            fabric_type_id: row.fabric_type || undefined,
            brand_id: row.brand || undefined,
            price: row.price || 0,
            available_sizes: row.available_sizes ? row.available_sizes.split(',').map(s => s.trim()) : [],
            colors: []
          });
        }

        const design = designsMap.get(row.design_no);
        if (row.color_name) {
          design.colors.push({
            color_name: row.color_name,
            color_code: row.color_code || '#000000',
            in_stock: true,
            stock_quantity: row.stock_quantity || 0,
            size_quantities: {
              S: row.size_S || 0,
              M: row.size_M || 0,
              L: row.size_L || 0,
              XL: row.size_XL || 0,
              XXL: row.size_XXL || 0,
              XXXL: row.size_XXXL || 0
            },
            image_urls: []
          });
        }
      }

      // Create designs one by one
      let successCount = 0;
      let errorCount = 0;

      for (const design of designsMap.values()) {
        try {
          await api.createDesign(design);
          successCount++;
        } catch (err) {
          console.error(`Failed to import design ${design.design_no}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully imported ${successCount} design(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError('Failed to import any designs. Please check the file format and try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import designs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-primary">Import Designs</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Download Template */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Download Sample Template</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Download the Excel template to see the required format. Fill in your design data following the same structure.
                  </p>
                  <button
                    onClick={downloadSampleTemplate}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                </div>
              </div>
            </div>

            {/* Upload File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Excel File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  {file ? file.name : 'Click to select or drag and drop your Excel file'}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  <Upload className="w-4 h-4" />
                  Select File
                </button>
              </div>
            </div>

            {/* Preview */}
            {previewData.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Preview (First 5 rows)</h3>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Design No</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 whitespace-nowrap">{row.design_no}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2">{row.department}</td>
                          <td className="px-3 py-2">{row.color_name}</td>
                          <td className="px-3 py-2">₹{row.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowTransformModal(true)}
            className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg font-semibold hover:bg-purple-200 transition flex items-center gap-2"
          >
            <FileUp className="w-4 h-4" />
            Transform Data
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Importing...' : 'Import Designs'}
          </button>
        </div>
      </div>

      {showTransformModal && (
        <TransformDataModal
          onClose={() => setShowTransformModal(false)}
          onSuccess={() => {
            setShowTransformModal(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}
