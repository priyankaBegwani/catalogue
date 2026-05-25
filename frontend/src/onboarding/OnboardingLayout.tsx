import { ReactNode } from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { useOnboarding } from './OnboardingContext';
import { useBranding } from '../hooks/useBranding';

const STEP_LABELS: Record<number, string> = {
  3: 'Start Method',
  4: 'Import Products',
  5: 'Import Parties',
  6: 'Team Invite',
  7: 'WhatsApp Setup',
  8: 'First Order',
};

type Props = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function OnboardingLayout({ children, title, subtitle }: Props) {
  const { activeSteps, completedSteps, currentStep, stepIndex, totalSteps, canGoBack, goBack } = useOnboarding();
  const branding = useBranding();
  const pct = Math.round(((stepIndex - 1) / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={branding.logoUrl} alt={branding.brandName} className="h-8 w-auto" />
          <span className="text-sm text-gray-400 hidden sm:block">Setup Wizard</span>
        </div>
        <span className="text-xs text-gray-400">Step {stepIndex} of {totalSteps}</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step trail */}
      {/* Back button row */}
      {canGoBack && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      )}

      <div className="bg-white border-b border-gray-100 px-4 py-3 overflow-x-auto">
        <ol className="flex items-center gap-1 min-w-max mx-auto max-w-3xl">
          {activeSteps.map((step, idx) => {
            const done    = completedSteps.includes(step);
            const current = step === currentStep;
            return (
              <li key={step} className="flex items-center gap-1">
                {idx > 0 && (
                  <div className={`w-6 h-px ${done ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  done    ? 'bg-primary/10 text-primary' :
                  current ? 'bg-primary text-white' :
                            'bg-gray-100 text-gray-400'
                }`}>
                  {done
                    ? <CheckCircle className="w-3 h-3" />
                    : <span className="w-4 h-4 flex items-center justify-center rounded-full text-[10px]">{idx + 1}</span>
                  }
                  <span className="hidden sm:block">{STEP_LABELS[step]}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
