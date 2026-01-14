import { useEffect } from 'react';
import { useTawkTo, TawkToAPI } from '../hooks/useTawkTo';
import { useAuth } from '../contexts/AuthContext';

interface TawkToChatProps {
  enabled?: boolean;
}

export function TawkToChat({ enabled = true }: TawkToChatProps) {
  const { user } = useAuth();

  // Get Tawk.to configuration from localStorage (admin settings) or environment variables
  const propertyId = localStorage.getItem('tawk_property_id') || import.meta.env.VITE_TAWKTO_PROPERTY_ID || '';
  const widgetId = localStorage.getItem('tawk_widget_id') || import.meta.env.VITE_TAWKTO_WIDGET_ID || '';

  // Initialize Tawk.to
  useTawkTo({
    propertyId,
    widgetId,
    enabled: enabled && !!propertyId && !!widgetId,
  });

  // Set user attributes when user is available
  useEffect(() => {
    if (user && window.Tawk_API) {
      // Wait for Tawk.to to be fully loaded
      const setUserInfo = () => {
        TawkToAPI.setAttributes({
          name: user.full_name,
          email: user.email,
          role: user.role,
          userId: user.id,
        });
      };

      // If Tawk_API is ready, set immediately
      if (window.Tawk_API.onLoad) {
        window.Tawk_API.onLoad = setUserInfo;
      } else {
        setUserInfo();
      }
    }
  }, [user]);

  // Component doesn't render anything - it just loads the script
  return null;
}
