import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Activity } from "lucide-react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function TrendChart({ newsletters }) {
  // Group newsletters by month
  const monthlyData = React.useMemo(() => {
    const months = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = startOfMonth(subMonths(now, i));
      const key = format(month, 'MMM yyyy');
      months[key] = { month: key, newsletters: 0, ma_deals: 0, funding: 0 };
    }

    newsletters.forEach(newsletter => {
      let date;
      if (newsletter.publication_date) {
        try {
          date = parseISO(newsletter.publication_date);
          if (isNaN(date.getTime())) date = null;
        } catch {
          date = null;
        }
      }
      
      if (!date && newsletter.created_date) {
        try {
          date = new Date(newsletter.created_date);
          if (isNaN(date.getTime())) date = null;
        } catch {
          date = null;
        }
      }
      
      if (!date) return;
      
      const key = format(startOfMonth(date), 'MMM yyyy');
      
      if (months[key]) {
        months[key].newsletters++;
        months[key].ma_deals += newsletter.ma_activities?.length || 0;
        months[key].funding += newsletter.funding_rounds?.length || 0;
      }
    });

    return Object.values(months);
  }, [newsletters]);

  // Sentiment distribution
  const sentimentData = React.useMemo(() => {
    const sentiments = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
    newsletters.forEach(n => {
      if (n.sentiment) sentiments[n.sentiment]++;
    });
    return Object.entries(sentiments)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [newsletters]);

  // Top themes
  const themeData = React.useMemo(() => {
    const themes = {};
    newsletters.forEach(newsletter => {
      newsletter.themes?.forEach(theme => {
        const name = theme.theme;
        themes[name] = (themes[name] || 0) + 1;
      });
    });
    return Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
  }, [newsletters]);

  return (
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
        <CardHeader className="border-b border-slate-200/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Activity Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="newsletters" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="ma_deals" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
        <CardHeader className="border-b border-slate-200/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-purple-600" />
            Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {themeData.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 md:col-span-2">
          <CardHeader className="border-b border-slate-200/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              Top Themes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={themeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="theme" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}