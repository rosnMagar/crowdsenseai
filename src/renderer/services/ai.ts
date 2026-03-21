import { LocationData, PredictionPoint } from '../types'

export interface GPRConfig {
  lengthScale: number
  variance: number
  noise: number
}

export interface GPResponse {
  predictions: number[]
  uncertainties: number[]
}

export class GaussianProcessRegressor {
  private config: GPRConfig
  private trainingData: { X: number[][], y: number[] } = { X: [], y: [] }

  constructor(config: Partial<GPRConfig> = {}) {
    this.config = {
      lengthScale: config.lengthScale || 1.0,
      variance: config.variance || 1.0,
      noise: config.noise || 0.1
    }
  }

  addTrainingPoint(input: number[], output: number): void {
    this.trainingData.X.push(input)
    this.trainingData.y.push(output)
  }

  addTrainingData(X: number[][], y: number[]): void {
    this.trainingData.X = [...this.trainingData.X, ...X]
    this.trainingData.y = [...this.trainingData.y, ...y]
  }

  predict(inputs: number[][]): GPResponse {
    const predictions: number[] = []
    const uncertainties: number[] = []

    if (this.trainingData.X.length === 0) {
      return { predictions: inputs.map(() => 0), uncertainties: inputs.map(() => 1) }
    }

    for (const input of inputs) {
      const result = this.predictSingle(input)
      predictions.push(result.mean)
      uncertainties.push(result.std)
    }

    return { predictions, uncertainties }
  }

  private predictSingle(input: number[]): { mean: number; std: number } {
    const similarities = this.trainingData.X.map(trainingPoint =>
      this.kernel(input, trainingPoint)
    )

    const weights = similarities.map(s =>
      s / (similarities.reduce((a, b) => a + b, 0) || 1)
    )

    const mean = weights.reduce((acc, w, i) => acc + w * this.trainingData.y[i], 0)
    const variance = this.config.variance * (1 - Math.max(...similarities) + this.config.noise)
    const std = Math.sqrt(Math.max(0, variance))

    return { mean, std }
  }

  private kernel(x1: number[], x2: number[]): number {
    let sum = 0
    for (let i = 0; i < x1.length; i++) {
      const diff = x1[i] - (x2[i] || 0)
      sum += (diff * diff) / (this.config.lengthScale * this.config.lengthScale)
    }
    return this.config.variance * Math.exp(-0.5 * sum)
  }

  clear(): void {
    this.trainingData = { X: [], y: [] }
  }
}

export function predictSignalStrength(
  location: LocationData,
  knownPoints: PredictionPoint[],
  gpr: GaussianProcessRegressor
): { signalStrength: number; confidence: number } {
  if (knownPoints.length === 0) {
    return { signalStrength: -100, confidence: 0 }
  }

  const input = [[location.latitude, location.longitude]]
  const result = gpr.predict(input)

  return {
    signalStrength: result.predictions[0],
    confidence: 1 - Math.min(1, result.uncertainties[0])
  }
}

export function krigingInterpolation(
  points: PredictionPoint[],
  gridSize: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }
): PredictionPoint[] {
  const predictions: PredictionPoint[] = []
  const latStep = (bounds.maxLat - bounds.minLat) / gridSize
  const lonStep = (bounds.maxLon - bounds.minLon) / gridSize

  const gpr = new GaussianProcessRegressor()
  
  const X = points.map(p => [p.location.latitude, p.location.longitude])
  const y = points.map(p => p.prediction?.signalStrength || -100)
  gpr.addTrainingData(X, y)

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const lat = bounds.minLat + i * latStep
      const lon = bounds.minLon + j * lonStep
      
      predictions.push({
        location: {
          latitude: lat,
          longitude: lon,
          accuracy: 0,
          timestamp: Date.now()
        },
        prediction: predictSignalStrength(
          { latitude: lat, longitude: lon, accuracy: 0, timestamp: Date.now() },
          points,
          gpr
        )
      })
    }
  }

  return predictions
}
