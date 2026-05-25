import { useEffect } from 'react';
import { useTawkTo, TawkToAPI } from '../hooks/useTawkTo';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

interface TawkToChatProps {
  enabled?: boolean;
}

export function TawkToChat({ enabled = true }: TawkToChatProps) {
  const { user } = useAuth();
  const { settings } = useTenant();

  const propertyId = settings?.tawk_property_id || import.meta.env.VITE_TAWKTO_PROPERTY_ID || '';
  const widgetId = settings?.tawk_widget_id || import.meta.env.VITE_TAWKTO_WIDGET_ID || '';

  useTawkTo({
    propertyId,
    widgetId,
    enabled: enabled && !!propertyId && !!widgetId,
  });

  useEffect(() => {
    if (user && window.Tawk_API) {
      const setUserInfo = () => {
        TawkToAPI.setAttributes({
          name: user.full_name,
          email: user.email,
          role: user.user_roles?.role_name || 'Unknown',
          userId: user.id,
        });
      };

      if (window.Tawk_API.onLoad) {
        window.Tawk_API.onLoad = setUserInfo;
      } else {
        setUserInfo();
      }
    }
  }, [user]);

  return null;
}
