'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MODULES, modulesOf } from '@/lib/roles'

// Écran affiché après la connexion :
// - un seul CRM autorisé : redirection directe
// - deux CRM : choix (le dernier utilisé est mis en avant)
// - aucun : message
export default function Choix() {
  const router = useRouter()
  const [mods, setMods] = useState(null)
  const [dernier, setDernier] = useState(null)

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.replace('/login')
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const m = modulesOf(p?.role, p?.modules)
    if (m.length === 1) return router.replace(MODULES[m[0]].home)
    try { setDernier(localStorage.getItem('dernier_module')) } catch {}
    setMods(m)
  })() }, [router])

  const logout = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="Agapecazel" width={80} height={80} priority className="h-20 w-20 rounded-full object-cover" />
          <h1 className="text-lg font-semibold text-white">Agapecazel CRM</h1>
        </div>
        {mods === null ? (
          <p className="text-center text-sm text-white/60">Chargement…</p>
        ) : mods.length === 0 ? (
          <div className="card p-6 text-center text-sm">
            <p>Aucun CRM n'est activé sur votre compte. Contactez l'administrateur.</p>
            <button onClick={logout} className="btn-ghost mt-4">Déconnexion</button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-center text-sm text-white/70">Quel CRM souhaitez-vous utiliser ?</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {mods.map((k) => (
                <button key={k} onClick={() => { try { localStorage.setItem('dernier_module', k) } catch {} ; router.push(MODULES[k].home) }}
                  className="card p-6 text-left transition-shadow hover:shadow-lg"
                  style={k === dernier ? { outline: '2px solid var(--accent)' } : undefined}>
                  <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>{MODULES[k].label}</p>
                  {k === dernier && <p className="mt-1 text-[12px]" style={{ color: 'var(--accent)' }}>Dernier utilisé</p>}
                </button>
              ))}
            </div>
            <button onClick={logout} className="mx-auto mt-6 block text-sm text-white/60 underline">Déconnexion</button>
          </>
        )}
      </div>
    </div>
  )
}
