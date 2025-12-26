
import { Point, PolymerChain, SimulationParams, SimulationStats } from '../types';

export class SimulationEngine {
  private params: SimulationParams;
  private chains: PolymerChain[] = [];
  private obstacles: Set<string> = new Set();
  private occupied: Set<string> = new Set();
  private steps = 0;
  private successfulMoves = 0;

  constructor(params: SimulationParams) {
    this.params = params;
    this.reset();
  }

  public reset() {
    this.steps = 0;
    this.successfulMoves = 0;
    this.obstacles.clear();
    this.occupied.clear();
    this.chains = [];

    // Initialize Obstacles
    const totalSites = this.params.latticeSize * this.params.latticeSize;
    const numObstacles = Math.floor(totalSites * this.params.obstacleConcentration);
    let placed = 0;
    while (placed < numObstacles) {
      const x = Math.floor(Math.random() * this.params.latticeSize);
      const y = Math.floor(Math.random() * this.params.latticeSize);
      const key = `${x},${y}`;
      if (!this.obstacles.has(key)) {
        this.obstacles.add(key);
        placed++;
      }
    }

    // Initialize Chains
    for (let i = 0; i < this.params.numChains; i++) {
      const chain: PolymerChain = [];
      let foundStart = false;
      let startX = 0, startY = 0;
      
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * this.params.latticeSize);
        const y = Math.floor(Math.random() * this.params.latticeSize);
        if (!this.isBlocked(x, y)) {
          startX = x;
          startY = y;
          foundStart = true;
          break;
        }
      }

      if (!foundStart) continue;

      chain.push({ x: startX, y: startY });
      this.occupied.add(`${startX},${startY}`);

      for (let j = 1; j < this.params.chainLength; j++) {
        const last = chain[chain.length - 1];
        const neighbors = this.getNeighbors(last.x, last.y).filter(p => !this.isBlocked(p.x, p.y));
        if (neighbors.length > 0) {
          const next = neighbors[Math.floor(Math.random() * neighbors.length)];
          chain.push(next);
          this.occupied.add(`${next.x},${next.y}`);
        } else {
          break;
        }
      }
      this.chains.push(chain);
    }
  }

  private isBlocked(x: number, y: number): boolean {
    const key = `${x},${y}`;
    return this.obstacles.has(key) || this.occupied.has(key);
  }

  private getNeighbors(x: number, y: number): Point[] {
    const L = this.params.latticeSize;
    return [
      { x: (x + 1) % L, y },
      { x: (x - 1 + L) % L, y },
      { x, y: (y + 1) % L },
      { x, y: (y - 1 + L) % L }
    ];
  }

  public step() {
    if (this.steps >= this.params.maxSteps) return;
    for (let i = 0; i < this.params.numChains; i++) {
      this.reptate();
      this.steps++;
      if (this.steps >= this.params.maxSteps) break;
    }
  }

  private reptate() {
    if (this.chains.length === 0) return;
    const chainIdx = Math.floor(Math.random() * this.chains.length);
    const chain = this.chains[chainIdx];
    if (chain.length < 2) return;

    const isHead = Math.random() < 0.5;
    const endPos = isHead ? chain[0] : chain[chain.length - 1];
    const removePos = isHead ? chain[chain.length - 1] : chain[0];

    const neighbors = this.getNeighbors(endPos.x, endPos.y);
    const validMoves = neighbors.filter(p => !this.isBlocked(p.x, p.y));

    if (validMoves.length > 0) {
      const nextPos = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.occupied.delete(`${removePos.x},${removePos.y}`);
      if (isHead) {
        chain.unshift(nextPos);
        chain.pop();
      } else {
        chain.push(nextPos);
        chain.shift();
      }
      this.occupied.add(`${nextPos.x},${nextPos.y}`);
      this.successfulMoves++;
    }
  }

  public getChains() { return this.chains; }
  public getObstacles() { return this.obstacles; }

  public getStats(): SimulationStats {
    let sumR = 0;
    let sumR2 = 0;
    let sumRg = 0;
    let sumRg2 = 0;
    let validCount = 0;

    this.chains.forEach(chain => {
      if (chain.length < 2) return;
      validCount++;
      const head = chain[0];
      const tail = chain[chain.length - 1];
      
      const dx = head.x - tail.x;
      const dy = head.y - tail.y;
      const r2 = (dx * dx + dy * dy);
      sumR2 += r2;
      sumR += Math.sqrt(r2);

      const cx = chain.reduce((s, p) => s + p.x, 0) / chain.length;
      const cy = chain.reduce((s, p) => s + p.y, 0) / chain.length;
      let rg2_local = 0;
      chain.forEach(p => {
        rg2_local += Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2);
      });
      rg2_local /= chain.length;
      sumRg2 += rg2_local;
      sumRg += Math.sqrt(rg2_local);
    });

    const divisor = validCount || 1;
    return {
      steps: this.steps,
      rmsEndToEnd: Math.sqrt(sumR2 / divisor),
      meanEndToEnd: sumR / divisor,
      radiusOfGyration: Math.sqrt(sumRg2 / divisor),
      meanRadiusOfGyration: sumRg / divisor,
      successfulMoves: this.successfulMoves,
      acceptanceRatio: this.steps > 0 ? (this.successfulMoves / this.steps) : 0,
      isFinished: this.steps >= this.params.maxSteps
    };
  }
}
