
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SimulationEngine } from './services/SimulationEngine';
import { SimulationParams, SimulationStats } from './types';
import LatticeCanvas from './components/LatticeCanvas';
import Controls from './components/Controls';
import Stats from './components/Stats';

const INITIAL_PARAMS: SimulationParams = {
  latticeSize: 50,
  numChains: 15,
  chainLength: 20,
  obstacleConcentration: 0.12,
  simulationSpeed: 100,
  maxSteps: 1000000
};

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({ 
    steps: 0, rmsEndToEnd: 0, meanEndToEnd: 0, radiusOfGyration: 0, 
    meanRadiusOfGyration: 0, successfulMoves: 0, acceptanceRatio: 0,
    autocorrelation: 1, rawAutocorrelation: 0, isFinished: false 
  });
  const [history, setHistory] = useState<{ step: number; rms: number; rg: number; autocorrelation: number }[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const engineRef = useRef<SimulationEngine>(new SimulationEngine(INITIAL_PARAMS));
  const requestRef = useRef<number | null>(null);
  const lastHistoryUpdateRef = useRef<number>(0);

  const [displayChains, setDisplayChains] = useState(engineRef.current.getChains());
  const [displayObstacles, setDisplayObstacles] = useState(engineRef.current.getObstacles());

  const animate = useCallback(() => {
    if (isPlaying) {
      const currentStats = engineRef.current.getStats();
      if (currentStats.isFinished) {
        setIsPlaying(false);
        setStats(currentStats);
        return;
      }

      for (let i = 0; i < params.simulationSpeed; i++) {
        engineRef.current.step();
      }

      const updatedStats = engineRef.current.getStats();
      setStats(updatedStats);
      setDisplayChains([...engineRef.current.getChains()]);

      if (updatedStats.steps - lastHistoryUpdateRef.current >= 200) {
        setHistory(prev => [
          ...prev, 
          { step: updatedStats.steps, rms: updatedStats.rmsEndToEnd, rg: updatedStats.radiusOfGyration, autocorrelation: updatedStats.autocorrelation }
        ].slice(-200));
        lastHistoryUpdateRef.current = updatedStats.steps;
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, params.simulationSpeed]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  const handleParamChange = (updates: Partial<SimulationParams>) => {
    const newParams = { ...params, ...updates };
    setParams(newParams);
    if ('latticeSize' in updates || 'numChains' in updates || 'chainLength' in updates || 'obstacleConcentration' in updates) {
      engineRef.current = new SimulationEngine(newParams);
      setDisplayChains(engineRef.current.getChains());
      setDisplayObstacles(new Set(engineRef.current.getObstacles()));
      setHistory([]); lastHistoryUpdateRef.current = 0;
      setStats(engineRef.current.getStats()); setIsPlaying(false);
    } else {
      engineRef.current.updateParams(newParams);
      setStats(engineRef.current.getStats());
    }
  };

  const handleReset = () => {
    engineRef.current.reset();
    setDisplayChains([...engineRef.current.getChains()]);
    setDisplayObstacles(new Set(engineRef.current.getObstacles()));
    setStats(engineRef.current.getStats());
    setHistory([]); lastHistoryUpdateRef.current = 0;
    setIsPlaying(false);
  };

  const getGeminiInsight = async () => {
    setIsLoadingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze the following polymer reptation Monte Carlo simulation results:
      - Lattice: ${params.latticeSize}x${params.latticeSize}
      - Chains: ${params.numChains}, Length (N): ${params.chainLength}
      - Obstacle Density: ${params.obstacleConcentration * 100}%
      - Sweeps Completed: ${stats.steps}
      - Current RMS End-to-End: ${stats.rmsEndToEnd.toFixed(3)}
      - Current Vector Autocorrelation: ${stats.autocorrelation.toFixed(3)}
      - Acceptance Ratio: ${(stats.acceptanceRatio * 100).toFixed(2)}%
      
      Explain the physical significance of the autocorrelation decay. If it's still near 1.0, what does that say about the relaxation time relative to the simulation duration? Mention how the obstacle density affects the 'tube' width in the De Gennes reptation model. Use professional physics terminology.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 4096 }
        }
      });
      setExplanation(response.text || "Insight unavailable.");
    } catch (err) {
      console.error(err);
      setExplanation("Analysis failed. Please check your connection.");
    } finally {
      setIsLoadingInsight(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-500">
              POLYMER REPTATION <span className="text-emerald-500">LAB</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
              Lattice Dynamics & Topological Constraint Simulation
            </p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={getGeminiInsight}
              disabled={isLoadingInsight || stats.steps < 1000}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isLoadingInsight ? <span className="animate-spin text-lg">⚙️</span> : '✨ Physics Analysis'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <LatticeCanvas chains={displayChains} obstacles={displayObstacles} latticeSize={params.latticeSize} />
            <Stats stats={stats} history={history} maxSteps={params.maxSteps} />
            
            {explanation && (
              <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                <h3 className="text-indigo-400 font-black mb-4 uppercase tracking-tighter flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">P</span>
                  Theoretical Interpretation
                </h3>
                <div className="text-slate-400 leading-relaxed text-sm font-light prose prose-invert max-w-none">
                  {explanation}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 flex flex-col gap-6">
            <Controls 
              params={params} onChange={handleParamChange} onReset={handleReset} 
              onStop={() => setIsPlaying(false)} onTogglePlay={() => setIsPlaying(!isPlaying)}
              isPlaying={isPlaying} isFinished={stats.isFinished}
            />
            
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Visual Legend</h4>
              <div className="space-y-6">
                <LegendItem 
                  icon={<div className="w-4 h-4 bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                  label="Quenched Obstacles" 
                  desc="Static geometric constraints." 
                />
                <LegendItem 
                  icon={<div className="w-10 h-1 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                  label="Reptating Chain" 
                  desc="Contiguous line segment model." 
                />
                <LegendItem 
                  icon={<div className="w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-900 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />}
                  label="Chain Head" 
                  desc="Active migration point (solid circle)." 
                />
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    Reptation describes the thermal motion of long polymers in a crowded environment. 
                    The chain is topologically constrained to move within a 'tube'.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) => (
  <div className="flex gap-4 items-center">
    <div className="w-12 flex justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs font-bold text-slate-200">{label}</p>
      <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
    </div>
  </div>
);

export default App;
