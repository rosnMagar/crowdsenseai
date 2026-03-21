import type { AILayerConfig } from '../types'
import { GRID_CONFIG } from './grid'

export interface NetworkConfig {
  inputSize: number
  hiddenSizes: number[]
  outputSize: number
  learningRate: number
}

export interface Weights {
  layers: number[][][]
  biases: number[][]
}

const DEFAULT_CONFIG: NetworkConfig = {
  inputSize: GRID_CONFIG.totalQuadrants + 25,
  hiddenSizes: [64, 32],
  outputSize: GRID_CONFIG.totalQuadrants,
  learningRate: 0.01
}

function randomWeight(rows: number, cols: number): number {
  return (Math.random() - 0.5) * 2 * Math.sqrt(2.0 / rows)
}

function relu(x: number): number {
  return Math.max(0, x)
}

function reluDerivative(x: number): number {
  return x > 0 ? 1 : 0
}

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr)
  const exps = arr.map(x => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

export class NeuralNetwork {
  private config: NetworkConfig
  private weights: Weights
  private activations: number[][] = []
  private preActivations: number[][] = []

  constructor(config: Partial<NetworkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.weights = this.initializeWeights()
  }

  private initializeWeights(): Weights {
    const layers: number[][][] = []
    const biases: number[][] = []
    
    const layerSizes = [this.config.inputSize, ...this.config.hiddenSizes, this.config.outputSize]
    
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const rows = layerSizes[l + 1]
      const cols = layerSizes[l]
      
      layers.push(
        Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => randomWeight(rows, cols))
        )
      )
      
      biases.push(Array(rows).fill(0).map(() => (Math.random() - 0.5) * 0.1))
    }
    
    return { layers, biases }
  }

  private forward(input: number[]): number[] {
    this.activations = [input]
    this.preActivations = []
    
    let current = input
    
    for (let l = 0; l < this.weights.layers.length; l++) {
      const layerWeights = this.weights.layers[l]
      const layerBiases = this.weights.biases[l]
      
      const preAct: number[] = layerWeights.map((row, i) =>
        row.reduce((sum, w, j) => sum + w * current[j], 0) + layerBiases[i]
      )
      this.preActivations.push(preAct)
      
      if (l === this.weights.layers.length - 1) {
        current = softmax(preAct)
      } else {
        current = preAct.map(relu)
      }
      
      this.activations.push(current)
    }
    
    return current
  }

  private backward(target: number[]): number {
    const output = this.activations[this.activations.length - 1]
    let gradients: number[] = output.map((o, i) => o - target[i])
    
    for (let l = this.weights.layers.length - 1; l >= 0; l--) {
      const preAct = this.preActivations[l]
      const input = this.activations[l]
      
      if (l === this.weights.layers.length - 1) {
        gradients = gradients.map((g, i) => g * output[i] * (1 - output[i]))
      } else {
        gradients = gradients.map((g, i) => g * reluDerivative(preAct[i]))
      }
      
      const newGradients: number[] = []
      for (let j = 0; j < this.weights.layers[l][0].length; j++) {
        let sum = 0
        for (let i = 0; i < gradients.length; i++) {
          sum += gradients[i] * this.weights.layers[l][i][j]
        }
        newGradients.push(sum)
      }
      
      for (let i = 0; i < this.weights.layers[l].length; i++) {
        for (let j = 0; j < this.weights.layers[l][i].length; j++) {
          this.weights.layers[l][i][j] -= this.config.learningRate * gradients[i] * input[j]
        }
        this.weights.biases[l][i] -= this.config.learningRate * gradients[i]
      }
      
      gradients = newGradients
    }
    
    const loss = output.reduce((sum, o, i) => {
      const t = target[i]
      return sum + (t > 0 ? t * Math.log(o + 1e-10) : 0)
    }, 0)
    
    return -loss
  }

  train(inputs: number[][], targets: number[][], epochs: number = 100): { loss: number; accuracy: number } {
    let totalLoss = 0
    let correct = 0
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0
      
      for (let i = 0; i < inputs.length; i++) {
        const output = this.forward(inputs[i])
        const loss = this.backward(targets[i])
        epochLoss += loss
        
        const pred = output.indexOf(Math.max(...output))
        const actual = targets[i].indexOf(Math.max(...targets[i]))
        if (pred === actual) correct++
      }
      
      totalLoss = epochLoss / inputs.length
    }
    
    return {
      loss: totalLoss,
      accuracy: correct / (inputs.length * epochs)
    }
  }

  predict(input: number[]): number[] {
    return this.forward(input)
  }

  predictForMultipleTimes(
    baseInput: number[],
    timeSteps: number
  ): number[][] {
    const predictions: number[][] = []
    
    for (let t = 0; t < timeSteps; t++) {
      const timeInput = [...baseInput]
      const hourIndex = GRID_CONFIG.totalQuadrants
      const dayIndex = GRID_CONFIG.totalQuadrants + 24
      
      for (let h = 0; h < 24; h++) {
        timeInput[hourIndex + h] = 0
      }
      timeInput[hourIndex + ((t * 5) % 24)] = 1
      
      const prediction = this.predict(timeInput)
      predictions.push(prediction)
    }
    
    return predictions
  }

  getWeights(): Weights {
    return JSON.parse(JSON.stringify(this.weights))
  }

  setWeights(weights: Weights): void {
    this.weights = JSON.parse(JSON.stringify(weights))
  }

  getLayerConfig(): AILayerConfig {
    return {
      inputSize: this.config.inputSize,
      hiddenSizes: [...this.config.hiddenSizes],
      outputSize: this.config.outputSize
    }
  }

  toJSON(): { config: NetworkConfig; weights: Weights } {
    return {
      config: this.config,
      weights: this.weights
    }
  }

  static fromJSON(data: { config?: Partial<NetworkConfig>; weights: Weights }): NeuralNetwork {
    const nn = new NeuralNetwork(data.config)
    nn.setWeights(data.weights)
    return nn
  }
}

export function createDefaultNetwork(): NeuralNetwork {
  return new NeuralNetwork()
}

export function networkToStorable(weights: Weights): string {
  return JSON.stringify(weights)
}

export function storableToNetwork(json: string): Weights {
  return JSON.parse(json)
}
