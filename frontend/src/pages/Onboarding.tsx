import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from '../onboarding/OnboardingContext';
import { Step3StartMethod }  from '../onboarding/steps/Step3StartMethod';
import { Step4DesignImport } from '../onboarding/steps/Step4DesignImport';
import { Step5PartyImport }  from '../onboarding/steps/Step5PartyImport';
import { Step6TeamInvite }   from '../onboarding/steps/Step6TeamInvite';
import { Step7WhatsApp }     from '../onboarding/steps/Step7WhatsApp';
import { AssistedStatus }    from '../onboarding/steps/AssistedStatus';

function OnboardingRouter() {
  const { currentStep, startMethod, isComplete, isLoading } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (isComplete) {
      navigate('/', { replace: true });
    }
  }, [isComplete, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // Assisted path: after step 3 is done, show the live status tracker
  // instead of the normal import/invite wizard steps.
  if (startMethod === 'assisted' && currentStep > 3) {
    return <AssistedStatus />;
  }

  switch (currentStep) {
    case 3:  return <Step3StartMethod />;
    case 4:  return <Step4DesignImport />;
    case 5:  return <Step5PartyImport />;
    case 6:  return <Step6TeamInvite />;
    case 7:  return <Step7WhatsApp />;
    // Step 8 (First Order) removed from onboarding — users do this naturally
    default: return <Step3StartMethod />;
  }
}

export function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingRouter />
    </OnboardingProvider>
  );
}

export default Onboarding;
