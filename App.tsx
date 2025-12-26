
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SimulationEngine } from './services/SimulationEngine';
import { SimulationParams, SimulationStats } from './types';
import LatticeCanvas from './components/LatticeCanvas';
import Controls from './components/Controls';
import Stats from './components/Stats';

const INITIAL_PARAMS: SimulationParams = {
  latticeSize: 50,
  numChains: 20,
  chainLength: 15,
  obstacleConcentration: 0.1,
  simulationSpeed: 50,
  maxSteps: 50000
};

const App: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>(INITIAL_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({ 
    steps: 0, 
    rmsEndToEnd: 0, 
    meanEndToEnd: 0,
    radiusOfGyration: 0, 
    meanRadiusOfGyration: 0,
    successfulMoves: 0, 
    acceptanceRatio: 0,
    isFinished: false 
  });
  const [history, setHistory] = useState<{ step: number; rms: number; rg: number }[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Initialize engineRef with a concrete instance
  const engineRef = useRef<SimulationEngine>(new SimulationEngine(INITIAL_PARAMS));
  // Fix: Added null as initial value to satisfy TypeScript's useRef definition (Error on line 38/37)
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

      // Step the simulation based on speed
      for (let i = 0; i < params.simulationSpeed; i++) {
        engineRef.current.step();
      }

      const updatedStats = engineRef.current.getStats();
      setStats(updatedStats);
      setDisplayChains([...engineRef.current.getChains()]);

      // Update history
      if (updatedStats.steps - lastHistoryUpdateRef.current >= 500) {
        setHistory(prev => [...prev, { step: updatedStats.steps, rms: updatedStats.rmsEndToEnd, rg: updatedStats.radiusOfGyration }].slice(-100));
        lastHistoryUpdateRef.current = updatedStats.steps;
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, params.simulationSpeed]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  const handleParamChange = (updates: Partial<SimulationParams>) => {
    const newParams = { ...params, ...updates };
    setParams(newParams);
    
    // If structural params change, reset the engine
    if ('latticeSize' in updates || 'numChains' in updates || 'chainLength' in updates || 'obstacleConcentration' in updates) {
      engineRef.current = new SimulationEngine(newParams);
      setDisplayChains(engineRef.current.getChains());
      setDisplayObstacles(new Set(engineRef.current.getObstacles()));
      setHistory([]);
      lastHistoryUpdateRef.current = 0;
      setStats(engineRef.current.getStats());
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    engineRef.current.reset();
    setDisplayChains([...engineRef.current.getChains()]);
    setDisplayObstacles(new Set(engineRef.current.getObstacles()));
    setStats(engineRef.current.getStats());
    setHistory([]);
    lastHistoryUpdateRef.current = 0;
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    // When manually stopped, we can consider the data frozen
  };

  const getGeminiInsight = async () => {
    setIsLoadingInsight(true);
    try {
      // Use the injected API_KEY environment variable. Create a new instance for each call.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Perform a high-level statistical analysis for a polymer physicist of this simulation:
      - Lattice Size: ${params.latticeSize}
      - Number of Chains: ${params.numChains}
      - Chain Length (N): ${params.chainLength}
      - Obstacle Concentration: ${params.obstacleConcentration * 100}%
      - Total Steps: ${stats.steps}
      - RMS End-to-End distance: ${stats.rmsEndToEnd.toFixed(4)}
      - Mean Radius of Gyration: ${stats.meanRadiusOfGyration.toFixed(4)}
      - Acceptance Ratio: ${stats.acceptanceRatio.toFixed(4)}
      
      Focus on scaling laws, the impact of obstacle concentration on reptation tube width, and whether the current RMS values suggest a relaxed chain or if the simulation should run longer for equilibration.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      // Correctly access response.text property
      setExplanation(response.text || "No insights available.");
    } catch (err) {
      console.error(err);
      setExplanation("Failed to fetch AI insights. Ensure your simulation has data and API key is valid.");
    } finally {
      setIsLoadingInsight(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-100">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Polymer Reptation Lab
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            Monte Carlo Simulation on Square Lattice (PBC)
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <span className="text-emerald-500 font-mono text-xs">{params.maxSteps.toLocaleString()} Steps Limit</span>
          </p>
        </div>
        <button 
          onClick={getGeminiInsight}
          disabled={isLoadingInsight || stats.steps === 0}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
        >
          {isLoadingInsight ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : '✨ Analyze Summary Statistics'}
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visualizer & Expanded Stats */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <LatticeCanvas 
            chains={displayChains} 
            obstacles={displayObstacles} 
            latticeSize={params.latticeSize} 
          />
          <Stats stats={stats} history={history} maxSteps={params.maxSteps} />
          
          {explanation && (
            <div className="p-6 bg-slate-800 rounded-xl border-l-4 border-indigo-500 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-indigo-400 font-bold flex items-center gap-2">
                  <span className="text-lg">⚛️</span> Physics Summary Analysis
                </h3>
                <button onClick={() => setExplanation('')} className="text-slate-500 hover:text-white text-xs">Close</button>
              </div>
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm font-light">
                {explanation}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Controls & Legend */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 shadow-inner">
            <h3 className="font-bold text-slate-300 mb-3 text-xs uppercase tracking-widest">Quick Legend</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-3 h-3 bg-red-500 rounded-sm shadow-sm shadow-red-500/50"></span>
                <span>Obstacles</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-3 h-3 bg-blue-400 rounded-full shadow-sm shadow-blue-400/50"></span>
                <span>Polymer Head</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="w-4 h-1 bg-blue-400 rounded-full"></span>
                <span>Chain Segment</span>
              </div>
            </div>
          </div>

          <Controls 
            params={params} 
            onChange={handleParamChange} 
            onReset={handleReset} 
            onStop={handleStop}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            isPlaying={isPlaying}
            isFinished={stats.isFinished}
          />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        Polymer Reptation Lab • Explicit Step Control & Detailed MC Statistics • Engine v1.1
      </footer>
    </div>
  );
};

export default App;
