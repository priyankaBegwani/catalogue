import { useState, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Check, FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { TransformDataStepper } from './TransformDataStepper';
import { UploadInputsStep } from './UploadInputsStep';
import { PreviewDataGrid } from './PreviewDataGrid';
import { ConfirmationSummary } from './ConfirmationSummary';
import { api } from '../lib/api';

interface TransformDataModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export type TransformStep = 1 | 2 | 3 | 4;

export interface TransformedRow {
  [key: string]: string | number | boolean | null;
}

export interface TransformResult {
  success: boolean;
  message: string;
  preview_rows: TransformedRow[];
  total_rows: number;
  warnings: Array<{ column?: string; row?: number; warning: string }>;
  errors: Array<{ column?: string; row?: number; error: string }>;
  transformed_columns: string[];
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function TransformDataModal({ onClose, onSuccess }: TransformDataModalProps) {
  const [currentStep, setCurrentStep] = useState<TransformStep>(1);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [transformedData, setTransformedData] = useState<TransformedRow[]>([]);
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null);
  const [upsertResult, setUpsertResult] = useState<UpsertResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFilesSelected = useCallback((source: File | null, template: File | null) => {
    setSourceFile(source);
    setTemplateFile(template);
  }, []);

  const handleTransform = async () => {
    if (!sourceFile || !templateFile) {
      setError('Please select both source file and template file');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep(2);

    try {
      const formData = new FormData();
      formData.append('source_file', sourceFile);
      formData.append('template_file', templateFile);
      
      // Default mapping config - can be enhanced to load from saved configs
      const defaultMapping = {
        column_mappings: {},
        value_transformations: {},
        default_values: { is_active: true, is_archived: false },
        required_columns: ['design_no', 'name'],
        skip_rows: 0
      };
      formData.append('mapping_config', JSON.stringify(defaultMapping));

      const response = await fetch('http://localhost:8001/api/transform-design-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Transform failed: ${response.statusText}`);
      }

      const result: TransformResult = await response.json();
      setTransformResult(result);
      setTransformedData(result.preview_rows);
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transform data');
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = useCallback((newData: TransformedRow[]) => {
    setTransformedData(newData);
  }, []);

  const handleConfirmUpsert = async () => {
    setLoading(true);
    setError('');
    setCurrentStep(4);

    const BULK_THRESHOLD = 200; // Use bulk API for 200+ rows

    try {
      if (transformedData.length >= BULK_THRESHOLD) {
        // Use bulk API for large datasets
        const designs = transformedData.map(row => ({
          design_no: String(row.design_no || ''),
          name: String(row.name || ''),
          description: String(row.description || ''),
          department: (row.department as 'mens' | 'boys') || undefined,
          category_id: row.category_id ? String(row.category_id) : undefined,
          style_id: row.style_id ? String(row.style_id) : undefined,
          fabric_type_id: row.fabric_type_id ? String(row.fabric_type_id) : undefined,
          brand_id: row.brand_id ? String(row.brand_id) : undefined,
          price: row.price ? Number(row.price) : 0,
          work_type: row.work_type as any,
          occasion: row.occasion as any,
          collection: row.collection as any,
          design_month_year: row.design_month_year ? String(row.design_month_year) : undefined,
          available_sizes: row.available_sizes
            ? String(row.available_sizes).split(',').map((s: string) => s.trim())
            : undefined,
          tags: row.tags
            ? String(row.tags).split(',').map((s: string) => s.trim())
            : undefined,
        }));

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL.replace('/rest/v1', '') : 'http://localhost:3000'}/api/designs/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ designs }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Bulk upsert failed: ${response.statusText}`);
        }

        const result: UpsertResult = await response.json();
        setUpsertResult(result);
      } else {
        // Use individual API calls for small datasets (better error granularity)
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const row of transformedData) {
          try {
            const designData = {
              design_no: String(row.design_no || ''),
              name: String(row.name || ''),
              description: String(row.description || ''),
              department: (row.department as 'mens' | 'boys') || undefined,
              category_id: row.category_id ? String(row.category_id) : undefined,
              style_id: row.style_id ? String(row.style_id) : undefined,
              fabric_type_id: row.fabric_type_id ? String(row.fabric_type_id) : undefined,
              brand_id: row.brand_id ? String(row.brand_id) : undefined,
              price: row.price ? Number(row.price) : 0,
              work_type: row.work_type as any,
              occasion: row.occasion as any,
              collection: row.collection as any,
              design_month_year: row.design_month_year ? String(row.design_month_year) : undefined,
              available_sizes: row.available_sizes
                ? String(row.available_sizes).split(',').map((s: string) => s.trim())
                : undefined,
              tags: row.tags
                ? String(row.tags).split(',').map((s: string) => s.trim())
                : undefined,
              colors: row.color_name ? [{
                color_name: String(row.color_name),
                color_code: row.color_code ? String(row.color_code) : undefined,
                in_stock: row.in_stock === 'TRUE' || row.in_stock === true || row.in_stock === '1',
                stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
                size_quantities: {
                  S: Number(row.size_S) || 0,
                  M: Number(row.size_M) || 0,
                  L: Number(row.size_L) || 0,
                  XL: Number(row.size_XL) || 0,
                  XXL: Number(row.size_XXL) || 0,
                  XXXL: Number(row.size_XXXL) || 0,
                },
                image_urls: row.image_urls
                  ? String(row.image_urls).split(',').map((s: string) => s.trim())
                  : [],
              }] : [],
            };

            try {
              const existingDesigns = await api.getDesigns();
              const existingDesign = existingDesigns.find((d: any) =>
                d.design_no?.toLowerCase() === designData.design_no.toLowerCase()
              );

              if (existingDesign) {
                await api.updateDesign(existingDesign.id, designData);
                updated++;
              } else {
                await api.createDesign(designData);
                inserted++;
              }
            } catch (lookupErr) {
              try {
                await api.createDesign(designData);
                inserted++;
              } catch (createErr: any) {
                if (createErr.message?.includes('duplicate') || createErr.message?.includes('already exists')) {
                  errors.push(`Design ${designData.design_no}: Already exists (could not update)`);
                  skipped++;
                } else {
                  throw createErr;
                }
              }
            }
          } catch (rowErr: any) {
            const designNo = row.design_no || 'unknown';
            errors.push(`Design ${designNo}: ${rowErr.message || 'Failed to save'}`);
            skipped++;
          }
        }

        const result: UpsertResult = { inserted, updated, skipped, errors };
        setUpsertResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save designs');
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as TransformStep);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return sourceFile && templateFile && !loading;
      case 3:
        return transformedData.length > 0 && !loading;
      default:
        return !loading;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <UploadInputsStep
            sourceFile={sourceFile}
            templateFile={templateFile}
            onFilesSelected={handleFilesSelected}
            isProcessing={loading}
          />
        );
      case 2:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transforming Data...</h3>
            <p className="text-sm text-gray-500">Applying mapping rules and converting to target format</p>
          </div>
        );
      case 3:
        return transformResult ? (
          <PreviewDataGrid
            data={transformedData}
            columns={transformResult.transformed_columns}
            warnings={transformResult.warnings}
            errors={transformResult.errors}
            totalRows={transformResult.total_rows}
            onDataChange={handleDataChange}
          />
        ) : null;
      case 4:
        return upsertResult ? (
          <ConfirmationSummary
            result={upsertResult}
            totalRows={transformedData.length}
            onBack={() => setCurrentStep(3)}
            onComplete={() => {
              onSuccess();
              onClose();
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Saving to Database...</h3>
            <p className="text-sm text-gray-500">Performing upsert operations</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <FileUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transform & Import Data</h2>
              <p className="text-sm text-gray-500">Map, transform, preview, and upsert design data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-6">
          <TransformDataStepper currentStep={currentStep} />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {currentStep === 1 && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            )}
            {currentStep > 1 && currentStep < 4 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep === 1 && (
              <button
                onClick={handleTransform}
                disabled={!canProceed()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Transform Data
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 3 && (
              <>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition"
                >
                  Start Over
                </button>
                <button
                  onClick={handleConfirmUpsert}
                  disabled={!canProceed()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Save
                    </>
                  )}
                </button>
              </>
            )}

            {currentStep === 4 && upsertResult && (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
