
import { Point, PolymerChain, SimulationParams, SimulationStats } from '../types';

export class SimulationEngine {
  private params: SimulationParams;
  private chains: PolymerChain[] = [];
  private initialR0: { x: number; y: number }[] = [];
  private initialR0SquaredSum = 0;
  private obstacles: Set<string> = new Set();
  private occupied: Set<string> = new Set();
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

    // Initialize Chains (Random walk start, avoiding obstacles/other segments)
    for (let i = 0; i < this.params.numChains; i++) {
      const chain: PolymerChain = [];
      let foundStart = false;
      let startX = 0, startY = 0;
      
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * this.params.latticeSize);
        const y = Math.floor(Math.random() * this.params.latticeSize);
        if (!this.isBlocked(x, y)) {
          startX = x; startY = y;
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

    // Capture initial configuration for autocorrelation
    this.chains.forEach(chain => {
      const r0 = this.getUnwrappedEndToEnd(chain);
      this.initialR0.push(r0);
      this.initialR0SquaredSum += (r0.x * r0.x + r0.y * r0.y);
    });
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
    // An ensemble step attempts numChains moves
    const attempts = Math.max(1, this.params.numChains);
    for (let i = 0; i < attempts; i++) {
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

  // Fix: Completed the missing logic for statistics calculation (RMS End-to-End, Radius of Gyration, Autocorrelation)
  public getStats(): SimulationStats {
    let sumR = 0, sumR2 = 0, sumRg2 = 0, sumRg = 0, sumDotProduct = 0;
    let validCount = 0;

    this.chains.forEach((chain, idx) => {
      if (chain.length < 2) return;
      validCount++;
      const r_unwrapped = this.getUnwrappedEndToEnd(chain);
      // Fix: Resolved syntax error with r_ and finished calculating r2
      const r2 = r_unwrapped.x * r_unwrapped.x + r_unwrapped.y * r_unwrapped.y;
      const r_mag = Math.sqrt(r2);
      sumR += r_mag;
      sumR2 += r2;

      // Radius of Gyration (Rg) calculation using unwrapped coordinates
      const L = this.params.latticeSize;
      let unwrappedChain: Point[] = [{ x: 0, y: 0 }];
      let cx = 0, cy = 0;

      for (let i = 0; i < chain.length - 1; i++) {
        const p1 = chain[i];
        const p2 = chain[i+1];
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        if (dx > 1) dx -= L; else if (dx < -1) dx += L;
        if (dy > 1) dy -= L; else if (dy < -1) dy += L;
        
        const last = unwrappedChain[unwrappedChain.length - 1];
        const next = { x: last.x + dx, y: last.y + dy };
        unwrappedChain.push(next);
        cx += next.x;
        cy += next.y;
      }
      
      const N = chain.length;
      const avgX = cx / N;
      const avgY = cy / N;
      let rg2_sum = 0;
      unwrappedChain.forEach(p => {
        rg2_sum += (p.x - avgX)**2 + (p.y - avgY)**2;
      });
      const rg2 = rg2_sum / N;
      sumRg2 += rg2;
      sumRg += Math.sqrt(rg2);

      // Autocorrelation calculation
      const r0 = this.initialR0[idx];
      if (r0) {
        sumDotProduct += (r_unwrapped.x * r0.x + r_unwrapped.y * r0.y);
      }
    });

    const avgR2 = validCount > 0 ? sumR2 / validCount : 0;
    const avgRg2 = validCount > 0 ? sumRg2 / validCount : 0;
    const avgDot = validCount > 0 ? sumDotProduct / validCount : 0;
    const initialAvgR2 = this.chains.length > 0 ? this.initialR0SquaredSum / this.chains.length : 1;

    return {
      steps: this.steps,
      rmsEndToEnd: Math.sqrt(avgR2),
      meanEndToEnd: validCount > 0 ? sumR / validCount : 0,
      radiusOfGyration: Math.sqrt(avgRg2),
      meanRadiusOfGyration: validCount > 0 ? sumRg / validCount : 0,
      successfulMoves: this.successfulMoves,
      acceptanceRatio: this.steps > 0 ? this.successfulMoves / this.steps : 0,
      autocorrelation: initialAvgR2 > 0 ? avgDot / initialAvgR2 : 0,
      rawAutocorrelation: avgDot,
      isFinished: this.steps >= this.params.maxSteps
    };
  }
}
