// Main page exports with lazy loading for better code splitting
import { lazy } from 'react';

// Critical pages - loaded immediately
export { Login } from './Login';
export { ResetPassword } from './ResetPassword';

// Non-critical pages - lazy loaded
export const Dashboard = lazy(() => import('./Dashboard'));
export const AdminDashboard = lazy(() => import('./AdminDashboard'));
export const Catalogue = lazy(() => import('./Catalogue').then(m => ({ default: m.Catalogue })));
export const DesignManagement = lazy(() => import('./DesignManagement').then(m => ({ default: m.DesignManagement })));
export const Orders = lazy(() => import('./Orders'));
export const OrderDetails = lazy(() => import('./OrderDetails'));
export const PartyEntry = lazy(() => import('./PartyEntry'));
export const TransportEntry = lazy(() => import('./TransportEntry'));
export const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
export const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })));
export const ContactUs = lazy(() => import('./ContactUs').then(m => ({ default: m.ContactUs })));
export const AboutUs = lazy(() => import('./AboutUs').then(m => ({ default: m.AboutUs })));
export const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
export const PricingTiers = lazy(() => import('./PricingTiers').then(m => ({ default: m.PricingTiers })));
export const Setup = lazy(() => import('./Setup').then(m => ({ default: m.Setup })));
