
import React from 'react';
import { SimulationStats } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsProps {
  stats: SimulationStats;
  history: { step: number; rms: number; rg: number }[];
  maxSteps: number;
}

const Stats: React.FC<StatsProps> = ({ stats, history, maxSteps }) => {
  const progress = (stats.steps / maxSteps) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 border border-slate-700 overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <StatCard 
          label="Progress" 
          value={stats.steps.toLocaleString()} 
          subValue={`Target: ${maxSteps.toLocaleString()}`} 
        />
        <StatCard 
          label="Acceptance Ratio" 
          value={`${(stats.acceptanceRatio * 100).toFixed(1)}%`} 
          subValue={`${stats.successfulMoves.toLocaleString()} successes`} 
        />
        <StatCard 
          label="RMS End-to-End" 
          value={stats.rmsEndToEnd.toFixed(2)} 
          unit="px" 
        />
        
        <div className="col-span-1 md:col-span-2 lg:col-span-1 h-32">
          <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">RMS Chain Expansion</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.slice(-50)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="step" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="rms" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Summary Statistics Panel */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 shadow-inner">
        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
          Full Summary Statistics
          {stats.isFinished && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">FINAL DATA</span>}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <DetailStat label="Mean <R>" value={stats.meanEndToEnd.toFixed(3)} />
          <DetailStat label="RMS <R²>¹/²" value={stats.rmsEndToEnd.toFixed(3)} />
          <DetailStat label="Mean <Rg>" value={stats.meanRadiusOfGyration.toFixed(3)} />
          <DetailStat label="RMS <Rg²>¹/²" value={stats.radiusOfGyration.toFixed(3)} />
          <DetailStat label="Total Steps" value={stats.steps.toLocaleString()} />
          <DetailStat label="Acceptance" value={(stats.acceptanceRatio).toFixed(4)} />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, subValue }: { label: string; value: string | number; unit?: string; subValue?: string }) => (
  <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 flex flex-col justify-center">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-white font-mono">{value}</span>
      {unit && <span className="text-xs text-slate-400">{unit}</span>}
    </div>
    {subValue && <p className="text-xs text-emerald-500 mt-1 font-medium">{subValue}</p>}
  </div>
);

const DetailStat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</p>
    <p className="text-lg font-mono text-slate-200">{value}</p>
  </div>
);

export default Stats;
