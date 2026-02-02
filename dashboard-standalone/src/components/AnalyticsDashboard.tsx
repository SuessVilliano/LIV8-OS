import { useState, useEffect } from 'react';

interface MetricData {
  label: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease';
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface AnalyticsData {
  overview: {
    conversations: MetricData;
    contentCreated: MetricData;
    leadsGenerated: MetricData;
    revenue: MetricData;
    callsCompleted: MetricData;
    emailsSent: MetricData;
  };
  conversationsTrend: ChartDataPoint[];
  contentPerformance: ChartDataPoint[];
  leadSources: { source: string; count: number; percentage: number }[];
  topContent: { title: string; platform: string; engagement: number; reach: number }[];
  aiStaffActivity: { role: string; tasks: number; conversations: number; satisfaction: number }[];
  revenueByMonth: ChartDataPoint[];
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'1d' | '3d' | '7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [showDrillDown, setShowDrillDown] = useState<string | null>(null);
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [drillDownData, setDrillDownData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);

    // Simulate API call - in production, fetch from /api/analytics
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate demo data
    const demoData: AnalyticsData = {
      overview: {
        conversations: { label: 'Conversations', value: 1248, change: 12.5, changeType: 'increase' },
        contentCreated: { label: 'Content Created', value: 89, change: 8.2, changeType: 'increase' },
        leadsGenerated: { label: 'Leads Generated', value: 156, change: 23.1, changeType: 'increase' },
        revenue: { label: 'Revenue', value: 45200, change: 15.8, changeType: 'increase' },
        callsCompleted: { label: 'Calls Completed', value: 312, change: -2.4, changeType: 'decrease' },
        emailsSent: { label: 'Emails Sent', value: 2450, change: 18.9, changeType: 'increase' }
      },
      conversationsTrend: generateTrendData(30, 40, 60),
      contentPerformance: generateTrendData(30, 2, 8),
      leadSources: [
        { source: 'Website', count: 45, percentage: 29 },
        { source: 'Social Media', count: 38, percentage: 24 },
        { source: 'Referral', count: 32, percentage: 21 },
        { source: 'AI Chat', count: 25, percentage: 16 },
        { source: 'Phone', count: 16, percentage: 10 }
      ],
      topContent: [
        { title: '5 Ways to Boost Productivity', platform: 'LinkedIn', engagement: 1250, reach: 15000 },
        { title: 'Product Launch Announcement', platform: 'Instagram', engagement: 890, reach: 12000 },
        { title: 'Customer Success Story', platform: 'Facebook', engagement: 654, reach: 8500 },
        { title: 'Industry Trends 2026', platform: 'Twitter', engagement: 432, reach: 6200 },
        { title: 'Behind the Scenes', platform: 'TikTok', engagement: 2100, reach: 25000 }
      ],
      aiStaffActivity: [
        { role: 'Marketing Manager', tasks: 145, conversations: 89, satisfaction: 94 },
        { role: 'Sales Rep', tasks: 234, conversations: 156, satisfaction: 91 },
        { role: 'Support Agent', tasks: 312, conversations: 245, satisfaction: 96 },
        { role: 'Executive Assistant', tasks: 78, conversations: 34, satisfaction: 98 },
        { role: 'Voice Agent', tasks: 56, conversations: 56, satisfaction: 89 }
      ],
      revenueByMonth: [
        { date: 'Sep', value: 32000 },
        { date: 'Oct', value: 35500 },
        { date: 'Nov', value: 38200 },
        { date: 'Dec', value: 42100 },
        { date: 'Jan', value: 45200 }
      ]
    };

    setData(demoData);
    setLoading(false);
  };

