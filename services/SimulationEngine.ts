
import { Point, PolymerChain, SimulationParams, SimulationStats } from '../types';

export class SimulationEngine {
  private params: SimulationParams;
  private chains: PolymerChain[] = [];
  private initialR0: { x: number; y: number }[] = [];
  private initialR0SquaredSum = 0;
  private obstacles: Set<string> = new Set();
  // Using a Map to track occupancy counts to handle multiple segments on one site (if needed) or faster lookups
  private occupied: Map<string, number> = new Map();
  private steps = 0;
  private successfulMoves = 0;

  constructor(params: SimulationParams) {
    this.params = params;
    this.reset();
  }

  public updateParams(newParams: SimulationParams) {
    this.params = newParams;
  }

  public reset() {
    this.steps = 0;
    this.successfulMoves = 0;
    this.obstacles.clear();
    this.occupied.clear();
    this.chains = [];
    this.initialR0 = [];
    this.initialR0SquaredSum = 0;

    const L = this.params.latticeSize;

    // Initialize Obstacles
    const totalSites = L * L;
    const numObstacles = Math.floor(totalSites * this.params.obstacleConcentration);
    let placed = 0;
    while (placed < numObstacles) {
      const x = Math.floor(Math.random() * L);
      const y = Math.floor(Math.random() * L);
      const key = `${x},${y}`;
      if (!this.obstacles.has(key)) {
        this.obstacles.add(key);
        placed++;
      }
    }

    // Initialize Chains with Grow-or-Retry
    for (let i = 0; i < this.params.numChains; i++) {
      let chainFound = false;
      for (let attempt = 0; attempt < 200; attempt++) {
        const tempChain: PolymerChain = [];
        const startX = Math.floor(Math.random() * L);
        const startY = Math.floor(Math.random() * L);
        
        if (this.isSiteOccupied(startX, startY)) continue;
        
        tempChain.push({ x: startX, y: startY });
        this.incrementOccupancy(startX, startY);

        let growthFailed = false;
        for (let j = 1; j < this.params.chainLength; j++) {
          const last = tempChain[tempChain.length - 1];
          const neighbors = this.getNeighbors(last.x, last.y).filter(p => !this.isSiteOccupied(p.x, p.y));
          
          if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            tempChain.push(next);
            this.incrementOccupancy(next.x, next.y);
          } else {
            growthFailed = true;
            break;
          }
        }

        if (!growthFailed && tempChain.length === this.params.chainLength) {
          this.chains.push(tempChain);
          chainFound = true;
          break;
        } else {
          // Rollback
          tempChain.forEach(p => this.decrementOccupancy(p.x, p.y));
        }
      }
    }

