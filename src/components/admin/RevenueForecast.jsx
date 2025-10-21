import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, DollarSign, Target, Percent, Calendar, Settings, Shield, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';

export default function RevenueForecast() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  
  const [scenario, setScenario] = useState('moderate');
  const [showSEK, setShowSEK] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  // Editable CAC (Customer Acquisition Cost)
  const [cac, setCac] = useState(500);
  // Toggle between quarter-end snapshot and quarter-average
  const [useQuarterAverage, setUseQuarterAverage] = useState(false);
  // Expanded quarters for monthly drilldown
  const [expandedQuarters, setExpandedQuarters] = useState(new Set());
  
  const pricing = {
    monthly: 79,
    annual: 768,
    annualMonthly: 64
  };

  const [scenarios, setScenarios] = useState({
    conservative: {
      name: 'Konservativ',
      color: '#ef4444',
      monthlySignups: 100,
      growthRate: 8,
      churnRate: 5.5,
      freeToPayingConversion: 3,
      annualVsMonthlyRatio: 60,
      avgMonthsToConvert: 2.5
    },
    moderate: {
      name: 'Moderat',
      color: '#3b82f6',
      monthlySignups: 250,
      growthRate: 15,
      churnRate: 4.5,
      freeToPayingConversion: 5,
      annualVsMonthlyRatio: 70,
      avgMonthsToConvert: 2
    },
    optimistic: {
      name: 'Optimistisk',
      color: '#10b981',
      monthlySignups: 450,
      growthRate: 22,
      churnRate: 3.5,
      freeToPayingConversion: 8,
      annualVsMonthlyRatio: 75,
      avgMonthsToConvert: 1.5
    }
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('yearwheel_forecast_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.cac) setCac(parsed.cac);
        if (parsed.scenario) setScenario(parsed.scenario);
        if (parsed.scenarios) setScenarios(parsed.scenarios);
      } catch (e) {
        console.error('Failed to load forecast settings:', e);
      }
    }
  }, []);
  
  // Persist settings to localStorage when they change
  useEffect(() => {
    const settingsToSave = { cac, scenario, scenarios };
    localStorage.setItem('yearwheel_forecast_settings', JSON.stringify(settingsToSave));
  }, [cac, scenario, scenarios]);

  const currentScenario = scenarios[scenario];
  const exchangeRate = 0.091;

  const updateScenarioValue = (scenarioKey, field, value) => {
    setScenarios(prev => ({
      ...prev,
      [scenarioKey]: {
        ...prev[scenarioKey],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  // Return a breakdown of LTV components and lifespans
  const calculateLTV = (churnRate, annualRatio) => {
    const monthlyChurnDecimal = churnRate / 100;
    const annualChurnDecimal = monthlyChurnDecimal / 12;

    const avgLifespanMonthly = monthlyChurnDecimal > 0 ? 1 / monthlyChurnDecimal : 36;
    const avgLifespanAnnual = annualChurnDecimal > 0 ? 1 / annualChurnDecimal : 36;

    const cappedLifespanMonthly = Math.min(avgLifespanMonthly, 36);
    const cappedLifespanAnnual = Math.min(avgLifespanAnnual, 36);

    const annualRatioDecimal = annualRatio / 100;
    const monthlyRatioDecimal = 1 - annualRatioDecimal;

    const ltvMonthly = pricing.monthly * cappedLifespanMonthly * monthlyRatioDecimal;
    const ltvAnnual = pricing.annualMonthly * cappedLifespanAnnual * annualRatioDecimal;

    const total = ltvMonthly + ltvAnnual;

    return {
      ltvTotal: Math.round(total),
      ltvMonthly: Math.round(ltvMonthly),
      ltvAnnual: Math.round(ltvAnnual),
      avgLifespanMonthly: Math.round(cappedLifespanMonthly * 10) / 10,
      avgLifespanAnnual: Math.round(cappedLifespanAnnual * 10) / 10,
    };
  };

  const calculateForecast = () => {
    // First generate monthly forecast for 24 months, then aggregate into 8 quarters
    const monthly = [];
    let cumulativeFreeUsers = 0;
    let monthlyPayers = 0;
    let annualPayers = 0;
    
    const growthRateDecimal = currentScenario.growthRate / 100;
    const churnRateDecimal = currentScenario.churnRate / 100;
    const conversionDecimal = currentScenario.freeToPayingConversion / 100;
    const annualRatioDecimal = currentScenario.annualVsMonthlyRatio / 100;

    for (let month = 1; month <= 24; month++) {
      const growthMultiplier = Math.pow(1 + growthRateDecimal, (month - 1) / 12);
      const newSignups = Math.round(currentScenario.monthlySignups * growthMultiplier);
      
      cumulativeFreeUsers += newSignups;
      
      const conversionRate = conversionDecimal / currentScenario.avgMonthsToConvert;
      const newConversions = Math.round(cumulativeFreeUsers * conversionRate);
      cumulativeFreeUsers -= newConversions;
      
      const newAnnual = Math.round(newConversions * annualRatioDecimal);
      const newMonthly = newConversions - newAnnual;
      
      monthlyPayers += newMonthly;
      annualPayers += newAnnual;
      
      monthlyPayers = Math.round(monthlyPayers * (1 - churnRateDecimal));
      annualPayers = Math.round(annualPayers * (1 - churnRateDecimal / 12));
      
      const mrrFromMonthly = monthlyPayers * pricing.monthly;
      const mrrFromAnnual = annualPayers * pricing.annualMonthly;
      const totalMRR = mrrFromMonthly + mrrFromAnnual;
      const arr = totalMRR * 12;
      
      const totalPayingUsers = monthlyPayers + annualPayers;
      const totalUsers = cumulativeFreeUsers + totalPayingUsers;
      const arpu = totalPayingUsers > 0 ? totalMRR / totalPayingUsers : 0;

      monthly.push({
        month,
        quarterIndex: Math.ceil(month / 3) - 1, // 0..7
        monthIndex: month - 1,
        mrrSEK: Math.round(totalMRR),
        mrrUSD: Math.round(totalMRR * exchangeRate),
        arrSEK: Math.round(arr),
        arrUSD: Math.round(arr * exchangeRate),
        totalUsers,
        payingUsers: totalPayingUsers,
        freeUsers: cumulativeFreeUsers,
        monthlyPayers,
        annualPayers,
        arpuSEK: Math.round(arpu),
        arpuUSD: Math.round(arpu * exchangeRate),
        conversionRate: totalUsers > 0 ? ((totalPayingUsers / totalUsers) * 100).toFixed(2) : 0,
        annualPercentage: totalPayingUsers > 0 ? ((annualPayers / totalPayingUsers) * 100).toFixed(0) : 0
      });
    }
    
    // Aggregate into quarters (8 quarters)
    const quarters = [];
    for (let q = 0; q < 8; q++) {
      const monthsInQuarter = monthly.slice(q * 3, q * 3 + 3);
      if (monthsInQuarter.length === 0) continue;

      // Use the last month in the quarter as the representative snapshot
      const lastMonth = monthsInQuarter[monthsInQuarter.length - 1];

      const quarterLabel = `Q${(q % 4) + 1} - År ${Math.floor(q / 4) + 1}`;

      // Calculate averages across the quarter
      const avgMrrSEK = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.mrrSEK, 0) / monthsInQuarter.length);
      const avgMrrUSD = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.mrrUSD, 0) / monthsInQuarter.length);
      const avgArrSEK = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.arrSEK, 0) / monthsInQuarter.length);
      const avgArrUSD = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.arrUSD, 0) / monthsInQuarter.length);
      const avgTotalUsers = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.totalUsers, 0) / monthsInQuarter.length);
      const avgPayingUsers = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.payingUsers, 0) / monthsInQuarter.length);
      const avgFreeUsers = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.freeUsers, 0) / monthsInQuarter.length);
      const avgMonthlyPayers = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.monthlyPayers, 0) / monthsInQuarter.length);
      const avgAnnualPayers = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.annualPayers, 0) / monthsInQuarter.length);
      const avgArpuSEK = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.arpuSEK, 0) / monthsInQuarter.length);
      const avgArpuUSD = Math.round(monthsInQuarter.reduce((sum, m) => sum + m.arpuUSD, 0) / monthsInQuarter.length);
      const avgConversionRate = (monthsInQuarter.reduce((sum, m) => sum + parseFloat(m.conversionRate), 0) / monthsInQuarter.length).toFixed(2);
      const avgAnnualPercentage = Math.round(monthsInQuarter.reduce((sum, m) => sum + parseFloat(m.annualPercentage), 0) / monthsInQuarter.length);

      quarters.push({
        quarter: quarterLabel,
        quarterIndex: q,
        // Snapshot (end of quarter)
        mrrSEK: lastMonth.mrrSEK,
        mrrUSD: lastMonth.mrrUSD,
        arrSEK: lastMonth.arrSEK,
        arrUSD: lastMonth.arrUSD,
        totalUsers: lastMonth.totalUsers,
        payingUsers: lastMonth.payingUsers,
        freeUsers: lastMonth.freeUsers,
        monthlyPayers: lastMonth.monthlyPayers,
        annualPayers: lastMonth.annualPayers,
        arpuSEK: lastMonth.arpuSEK,
        arpuUSD: lastMonth.arpuUSD,
        conversionRate: lastMonth.conversionRate,
        annualPercentage: lastMonth.annualPercentage,
        // Averages
        avgMrrSEK,
        avgMrrUSD,
        avgArrSEK,
        avgArrUSD,
        avgTotalUsers,
        avgPayingUsers,
        avgFreeUsers,
        avgMonthlyPayers,
        avgAnnualPayers,
        avgArpuSEK,
        avgArpuUSD,
        avgConversionRate,
        avgAnnualPercentage,
        // Store monthly details for drilldown
        monthlyDetails: monthsInQuarter
      });
    }

    return { monthly, quarters };
  };
  const { monthly: forecastMonthly, quarters: forecastQuarters } = calculateForecast();
  
  // Helper to get the right data field based on snapshot vs average toggle
  const getQuarterData = (quarter, field) => {
    if (!quarter) return 0;
    if (useQuarterAverage && quarter[`avg${field.charAt(0).toUpperCase()}${field.slice(1)}`] !== undefined) {
      return quarter[`avg${field.charAt(0).toUpperCase()}${field.slice(1)}`];
    }
    return quarter[field] || 0;
  };
  
  // Create display data using the selected calculation method
  const displayQuarters = forecastQuarters.map(q => ({
    ...q,
    displayMrrSEK: getQuarterData(q, 'mrrSEK'),
    displayMrrUSD: getQuarterData(q, 'mrrUSD'),
    displayArrSEK: getQuarterData(q, 'arrSEK'),
    displayArrUSD: getQuarterData(q, 'arrUSD'),
    displayTotalUsers: getQuarterData(q, 'totalUsers'),
    displayPayingUsers: getQuarterData(q, 'payingUsers'),
    displayFreeUsers: getQuarterData(q, 'freeUsers'),
    displayMonthlyPayers: getQuarterData(q, 'monthlyPayers'),
    displayAnnualPayers: getQuarterData(q, 'annualPayers'),
    displayArpuSEK: getQuarterData(q, 'arpuSEK'),
    displayArpuUSD: getQuarterData(q, 'arpuUSD'),
    displayConversionRate: getQuarterData(q, 'conversionRate'),
    displayAnnualPercentage: getQuarterData(q, 'annualPercentage'),
  }));
  
  const latestQuarter = displayQuarters[displayQuarters.length - 1] || {};
  const q1 = displayQuarters[0] || {};
  const year1Data = displayQuarters[3] || latestQuarter || {};
  const year2Data = displayQuarters[7] || latestQuarter || {};
  
  const toggleQuarterExpansion = (quarterIndex) => {
    setExpandedQuarters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quarterIndex)) {
        newSet.delete(quarterIndex);
      } else {
        newSet.add(quarterIndex);
      }
      return newSet;
    });
  };

  const ltvBreakdown = calculateLTV(currentScenario.churnRate, currentScenario.annualVsMonthlyRatio);
  const ltv3Years = ltvBreakdown.ltvTotal;
  const ltvCacRatio = (ltv3Years / (cac || 1)).toFixed(2);

  const MetricCard = ({ icon: Icon, label, value, subtitle, color }) => (
    <div className="bg-white rounded-sm shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm font-medium">{label}</span>
        <Icon className="text-gray-400" size={20} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );

  const formatCurrency = (value) => {
    const val = showSEK ? value : Math.round(value * exchangeRate);
    const symbol = showSEK ? 'kr' : '$';
    
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M ' + symbol;
    if (val >= 1000) return Math.round(val / 1000) + 'K ' + symbol;
    return Math.round(val) + ' ' + symbol;
  };

  const formatNumber = (num) => num.toLocaleString('sv-SE');

  const billingMixData = [
    { name: 'Årsprenumeration', value: latestQuarter?.displayAnnualPayers || 0, color: '#3b82f6' },
    { name: 'Månadsprenumeration', value: latestQuarter?.displayMonthlyPayers || 0, color: '#8b5cf6' }
  ];

  const ScenarioInput = ({ label, value, field, scenarioKey, suffix, step, min }) => (
    <div className="flex flex-col">
      <label className="text-xs text-gray-600 mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => updateScenarioValue(scenarioKey, field, e.target.value)}
          step={step}
          min={min}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && <span className="ml-1 text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );

  const CacInput = () => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <div className="flex flex-col">
        <label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
          Customer Acquisition Cost (CAC)
          <div className="relative">
            <HelpCircle 
              size={14} 
              className="text-gray-400 hover:text-gray-600 cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            />
            {showTooltip && (
              <div className="absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 z-50">
                <div className="font-semibold mb-1">CAC inkluderar:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Marknadsföringskostnader (annonser, SEO, content)</li>
                  <li>Försäljningskostnader (löner, verktyg, provisioner)</li>
                  <li>Onboarding & support (initiala kostnader per kund)</li>
                </ul>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  Beräkning: Total kostnad / Nya kunder
                </div>
              </div>
            )}
          </div>
        </label>
        <div className="flex items-center">
          <input
            type="number"
            value={cac}
            onChange={(e) => setCac(parseFloat(e.target.value) || 0)}
            step="10"
            min="0"
            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="ml-2 text-xs text-gray-500">kr</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-gray-900" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">YearWheel Intäktsprognos</h1>
                <p className="text-sm text-gray-600 mt-1">24-månaders intäktsprojektion med LTV-analys</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={'px-4 py-2 rounded-sm transition-colors font-medium flex items-center gap-2 ' + (showSettings ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}
              >
                <Settings size={18} />
                Justera värden
              </button>
              <button
                onClick={() => setUseQuarterAverage(!useQuarterAverage)}
                className={'px-4 py-2 rounded-sm transition-colors font-medium text-sm ' + (useQuarterAverage ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}
              >
                {useQuarterAverage ? 'Kvartal: Medelvärde' : 'Kvartal: Slutvärde'}
              </button>
              <button
                onClick={() => setShowSEK(!showSEK)}
                className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors font-medium"
              >
                Visa i {showSEK ? 'USD' : 'SEK'}
              </button>
              <LanguageSwitcher />
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
              >
                Tillbaka till Admin
              </button>
            </div>
          </div>
        </div>
      </div>

  <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-sm shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Välj & Anpassa Scenario</h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(scenarios).map(([key, s]) => (
              <div key={key}>
                <button
                  onClick={() => setScenario(key)}
                  className={'w-full p-4 rounded-sm border-2 transition-all mb-3 ' + (scenario === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}
                >
                  <div className="font-semibold text-lg mb-2">{s.name}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Registreringar: {s.monthlySignups}/mån</div>
                    <div>Tillväxt: {s.growthRate}%/år</div>
                    <div>Churn: {s.churnRate}%/mån</div>
                    <div>Konvertering: {s.freeToPayingConversion}%</div>
                  </div>
                </button>
                
                {showSettings && scenario === key && (
                  <div className="p-4 bg-gray-50 rounded-sm border border-gray-200 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Justera {s.name}</h3>
                    <ScenarioInput
                      label="Registreringar/mån"
                      value={s.monthlySignups}
                      field="monthlySignups"
                      scenarioKey={key}
                      step="10"
                      min="0"
                    />
                    <ScenarioInput
                      label="Tillväxt"
                      value={s.growthRate}
                      field="growthRate"
                      scenarioKey={key}
                      suffix="%/år"
                      step="1"
                      min="0"
                    />
                    <ScenarioInput
                      label="Churn"
                      value={s.churnRate}
                      field="churnRate"
                      scenarioKey={key}
                      suffix="%/mån"
                      step="0.5"
                      min="0"
                    />
                    <ScenarioInput
                      label="Konvertering"
                      value={s.freeToPayingConversion}
                      field="freeToPayingConversion"
                      scenarioKey={key}
                      suffix="%"
                      step="0.5"
                      min="0"
                    />
                    <ScenarioInput
                      label="Årsprenumeration"
                      value={s.annualVsMonthlyRatio}
                      field="annualVsMonthlyRatio"
                      scenarioKey={key}
                      suffix="%"
                      step="5"
                      min="0"
                    />
                    <ScenarioInput
                      label="Månader till konv."
                      value={s.avgMonthsToConvert}
                      field="avgMonthsToConvert"
                      scenarioKey={key}
                      suffix="mån"
                      step="0.5"
                      min="0.5"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <MetricCard
            icon={DollarSign}
            label={`MRR (${latestQuarter?.quarter || 'Q8'})`}
            value={formatCurrency(latestQuarter?.displayMrrSEK || 0)}
            subtitle={'ARR: ' + formatCurrency(latestQuarter?.displayArrSEK || 0)}
            color={currentScenario.color}
          />
          <MetricCard
            icon={Users}
            label="Totalt Användare"
            value={formatNumber(latestQuarter?.displayTotalUsers || 0)}
            subtitle={formatNumber(latestQuarter?.displayPayingUsers || 0) + ' betalande'}
            color="#8b5cf6"
          />
          <MetricCard
            icon={Percent}
            label="Konverteringsgrad"
            value={(latestQuarter?.displayConversionRate || 0) + '%'}
            subtitle="Gratis → Betalande"
            color="#f59e0b"
          />
          <MetricCard
            icon={Target}
            label="LTV (3 år)"
            value={formatCurrency(ltv3Years)}
            subtitle={'LTV:CAC = ' + ltvCacRatio + ':1'}
            color="#10b981"
          />
          <MetricCard
            icon={TrendingUp}
            label="ARPU"
            value={formatCurrency(latestQuarter?.displayArpuSEK || 0)}
            subtitle="Per betalande användare"
            color="#06b6d4"
          />
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-sm shadow-md p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                LTV
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Lifetime Value (3 år)</h3>
              <p className="text-sm text-gray-700 mb-3">
                LTV visar genomsnittlig intäkt per kund över 3 år baserat på din churn-rate. Med {currentScenario.churnRate}% månatlig churn 
                och {currentScenario.annualVsMonthlyRatio}% årsprenumerationer genererar varje kund i snitt <strong>{formatCurrency(ltv3Years)}</strong> över 3 år.
              </p>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600 text-xs mb-1">Customer Lifetime Value (3 år)</div>
                  <div className="font-bold text-green-600">{formatCurrency(ltvBreakdown.ltvTotal)}</div>
                  <div className="text-xs text-gray-500 mt-1">(Månad: {formatCurrency(ltvBreakdown.ltvMonthly)} • År: {formatCurrency(ltvBreakdown.ltvAnnual)})</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600 text-xs mb-1">Est. Customer Acquisition Cost</div>
                  <div className="font-bold text-orange-600">{formatCurrency(cac)}</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600 text-xs mb-1">LTV:CAC Ratio</div>
                  <div className="font-bold text-blue-600">{ltvCacRatio}:1</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {parseFloat(ltvCacRatio) >= 3 ? '✅ Utmärkt!' : parseFloat(ltvCacRatio) >= 2 ? '👍 Bra' : '⚠️ Förbättra'}
                  </div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600 text-xs mb-1">Avg Lifespan (mån / år)</div>
                  <div className="font-bold text-gray-900">{ltvBreakdown.avgLifespanMonthly}m / {ltvBreakdown.avgLifespanAnnual}y</div>
                </div>
              </div>
              <div className="mt-3">
                <CacInput />
              </div>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Riktmärke:</strong> Ett hälsosamt SaaS-företag bör ha LTV:CAC ≥ 3:1. Om din CAC är högre än {formatCurrency(cac)}, fokusera på att sänka den eller öka LTV genom lägre churn.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-sm shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="mr-2 text-blue-600" size={20} />
              År 1 Resultat
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">MRR:</span>
                <span className="font-semibold">{formatCurrency(year1Data.displayMrrSEK || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ARR:</span>
                <span className="font-semibold">{formatCurrency(year1Data.displayArrSEK || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Betalande användare:</span>
                <span className="font-semibold">{formatNumber(year1Data.displayPayingUsers || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total användare:</span>
                <span className="font-semibold">{formatNumber(year1Data.displayTotalUsers || 0)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-sm shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="mr-2 text-green-600" size={20} />
              År 2 Resultat
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">MRR:</span>
                <span className="font-semibold">{formatCurrency(year2Data.displayMrrSEK || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ARR:</span>
                <span className="font-semibold">{formatCurrency(year2Data.displayArrSEK || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Betalande användare:</span>
                <span className="font-semibold">{formatNumber(year2Data.displayPayingUsers || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total användare:</span>
                <span className="font-semibold">{formatNumber(year2Data.displayTotalUsers || 0)}</span>
              </div>
              <div className="mt-2 pt-2 border-t">
                <span className="text-xs text-green-600 font-medium">
                  YoY Tillväxt: +{(((year2Data.displayMrrSEK || 1) / (year1Data.displayMrrSEK || 1) - 1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-sm shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Månatlig Återkommande Intäkt (MRR) — kvartalsvy</h2>
            <div className="text-xs text-gray-500">
              {useQuarterAverage ? 'Visar medelvärde per kvartal' : 'Visar slutvärde per kvartal'}
            </div>
          </div>
          <div className="w-full h-[350px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-gray-600 font-medium">MRR Line Chart</p>
              <p className="text-sm text-gray-500 mt-1">Chart placeholder - coming soon</p>
            </div>
          </div>
          
          {/* Monthly drilldown section */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Månadsuppdelning per kvartal</h3>
            {displayQuarters.map((q) => (
              <div key={q.quarterIndex} className="border border-gray-200 rounded-sm">
                <button
                  onClick={() => toggleQuarterExpansion(q.quarterIndex)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{q.quarter}</span>
                    <span className="text-sm text-gray-600">
                      MRR: {formatCurrency(q.displayMrrSEK)} | Användare: {formatNumber(q.displayTotalUsers)}
                    </span>
                  </div>
                  {expandedQuarters.has(q.quarterIndex) ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </button>
                
                {expandedQuarters.has(q.quarterIndex) && q.monthlyDetails && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-3">
                      {q.monthlyDetails.map((m) => (
                        <div key={m.month} className="bg-white p-3 rounded-sm border border-gray-200">
                          <div className="text-xs font-semibold text-gray-500 mb-2">Månad {m.month}</div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">MRR:</span>
                              <span className="font-medium">{formatCurrency(m.mrrSEK)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Användare:</span>
                              <span className="font-medium">{formatNumber(m.totalUsers)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Betalande:</span>
                              <span className="font-medium">{formatNumber(m.payingUsers)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Konvertering:</span>
                              <span className="font-medium">{m.conversionRate}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-sm shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Användartillväxt</h2>
            <div className="w-full h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto mb-3 text-gray-400" size={48} />
                <p className="text-gray-600 font-medium">User Growth Bar Chart</p>
                <p className="text-sm text-gray-500 mt-1">Chart placeholder - coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Prenumerationsmix (Månad 24)</h2>
            <div className="w-full h-[300px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Percent className="mx-auto mb-3 text-gray-400" size={48} />
                <p className="text-gray-600 font-medium">Subscription Mix Pie Chart</p>
                <p className="text-sm text-gray-500 mt-1">Chart placeholder - coming soon</p>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              <div className="font-semibold text-lg text-gray-900 mb-1">
                {latestQuarter?.displayAnnualPercentage || 0}% väljer årsprenumeration
              </div>
              <div>Årlig: {formatNumber(latestQuarter?.displayAnnualPayers || 0)} | Månadsvis: {formatNumber(latestQuarter?.displayMonthlyPayers || 0)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-sm shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Insikter & Rekommendationer</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">📈 Tillväxtstrategier</h3>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li><strong>Optimera LTV:</strong> Minska churn från {currentScenario.churnRate}% till 3% för att öka LTV med ~50%</li>
                <li><strong>Främja årsprenumeration:</strong> Öka från {currentScenario.annualVsMonthlyRatio}% till 80% för bättre cash flow</li>
                <li><strong>Förbättra konvertering:</strong> Varje 1% ökning i konvertering = {formatCurrency(Math.round((year2Data.displayMrrSEK || 0) * 0.2))} mer MRR</li>
                <li><strong>Sänk CAC:</strong> Fokusera på organisk tillväxt och word-of-mouth</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">🎯 Nordisk Marknad</h3>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li><strong>LTV:CAC ratio:</strong> Sikta på 3:1 eller bättre för hållbar tillväxt</li>
                <li><strong>Säsongsvariation:</strong> Höga signups i jan/aug ger konverteringar under feb-apr/sep-nov</li>
                <li><strong>Retention tactics:</strong> Påminnelser, templates och community features</li>
                <li><strong>B2B expansion:</strong> Team-funktioner kan öka ARPU med 3-5x</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
            <h3 className="font-semibold text-gray-900 mb-2">💡 Kritiska Framgångsfaktorer</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Månad 12 mål:</strong> {formatCurrency(year1Data.displayMrrSEK || 0)} MRR | {formatNumber(year1Data.displayPayingUsers || 0)} kunder | LTV = {formatCurrency(ltv3Years)}</p>
              <p><strong>Månad 24 mål:</strong> {formatCurrency(year2Data.displayMrrSEK || 0)} MRR | {formatNumber(year2Data.displayPayingUsers || 0)} kunder</p>
              <p className="pt-2 border-t mt-2"><strong>Fokusområden:</strong> Churn under 4%, Årsprenumeration över 70%, Konvertering över 5%, LTV:CAC över 3:1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
