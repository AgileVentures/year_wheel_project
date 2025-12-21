import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Percent, 
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getEnhancedAdminStats } from '../../services/adminService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Shared forecast targets - exported for use in AdminDashboardStats
export const FORECAST_SCENARIOS = {
  conservative: {
    name: 'Konservativ',
    color: '#ef4444',
    monthlySignups: 100,
    growthRate: 8,
    churnRate: 5.5,
    conversionRate: 3,
    annualRatio: 60,
  },
  moderate: {
    name: 'Moderat',
    color: '#3b82f6',
    monthlySignups: 250,
    growthRate: 15,
    churnRate: 4.5,
    conversionRate: 5,
    annualRatio: 70,
  },
  optimistic: {
    name: 'Optimistisk',
    color: '#10b981',
    monthlySignups: 450,
    growthRate: 22,
    churnRate: 3.5,
    conversionRate: 8,
    annualRatio: 75,
  },
};

const PRICING = {
  monthly: 79,
  annual: 768,
  annualMonthly: 64,
};

// Helper functions
const formatCurrency = (value, showSEK = true) => {
  const exchangeRate = 0.091;
  const val = showSEK ? value : Math.round(value * exchangeRate);
  const symbol = showSEK ? 'kr' : '$';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M ${symbol}`;
  if (val >= 1000) return `${Math.round(val / 1000)}k ${symbol}`;
  return `${Math.round(val)} ${symbol}`;
};

const formatNumber = (num) => {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString('sv-SE');
};

const formatPercent = (value) => `${Number(value).toFixed(1)}%`;

// Calculate 12-month forecast
const calculateForecast = (scenario) => {
  const months = [];
  let freeUsers = 0;
  let monthlyPayers = 0;
  let annualPayers = 0;
  
  const growthRate = scenario.growthRate / 100;
  const churnRate = scenario.churnRate / 100;
  const conversionRate = scenario.conversionRate / 100;
  const annualRatio = scenario.annualRatio / 100;

  for (let month = 1; month <= 12; month++) {
    const growthMultiplier = Math.pow(1 + growthRate, (month - 1) / 12);
    const newSignups = Math.round(scenario.monthlySignups * growthMultiplier);
    
    freeUsers += newSignups;
    const conversions = Math.round(freeUsers * (conversionRate / 2));
    freeUsers -= conversions;
    
    const newAnnual = Math.round(conversions * annualRatio);
    const newMonthly = conversions - newAnnual;
    
    monthlyPayers += newMonthly;
    annualPayers += newAnnual;
    monthlyPayers = Math.round(monthlyPayers * (1 - churnRate));
    annualPayers = Math.round(annualPayers * (1 - churnRate / 12));
    
    const mrr = (monthlyPayers * PRICING.monthly) + (annualPayers * PRICING.annualMonthly);
    const totalPaying = monthlyPayers + annualPayers;
    const totalUsers = freeUsers + totalPaying;
    
    months.push({
      month,
      label: `M${month}`,
      mrr: Math.round(mrr),
      totalUsers,
      payingUsers: totalPaying,
      conversionRate: totalUsers > 0 ? (totalPaying / totalUsers) * 100 : 0,
      annualRatio: totalPaying > 0 ? (annualPayers / totalPaying) * 100 : 0,
    });
  }
  
  return months;
};

// Progress indicator
const ProgressToTarget = ({ actual, target, label, inverse = false }) => {
  const progress = target > 0 ? Math.min((actual / target) * 100, 150) : 0;
  const isOnTrack = inverse ? actual <= target : actual >= target * 0.7;
  const isAhead = inverse ? actual < target * 0.8 : actual >= target;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${isAhead ? 'text-green-600' : isOnTrack ? 'text-yellow-600' : 'text-red-600'}`}>
          {progress.toFixed(0)}% av mål
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isAhead ? 'bg-green-500' : isOnTrack ? 'bg-yellow-500' : 'bg-red-400'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Metric card
const MetricCard = ({ icon: Icon, label, value, target, subtitle, status }) => {
  const statusColors = {
    good: 'border-green-500 bg-green-50',
    warning: 'border-yellow-500 bg-yellow-50', 
    bad: 'border-red-500 bg-red-50',
    neutral: 'border-gray-200 bg-white',
  };
  
  return (
    <div className={`rounded-sm p-5 border-l-4 ${statusColors[status || 'neutral']}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <Icon className="text-gray-400" size={18} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {target && (
        <div className="text-xs text-gray-500 mt-1">Mål: {target}</div>
      )}
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};

export default function RevenueForecast() {
  const { t } = useTranslation(['admin']);
  const [scenario, setScenario] = useState('moderate');
  const [showSettings, setShowSettings] = useState(false);
  const [actualStats, setActualStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customScenarios, setCustomScenarios] = useState(FORECAST_SCENARIOS);
  const [cac, setCac] = useState(500); // Customer Acquisition Cost in SEK
  
  const currentScenario = customScenarios[scenario];
  const forecast = useMemo(() => calculateForecast(currentScenario), [currentScenario]);
  
  // Load actual stats
  useEffect(() => {
    loadActualStats();
  }, []);
  
  const loadActualStats = async () => {
    setLoading(true);
    try {
      // Get YTD stats for comparison
      const data = await getEnhancedAdminStats('ytd');
      setActualStats(data.current);
    } catch (error) {
      console.error('Error loading actual stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate actual metrics
  const actual = useMemo(() => {
    if (!actualStats) return null;
    
    const conversionRate = actualStats.users.total > 0 
      ? (actualStats.premium.total / actualStats.users.total) * 100 
      : 0;
    const annualRatio = actualStats.premium.total > 0
      ? (actualStats.premium.yearly / actualStats.premium.total) * 100
      : 0;
      
    return {
      mrr: actualStats.revenue.mrr,
      totalUsers: actualStats.users.total,
      payingUsers: actualStats.premium.total,
      newUsers: actualStats.users.new,
      conversionRate,
      annualRatio,
      churnRate: 0, // Would need historical data
    };
  }, [actualStats]);

  // Current month target (based on how many months into the year we are)
  const currentMonth = new Date().getMonth() + 1;
  const currentTarget = forecast[Math.min(currentMonth - 1, 11)];
  
  // Calculate LTV (Customer Lifetime Value)
  const ltv = useMemo(() => {
    const churnRate = currentScenario.churnRate / 100;
    const annualRatio = currentScenario.annualRatio / 100;
    
    // Average lifespan in months (capped at 36 months)
    const avgLifespanMonthly = churnRate > 0 ? Math.min(1 / churnRate, 36) : 36;
    const avgLifespanAnnual = churnRate > 0 ? Math.min(1 / (churnRate / 12), 36) : 36;
    
    // LTV per customer type
    const ltvMonthly = PRICING.monthly * avgLifespanMonthly * (1 - annualRatio);
    const ltvAnnual = PRICING.annualMonthly * avgLifespanAnnual * annualRatio;
    
    const total = ltvMonthly + ltvAnnual;
    const ltvCacRatio = cac > 0 ? total / cac : 0;
    
    return {
      total: Math.round(total),
      ltvCacRatio: ltvCacRatio.toFixed(1),
      avgLifespan: Math.round((avgLifespanMonthly * (1 - annualRatio) + avgLifespanAnnual * annualRatio) * 10) / 10,
    };
  }, [currentScenario.churnRate, currentScenario.annualRatio, cac]);
  
  // Performance status
  const getStatus = (actual, target, inverse = false) => {
    if (!actual || !target) return 'neutral';
    const ratio = actual / target;
    if (inverse) {
      if (ratio <= 0.8) return 'good';
      if (ratio <= 1.2) return 'warning';
      return 'bad';
    }
    if (ratio >= 1) return 'good';
    if (ratio >= 0.7) return 'warning';
    return 'bad';
  };

  const updateScenario = (field, value) => {
    setCustomScenarios(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  // Chart data
  const chartData = {
    labels: forecast.map(m => m.label),
    datasets: [
      {
        label: 'Prognostiserad MRR',
        data: forecast.map(m => m.mrr),
        borderColor: currentScenario.color,
        backgroundColor: `${currentScenario.color}20`,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
      },
      // Add actual data point for current month
      ...(actual ? [{
        label: 'Faktisk MRR',
        data: forecast.map((m, i) => i < currentMonth ? (i === currentMonth - 1 ? actual.mrr : null) : null),
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
        borderWidth: 0,
        pointRadius: forecast.map((_, i) => i === currentMonth - 1 ? 10 : 0),
        pointStyle: 'circle',
        showLine: false,
      }] : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value).replace(' kr', 'k')
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Intäktsprognos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            12-månaders projektion vs faktisk prestanda
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-2 transition-colors ${
              showSettings ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings size={16} />
            Anpassa
          </button>
          <button
            onClick={loadActualStats}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="flex gap-2">
        {Object.entries(customScenarios).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setScenario(key)}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-all ${
              scenario === key 
                ? 'text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={scenario === key ? { backgroundColor: s.color } : {}}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-sm p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Justera {currentScenario.name} scenario
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { key: 'monthlySignups', label: 'Registreringar/mån', suffix: '' },
              { key: 'growthRate', label: 'Tillväxt', suffix: '%/år' },
              { key: 'churnRate', label: 'Churn', suffix: '%/mån' },
              { key: 'conversionRate', label: 'Konvertering', suffix: '%' },
              { key: 'annualRatio', label: 'Årspren.', suffix: '%' },
            ].map(({ key, label, suffix }) => (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={currentScenario[key]}
                    onChange={(e) => updateScenario(key, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
                </div>
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-600 mb-1">CAC</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={cac}
                  onChange={(e) => setCac(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-500">kr</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actual vs Forecast metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={DollarSign}
          label="MRR (Faktisk)"
          value={actual ? formatCurrency(actual.mrr) : '—'}
          target={formatCurrency(currentTarget?.mrr || 0)}
          status={getStatus(actual?.mrr, currentTarget?.mrr)}
        />
        <MetricCard
          icon={Users}
          label="Användare"
          value={actual ? formatNumber(actual.totalUsers) : '—'}
          target={formatNumber(currentTarget?.totalUsers || 0)}
          status={getStatus(actual?.totalUsers, currentTarget?.totalUsers)}
        />
        <MetricCard
          icon={Percent}
          label="Konvertering"
          value={actual ? formatPercent(actual.conversionRate) : '—'}
          target={`${currentScenario.conversionRate}%`}
          status={getStatus(actual?.conversionRate, currentScenario.conversionRate)}
        />
        <MetricCard
          icon={Target}
          label="Årspren. andel"
          value={actual ? formatPercent(actual.annualRatio) : '—'}
          target={`${currentScenario.annualRatio}%`}
          status={getStatus(actual?.annualRatio, currentScenario.annualRatio)}
        />
        <MetricCard
          icon={DollarSign}
          label="LTV:CAC"
          value={`${ltv.ltvCacRatio}:1`}
          subtitle={`LTV ${formatCurrency(ltv.total)}`}
          status={parseFloat(ltv.ltvCacRatio) >= 3 ? 'good' : parseFloat(ltv.ltvCacRatio) >= 2 ? 'warning' : 'bad'}
        />
        <MetricCard
          icon={TrendingUp}
          label="År 1 MRR mål"
          value={formatCurrency(forecast[11]?.mrr || 0)}
          subtitle={`${formatNumber(forecast[11]?.payingUsers || 0)} betalande`}
          status="neutral"
        />
      </div>

      {/* Progress to targets */}
      {actual && (
        <div className="bg-white rounded-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Target size={16} />
            Framsteg mot mål (Månad {currentMonth})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProgressToTarget 
              actual={actual.mrr} 
              target={currentTarget?.mrr || 0} 
              label="MRR"
            />
            <ProgressToTarget 
              actual={actual.totalUsers} 
              target={currentTarget?.totalUsers || 0} 
              label="Användare"
            />
            <ProgressToTarget 
              actual={actual.conversionRate} 
              target={currentScenario.conversionRate} 
              label="Konvertering"
            />
            <ProgressToTarget 
              actual={actual.annualRatio} 
              target={currentScenario.annualRatio} 
              label="Årspren. andel"
            />
          </div>
        </div>
      )}

      {/* MRR Chart */}
      <div className="bg-white rounded-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            MRR Prognos vs Faktisk
          </h3>
          {actual && (
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentScenario.color }} />
                Prognos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Faktisk (M{currentMonth})
              </span>
            </div>
          )}
        </div>
        <div className="h-[300px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Year-end projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-sm p-5 border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Target size={16} />
            År 1 Mål ({currentScenario.name})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-blue-600 mb-1">MRR</div>
              <div className="text-xl font-bold text-blue-900">{formatCurrency(forecast[11]?.mrr || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-1">ARR</div>
              <div className="text-xl font-bold text-blue-900">{formatCurrency((forecast[11]?.mrr || 0) * 12)}</div>
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-1">Användare</div>
              <div className="text-xl font-bold text-blue-900">{formatNumber(forecast[11]?.totalUsers || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-1">Betalande</div>
              <div className="text-xl font-bold text-blue-900">{formatNumber(forecast[11]?.payingUsers || 0)}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-sm p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle size={16} />
            Fokusområden
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${currentScenario.churnRate <= 4 ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentScenario.churnRate <= 4 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              </span>
              Churn under 4% (nu: {currentScenario.churnRate}%)
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${currentScenario.annualRatio >= 70 ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentScenario.annualRatio >= 70 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              </span>
              Årspren. över 70% (nu: {currentScenario.annualRatio}%)
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${currentScenario.conversionRate >= 5 ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentScenario.conversionRate >= 5 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              </span>
              Konvertering över 5% (nu: {currentScenario.conversionRate}%)
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 ${currentScenario.monthlySignups >= 200 ? 'text-green-500' : 'text-yellow-500'}`}>
                {currentScenario.monthlySignups >= 200 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              </span>
              200+ registreringar/mån (nu: {currentScenario.monthlySignups})
            </li>
          </ul>
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div className="bg-white rounded-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Månadsuppdelning</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Månad</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">MRR</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Användare</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Betalande</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Konvertering</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forecast.map((m, i) => (
                <tr key={m.month} className={i === currentMonth - 1 ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    Månad {m.month}
                    {i === currentMonth - 1 && (
                      <span className="ml-2 text-xs text-blue-600">(nu)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatCurrency(m.mrr)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatNumber(m.totalUsers)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatNumber(m.payingUsers)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatPercent(m.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
