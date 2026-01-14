import { useEffect } from 'react';

interface TawkToConfig {
  propertyId: string;
  widgetId: string;
  enabled?: boolean;
}

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

export const useTawkTo = (config: TawkToConfig) => {
  useEffect(() => {
    // Don't load if disabled or missing config
    if (!config.enabled || !config.propertyId || !config.widgetId) {
      return;
    }

    // Don't load if already loaded
    if (window.Tawk_API) {
      return;
    }

    // Create Tawk.to script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${config.propertyId}/${config.widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    // Set load start time
    window.Tawk_LoadStart = new Date();

    // Append script to document
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }

    // Cleanup function
    return () => {
      // Remove Tawk.to widget on unmount
      if (window.Tawk_API && window.Tawk_API.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };
  }, [config.propertyId, config.widgetId, config.enabled]);
};

// Helper functions to control Tawk.to widget
export const TawkToAPI = {
  maximize: () => {
    if (window.Tawk_API && window.Tawk_API.maximize) {
      window.Tawk_API.maximize();
    }
  },
  minimize: () => {
    if (window.Tawk_API && window.Tawk_API.minimize) {
      window.Tawk_API.minimize();
    }
  },
  toggle: () => {
    if (window.Tawk_API && window.Tawk_API.toggle) {
      window.Tawk_API.toggle();
    }
  },
  showWidget: () => {
    if (window.Tawk_API && window.Tawk_API.showWidget) {
      window.Tawk_API.showWidget();
    }
  },
  hideWidget: () => {
    if (window.Tawk_API && window.Tawk_API.hideWidget) {
      window.Tawk_API.hideWidget();
    }
  },
  setAttributes: (attributes: Record<string, any>) => {
    if (window.Tawk_API && window.Tawk_API.setAttributes) {
      window.Tawk_API.setAttributes(attributes, (error: any) => {
        if (error) {
          console.error('Tawk.to setAttributes error:', error);
        }
      });
    }
  },
  addEvent: (event: string, metadata?: Record<string, any>) => {
    if (window.Tawk_API && window.Tawk_API.addEvent) {
      window.Tawk_API.addEvent(event, metadata, (error: any) => {
        if (error) {
          console.error('Tawk.to addEvent error:', error);
        }
      });
    }
  },
};
