import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Circle,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Zap,
  UserCheck,
  Target,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const PERIODS = [
  { value: '7d', label: '7 dagar' },
  { value: '30d', label: '30 dagar' },
  { value: '90d', label: '90 dagar' },
  { value: 'mtd', label: 'Denna månad' },
  { value: 'ytd', label: 'Detta år' },
  { value: 'all', label: 'All tid' },
];

const formatNumber = (num) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

const formatCurrency = (amount) => {
  return `${Math.round(amount).toLocaleString('sv-SE')} kr`;
};

const TrendBadge = ({ current, previous, inverse = false }) => {
  if (previous === 0 || previous === null || previous === undefined || current === previous) {
    return null;
  }
  
  const change = ((current - previous) / previous) * 100;
  const isPositive = inverse ? change < 0 : change > 0;
  
  if (Math.abs(change) < 0.5) return null;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    }`}>
      {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(change).toFixed(0)}%
    </span>
  );
};

const MetricCard = ({ title, value, subtitle, change, icon: Icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
          <Icon size={24} className="text-white" />
        </div>
        {change !== undefined && (
          <TrendBadge current={value} previous={value - change} inverse={trend === 'inverse'} />
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
};

const ProgressCard = ({ title, current, target, subtitle, icon: Icon, color = 'blue' }) => {
  const percentage = Math.min((current / target) * 100, 100);
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]} bg-opacity-10`}>
            <Icon size={20} className={`${colorClasses[color].replace('bg-', 'text-')}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{current}</div>
          <div className="text-xs text-gray-500">av {target}</div>
        </div>
      </div>
      <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600 text-right">{percentage.toFixed(0)}%</div>
    </div>
  );
};

export default function AdminDashboardStats({ onPeriodChange }) {
  const { t } = useTranslation(['admin']);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, [selectedPeriod]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { getEnhancedAdminStats } = await import('../../services/adminService');
      const data = await getEnhancedAdminStats(selectedPeriod);
      setStats(data.current);
      setComparisonStats(data.previous);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!stats) return null;
    
    const conversionRate = stats.users.total > 0 
      ? ((stats.premium.total / stats.users.total) * 100).toFixed(1)
      : '0.0';
    
    const activeRate = stats.users.total > 0 
      ? ((stats.users.active / stats.users.total) * 100).toFixed(0)
      : '0';

    const avgRevenuePerUser = stats.premium.total > 0
      ? stats.revenue.mrr / stats.premium.total
      : 0;

    const growthRate = comparisonStats?.users.total > 0
      ? ((stats.users.new - comparisonStats.users.new) / comparisonStats.users.new) * 100
      : 0;

    return {
      conversionRate,
      activeRate,
      avgRevenuePerUser,
      growthRate,
      totalRevenue: stats.revenue.mrr,
      activeUsers: stats.users.active,
      newUsers: stats.users.new,
      newPremium: stats.premium.new,
    };
  }, [stats, comparisonStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Laddar statistik...</p>
        </div>
      </div>
    );
  }

  if (!stats || !metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kunde inte ladda statistik</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Översikt</h3>
          <p className="text-sm text-gray-500 mt-1">Plattformens nyckeltal och tillväxt</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {PERIODS.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="Uppdatera"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top KPIs - Most Important Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Månatlig Intäkt (MRR)"
          value={formatCurrency(metrics.totalRevenue)}
          subtitle={`${stats.premium.total} betalande`}
          change={comparisonStats ? metrics.totalRevenue - comparisonStats.revenue.mrr : 0}
          icon={DollarSign}
          color="green"
        />
        
        <MetricCard
          title="Nya Användare"
          value={formatNumber(metrics.newUsers)}
          subtitle={`${metrics.growthRate > 0 ? '+' : ''}${metrics.growthRate.toFixed(0)}% vs föregående`}
          change={comparisonStats ? metrics.newUsers - comparisonStats.users.new : 0}
          icon={Users}
          color="blue"
        />
        
        <MetricCard
          title="Konvertering"
          value={`${metrics.conversionRate}%`}
          subtitle={`${metrics.newPremium} nya premium`}
          change={comparisonStats ? stats.premium.new - comparisonStats.premium.new : 0}
          icon={Crown}
          color="purple"
        />
        
        <MetricCard
          title="Aktiva Användare"
          value={`${metrics.activeRate}%`}
          subtitle={`${metrics.activeUsers} av ${stats.users.total} användare`}
          change={comparisonStats ? stats.users.active - comparisonStats.users.active : 0}
          icon={Zap}
          color="orange"
        />
      </div>

      {/* Growth & Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProgressCard
          title="Tillväxtmål"
          current={stats.users.new}
          target={100}
          subtitle="Nya användare denna period"
          icon={Target}
          color="blue"
        />
        
        <ProgressCard
          title="Premiummål"
          current={stats.premium.new}
          target={20}
          subtitle="Nya premium denna period"
          icon={Crown}
          color="purple"
        />
        
        <ProgressCard
          title="Engagemang"
          current={stats.wheels.withActivities}
          target={stats.wheels.total}
          subtitle="Hjul med aktiviteter"
          icon={UserCheck}
          color="green"
        />
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Totalt Användare</div>
          <div className="text-3xl font-bold text-gray-900">{formatNumber(stats.users.total)}</div>
          <div className="text-xs text-gray-500 mt-2">{stats.users.active} aktiva</div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Totalt Hjul</div>
          <div className="text-3xl font-bold text-gray-900">{formatNumber(stats.wheels.total)}</div>
          <div className="text-xs text-gray-500 mt-2">{stats.wheels.new} nya</div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Aktiviteter</div>
          <div className="text-3xl font-bold text-gray-900">{formatNumber(stats.activities.total)}</div>
          <div className="text-xs text-gray-500 mt-2">{stats.activities.new} nya</div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">ARPU</div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.avgRevenuePerUser)}</div>
          <div className="text-xs text-gray-500 mt-2">per premium-användare</div>
        </div>
      </div>
    </div>
  );
}
