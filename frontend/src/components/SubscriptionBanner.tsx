import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useBranding } from '../hooks/useBranding';

export function SubscriptionBanner() {
  const { subscriptionStatus, daysRemaining, inGracePeriod } = useTenant();
  const branding = useBranding();
  const [dismissed, setDismissed] = useState(false);

  // Show banner when: in grace period OR trial with ≤ 7 days remaining
  const shouldShow = !dismissed && (
    inGracePeriod ||
    (subscriptionStatus === 'trial' && daysRemaining != null && daysRemaining <= 7)
  );

  if (!shouldShow) return null;

  const isUrgent = inGracePeriod || (daysRemaining != null && daysRemaining <= 3);

  const message = inGracePeriod
    ? 'Your subscription has ended. Your account will be frozen soon — renew now.'
    : daysRemaining === 0
      ? 'Your trial expires today!'
      : `Your trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

  const whatsappHref = branding.whatsappNumber
    ? `https://wa.me/${branding.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'd like to subscribe to ${branding.brandName}.`)}`
    : null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between gap-4 ${isUrgent ? 'bg-red-600' : 'bg-amber-500'} text-white shadow-lg`}>
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium truncate">{message}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          to="/subscription"
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline"
        >
          View Plans
        </Link>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline underline-offset-2 hover:no-underline"
          >
            Renew via WhatsApp
          </a>
        )}
        <button onClick={() => setDismissed(true)} aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
