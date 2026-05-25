/**
 * Assisted Onboarding Status Screen
 *
 * Shown instead of the normal wizard steps after user submits the
 * "We Setup For You" form. Polls the assistance request status and
 * shows a live progress tracker so the user never feels abandoned.
 *
 * Status progression shown to user:
 *   pending           → "Request received — we'll call you soon"
 *   in_progress       → "Our team is setting up your catalog"
 *   preview_ready     → "Your catalog preview is ready!" (with link)
 *   changes_requested → "Making your requested changes"
 *   payment_pending   → "Almost there — approve your preview"
 *   paid / complete   → "You're live! 🎉"
 */

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, Wrench, Eye, Sparkles, ExternalLink } from 'lucide-react';
import { API_URL } from '../../config/backend';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

type AssistanceStatus = {
  id: string;
  status: string;
  preview_token: string | null;
  setup_fee_paise: number;
  final_paid_at: string | null;
  published_at: string | null;
  created_at: string;
};

const STEPS: {
  statuses: string[];
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    statuses: ['pending'],
    icon:     <Clock className="w-4 h-4" />,
    title:    'Request received',
    description: 'We got your request. Our team will contact you on WhatsApp within a few hours.',
  },
  {
    statuses: ['in_progress'],
    icon:     <Wrench className="w-4 h-4" />,
    title:    'Setting up your catalog',
    description: 'Our team is organizing your data, uploading photos, and completing your product catalog.',
  },
  {
    statuses: ['preview_ready', 'changes_requested', 'payment_pending'],
    icon:     <Eye className="w-4 h-4" />,
    title:    'Preview ready',
    description: 'Your catalog has been set up. We sent a preview link to your WhatsApp — please review and approve.',
  },
  {
    statuses: ['paid', 'complete'],
    icon:     <Sparkles className="w-4 h-4" />,
    title:    "You're live!",
    description: 'Your catalog is published and ready to share with retailers.',
  },
];

function getStepIndex(status: string): number {
  return STEPS.findIndex(s => s.statuses.includes(status));
}

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

export function AssistedStatus() {
  const [request,   setRequest]   = useState<AssistanceStatus | null>(null);
  const [loading,   setLoading]   = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${API_URL}/api/onboarding/assistance-status`, { headers: authHeaders() });
      const j = await r.json();
      if (j.success && j.data) setRequest(j.data);
    } catch {
      // non-fatal — keep showing last known state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const status     = request?.status ?? 'pending';
  const activeStep = getStepIndex(status);
  const isLive     = ['paid', 'complete'].includes(status);
  const previewUrl = request?.preview_token ? `/preview/${request.preview_token}` : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      {/* Header */}
      <div className="text-center mb-8">
        {isLive
          ? (
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-green-600" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wrench className="w-7 h-7 text-primary" />
            </div>
          )
        }
        <h1 className="text-xl font-bold text-gray-900">
          {isLive ? "Your catalog is live!" : "Setting up your catalog"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLive
            ? "Everything is ready. Start sharing your catalog with retailers."
            : "Our team is working on it. We'll notify you on WhatsApp at each step."
          }
        </p>
      </div>

      {/* Progress steps */}
      <div className="space-y-3 mb-8">
        {STEPS.map((step, idx) => {
          const done    = idx < activeStep;
          const current = idx === activeStep;
          const upcoming = idx > activeStep;

          return (
            <div
              key={idx}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                current  ? 'bg-primary/5 border-primary/20' :
                done     ? 'bg-gray-50 border-gray-100' :
                           'bg-white border-gray-100 opacity-40'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                done    ? 'bg-primary text-white' :
                current ? 'bg-primary text-white' :
                          'bg-gray-200 text-gray-400'
              }`}>
                {done
                  ? <CheckCircle className="w-4 h-4" />
                  : step.icon
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${current ? 'text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                  {step.title}
                  {current && !done && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      In progress
                    </span>
                  )}
                </p>
                <p className={`text-xs mt-0.5 ${current ? 'text-gray-500' : 'text-gray-400'}`}>
                  {step.description}
                </p>

                {/* Preview link when preview_ready */}
                {current && step.statuses.includes('preview_ready') && previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open your catalog preview
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live CTAs */}
      {isLive && (
        <div className="space-y-2">
          <a
            href="/"
            className="block w-full text-center px-5 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all text-sm"
          >
            Go to your dashboard
          </a>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all text-sm"
            >
              View & export your data
            </a>
          )}
        </div>
      )}

      {/* Footer note */}
      {!isLive && (
        <p className="text-center text-xs text-gray-400">
          This page updates automatically. You'll also receive WhatsApp messages at each milestone.
        </p>
      )}
    </div>
  );
}
