import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  Circle,
  Crown,
  DollarSign,
  Zap,
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertCircle,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { FORECAST_SCENARIOS } from './RevenueForecast';

// Use moderate scenario as default targets
const FORECAST_TARGETS = {
  monthlySignups: FORECAST_SCENARIOS.moderate.monthlySignups,
  conversionRate: FORECAST_SCENARIOS.moderate.conversionRate,
  churnRate: FORECAST_SCENARIOS.moderate.churnRate,
  annualRatio: FORECAST_SCENARIOS.moderate.annualRatio,
};

const PERIODS = [
  { value: '7d', label: '7 dagar', days: 7 },
  { value: '30d', label: '30 dagar', days: 30 },
  { value: '90d', label: '90 dagar', days: 90 },
  { value: 'mtd', label: 'Denna månad', days: null },
  { value: 'ytd', label: 'Detta år', days: null },
  { value: 'all', label: 'All tid', days: null },
];

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return Math.round(num).toString();
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 kr';
  return `${Math.round(amount).toLocaleString('sv-SE')} kr`;
};


const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

// Calculate period-adjusted target
const getAdjustedTarget = (monthlyTarget, periodDays) => {
  if (!periodDays) return monthlyTarget; // For mtd/ytd/all, use monthly as-is
  return Math.round((monthlyTarget / 30) * periodDays);
};

// Status indicator based on performance vs target
const TargetStatus = ({ actual, target, inverse = false }) => {
  if (!target || target === 0) return null;
  
  const ratio = actual / target;
  const isGood = inverse ? ratio <= 1 : ratio >= 1;
  const isClose = inverse ? ratio <= 1.2 && ratio > 1 : ratio >= 0.7 && ratio < 1;
  
  if (isGood) {
    return <CheckCircle size={16} className="text-green-500" />;
  } else if (isClose) {
    return <AlertCircle size={16} className="text-yellow-500" />;
  }
  return <AlertCircle size={16} className="text-red-500" />;
};

