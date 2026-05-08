import React from 'react';
import { VmindChart } from '@/shared/types/vmind';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

interface ChartRendererProps {
  chart: VmindChart;
}

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chart }) => {
  if (!chart || !chart.data || chart.data.length === 0) return null;

  const xKey = chart.xKey || "label";
  const yKey = chart.yKey || "value";

  const renderChart = () => {
    const commonProps = {
      width: 350,
      height: 250,
      data: chart.data,
      margin: { top: 5, right: 20, bottom: 20, left: 0 }
    };

    switch (chart.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2538" vertical={false} />
            <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1c2538', borderRadius: '8px' }}
              itemStyle={{ color: '#06b6d4' }}
            />
            <Bar dataKey={yKey} fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2538" vertical={false} />
            <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1c2538', borderRadius: '8px' }}
              itemStyle={{ color: '#06b6d4' }}
            />
            <Line type="monotone" dataKey={yKey} stroke="#06b6d4" strokeWidth={2} dot={{ r: 4, fill: '#06b6d4' }} />
          </LineChart>
        );

      case 'pie':
      case 'doughnut':
        return (
          <PieChart width={350} height={250}>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              innerRadius={chart.type === 'doughnut' ? 60 : 0}
              outerRadius={80}
              paddingAngle={5}
              dataKey={yKey}
              nameKey={xKey}
            >
              {chart.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1c2538', borderRadius: '8px' }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2538" vertical={false} />
            <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1c2538', borderRadius: '8px' }}
              itemStyle={{ color: '#06b6d4' }}
            />
            <Area type="monotone" dataKey={yKey} stroke="#06b6d4" fillOpacity={0.3} fill="#06b6d4" />
          </AreaChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs italic">
            Type de graphique non supporté : {chart.type}
          </div>
        );
    }
  };

  return (
    <div className="my-6 p-4 rounded-xl border border-[#1c2538] bg-[#0d121f]/50 backdrop-blur-sm overflow-hidden">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-100">{chart.title}</h3>
        {chart.description && <p className="text-[10px] text-gray-500">{chart.description}</p>}
      </div>
      <div className="flex justify-center">
        {renderChart()}
      </div>
    </div>
  );
};
