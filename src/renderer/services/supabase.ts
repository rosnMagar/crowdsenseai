import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Session, LocationData, AccessPoint, PredictionPoint, SessionMetadata } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

interface DbSession {
  id: string
  created_at: string
  metadata: SessionMetadata
  locations: LocationData[]
  access_points: AccessPoint[]
  predictions: PredictionPoint[]
}

function toSnakeCase(session: DbSession): Record<string, unknown> {
  return {
    id: session.id,
    created_at: session.created_at,
    metadata: session.metadata,
    locations: session.locations,
    access_points: session.access_points,
    predictions: session.predictions
  }
}

function fromSnakeCase(row: DbSession): Session {
  return {
    id: row.id,
    createdAt: row.created_at,
    metadata: row.metadata || {},
    locations: row.locations || [],
    accessPoints: row.access_points || [],
    predictions: row.predictions || []
  }
}

export async function createSession(metadata?: SessionMetadata): Promise<Session | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return null
  }

  const newSession: DbSession = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    metadata: metadata || {},
    locations: [],
    access_points: [],
    predictions: []
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert([toSnakeCase(newSession)])
    .select()
    .single()

  if (error) {
    console.error('Failed to create session:', error)
    return null
  }

  return fromSnakeCase(data)
}

export async function getSession(sessionId: string): Promise<Session | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return null
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    console.error('Failed to get session:', error)
    return null
  }

  return fromSnakeCase(data)
}

export async function getAllSessions(limit = 50): Promise<Session[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return []
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch sessions:', error)
    return []
  }

  return (data || []).map(fromSnakeCase)
}

export async function addLocationToSession(
  sessionId: string,
  location: LocationData
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return false
  }

  const { data, error: fetchError } = await supabase
    .from('sessions')
    .select('locations')
    .eq('id', sessionId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch session:', fetchError)
    return false
  }

  const currentLocations = data?.locations || []
  const updatedLocations = [...currentLocations, location]

  const { error } = await supabase
    .from('sessions')
    .update({ locations: updatedLocations })
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to add location:', error)
    return false
  }

  return true
}

export async function addAccessPointToSession(
  sessionId: string,
  accessPoint: AccessPoint
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return false
  }

  const { data, error: fetchError } = await supabase
    .from('sessions')
    .select('access_points')
    .eq('id', sessionId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch session:', fetchError)
    return false
  }

  const currentAccessPoints = data?.access_points || []
  const updatedAccessPoints = [...currentAccessPoints, accessPoint]

  const { error } = await supabase
    .from('sessions')
    .update({ access_points: updatedAccessPoints })
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to add access point:', error)
    return false
  }

  return true
}

export async function addPredictionToSession(
  sessionId: string,
  prediction: PredictionPoint
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return false
  }

  const { data, error: fetchError } = await supabase
    .from('sessions')
    .select('predictions')
    .eq('id', sessionId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch session:', fetchError)
    return false
  }

  const currentPredictions = data?.predictions || []
  const updatedPredictions = [...currentPredictions, prediction]

  const { error } = await supabase
    .from('sessions')
    .update({ predictions: updatedPredictions })
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to add prediction:', error)
    return false
  }

  return true
}

export async function updateSessionLocations(
  sessionId: string,
  locations: LocationData[]
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return false
  }

  const { error } = await supabase
    .from('sessions')
    .update({ locations })
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to update locations:', error)
    return false
  }

  return true
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return false
  }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to delete session:', error)
    return false
  }

  return true
}