// Change indicator with safe NaN handling
const ChangeIndicator = ({ current, previous, inverse = false }) => {
  if (previous === null || previous === undefined || previous === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  
  const change = ((current - previous) / previous) * 100;
  if (isNaN(change) || !isFinite(change)) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  
  const isPositive = inverse ? change < 0 : change > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isPositive ? 'text-green-600' : 'text-red-600'
    }`}>
      <Icon size={12} />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
};

// Main KPI Card with target comparison
const KPICard = ({ 
  title, 
  value, 
  target, 
  targetLabel,
  previousValue,
  icon: Icon, 
  color = 'blue',
  inverse = false,
  subtitle
}) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' },
    pink: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600' },
  };
  
  const c = colorClasses[color];
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const progress = target ? Math.min((numericValue / target) * 100, 150) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex items-center gap-2">
          {target && <TargetStatus actual={numericValue} target={target} inverse={inverse} />}
          <ChangeIndicator current={numericValue} previous={previousValue} inverse={inverse} />
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      
      {target && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{targetLabel || 'Mål'}</span>
            <span className={`font-medium ${progress >= 100 ? 'text-green-600' : 'text-gray-600'}`}>
              {formatPercent(progress, 0)} av mål
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {subtitle && !target && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

// Simple stat card for secondary metrics
const StatCard = ({ label, value, sublabel, icon: Icon }) => (
  <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-100">
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon size={14} className="text-gray-400" />}
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
  </div>
);

export default function AdminDashboardStats({ onPeriodChange }) {
  const { t } = useTranslation(['admin']);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);

  const periodConfig = PERIODS.find(p => p.value === selectedPeriod);
  const periodDays = periodConfig?.days || 30;

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

  // Calculate derived metrics with safe NaN handling
  const metrics = useMemo(() => {
    if (!stats) return null;
    
    // Conversion rate: premium / total users
    const conversionRate = stats.users.total > 0 
      ? (stats.premium.total / stats.users.total) * 100
      : 0;
    
    // Active rate: active / total users  
    const activeRate = stats.users.total > 0 
      ? (stats.users.active / stats.users.total) * 100
      : 0;

    // ARPU: MRR / paying users
    const arpu = stats.premium.total > 0
      ? stats.revenue.mrr / stats.premium.total
      : 0;

    // Annual ratio: yearly / total premium
    const annualRatio = stats.premium.total > 0
      ? (stats.premium.yearly / stats.premium.total) * 100
      : 0;

    // Previous period metrics for comparison (with null safety)
    const prevConversionRate = comparisonStats?.users?.total > 0
      ? (comparisonStats.premium.total / comparisonStats.users.total) * 100
      : null;

    const prevActiveRate = comparisonStats?.users?.total > 0
      ? (comparisonStats.users.active / comparisonStats.users.total) * 100
      : null;

    return {
      conversionRate,
      activeRate,
      arpu,
      annualRatio,
      prevConversionRate,
      prevActiveRate,
    };
  }, [stats, comparisonStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Laddar statistik...</p>
        </div>
      </div>
    );
  }

  if (!stats || !metrics) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Kunde inte ladda statistik</p>
        <button 
          onClick={loadStats}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          Försök igen
        </button>
      </div>
    );
  }

  // Adjusted targets based on selected period
  const signupTarget = getAdjustedTarget(FORECAST_TARGETS.monthlySignups, periodDays);
  const premiumTarget = getAdjustedTarget(
    Math.round(FORECAST_TARGETS.monthlySignups * (FORECAST_TARGETS.conversionRate / 100)), 
    periodDays
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Prestanda vs Prognos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Jämför faktisk prestanda mot prognosmodellen (moderat scenario)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PERIODS.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
            title="Uppdatera"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Primary KPIs with Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="MRR"
          value={formatCurrency(stats.revenue.mrr)}
          target={Math.round(FORECAST_TARGETS.mrr12Month / 12)}
          targetLabel="Prognos (mån)"
          previousValue={comparisonStats?.revenue?.mrr}
          icon={DollarSign}
          color="green"
          subtitle={`${stats.premium.total} betalande`}
        />
        
        <KPICard
          title="Nya Användare"
          value={formatNumber(stats.users.new)}
          target={signupTarget}
          targetLabel={`Mål (${periodDays}d)`}
          previousValue={comparisonStats?.users?.new}
          icon={Users}
          color="blue"
        />
        
        <KPICard
          title="Konvertering"
          value={formatPercent(metrics.conversionRate)}
          target={FORECAST_TARGETS.conversionRate}
          targetLabel="Mål: 5%"
          previousValue={metrics.prevConversionRate}
          icon={Percent}
          color="purple"
          subtitle={`${stats.premium.new} nya premium`}
        />
        
        <KPICard
          title="Aktiva Användare"
          value={formatPercent(metrics.activeRate, 0)}
          previousValue={metrics.prevActiveRate}
          icon={Zap}
          color="orange"
          subtitle={`${stats.users.active} av ${stats.users.total}`}
        />
      </div>

      {/* Secondary KPIs - Business Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Nya Premium"
          value={formatNumber(stats.premium.new)}
          target={premiumTarget}
          targetLabel={`Mål (${periodDays}d)`}
          previousValue={comparisonStats?.premium?.new}
          icon={Crown}
          color="pink"
        />
        
        <KPICard
          title="Årsprenumeranter"
          value={formatPercent(metrics.annualRatio, 0)}
          target={FORECAST_TARGETS.annualRatio}
          targetLabel="Mål: 70%"
          icon={Target}
          color="green"
          subtitle={`${stats.premium.yearly} av ${stats.premium.total}`}
        />
        
        <StatCard
          label="ARPU"
          value={formatCurrency(metrics.arpu)}
          sublabel="per betalande användare"
          icon={DollarSign}
        />
        
        <StatCard
          label="Totalt Premium"
          value={formatNumber(stats.premium.total)}
          sublabel={`${stats.premium.monthly} mån / ${stats.premium.yearly} år`}
          icon={Crown}
        />
      </div>

      {/* Volume Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Användare"
          value={formatNumber(stats.users.total)}
          sublabel={`${stats.users.new} nya denna period`}
          icon={Users}
        />
        
        <StatCard
          label="Hjul"
          value={formatNumber(stats.wheels.total)}
          sublabel={`${stats.wheels.new} nya`}
          icon={Circle}
        />
        
        <StatCard
          label="Med aktiviteter"
          value={formatNumber(stats.wheels.withActivities)}
          sublabel={`${stats.wheels.total > 0 ? Math.round((stats.wheels.withActivities / stats.wheels.total) * 100) : 0}% av hjul`}
          icon={CheckCircle}
        />
        
        <StatCard
          label="Aktiviteter"
          value={formatNumber(stats.activities.total)}
          sublabel={`${stats.activities.new} nya`}
          icon={Target}
        />
        
        <StatCard
          label="Team"
          value={formatNumber(stats.teams?.total || 0)}
          sublabel={`${stats.teams?.members || 0} medlemmar`}
          icon={Users}
        />
      </div>

      {/* Forecast Link */}
      <Link 
        to="/admin/forecasts"
        className="block bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100 hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <TrendingUp className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <span className="font-medium text-blue-900">Prognosmål (Moderat): </span>
              <span className="text-blue-700">
                {FORECAST_TARGETS.monthlySignups} registreringar/mån, {FORECAST_TARGETS.conversionRate}% konvertering, 
                {' '}{FORECAST_TARGETS.annualRatio}% årspren.
              </span>
            </div>
          </div>
          <ArrowUpRight className="text-blue-400" size={16} />
        </div>
      </Link>
    </div>
  );
}
