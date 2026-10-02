'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function Logo() {
  // Le logo doit être dans /public/logo.png
  // S'il ne charge pas, le badge "AC" s'affiche à la place.
  const [logoOk, setLogoOk] = useState(true)
  return (
    <span className="flex items-center gap-3 text-white">
      {logoOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="Logo Agapecazel"
          className="h-10 w-10 shrink-0 rounded-full object-cover"
          onError={() => setLogoOk(false)}
        />
      ) : (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: 'var(--accent)', color: 'var(--ink)' }}
        >
          AC
        </span>
      )}
      <span className="text-[16px] font-semibold leading-none tracking-wide">Agapecazel</span>
    </span>
  )
}

export default function AppShell({ title, subtitle, backHref, backLabel = 'Retour', actions, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState(null)
  const [nom, setNom] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) { console.error('AppShell auth.getUser error:', userErr); return }
      if (!user) return
      const { data: p, error: profileErr } = await supabase
        .from('profiles')
        .select('role, nom_complet')
        .eq('id', user.id)
        .single()
      if (profileErr) { console.error('AppShell profiles fetch error:', profileErr); return }
      setRole(p?.role ?? null)
      setNom(p?.nom_complet || user.email || '')
    })()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLink = (href, label) => (
    <Link
      href={href}
      onClick={() => setMenuOpen(false)}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{
        color: pathname.startsWith(href) ? 'white' : 'rgba(255,255,255,0.72)',
        background: pathname.startsWith(href) ? 'rgba(255,255,255,0.12)' : 'transparent',
      }}
    >
      {label}
    </Link>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 shadow-sm" style={{ background: 'var(--ink)', borderBottom: '3px solid var(--accent)' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/leads" className="mr-2">
            <Logo />
          </Link>
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {navLink('/leads', 'Leads')}
            {navLink('/appels', 'Appels')}
            {navLink('/stats', 'Statistiques')}
            {role === 'admin' && navLink('/admin', 'Espace admin')}
            {role === 'admin' && navLink('/logs', 'Historique')}
          </nav>

          {/* Desktop : Déconnexion + nom (or) en dessous */}
          <div className="ml-auto hidden flex-col items-end sm:flex">
            <button
              onClick={logout}
              className="rounded-lg px-3 py-1 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              Déconnexion
            </button>
            {nom && (
              <p
                className="mt-0.5 max-w-[220px] truncate px-3 text-xs font-semibold"
                style={{ color: 'var(--accent)' }}
                title={nom}
              >
                {nom}
              </p>
            )}
          </div>

          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Ouvrir le menu"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-white sm:hidden"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 sm:hidden">
            <Link href="/leads" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">Leads</Link>
            <Link href="/appels" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">Appels</Link>
            <Link href="/stats" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">Statistiques</Link>
            {role === 'admin' && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">Espace admin</Link>
            )}
            {role === 'admin' && (
              <Link href="/logs" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">Historique</Link>
            )}
            <button onClick={logout} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/70 hover:bg-white/10">Déconnexion</button>
            {nom && (
              <p className="truncate px-3 text-xs font-semibold" style={{ color: 'var(--accent)' }} title={nom}>{nom}</p>
            )}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {(title || backHref) && (
          <div className="mb-6">
            {backHref && (
              <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4 7L8.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {backLabel}
              </Link>
            )}
            {title && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h1>
                  {subtitle && <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
