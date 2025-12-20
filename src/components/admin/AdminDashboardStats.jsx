import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Circle,
  Crown,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
  DollarSign,
  UserPlus,
  UserMinus,
  Layers,
  Bot,
  Share2,
  Download,
  RefreshCw,
} from 'lucide-react';

const PERIODS = [
  { value: 'today', label: 'Idag', days: 1 },
  { value: 'week', label: 'Denna vecka', days: 7 },
  { value: '7d', label: '7 dagar', days: 7 },
  { value: '30d', label: '30 dagar', days: 30 },
  { value: '90d', label: '90 dagar', days: 90 },
  { value: 'mtd', label: 'Denna månad', days: null },
  { value: 'ytd', label: 'Detta år', days: null },
  { value: 'all', label: 'All tid', days: null },
  { value: 'custom', label: 'Anpassad...', days: null },
];

const TrendIndicator = ({ current, previous, suffix = '', inverse = false }) => {
  if (previous === 0 || previous === null || previous === undefined) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  
  const change = ((current - previous) / previous) * 100;
  const isPositive = inverse ? change < 0 : change > 0;
  const isNeutral = Math.abs(change) < 1;
  
  if (isNeutral) {
    return (
      <span className="flex items-center gap-1 text-gray-500 text-xs">
        <Minus size={12} />
        <span>0%</span>
      </span>
    );
  }
  
  return (
    <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%{suffix}</span>
    </span>
  );
};

