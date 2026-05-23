import { Upload, FileSpreadsheet, Table2, CheckCircle } from 'lucide-react';
import { TransformStep } from './TransformDataModal';

interface TransformDataStepperProps {
  currentStep: TransformStep;
}

const steps = [
  { id: 1, label: 'Upload Files', icon: Upload },
  { id: 2, label: 'Transform', icon: FileSpreadsheet },
  { id: 3, label: 'Preview & Edit', icon: Table2 },
  { id: 4, label: 'Confirm', icon: CheckCircle },
] as const;

export function TransformDataStepper({ currentStep }: TransformDataStepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium transition-colors duration-300
                    ${isActive ? 'text-purple-700' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`
                    flex-1 h-0.5 mx-4 transition-colors duration-300
                    ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
