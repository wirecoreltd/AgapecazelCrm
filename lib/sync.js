'use client'
// Synchronisation entre appareils d'un même compte :
//  - useSyncedState : comme useState, mais la valeur est enregistrée dans Supabase (table user_prefs)
//    et recopiée en direct sur tous les appareils connectés avec le même login.
//  - useLiveRefresh : recharge une page dès qu'une donnée change ailleurs (autre appareil, autre utilisateur).
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const store = { uid: null, data: {}, starting: null, listeners: new Set(), timer: null, channel: null, lastLocal: 0 }
const notify = () => store.listeners.forEach((fn) => fn())

function reset() {
  clearTimeout(store.timer)
  if (store.channel) supabase.removeChannel(store.channel)
  Object.assign(store, { uid: null, data: {}, starting: null, timer: null, channel: null })
  notify()
}

function start() {
  if (store.starting) return store.starting
  store.starting = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { store.starting = null; return }
      store.uid = user.id
      const { data } = await supabase.from('user_prefs').select('data').eq('user_id', user.id).maybeSingle()
      // Les modifications faites avant la fin du chargement restent prioritaires
      store.data = { ...(data?.data ?? {}), ...store.data }
      notify()
      store.channel = supabase
        .channel(`prefs-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_prefs', filter: `user_id=eq.${user.id}` }, (payload) => {
          const next = payload.new?.data
          // On ignore l'écho de nos propres modifications récentes
          if (!next || Date.now() - store.lastLocal < 2000) return
          if (JSON.stringify(next) !== JSON.stringify(store.data)) { store.data = next; notify() }
        })
        .subscribe()
    } catch (e) {
      console.error('sync prefs:', e)
      store.starting = null
    }
  })()
  return store.starting
}

let authWatch = false
function watchAuth() {
  if (authWatch) return
  authWatch = true
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (store.uid && session?.user && session.user.id !== store.uid)) reset()
  })
}

function scheduleSave() {
  clearTimeout(store.timer)
  store.timer = setTimeout(async () => {
    store.timer = null
    if (!store.uid) return
    const { error } = await supabase.from('user_prefs').upsert({ user_id: store.uid, data: store.data, updated_at: new Date().toISOString() })
    if (error) console.error('sync prefs (save):', error.message)
  }, 700)
}

export function useSyncedState(key, initial) {
  const [, force] = useState(0)
  const initialRef = useRef(initial)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    store.listeners.add(fn)
    watchAuth()
    start()
    return () => { store.listeners.delete(fn) }
  }, [])
  const value = key in store.data ? store.data[key] : initialRef.current
  const valueRef = useRef(value)
  valueRef.current = value
  const set = useCallback((v) => {
    const prev = valueRef.current
    const next = typeof v === 'function' ? v(prev) : v
    if (JSON.stringify(next) === JSON.stringify(prev)) return
    store.data = { ...store.data, [key]: next }
    store.lastLocal = Date.now()
    valueRef.current = next
    notify()
    scheduleSave()
  }, [key])
  return [value, set]
}

export function useLiveRefresh(tables, reload) {
  const ref = useRef(reload)
  ref.current = reload
  const clef = tables.join(',')
  useEffect(() => {
    let t
    const run = () => { clearTimeout(t); t = setTimeout(() => ref.current?.(), 600) }
    let ch = supabase.channel(`live-${clef}-${Math.random().toString(36).slice(2)}`)
    for (const table of clef.split(',')) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, run)
    ch.subscribe()
    // Filet de sécurité : au retour sur l'onglet / après une coupure réseau, on recharge
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', run)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', run)
      supabase.removeChannel(ch)
    }
  }, [clef])
}
