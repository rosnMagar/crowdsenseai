import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  console.error('Please set these in your .env file or environment')
  process.exit(1)
}

const GRID_CONFIG = {
  totalQuadrants: 384,
  bounds: {
    west: -92.586164,
    south: 40.179033,
    east: -92.576637,
    north: 40.190088
  }
}

const BOUNDS = GRID_CONFIG.bounds
const ROWS = 24
const COLS = 16

function randomWeight(rows, cols) {
  return (Math.random() - 0.5) * 2 * Math.sqrt(2.0 / rows)
}

function relu(x) {
  return Math.max(0, x)
}

function reluDerivative(x) {
  return x > 0 ? 1 : 0
}

function softmax(arr) {
  const max = Math.max(...arr)
  const exps = arr.map(x => Math.exp(x - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(x => x / sum)
}

class NeuralNetwork {
  constructor(inputSize, hiddenSizes, outputSize) {
    this.inputSize = inputSize
    this.hiddenSizes = hiddenSizes
    this.outputSize = outputSize
    this.learningRate = 0.01
    
    this.weights = []
    this.biases = []
    
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
    
    this.activations = []
    this.preActivations = []
  }

  forward(input) {
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

  backward(target) {
    let gradients = this.activations[this.activations.length - 1].map((o, i) => o - target[i])
    
    for (let l = this.weights.length - 1; l >= 0; l--) {
      const preAct = this.preActivations[l]
      const input = this.activations[l]
      
      if (l === this.weights.length - 1) {
        gradients = gradients.map((g, i) => g * this.activations[this.activations.length - 1][i] * (1 - this.activations[this.activations.length - 1][i]))
      } else {
        gradients = gradients.map((g, i) => g * reluDerivative(preAct[i]))
      }
      
      const newGradients = []
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
    
    const output = this.activations[this.activations.length - 1]
    const loss = output.reduce((sum, o, i) => {
      const t = target[i]
      return sum + (t > 0 ? t * Math.log(o + 1e-10) : 0)
    }, 0)
    
    return -loss
  }

  train(inputs, targets, epochs) {
    let totalLoss = 0
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0
      
      for (let i = 0; i < inputs.length; i++) {
        this.forward(inputs[i])
        const loss = this.backward(targets[i])
        epochLoss += loss
      }
      
      totalLoss = epochLoss / inputs.length
    }
    
    return { loss: totalLoss, accuracy: 1 - Math.min(1, totalLoss) }
  }

  predict(input) {
    return this.forward(input)
  }
}

function latLonToQuadrant(lat, lon) {
  const latStep = (BOUNDS.north - BOUNDS.south) / ROWS
  const lonStep = (BOUNDS.east - BOUNDS.west) / COLS
  
  const row = Math.floor((lat - BOUNDS.south) / latStep)
  const col = Math.floor((lon - BOUNDS.west) / lonStep)
  
  const clampedRow = Math.max(0, Math.min(ROWS - 1, row))
  const clampedCol = Math.max(0, Math.min(COLS - 1, col))
  
  return `Q_${clampedRow}_${clampedCol}`
}

function getAllQuadrantIds() {
  const ids = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ids.push(`Q_${row}_${col}`)
    }
  }
  return ids
}

async function trainAndSaveModel() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  console.log('Fetching training data via REST API...')
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 30)
  
  let allData = []
  let page = 1
  const perPage = 1000
  
  while (true) {
    const offset = (page - 1) * perPage
    const url = `${supabaseUrl}/rest/v1/quadrant_data?select=*&is_prediction=eq.false&timestamp=gte.${cutoffDate.toISOString()}&offset=${offset}&limit=${perPage}`
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })
    
    if (!response.ok) {
      console.error('Error fetching data:', response.status)
      break
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      break
    }
    
    allData = allData.concat(data)
    console.log(`Fetched ${allData.length} records...`)
    
    if (data.length < perPage) {
      break
    }
    
    page++
    
    if (page > 200) {
      console.log('Reached max pages, stopping')
      break
    }
  }
  
  const data = allData
  
  if (!data || data.length === 0) {
    console.error('Failed to fetch data')
    return
  }
  
  console.log(`Total fetched: ${data.length} records`)
  
  const maxSamples = 5000
  const sampleRate = Math.max(1, Math.ceil(data.length / maxSamples))
  const sampledData = data.filter((_, i) => i % sampleRate === 0).slice(0, maxSamples)
  console.log(`Sampled to ${sampledData.length} records for training`)
  
  const qIds = getAllQuadrantIds()
  const trainingMap = new Map()
  
  for (const obs of sampledData) {
    const timeKey = obs.hour_of_day * 7 + obs.day_of_week
    if (!trainingMap.has(obs.quadrant_id)) {
      trainingMap.set(obs.quadrant_id, new Map())
    }
    const timeMap = trainingMap.get(obs.quadrant_id)
    timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1)
  }
  
  const inputs = []
  const outputs = []
  
  for (const obs of sampledData) {
    const features = new Array(GRID_CONFIG.totalQuadrants + 25).fill(0)
    features[obs.hour_of_day] = 1
    features[GRID_CONFIG.totalQuadrants + obs.day_of_week] = 1
    
    const output = new Array(GRID_CONFIG.totalQuadrants).fill(0)
    const qIndex = qIds.indexOf(obs.quadrant_id)
    if (qIndex >= 0) {
      const count = trainingMap.get(obs.quadrant_id)?.get(obs.hour_of_day * 7 + obs.day_of_week) || 1
      let density
      if (count === 0) density = 0
      else if (count <= 2) density = 1
      else if (count <= 5) density = 2
      else density = 3
      output[qIndex] = density === 0 ? 0.05 : density / 3
    }
    
    inputs.push(features)
    outputs.push(output)
  }
  
  console.log('Training network...')
  
  const inputSize = GRID_CONFIG.totalQuadrants + 25
  const hiddenSizes = [32, 16]
  const outputSize = GRID_CONFIG.totalQuadrants
  
  const network = new NeuralNetwork(inputSize, hiddenSizes, outputSize)
  const result = network.train(inputs, outputs, 10)
  
  console.log(`Training complete. Loss: ${result.loss.toFixed(4)}, Accuracy: ${(result.accuracy * 100).toFixed(2)}%`)
  
  console.log('Saving to database...')
  
  await supabase
    .from('ai_weights')
    .update({ is_active: false })
    .eq('is_active', true)
  
  const layerConfig = { inputSize, hiddenSizes, outputSize }
  
  const { error: insertError } = await supabase
    .from('ai_weights')
    .insert([{
      name: 'crowdsense_model',
      weights: JSON.stringify({ weights: network.weights, biases: network.biases }),
      layer_config: layerConfig,
      accuracy_score: result.accuracy,
      training_count: 1,
      is_active: true
    }])
  
  if (insertError) {
    console.error('Failed to save model:', insertError)
  } else {
    console.log('Model saved successfully!')
  }
}

trainAndSaveModel().catch(console.error)
