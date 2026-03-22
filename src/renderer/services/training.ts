import type { QuadrantData, AIWeights, DailyComparison, DensityLevel, TrainingData, PredictionResult, QuadrantDensity } from '../types'
import { NeuralNetwork, createDefaultNetwork, networkToStorable, storableToNetwork } from './network'
import { 
  GRID_CONFIG, 
  getAllQuadrantIds, 
  latLonToQuadrant, 
  countsToDensityLevel,
  encodeTimeFeatures,
  getCurrentTimeFeatures,
  getTimeFeaturesForTimestamp,
  getPredictionTimeFeatures,
  quadrantToLatLon
} from './grid'
import { supabase } from './supabase'

interface QuadrantObservation {
  quadrantId: string
  density: DensityLevel
  hourOfDay: number
  dayOfWeek: number
  timestamp: Date
}

let cachedNetwork: NeuralNetwork | null = null

export async function loadNetwork(): Promise<NeuralNetwork> {
  if (cachedNetwork) return cachedNetwork
  
  if (!supabase) {
    console.warn('Supabase not initialized, using default network')
    return createDefaultNetwork()
  }
  
  try {
    const { data, error } = await supabase
      .from('ai_weights')
      .select('*')
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      console.warn('No active network found, creating default')
      cachedNetwork = createDefaultNetwork()
      return cachedNetwork
    }
    
    const weights = storableToNetwork(data.weights)
    cachedNetwork = NeuralNetwork.fromJSON({ weights })
    return cachedNetwork
  } catch (err) {
    console.error('Failed to load network:', err)
    return createDefaultNetwork()
  }
}

export async function saveNetwork(network: NeuralNetwork, accuracy?: number): Promise<boolean> {
  if (!supabase) return false
  
  try {
    const weights = network.getWeights()
    const layerConfig = network.getLayerConfig()
    
    await supabase
      .from('ai_weights')
      .update({ is_active: false })
      .eq('is_active', true)
    
    const { error } = await supabase
      .from('ai_weights')
      .insert([{
        weights: networkToStorable(weights),
        layer_config: layerConfig,
        accuracy_score: accuracy,
        training_count: 1,
        is_active: true
      }])
    
    if (error) {
      console.error('Failed to save network:', error)
      return false
    }
    
    cachedNetwork = network
    return true
  } catch (err) {
    console.error('Failed to save network:', err)
    return false
  }
}

export async function recordQuadrantData(
  locations: { latitude: number; longitude: number; timestamp: number }[],
  sessionId?: string
): Promise<boolean> {
  if (!supabase || locations.length === 0) return false
  
  try {
    const observations = locations
      .filter(loc => 
        loc.latitude >= GRID_CONFIG.bounds.south && 
        loc.latitude <= GRID_CONFIG.bounds.north &&
        loc.longitude >= GRID_CONFIG.bounds.west && 
        loc.longitude <= GRID_CONFIG.bounds.east
      )
      .map(loc => {
        const qId = latLonToQuadrant(loc.latitude, loc.longitude)
        const date = new Date(loc.timestamp)
        
        return {
          quadrant_id: qId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          density: 1 as DensityLevel,
          hour_of_day: date.getHours(),
          day_of_week: date.getDay(),
          session_id: sessionId,
          timestamp: new Date(loc.timestamp).toISOString(),
          is_prediction: false
        }
      })
    
    if (observations.length === 0) return true
    
    const { error } = await supabase
      .from('quadrant_data')
      .insert(observations)
    
    if (error) {
      console.error('Failed to record quadrant data:', error)
      return false
    }
    
    return true
  } catch (err) {
    console.error('Failed to record quadrant data:', err)
    return false
  }
}

export async function getTrainingData(daysBack: number = 7): Promise<TrainingData> {
  if (!supabase) {
    return { inputs: [], outputs: [] }
  }
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    
    const { data, error } = await supabase
      .from('quadrant_data')
      .select('*')
      .eq('is_prediction', false)
      .gte('timestamp', cutoffDate.toISOString())
    
    if (error || !data) {
      console.error('Failed to fetch training data:', error)
      return { inputs: [], outputs: [] }
    }
    
    const observations = data as any[]
    const trainingMap = new Map<string, Map<number, number>>()
    const qIds = getAllQuadrantIds()
    
    for (const obs of observations) {
      const timeKey = obs.hour_of_day * 7 + obs.day_of_week
      if (!trainingMap.has(obs.quadrant_id)) {
        trainingMap.set(obs.quadrant_id, new Map())
      }
      const timeMap = trainingMap.get(obs.quadrant_id)!
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1)
    }
    
    const inputs: number[][] = []
    const outputs: number[][] = []
    
    for (const obs of observations) {
      const features = new Array(GRID_CONFIG.totalQuadrants + 25).fill(0)
      features[obs.hour_of_day] = 1
      features[GRID_CONFIG.totalQuadrants + obs.day_of_week] = 1
      
      const output = new Array(GRID_CONFIG.totalQuadrants).fill(0)
      const qIndex = qIds.indexOf(obs.quadrant_id)
      if (qIndex >= 0) {
        const count = trainingMap.get(obs.quadrant_id)?.get(obs.hour_of_day * 7 + obs.day_of_week) || 1
        const density = countsToDensityLevel(count)
        output[qIndex] = density === 0 ? 0.05 : density / 3
      }
      
      inputs.push(features)
      outputs.push(output)
    }
    
    return { inputs, outputs }
  } catch (err) {
    console.error('Failed to get training data:', err)
    return { inputs: [], outputs: [] }
  }
}

