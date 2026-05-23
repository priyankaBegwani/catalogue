import { useRef } from 'react';
import { Upload, FileSpreadsheet, X, Check, FileUp, AlertCircle } from 'lucide-react';

interface UploadInputsStepProps {
  sourceFile: File | null;
  templateFile: File | null;
  onFilesSelected: (source: File | null, template: File | null) => void;
  isProcessing: boolean;
}

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  label: string;
  description: string;
  acceptedFormats: string;
  icon: React.ReactNode;
  isRequired?: boolean;
}

function FileUploadZone({
  file,
  onFileSelect,
  label,
  description,
  acceptedFormats,
  icon,
  isRequired = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {isRequired && <span className="text-red-500">*</span>}
      </div>

      {file ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
              </p>
            </div>
          </div>
          <button
            onClick={() => onFileSelect(null)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isProcessing 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptedFormats}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) onFileSelect(selected);
            }}
            className="hidden"
            disabled={isProcessing}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              {icon}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium text-purple-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400">{description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function UploadInputsStep({
  sourceFile,
  templateFile,
  onFilesSelected,
  isProcessing,
}: UploadInputsStepProps) {
  const allFilesSelected = sourceFile && templateFile;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-blue-900 mb-1">How it works</h4>
          <p className="text-sm text-blue-700">
            Upload your source data file and a target template. The system will map columns, 
            transform values, and let you preview before saving to the database.
          </p>
        </div>
      </div>

      {/* File Uploads */}
      <div className="space-y-6">
        <FileUploadZone
          file={sourceFile}
          onFileSelect={(file) => onFilesSelected(file, templateFile)}
          label="Source Data File"
          description="Your raw data file (.xlsx, .xls, .csv)"
          acceptedFormats=".csv,.xlsx,.xls"
          icon={<Upload className="w-6 h-6 text-gray-400" />}
          isRequired
        />

        <FileUploadZone
          file={templateFile}
          onFileSelect={(file) => onFilesSelected(sourceFile, file)}
          label="Target Template File"
          description="Template with desired column structure (.xlsx, .xls, .csv)"
          acceptedFormats=".csv,.xlsx,.xls"
          icon={<FileUp className="w-6 h-6 text-gray-400" />}
          isRequired
        />
      </div>

      {/* Validation Status */}
      {allFilesSelected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">Files ready for transformation</p>
              <p className="text-sm text-green-700">
                {sourceFile.name} + {templateFile.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Tips:</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-gray-400">•</span>
            Ensure your source file has a header row with column names
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400">•</span>
            The template file defines the output structure and column order
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400">•</span>
            Column mapping will be auto-suggested based on name similarity
          </li>
        </ul>
      </div>
    </div>
  );
}
