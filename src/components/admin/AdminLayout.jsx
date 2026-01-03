import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher';
import {
  Activity,
  Shield,
  Users,
  Circle,
  DollarSign,
  Calendar,
  Mail,
  ChevronLeft,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: Activity, labelKey: 'overview', exact: true },
  { path: '/admin/users', icon: Users, labelKey: 'users' },
  { path: '/admin/wheels', icon: Circle, labelKey: 'wheels', label: 'Hjul' },
  { path: '/admin/teams', icon: Users, label: 'Team' },
  { path: '/admin/affiliates', icon: DollarSign, labelKey: 'affiliates' },
  { path: '/admin/monday', icon: Calendar, label: 'Monday.com' },
  { path: '/admin/newsletter', icon: Mail, labelKey: 'newsletter' },
  { path: '/admin/forecasts', icon: BarChart3, label: 'Prognoser' },
];

export default function AdminLayout() {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavItem = ({ item, mobile = false }) => {
    const Icon = item.icon;
    const label = item.label || t(item.labelKey);
    
    return (
      <NavLink
        to={item.path}
        end={item.exact}
        onClick={() => mobile && setSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
            isActive
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`
        }
      >
        <Icon size={18} />
        <span>{label}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="text-gray-900" size={20} />
              <span className="font-semibold text-gray-900">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Shield className="text-gray-900" size={24} />
              <span className="font-bold text-lg text-gray-900">{t('title')}</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} mobile />
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={() => {
                setSidebarOpen(false);
                navigate('/dashboard');
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-sm transition-colors"
            >
              <ChevronLeft size={18} />
              <span>{t('backToDashboard')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen fixed">
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="px-4 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Shield className="text-gray-900" size={28} />
                <div>
                  <h1 className="font-bold text-lg text-gray-900">{t('title')}</h1>
                  <p className="text-xs text-gray-500">{t('subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="px-3 py-4 border-t border-gray-200 space-y-2">
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-sm transition-colors"
              >
                <ChevronLeft size={18} />
                <span>{t('backToDashboard')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden">
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