export async function trainNetwork(epochs: number = 100): Promise<{ success: boolean; accuracy?: number }> {
  const network = await loadNetwork()
  const trainingData = await getTrainingData(7)
  
  if (trainingData.inputs.length < 10) {
    console.warn('Not enough training data, skipping training')
    return { success: false }
  }
  
  const result = network.train(trainingData.inputs, trainingData.outputs, epochs)
  
  await saveNetwork(network, result.accuracy)
  
  return { success: true, accuracy: result.accuracy }
}

export async function predictDensity(
  minutesAhead: number = 0
): Promise<Map<string, DensityLevel>> {
  const network = await loadNetwork()
  const { hour, dayOfWeek } = getCurrentTimeFeatures()
  
  const futureTime = minutesAhead > 0 
    ? getPredictionTimeFeatures(hour, dayOfWeek, minutesAhead)
    : { hour, dayOfWeek }
  
  const input = encodeTimeFeatures(futureTime.hour, futureTime.dayOfWeek)
  
  const predictions = network.predict(input)
  
  const heatmap = new Map<string, DensityLevel>()
  const qIds = getAllQuadrantIds()
  
  for (let i = 0; i < predictions.length; i++) {
    const densityValue = predictions[i]
    let density: DensityLevel
    
    if (densityValue < 0.1) density = 0
    else if (densityValue < 0.35) density = 1
    else if (densityValue < 0.65) density = 2
    else density = 3
    
    heatmap.set(qIds[i], density)
  }
  
  return heatmap
}

export async function generatePredictions(
  currentLocations: { latitude: number; longitude: number; timestamp: number }[]
): Promise<PredictionResult> {
  await recordQuadrantData(currentLocations)
  
  const qIds = getAllQuadrantIds()
  const currentDensities = await predictDensity(0)
  
  if (currentLocations.length > 0) {
    const counts = new Map<string, number>()
    for (const loc of currentLocations) {
      const qId = latLonToQuadrant(loc.latitude, loc.longitude)
      counts.set(qId, (counts.get(qId) || 0) + 1)
    }
    for (const qId of qIds) {
      const count = counts.get(qId) || 0
      if (count > 0) {
        currentDensities.set(qId, countsToDensityLevel(count))
      }
    }
  }
  
  const heatmaps: { timestamp: string; quadrants: Map<string, DensityLevel> }[] = []
  
  for (let t = 0; t <= 180; t += 5) {
    const predictedDensities = await predictDensity(t)
    heatmaps.push({
      timestamp: new Date(Date.now() + t * 60000).toISOString(),
      quadrants: predictedDensities
    })
  }
  
  const quadrants: QuadrantDensity[] = qIds.map(qId => ({
    quadrantId: qId,
    density: currentDensities.get(qId) || 0,
    bounds: quadrantToLatLon(qId)!,
    count: currentDensities.get(qId) || 0
  }))
  
  return {
    quadrants,
    heatmaps,
    confidence: 0.7
  }
}

export async function comparePredictionWithActual(
  date: string,
  quadrantId: string,
  predicted: number[],
  actual: DensityLevel
): Promise<boolean> {
  if (!supabase) return false
  
  try {
    const errorScore = Math.abs(predicted[0] - (actual / 3))
    
    await supabase
      .from('daily_comparisons')
      .insert([{
        date,
        quadrant_id: quadrantId,
        predicted_density: predicted,
        actual_density: actual,
        error_score: errorScore
      }])
    
    return true
  } catch (err) {
    console.error('Failed to compare prediction:', err)
    return false
  }
}

export async function shouldRetrain(): Promise<boolean> {
  if (!supabase) return false
  
  try {
    const { data, error } = await supabase
      .from('quadrant_data')
      .select('timestamp')
      .eq('is_prediction', false)
      .order('timestamp', { ascending: false })
      .limit(1)
    
    if (error || !data || data.length === 0) return false
    
    const lastRecord = new Date(data[0].timestamp)
    const now = new Date()
    const hoursSince = (now.getTime() - lastRecord.getTime()) / (1000 * 60 * 60)
    
    return hoursSince >= 24
  } catch {
    return false
  }
}
