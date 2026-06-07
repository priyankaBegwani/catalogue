import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_URL } from '../config/backend';

export type StartMethod = 'import' | 'assisted' | 'fresh';

export type OnboardingState = {
  currentStep: number;
  completedSteps: number[];
  startMethod: StartMethod | null;
  isComplete: boolean;
  isLoading: boolean;
};

type OnboardingContextValue = OnboardingState & {
  goToStep: (step: number) => void;
  goBack: () => void;
  completeStep: (step: number) => void;
  setStartMethod: (method: StartMethod) => void;
  completeOnboarding: () => void;
  activeSteps: number[];
  totalSteps: number;
  stepIndex: number; // 1-based position in activeSteps
  canGoBack: boolean;
};

// Steps that require the "import" path
const IMPORT_STEPS = [4, 5];

function getActiveSteps(method: StartMethod | null): number[] {
  const all = [3, 4, 5, 6, 7, 8];
  if (method === 'fresh' || method === 'assisted') {
    return all.filter(s => !IMPORT_STEPS.includes(s));
  }
  return all;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

async function fetchProgress(): Promise<OnboardingState | null> {
  try {
    const res  = await fetch(`${API_URL}/api/onboarding/progress`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success || !json.data) return null;
    const d = json.data;
    return {
      currentStep:    d.current_step    ?? 3,
      completedSteps: d.completed_steps ?? [],
      startMethod:    d.start_method    ?? null,
      isComplete:     d.is_complete     ?? false,
      isLoading:      false,
    };
  } catch {
    return null;
  }
}

async function saveProgress(patch: Partial<{
  current_step: number;
  completed_steps: number[];
  start_method: string;
  is_complete: boolean;
}>) {
  try {
    await fetch(`${API_URL}/api/onboarding/progress`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(patch),
    });
  } catch {
    // non-fatal — progress persists locally too
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    currentStep:    3,
    completedSteps: [],
    startMethod:    null,
    isComplete:     false,
    isLoading:      true,
  });

  // Load progress on mount
  useEffect(() => {
    fetchProgress().then(progress => {
      if (progress) {
        setState(progress);
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    });
  }, []);

  const activeSteps = getActiveSteps(state.startMethod);
  const stepIndex   = Math.max(1, activeSteps.indexOf(state.currentStep) + 1);
  const canGoBack   = stepIndex > 1;

  const goToStep = useCallback((step: number) => {
    setState(s => {
      const next = { ...s, currentStep: step };
      saveProgress({ current_step: step });
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setState(s => {
      const active   = getActiveSteps(s.startMethod);
      const currIdx  = active.indexOf(s.currentStep);
      if (currIdx <= 0) return s;
      const prevStep = active[currIdx - 1];
      // Also un-complete the current step so it can be re-done
      const completedSteps = s.completedSteps.filter(x => x !== s.currentStep);
      const next = { ...s, currentStep: prevStep, completedSteps };
      saveProgress({ current_step: prevStep, completed_steps: completedSteps });
      return next;
    });
  }, []);

  const completeStep = useCallback((step: number) => {
    setState(s => {
      const completedSteps = s.completedSteps.includes(step)
        ? s.completedSteps
        : [...s.completedSteps, step];
      const active = getActiveSteps(s.startMethod);
      const currentIdx = active.indexOf(step);
      const nextStep = currentIdx >= 0 && currentIdx < active.length - 1
        ? active[currentIdx + 1]
        : step;
      const next = { ...s, completedSteps, currentStep: nextStep };
      saveProgress({ current_step: nextStep, completed_steps: completedSteps });
      return next;
    });
  }, []);

  const setStartMethod = useCallback((method: StartMethod) => {
    setState(s => {
      const next = { ...s, startMethod: method };
      saveProgress({ start_method: method });
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setState(s => {
      const next = { ...s, isComplete: true };
      saveProgress({ is_complete: true });
      return next;
    });
  }, []);

  return (
    <OnboardingContext.Provider value={{
      ...state,
      goToStep,
      goBack,
      completeStep,
      setStartMethod,
      completeOnboarding,
      activeSteps,
      totalSteps: activeSteps.length,
      stepIndex,
      canGoBack,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
