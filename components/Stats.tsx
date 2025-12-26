
import React from 'react';
import { SimulationStats } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsProps {
  stats: SimulationStats;
  history: { step: number; rms: number; rg: number; autocorrelation?: number }[];
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
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
          label="Vector Correlation" 
          value={stats.autocorrelation.toFixed(3)} 
          subValue={<>Ensemble Avg ⟨R(t)·R(0)⟩</>}
          tooltip="Average dot product of all chains' current vs initial end-to-end vectors, normalized by initial state."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* RMS Chart */}
        <div className="h-48 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-inner group relative">
          <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
            RMS Chain Expansion ⟨R²⟩<sup className="lowercase">1/2</sup>
          </h4>
          <span className="absolute top-4 right-4 text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Instantaneous average over all chains
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.slice(-100)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="step" hide />
              <YAxis domain={['auto', 'auto']} fontSize={10} stroke="#475569" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="rms" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Autocorrelation Chart */}
        <div className="h-48 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-inner group relative">
          <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Vector Autocorrelation ⟨R(t) · R(0)⟩
          </h4>
          <span className="absolute top-4 right-4 text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Correlation decay of the ensemble
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.slice(-100)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="step" hide />
              <YAxis domain={[0, 1.1]} fontSize={10} stroke="#475569" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="autocorrelation" stroke="#6366f1" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Summary Statistics Panel */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 shadow-inner">
        <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
          Full Summary Statistics (Ensemble Averages)
          {stats.isFinished && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">FINAL DATA</span>}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <DetailStat label={<>RMS ⟨R²⟩<sup className="lowercase">1/2</sup></>} value={stats.rmsEndToEnd.toFixed(3)} />
          <DetailStat label={<>RMS ⟨Rg²⟩<sup className="lowercase">1/2</sup></>} value={stats.radiusOfGyration.toFixed(3)} />
          <DetailStat label="Norm Autocorr" value={stats.autocorrelation.toFixed(4)} />
          <DetailStat label={<>Raw ⟨R(t)·R(0)⟩</>} value={stats.rawAutocorrelation.toFixed(2)} />
          <DetailStat label="Acceptance" value={(stats.acceptanceRatio).toFixed(4)} />
          <DetailStat label="Total Steps" value={stats.steps.toLocaleString()} />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, subValue, tooltip }: { label: string; value: string | number; unit?: string; subValue?: string | React.ReactNode; tooltip?: string }) => (
  <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 flex flex-col justify-center relative group">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-white font-mono">{value}</span>
      {unit && <span className="text-xs text-slate-400">{unit}</span>}
    </div>
    {subValue && <div className="text-xs text-emerald-500 mt-1 font-medium">{subValue}</div>}
    {tooltip && (
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-black text-white text-[10px] rounded shadow-xl z-50">
        {tooltip}
      </div>
    )}
  </div>
);

const DetailStat = ({ label, value }: { label: React.ReactNode; value: string | number }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-baseline gap-0.5">{label}</p>
    <p className="text-lg font-mono text-slate-200">{value}</p>
  </div>
);

export default Stats;
