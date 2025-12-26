
import React from 'react';
import { SimulationParams } from '../types';

interface ControlsProps {
  params: SimulationParams;
  onChange: (updates: Partial<SimulationParams>) => void;
  onReset: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
  isFinished: boolean;
}

const Controls: React.FC<ControlsProps> = ({ params, onChange, onReset, onTogglePlay, onStop, isPlaying, isFinished }) => {
  return (
    <div className="space-y-6 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 h-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Simulation Config</h2>
          {isFinished && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded border border-red-500/30 animate-pulse">
              FINISHED
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onTogglePlay}
            disabled={isFinished}
            className={`px-4 py-3 rounded-lg font-bold transition-all ${isFinished ? 'bg-slate-700 cursor-not-allowed text-slate-500' : isPlaying ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'} text-white`}
          >
            {isPlaying ? 'Pause' : 'Start'}
          </button>
          <button 
            onClick={onStop}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition-all shadow-lg shadow-red-600/20"
          >
            Stop
          </button>
          <button 
            onClick={onReset}
            className="px-4 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-bold transition-all col-span-2"
          >
            Reset & New Lattice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ControlItem 
          label="Max Steps Limit" 
          value={params.maxSteps} 
          min={1000} max={5000000} step={1000}
          displayValue={(v) => {
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
            if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
            return v.toString();
          }}
          onChange={(v) => onChange({ maxSteps: v })}
          tooltip="Total Monte Carlo steps to run. A limit of 5 million steps allows for significant chain relaxation and improved statistical convergence."
        />
        <ControlItem 
          label="Lattice Size (LxL)" 
          value={params.latticeSize} 
          min={20} max={100} step={5}
          onChange={(v) => onChange({ latticeSize: v })}
          tooltip="Dimensions of the periodic simulation box. Larger boxes minimize finite-size effects but increase computational requirements."
        />
        <ControlItem 
          label="Number of Chains" 
          value={params.numChains} 
          min={1} max={100} step={1}
          onChange={(v) => onChange({ numChains: v })}
          tooltip="Total number of polymers in the system. Increasing this shifts the simulation toward a concentrated regime where inter-chain entanglements occur."
        />
        <ControlItem 
          label="Chain Length (N)" 
          value={params.chainLength} 
          min={2} max={100} step={1}
          onChange={(v) => onChange({ chainLength: v })}
          tooltip="Segments per chain. Reptation theory predicts relaxation times scale with N³. Longer chains exhibit more pronounced 'snake-like' dynamics."
        />
        <ControlItem 
          label="Obstacle Concentration" 
          value={params.obstacleConcentration} 
          min={0} max={0.4} step={0.01}
          displayValue={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => onChange({ obstacleConcentration: v })}
          tooltip="Density of fixed, impenetrable barriers. These define the 'tube' through which chains must reptate, significantly slowing diffusion."
        />
        <ControlItem 
          label="Simulation Speed" 
          value={params.simulationSpeed} 
          min={1} max={500} step={5}
          onChange={(v) => onChange({ simulationSpeed: v })}
          tooltip="Number of Monte Carlo steps performed per visual frame. Increase to gather data faster; decrease to observe individual segment movements."
        />
      </div>

      <div className="pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 italic">
          * Reptation: One end moves to a neighbor, segments follow. Max steps helps ensure ensemble average convergence.
        </p>
      </div>
    </div>
  );
};

interface ControlItemProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  displayValue?: (val: number) => string;
  tooltip?: string;
}

const ControlItem: React.FC<ControlItemProps> = ({ label, value, min, max, step, onChange, displayValue, tooltip }) => (
  <div className="group relative space-y-2">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        {tooltip && (
          <div className="relative inline-block group/info">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 hover:text-emerald-400 cursor-help transition-colors">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/info:block w-48 p-2 bg-slate-900 text-slate-200 text-[10px] leading-tight rounded border border-slate-700 shadow-xl z-50 pointer-events-none">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        )}
      </div>
      <span className="text-sm font-mono text-emerald-400 font-bold">
        {displayValue ? displayValue(value) : value}
      </span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
    />
  </div>
);

export default Controls;