    // Capture initial configuration
    this.chains.forEach(chain => {
      const r0 = this.getUnwrappedEndToEnd(chain);
      this.initialR0.push(r0);
      this.initialR0SquaredSum += (r0.x * r0.x + r0.y * r0.y);
    });
  }

  private incrementOccupancy(x: number, y: number) {
    const key = `${x},${y}`;
    this.occupied.set(key, (this.occupied.get(key) || 0) + 1);
  }

  private decrementOccupancy(x: number, y: number) {
    const key = `${x},${y}`;
    const count = this.occupied.get(key) || 0;
    if (count <= 1) this.occupied.delete(key);
    else this.occupied.set(key, count - 1);
  }

  private isSiteOccupied(x: number, y: number): boolean {
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

  private getUnwrappedEndToEnd(chain: PolymerChain): { x: number; y: number } {
    const L = this.params.latticeSize;
    let rx = 0, ry = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      const p1 = chain[i];
      const p2 = chain[i + 1];
      let dx = p2.x - p1.x;
      let dy = p2.y - p1.y;
      if (dx > 1) dx -= L; else if (dx < -1) dx += L;
      if (dy > 1) dy -= L; else if (dy < -1) dy += L;
      rx += dx; ry += dy;
    }
    return { x: rx, y: ry };
  }

  public step() {
    if (this.steps >= this.params.maxSteps) return;
    const attempts = Math.max(1, this.params.numChains);
    for (let i = 0; i < attempts; i++) {
      this.reptate();
    }
    this.steps++;
  }

  private reptate() {
    if (this.chains.length === 0) return;
    const chainIdx = Math.floor(Math.random() * this.chains.length);
    const chain = this.chains[chainIdx];
    
    const isHead = Math.random() < 0.5;
    const headPos = isHead ? chain[0] : chain[chain.length - 1];
    const tailPos = isHead ? chain[chain.length - 1] : chain[0];

    const neighbors = this.getNeighbors(headPos.x, headPos.y);
    // Important: A reptation move into the site currently occupied by the TAIL is valid, 
    // because the tail moves out of that site in the same step.
    const validMoves = neighbors.filter(p => {
      const key = `${p.x},${p.y}`;
      if (this.obstacles.has(key)) return false;
      const occCount = this.occupied.get(key) || 0;
      if (occCount === 0) return true;
      // If the target site is occupied, it's only valid if it's ONLY occupied by the tail we are about to remove
      if (p.x === tailPos.x && p.y === tailPos.y && occCount === 1) return true;
      return false;
    });

    if (validMoves.length > 0) {
      const nextPos = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.decrementOccupancy(tailPos.x, tailPos.y);
      if (isHead) {
        chain.unshift(nextPos);
        chain.pop();
      } else {
        chain.push(nextPos);
        chain.shift();
      }
      this.incrementOccupancy(nextPos.x, nextPos.y);
      this.successfulMoves++;
    }
  }

  public getChains() { return this.chains; }
  public getObstacles() { return this.obstacles; }

  public getStats(): SimulationStats {
    let sumR2 = 0, sumRg2 = 0, sumDotProduct = 0;
    let sumR = 0, sumRg = 0;
    const L = this.params.latticeSize;

    this.chains.forEach((chain, idx) => {
      const r_unwrapped = this.getUnwrappedEndToEnd(chain);
      const r2 = r_unwrapped.x * r_unwrapped.x + r_unwrapped.y * r_unwrapped.y;
      sumR2 += r2;
      sumR += Math.sqrt(r2);

      // Simple unwrapping for Rg calculation
      let ux = 0, uy = 0;
      let currX = 0, currY = 0;
      let chainUX = [0], chainUY = [0];
      for (let i = 0; i < chain.length - 1; i++) {
        const p1 = chain[i], p2 = chain[i+1];
        let dx = p2.x - p1.x, dy = p2.y - p1.y;
        if (dx > 1) dx -= L; else if (dx < -1) dx += L;
        if (dy > 1) dy -= L; else if (dy < -1) dy += L;
        currX += dx; currY += dy;
        chainUX.push(currX); chainUY.push(currY);
      }
      const meanX = chainUX.reduce((a,b)=>a+b,0)/chain.length;
      const meanY = chainUY.reduce((a,b)=>a+b,0)/chain.length;
      let rg2 = 0;
      for(let i=0; i<chain.length; i++){
        rg2 += (chainUX[i]-meanX)**2 + (chainUY[i]-meanY)**2;
      }
      rg2 /= chain.length;
      sumRg2 += rg2;
      sumRg += Math.sqrt(rg2);

      const r0 = this.initialR0[idx];
      sumDotProduct += (r_unwrapped.x * r0.x + r_unwrapped.y * r0.y);
    });

    const N = this.chains.length || 1;
    const avgR2 = sumR2 / N;
    const avgRg2 = sumRg2 / N;
    const avgDot = sumDotProduct / N;
    const initialAvgR2 = this.initialR0SquaredSum / N || 1;

    return {
      steps: this.steps,
      rmsEndToEnd: Math.sqrt(avgR2),
      meanEndToEnd: sumR / N,
      radiusOfGyration: Math.sqrt(avgRg2),
      meanRadiusOfGyration: sumRg / N,
      successfulMoves: this.successfulMoves,
      acceptanceRatio: this.steps > 0 ? this.successfulMoves / (this.steps * N) : 0,
      autocorrelation: avgDot / initialAvgR2,
      rawAutocorrelation: avgDot,
      isFinished: this.steps >= this.params.maxSteps
    };
  }
}
