import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, X, ChevronRight, Package, Users, UserPlus, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/backend';

type TaskItem = {
  id:      string;
  label:   string;
  hint:    string;
  icon:    React.ReactNode;
  done:    boolean;
  action?: { label: string; to: string };
};

function authHeaders() {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

const DISMISSED_KEY = 'onboarding_banner_dismissed';

export function OnboardingProgressBanner() {
  const navigate = useNavigate();
  const [tasks,     setTasks]     = useState<TaskItem[] | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');

  useEffect(() => {
    if (dismissed) return;

    fetch(`${API_URL}/api/onboarding/quick-stats`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const catalogShared = localStorage.getItem('catalog_shared') === '1';

        setTasks([
          {
            id:     'designs',
            label:  'Add your products',
            hint:   data.designs > 0 ? `${data.designs} design${data.designs === 1 ? '' : 's'} added` : 'Your catalog starts here',
            icon:   <Package className="w-4 h-4" />,
            done:   data.designs > 0,
            action: { label: 'Add designs', to: '/designs' },
          },
          {
            id:     'parties',
            label:  'Add your customers',
            hint:   data.parties > 0 ? `${data.parties} customer${data.parties === 1 ? '' : 's'} added` : 'Manage who you sell to',
            icon:   <Users className="w-4 h-4" />,
            done:   data.parties > 0,
            action: { label: 'Add customers', to: '/parties' },
          },
          {
            id:     'team',
            label:  'Invite your team',
            hint:   data.team > 0 ? `${data.team} team member${data.team === 1 ? '' : 's'} invited` : 'Add staff and sales people',
            icon:   <UserPlus className="w-4 h-4" />,
            done:   data.team > 0,
            action: { label: 'Invite', to: '/users' },
          },
          {
            id:     'share',
            label:  'Share your catalog',
            hint:   catalogShared ? 'Catalog link shared' : 'Send your catalog link on WhatsApp',
            icon:   <Share2 className="w-4 h-4" />,
            done:   catalogShared,
            action: { label: 'Go to catalog', to: '/catalogue' },
          },
        ]);
      })
      .catch(() => {/* silently skip */});
  }, [dismissed]);

  if (dismissed || !tasks) return null;

  const doneCount = tasks.filter(t => t.done).length;

  // Auto-hide once all 4 done
  if (doneCount === tasks.length) return null;

  const handleAction = (task: TaskItem) => {
    if (task.id === 'share') {
      localStorage.setItem('catalog_shared', '1');
    }
    if (task.action) navigate(task.action.to);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {tasks.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < doneCount ? 'w-6 bg-primary' : 'w-3 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {doneCount}/{tasks.length} setup tasks complete
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Task list */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`flex items-start gap-3 px-5 py-4 ${task.done ? 'opacity-60' : ''}`}
          >
            <div className={`mt-0.5 flex-shrink-0 ${task.done ? 'text-green-500' : 'text-gray-300'}`}>
              {task.done
                ? <CheckCircle2 className="w-5 h-5" />
                : <Circle className="w-5 h-5" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {task.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{task.hint}</p>
              {!task.done && task.action && (
                <button
                  onClick={() => handleAction(task)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {task.action.label} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
