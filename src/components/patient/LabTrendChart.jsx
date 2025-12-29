import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function LabTrendChart({ testCode, testName, results, normalMin, normalMax, unit }) {
  // Transform results into chart data
  const chartData = results
    .map(r => ({
      date: r.result_date,
      value: r.value,
      isAbnormal: r.is_abnormal
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.isAbnormal) {
      return (
        <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="#fff" strokeWidth={2} />;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium">{format(new Date(payload[0].payload.date), 'MMM d, yyyy')}</p>
          <p className="text-sm text-slate-600">
            Value: <span className={payload[0].payload.isAbnormal ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
              {payload[0].value} {unit}
            </span>
          </p>
          {normalMin && normalMax && (
            <p className="text-xs text-slate-500 mt-1">
              Normal: {normalMin}-{normalMax} {unit}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const latestResult = chartData[chartData.length - 1];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{testName} ({testCode})</CardTitle>
          {latestResult && (
            <div className="flex items-center gap-2">
              {latestResult.isAbnormal && (
                <Badge className="bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Abnormal
                </Badge>
              )}
              <Badge variant="outline" className="text-lg font-semibold">
                {latestResult.value} {unit}
              </Badge>
            </div>
          )}
        </div>
        {normalMin && normalMax && (
          <p className="text-sm text-slate-500">Normal Range: {normalMin}-{normalMax} {unit}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => format(new Date(date), 'MMM d')}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              domain={['dataMin - 10', 'dataMax + 10']}
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {normalMin && <ReferenceLine y={normalMin} stroke="#94a3b8" strokeDasharray="3 3" label="Min" />}
            {normalMax && <ReferenceLine y={normalMax} stroke="#94a3b8" strokeDasharray="3 3" label="Max" />}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}