  const generateTrendData = (days: number, min: number, max: number): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.floor(Math.random() * (max - min + 1)) + min
      });
    }

    return data;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-gray-500">Track your business performance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['1d', '3d', '7d', '30d', '90d', '1y'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                timeRange === range
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {range === '1d' ? '1 Day' : range === '3d' ? '3 Days' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
          <button
            onClick={() => setTimeRange('custom')}
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
              timeRange === 'custom'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {timeRange === 'custom' && (
        <div className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">From:</label>
            <input
              type="date"
              value={customDateStart}
              onChange={(e) => setCustomDateStart(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">To:</label>
            <input
              type="date"
              value={customDateEnd}
              onChange={(e) => setCustomDateEnd(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Overview Cards - Clickable for Drill-Down */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(data.overview).map(([key, metric]) => (
          <button
            key={metric.label}
            onClick={() => setShowDrillDown(key)}
            className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-4 hover:border-violet-500/50 hover:bg-gray-800/50 transition-all text-left cursor-pointer group"
          >
            <div className="text-sm text-gray-500 mb-1 group-hover:text-violet-400 transition-colors">{metric.label}</div>
            <div className="text-2xl font-bold text-white">
              {metric.label === 'Revenue' ? formatCurrency(metric.value) : formatNumber(metric.value)}
            </div>
            <div className={`text-sm mt-1 flex items-center gap-1 ${
              metric.changeType === 'increase' ? 'text-green-400' : 'text-red-400'
            }`}>
              <span>{metric.changeType === 'increase' ? '↑' : '↓'}</span>
              <span>{Math.abs(metric.change)}%</span>
            </div>
            <div className="text-[10px] text-gray-600 mt-2 group-hover:text-gray-400 transition-colors uppercase tracking-wider">
              Click for details →
            </div>
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Trend */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Conversations Over Time</h3>
          <div className="h-64 relative">
            <SimpleLineChart data={data.conversationsTrend} color="#8b5cf6" />
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Revenue Trend</h3>
          <div className="h-64 relative">
            <SimpleBarChart data={data.revenueByMonth} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Sources */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Lead Sources</h3>
          <div className="space-y-3">
            {data.leadSources.map(source => (
              <div key={source.source}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-400">{source.source}</span>
                  <span className="text-white font-medium">{source.count}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Staff Activity */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-semibold text-white mb-4">AI Staff Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-800">
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Tasks</th>
                  <th className="pb-3 font-medium">Conversations</th>
                  <th className="pb-3 font-medium">Satisfaction</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data.aiStaffActivity.map(staff => (
                  <tr key={staff.role} className="border-b border-gray-800/50">
                    <td className="py-3 text-white font-medium">{staff.role}</td>
                    <td className="py-3 text-gray-400">{staff.tasks}</td>
                    <td className="py-3 text-gray-400">{staff.conversations}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              staff.satisfaction >= 95 ? 'bg-green-500' :
                              staff.satisfaction >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${staff.satisfaction}%` }}
                          />
                        </div>
                        <span className="text-white">{staff.satisfaction}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Content */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Top Performing Content</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.topContent.map((content, i) => (
            <div
              key={i}
              className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {content.platform === 'LinkedIn' ? '💼' :
                   content.platform === 'Instagram' ? '📸' :
                   content.platform === 'Facebook' ? '👤' :
                   content.platform === 'Twitter' ? '🐦' : '🎵'}
                </span>
                <span className="text-xs text-gray-500">{content.platform}</span>
              </div>
              <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">{content.title}</h4>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  <span className="text-white font-medium">{formatNumber(content.engagement)}</span> engagements
                </span>
                <span className="text-gray-500">
                  <span className="text-white font-medium">{formatNumber(content.reach)}</span> reach
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard
          icon="🎯"
          title="Best Performing Day"
          value="Tuesday"
          description="23% higher engagement than average"
        />
        <InsightCard
          icon="⏰"
          title="Peak Activity Time"
          value="2:00 PM - 4:00 PM"
          description="Most conversations happen during this window"
        />
        <InsightCard
          icon="🏆"
          title="Top AI Staff"
          value="Support Agent"
          description="96% satisfaction rate with 245 conversations"
        />
      </div>

      {/* Drill-Down Modal */}
      {showDrillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white capitalize">
                  {showDrillDown.replace(/([A-Z])/g, ' $1').trim()} Details
                </h3>
                <p className="text-sm text-gray-500">Detailed breakdown for {timeRange === 'custom' ? 'custom range' : `last ${timeRange}`}</p>
              </div>
              <button
                onClick={() => setShowDrillDown(null)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {showDrillDown === 'conversations' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-white">{data.overview.conversations.value}</div>
                      <div className="text-xs text-gray-500">Total Conversations</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-green-400">87%</div>
                      <div className="text-xs text-gray-500">Resolved</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-yellow-400">8%</div>
                      <div className="text-xs text-gray-500">Escalated</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-400">5%</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b border-gray-800">
                        <th className="pb-3">Contact</th>
                        <th className="pb-3">Channel</th>
                        <th className="pb-3">Agent</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {['Sarah Chen', 'James Wilson', 'Mike Ross', 'Emily Brown', 'David Kim'].map((name, i) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="py-3 text-white">{name}</td>
                          <td className="py-3 text-gray-400">{['Chat', 'SMS', 'Email', 'Call'][i % 4]}</td>
                          <td className="py-3 text-gray-400">{['AI Receptionist', 'Appointment Setter', 'Recovery Agent'][i % 3]}</td>
                          <td className="py-3"><span className={`px-2 py-1 rounded text-xs ${i % 3 === 0 ? 'bg-green-500/20 text-green-400' : i % 3 === 1 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{['Resolved', 'Escalated', 'Pending'][i % 3]}</span></td>
                          <td className="py-3 text-gray-400">{Math.floor(Math.random() * 10) + 1}m {Math.floor(Math.random() * 60)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {showDrillDown === 'contentCreated' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-white">{data.overview.contentCreated.value}</div>
                      <div className="text-xs text-gray-500">Total Content</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-violet-400">72%</div>
                      <div className="text-xs text-gray-500">AI Generated</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-400">3.2%</div>
                      <div className="text-xs text-gray-500">Avg CTR</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-green-400">156</div>
                      <div className="text-xs text-gray-500">Conversions</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Email', 'Social', 'SMS', 'Website'].map((type, i) => (
                      <div key={type} className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                        <div className="text-lg font-bold text-white">{Math.floor(Math.random() * 30) + 5}</div>
                        <div className="text-xs text-gray-500">{type} Posts</div>
                        <div className="text-[10px] text-green-400 mt-1">↑ {Math.floor(Math.random() * 20) + 5}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showDrillDown === 'revenue' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-white">{formatCurrency(data.overview.revenue.value)}</div>
                      <div className="text-xs text-gray-500">Total Revenue</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-green-400">23</div>
                      <div className="text-xs text-gray-500">Deals Closed</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-400">{formatCurrency(data.overview.revenue.value / 23)}</div>
                      <div className="text-xs text-gray-500">Avg Deal Value</div>
                    </div>
                    <div className="p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-violet-400">68%</div>
                      <div className="text-xs text-gray-500">Win Rate</div>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Revenue by Source</h4>
                  <div className="space-y-2">
                    {[
                      { source: 'AI Receptionist', pct: 40 },
                      { source: 'Website', pct: 25 },
                      { source: 'Referral', pct: 20 },
                      { source: 'Ad Campaign', pct: 15 }
                    ].map(s => (
                      <div key={s.source}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{s.source}</span>
                          <span className="text-white">{formatCurrency(data.overview.revenue.value * s.pct / 100)}</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!['conversations', 'contentCreated', 'revenue'].includes(showDrillDown) && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="text-lg font-bold text-white mb-2">Detailed Analytics</h4>
                  <p className="text-gray-500">Detailed breakdown for {showDrillDown.replace(/([A-Z])/g, ' $1').toLowerCase()} coming soon.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Line Chart Component
function SimpleLineChart({ data, color }: { data: ChartDataPoint[]; color: string }) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="w-full h-full relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
        <span>{maxValue}</span>
        <span>{Math.round((maxValue + minValue) / 2)}</span>
        <span>{minValue}</span>
      </div>

      {/* Chart area */}
      <div className="absolute left-14 right-0 top-0 bottom-8">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#374151" strokeWidth="0.5" strokeDasharray="2" />

          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill={`url(#gradient-${color.replace('#', '')})`}
            opacity="0.3"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-14 right-0 bottom-0 h-6 flex justify-between text-xs text-gray-500">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
          <span key={i}>{d.date}</span>
        ))}
      </div>
    </div>
  );
}

// Simple Bar Chart Component
function SimpleBarChart({ data, color }: { data: ChartDataPoint[]; color: string }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="w-full h-full flex items-end justify-between gap-2 pb-8">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 relative group"
            style={{
              height: `${(d.value / maxValue) * 180}px`,
              background: `linear-gradient(180deg, ${color}, ${color}80)`
            }}
          >
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ${(d.value / 1000).toFixed(1)}K
            </div>
          </div>
          <span className="text-xs text-gray-500">{d.date}</span>
        </div>
      ))}
    </div>
  );
}

// Insight Card Component
function InsightCard({ icon, title, value, description }: {
  icon: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-4 flex items-start gap-4">
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>
    </div>
  );
}
