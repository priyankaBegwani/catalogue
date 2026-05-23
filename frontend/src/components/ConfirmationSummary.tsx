import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Database, TrendingUp } from 'lucide-react';
import { UpsertResult } from './TransformDataModal';

interface ConfirmationSummaryProps {
  result: UpsertResult;
  totalRows: number;
  onBack: () => void;
  onComplete: () => void;
}

export function ConfirmationSummary({ result, totalRows, onBack, onComplete }: ConfirmationSummaryProps) {
  const { inserted, updated, skipped, errors } = result;
  const processedCount = inserted + updated + skipped;
  const successCount = inserted + updated;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Database className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Import Complete!</h3>
        <p className="text-gray-600">
          Successfully processed {successCount} of {totalRows} designs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{inserted}</p>
          <p className="text-sm text-green-700">New Designs Inserted</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{updated}</p>
          <p className="text-sm text-blue-700">Existing Designs Updated</p>
        </div>

        <div className={`border rounded-xl p-4 text-center ${skipped > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${skipped > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${skipped > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
          </div>
          <p className={`text-3xl font-bold ${skipped > 0 ? 'text-orange-900' : 'text-gray-600'}`}>{skipped}</p>
          <p className={`text-sm ${skipped > 0 ? 'text-orange-700' : 'text-gray-500'}`}>Skipped/Errors</p>
        </div>
      </div>

      {/* Summary Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Import Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Total rows processed</span>
            <span className="font-medium text-gray-900">{processedCount}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">New designs created</span>
            <span className="font-medium text-green-600">+{inserted}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Existing designs updated</span>
            <span className="font-medium text-blue-600">~{updated}</span>
          </div>
          {skipped > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Skipped due to errors</span>
              <span className="font-medium text-orange-600">{skipped}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="font-medium text-gray-900">Success rate</span>
            <span className="font-bold text-green-600">
              {processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Error Details */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-900">Errors Encountered</h4>
          </div>
          <ul className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((err, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                {err}
              </li>
            ))}
            {errors.length > 10 && (
              <li className="text-red-600 italic">...and {errors.length - 10} more errors</li>
            )}
          </ul>
        </div>
      )}

      {/* Success Note */}
      {errors.length === 0 && skipped === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-green-900 mb-1">Perfect Import!</h4>
            <p className="text-sm text-green-700">
              All {totalRows} designs were successfully imported into the database without any errors.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition"
        >
          Back to Edit
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Complete & Close
        </button>
      </div>
    </div>
  );
}
