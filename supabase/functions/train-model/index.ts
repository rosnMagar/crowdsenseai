import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GRID_CONFIG = {
  totalQuadrants: 96,
  inputSize: 121,
  hiddenSizes: [64, 32],
  outputSize: 96
}

const BOUNDS = {
  west: -92.586164,
  south: 40.179033,
  east: -92.576637,
  north: 40.190088
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

class NeuralNetwork {
  weights: number[][][]
  biases: number[][]
  activations: number[][]
  preActivations: number[][]
  learningRate: number

  constructor(inputSize: number, hiddenSizes: number[], outputSize: number) {
    this.learningRate = 0.01
    this.weights = []
    this.biases = []
    this.activations = []
    this.preActivations = []
    
    const layerSizes = [inputSize, ...hiddenSizes, outputSize]
    
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const rows = layerSizes[l + 1]
      const cols = layerSizes[l]
      
      this.weights.push(
        Array.from({ length: rows }, () =>
          Array.from({ length: cols }, () => randomWeight(rows, cols))
        )
      )
      
      this.biases.push(Array(rows).fill(0).map(() => (Math.random() - 0.5) * 0.1))
    }
  }

  forward(input: number[]): number[] {
    this.activations = [input]
    this.preActivations = []
    
    let current = input
    
    for (let l = 0; l < this.weights.length; l++) {
      const layerWeights = this.weights[l]
      const layerBiases = this.biases[l]
      
      const preAct = layerWeights.map((row, i) =>
        row.reduce((sum, w, j) => sum + w * current[j], 0) + layerBiases[i]
      )
      this.preActivations.push(preAct)
      
      if (l === this.weights.length - 1) {
        current = softmax(preAct)
      } else {
        current = preAct.map(relu)
      }
      
      this.activations.push(current)
    }
    
    return current
  }

  backward(target: number[]): number {
    let gradients = this.activations[this.activations.length - 1].map((o, i) => o - target[i])
    
    for (let l = this.weights.length - 1; l >= 0; l--) {
      const preAct = this.preActivations[l]
      const input = this.activations[l]
      
      if (l === this.weights.length - 1) {
        gradients = gradients.map((g, i) => 
          g * this.activations[this.activations.length - 1][i] * 
          (1 - this.activations[this.activations.length - 1][i])
        )
      } else {
        gradients = gradients.map((g, i) => g * reluDerivative(preAct[i]))
      }
      
      const newGradients: number[] = []
      for (let j = 0; j < this.weights[l][0].length; j++) {
        let sum = 0
        for (let i = 0; i < gradients.length; i++) {
          sum += gradients[i] * this.weights[l][i][j]
        }
        newGradients.push(sum)
      }
      
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          this.weights[l][i][j] -= this.learningRate * gradients[i] * input[j]
        }
        this.biases[l][i] -= this.learningRate * gradients[i]
      }
      
      gradients = newGradients
    }
    
    return 0
  }

  train(inputs: number[][], targets: number[][], epochs: number): { loss: number; accuracy: number } {
    let correct = 0
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < inputs.length; i++) {
        this.forward(inputs[i])
        this.backward(targets[i])
        
        const output = this.activations[this.activations.length - 1]
        const pred = output.indexOf(Math.max(...output))
        const actual = targets[i].indexOf(Math.max(...targets[i]))
        if (pred === actual) correct++
      }
    }
    
    return {
      loss: 0,
      accuracy: correct / (inputs.length * epochs)
    }
  }

  predict(input: number[]): number[] {
    return this.forward(input)
  }

  toJSON() {
    return {
      weights: this.weights,
      biases: this.biases
    }
  }

  loadFromJSON(data: { weights: number[][][]; biases: number[][] }) {
    this.weights = data.weights
    this.biases = data.biases
  }
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Fetching training data...')
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)
    
    const { data: quadrantData, error: fetchError } = await supabase
      .from('quadrant_data')
      .select('*')
      .eq('is_prediction', false)
      .gte('timestamp', cutoffDate.toISOString())
    
    if (fetchError || !quadrantData) {
      throw new Error(`Failed to fetch data: ${fetchError?.message}`)
    }
    
    console.log(`Fetched ${quadrantData.length} records`)

    if (quadrantData.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Not enough training data', count: quadrantData.length }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ROWS = 12
    const COLS = 8
    
    const trainingMap = new Map<string, Map<number, number>>()
    
    for (const obs of quadrantData) {
      const timeKey = obs.hour_of_day * 7 + obs.day_of_week
      if (!trainingMap.has(obs.quadrant_id)) {
        trainingMap.set(obs.quadrant_id, new Map())
      }
      const timeMap = trainingMap.get(obs.quadrant_id)!
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1)
    }
    
    const qIds: string[] = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        qIds.push(`Q_${row}_${col}`)
      }
    }

    const inputs: number[][] = []
    const outputs: number[][] = []
    
    for (const obs of quadrantData) {
      const features = new Array(GRID_CONFIG.inputSize).fill(0)
      features[obs.hour_of_day] = 1
      features[GRID_CONFIG.totalQuadrants + obs.day_of_week] = 1
      
      const output = new Array(GRID_CONFIG.outputSize).fill(0.05)
      const qIndex = qIds.indexOf(obs.quadrant_id)
      if (qIndex >= 0) {
        const count = trainingMap.get(obs.quadrant_id)?.get(obs.hour_of_day * 7 + obs.day_of_week) || 1
        let density: number
        if (count === 0) density = 0.05
        else if (count <= 2) density = 0.33
        else if (count <= 5) density = 0.66
        else density = 1.0
        output[qIndex] = density
      }
      
      inputs.push(features)
      outputs.push(output)
    }

    console.log('Training neural network...')
    
    const network = new NeuralNetwork(
      GRID_CONFIG.inputSize,
      GRID_CONFIG.hiddenSizes,
      GRID_CONFIG.outputSize
    )
    
    const epochs = 200
    const result = network.train(inputs, outputs, epochs)
    
    console.log(`Training complete. Accuracy: ${(result.accuracy * 100).toFixed(2)}%`)

    await supabase
      .from('ai_weights')
      .update({ is_active: false })
      .eq('is_active', true)
    
    const { error: insertError } = await supabase
      .from('ai_weights')
      .insert([{
        name: 'crowdsense_model',
        weights: JSON.stringify(network.toJSON()),
        layer_config: {
          inputSize: GRID_CONFIG.inputSize,
          hiddenSizes: GRID_CONFIG.hiddenSizes,
          outputSize: GRID_CONFIG.outputSize
        },
        accuracy_score: result.accuracy,
        training_count: 1,
        is_active: true
      }])
    
    if (insertError) {
      throw new Error(`Failed to save model: ${insertError.message}`)
    }
    
    console.log('Model saved successfully')

    return new Response(
      JSON.stringify({
        success: true,
        accuracy: result.accuracy,
        recordsProcessed: quadrantData.length,
        epochs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Training failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
