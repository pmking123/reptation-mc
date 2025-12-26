
export interface Point {
  x: number;
  y: number;
}

export type PolymerChain = Point[];

export interface SimulationParams {
  latticeSize: number;
  numChains: number;
  chainLength: number;
  obstacleConcentration: number;
  simulationSpeed: number;
  maxSteps: number;
}

export interface SimulationStats {
  steps: number;
  rmsEndToEnd: number;
  meanEndToEnd: number;
  radiusOfGyration: number;
  meanRadiusOfGyration: number;
  successfulMoves: number;
  acceptanceRatio: number;
  isFinished: boolean;
}