const StatCard = ({ icon: Icon, iconColor, title, value, subtitle, trend, trendLabel, children }) => (
  <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend !== undefined && (
        <div className="text-right">
          <TrendIndicator current={trend.current} previous={trend.previous} />
          {trendLabel && <div className="text-[10px] text-gray-400 mt-0.5">{trendLabel}</div>}
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-600 mt-1">{title}</div>
    {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    {children}
  </div>
);

const MiniStat = ({ label, value, trend }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-900">{value}</span>
      {trend && <TrendIndicator current={trend.current} previous={trend.previous} />}
    </div>
  </div>
);

export default function AdminDashboardStats({ onPeriodChange }) {
  const { t } = useTranslation(['admin']);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  useEffect(() => {
    if (selectedPeriod !== 'custom' || (customStart && customEnd)) {
      loadStats();
    }
  }, [selectedPeriod, customStart, customEnd]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Import dynamically to avoid circular deps
      const { getEnhancedAdminStats } = await import('../../services/adminService');
      const data = await getEnhancedAdminStats(selectedPeriod, customStart, customEnd);
      setStats(data.current);
      setComparisonStats(data.previous);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period) => {
    if (period === 'custom') {
      setShowCustomPicker(true);
      // Don't change selectedPeriod until dates are picked
    } else {
      setShowCustomPicker(false);
      setSelectedPeriod(period);
      onPeriodChange?.(period);
    }
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      setSelectedPeriod('custom');
      setShowCustomPicker(false);
      onPeriodChange?.('custom');
    }
  };

  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!stats) return null;
    
    const conversionRate = stats.users.total > 0 
      ? (stats.premium.total / stats.users.total) * 100 
      : 0;
    
    const avgActivitiesPerWheel = stats.wheels.total > 0 
      ? stats.activities.total / stats.wheels.total 
      : 0;
    
    const activeUserRate = stats.users.total > 0 
      ? (stats.users.active / stats.users.total) * 100 
      : 0;

    const prevConversionRate = comparisonStats?.users.total > 0 
      ? (comparisonStats.premium.total / comparisonStats.users.total) * 100 
      : 0;

    const prevAvgActivities = comparisonStats?.wheels.total > 0 
      ? comparisonStats.activities.total / comparisonStats.wheels.total 
      : 0;

    const prevActiveRate = comparisonStats?.users.total > 0 
      ? (comparisonStats.users.active / comparisonStats.users.total) * 100 
      : 0;

    return {
      conversionRate,
      avgActivitiesPerWheel,
      activeUserRate,
      prevConversionRate,
      prevAvgActivities,
      prevActiveRate,
    };
  }, [stats, comparisonStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Laddar statistik...</p>
        </div>
      </div>
    );
  }

  const getPeriodLabel = () => {
    const period = PERIODS.find(p => p.value === selectedPeriod);
    return period?.label || selectedPeriod;
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Nyckeltal</h3>
          <p className="text-sm text-gray-500">Jämfört med föregående period</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-gray-400" />
          <select
            value={selectedPeriod === 'custom' ? 'custom' : selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {PERIODS.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
          
          {/* Custom date range picker */}
          {(showCustomPicker || selectedPeriod === 'custom') && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                max={customEnd || undefined}
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
                min={customStart || undefined}
                max={new Date().toISOString().split('T')[0]}
              />
              {showCustomPicker && (
                <button
                  onClick={applyCustomRange}
                  disabled={!customStart || !customEnd}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Visa
                </button>
              )}
            </div>
          )}
          
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Uppdatera"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users */}
        <StatCard
          icon={Users}
          iconColor="bg-blue-500"
          title="Användare"
          value={stats?.users.total || 0}
          subtitle={`${stats?.users.new || 0} nya under ${getPeriodLabel().toLowerCase()}`}
          trend={stats && comparisonStats ? { current: stats.users.new, previous: comparisonStats.users.new } : undefined}
          trendLabel="vs förra perioden"
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <MiniStat 
              label="Aktiva" 
              value={stats?.users.active || 0}
              trend={stats && comparisonStats ? { current: stats.users.active, previous: comparisonStats.users.active } : undefined}
            />
            <MiniStat 
              label="Idag" 
              value={stats?.users.today || 0}
            />
          </div>
        </StatCard>

        {/* Wheels */}
        <StatCard
          icon={Circle}
          iconColor="bg-green-500"
          title="Hjul"
          value={stats?.wheels.total || 0}
          subtitle={`${stats?.wheels.new || 0} nya under ${getPeriodLabel().toLowerCase()}`}
          trend={stats && comparisonStats ? { current: stats.wheels.new, previous: comparisonStats.wheels.new } : undefined}
          trendLabel="vs förra perioden"
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <MiniStat 
              label="Med aktiviteter" 
              value={stats?.wheels.withActivities || 0}
            />
            <MiniStat 
              label="Snitt akt./hjul" 
              value={(metrics?.avgActivitiesPerWheel || 0).toFixed(1)}
              trend={metrics ? { current: metrics.avgActivitiesPerWheel, previous: metrics.prevAvgActivities } : undefined}
            />
          </div>
        </StatCard>

        {/* Premium / Revenue */}
        <StatCard
          icon={Crown}
          iconColor="bg-purple-500"
          title="Premium"
          value={stats?.premium.total || 0}
          subtitle={`${(metrics?.conversionRate || 0).toFixed(1)}% konverteringsgrad`}
          trend={stats && comparisonStats ? { current: stats.premium.total, previous: comparisonStats.premium.total } : undefined}
          trendLabel="vs förra perioden"
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <MiniStat 
              label="Månadsvis" 
              value={stats?.premium.monthly || 0}
            />
            <MiniStat 
              label="Årsvis" 
              value={stats?.premium.yearly || 0}
            />
            <MiniStat 
              label="Nya" 
              value={stats?.premium.new || 0}
              trend={stats && comparisonStats ? { current: stats.premium.new, previous: comparisonStats.premium.new } : undefined}
            />
          </div>
        </StatCard>

        {/* MRR */}
        <StatCard
          icon={DollarSign}
          iconColor="bg-emerald-500"
          title="MRR"
          value={`${(stats?.revenue.mrr || 0).toLocaleString('sv-SE')} kr`}
          subtitle="Månatlig återkommande intäkt"
          trend={stats && comparisonStats ? { current: stats.revenue.mrr, previous: comparisonStats.revenue.mrr } : undefined}
          trendLabel="vs förra perioden"
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <MiniStat 
              label="ARR" 
              value={`${((stats?.revenue.mrr || 0) * 12).toLocaleString('sv-SE')} kr`}
            />
            <MiniStat 
              label="Avg. per användare" 
              value={`${(stats?.revenue.arpu || 0).toFixed(0)} kr`}
            />
          </div>
        </StatCard>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Engagement */}
        <StatCard
          icon={Activity}
          iconColor="bg-orange-500"
          title="Aktiviteter"
          value={(stats?.activities.total || 0).toLocaleString('sv-SE')}
          subtitle={`${stats?.activities.new || 0} nya under perioden`}
          trend={stats && comparisonStats ? { current: stats.activities.new, previous: comparisonStats.activities.new } : undefined}
        />

        {/* AI Usage */}
        <StatCard
          icon={Bot}
          iconColor="bg-indigo-500"
          title="AI-användning"
          value={stats?.ai.requests || 0}
          subtitle={`${stats?.ai.uniqueUsers || 0} unika användare`}
          trend={stats && comparisonStats ? { current: stats.ai.requests, previous: comparisonStats.ai.requests } : undefined}
        />

        {/* Teams & Collaboration */}
        <StatCard
          icon={Users}
          iconColor="bg-cyan-500"
          title="Team"
          value={stats?.teams.total || 0}
          subtitle={`${stats?.teams.members || 0} totala medlemmar`}
          trend={stats && comparisonStats ? { current: stats.teams.new, previous: comparisonStats.teams.new } : undefined}
        />

        {/* Public & Sharing */}
        <StatCard
          icon={Share2}
          iconColor="bg-pink-500"
          title="Delning"
          value={stats?.sharing.publicWheels || 0}
          subtitle={`${stats?.sharing.exports || 0} exporter under perioden`}
        >
          <div className="mt-3 pt-3 border-t border-gray-100">
            <MiniStat label="Mallar" value={stats?.sharing.templates || 0} />
            <MiniStat label="På landningssida" value={stats?.sharing.onLanding || 0} />
          </div>
        </StatCard>
      </div>

      {/* Churn & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-green-500" />
            Tillväxt & Retention
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{stats?.retention.newUsers || 0}</div>
              <div className="text-xs text-gray-600 mt-1">Nya användare</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{(metrics?.activeUserRate || 0).toFixed(0)}%</div>
              <div className="text-xs text-gray-600 mt-1">Aktiva</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{(metrics?.conversionRate || 0).toFixed(1)}%</div>
              <div className="text-xs text-gray-600 mt-1">Konvertering</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <UserMinus size={16} className="text-red-500" />
            Churn
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{stats?.churn.canceled || 0}</div>
              <div className="text-xs text-gray-600 mt-1">Avslutade</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">{(stats?.churn.rate || 0).toFixed(1)}%</div>
              <div className="text-xs text-gray-600 mt-1">Churn rate</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{stats?.churn.atRisk || 0}</div>
              <div className="text-xs text-gray-600 mt-1">I riskzonen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Generation */}
      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Lead-generering & Konvertering</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.leads.quizStarts || 0}</div>
            <div className="text-xs text-gray-600 mt-1">Quiz startat</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.leads.quizCompleted || 0}</div>
            <div className="text-xs text-gray-600 mt-1">Quiz klart</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.leads.signups || 0}</div>
            <div className="text-xs text-gray-600 mt-1">Registreringar</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xl font-bold text-gray-900">{stats?.leads.newsletter || 0}</div>
            <div className="text-xs text-gray-600 mt-1">Nyhetsbrev</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-xl font-bold text-emerald-600">
              {stats?.leads.signups > 0 && stats?.leads.quizCompleted > 0 
                ? ((stats.leads.signups / stats.leads.quizCompleted) * 100).toFixed(0) 
                : 0}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Quiz → Signup</div>
          </div>
        </div>
      </div>
    </div>
  );
}
