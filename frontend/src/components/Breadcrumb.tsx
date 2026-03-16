import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from current path if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname);

  return (
    <nav className="flex items-center space-x-1 text-sm mb-4 overflow-x-auto scrollbar-hide pt-2 sm:pt-0">
      <Link
        to="/"
        className="flex items-center text-gray-500 hover:text-primary transition-colors whitespace-nowrap"
        title="Home"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={index} className="flex items-center space-x-1">
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="text-gray-500 hover:text-primary transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span className={`whitespace-nowrap ${isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Map of path segments to readable labels
  const labelMap: Record<string, string> = {
    'catalogue': 'Catalogue',
    'designs': 'Design Management',
    'orders': 'Orders',
    'parties': 'Party Management',
    'transport': 'Transport Management',
    'users': 'User Management',
    'settings': 'Settings',
    'profile': 'Profile',
    'pricing-tiers': 'Pricing Tiers',
    'admin': 'Admin Dashboard',
    'about': 'About Us',
    'contact': 'Contact Us',
    'dashboard': 'Dashboard'
  };

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    breadcrumbs.push({
      label,
      path: index < pathSegments.length - 1 ? currentPath : undefined
    });
  });

  return breadcrumbs;
}
