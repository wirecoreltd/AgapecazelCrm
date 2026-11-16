'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { canAccess, modulesOf, moduleOf, MODULES } from '@/lib/roles'

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

export default function AppShell({ title, subtitle, backHref, backLabel = 'Retour', actions, wide = false, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState(null)
  const [nom, setNom] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modules, setModules] = useState([])
  const [switchOpen, setSwitchOpen] = useState(false)
  // CRM courant : celui de la page ; sur les pages communes (admin, historique) on garde le dernier utilisé
  const [dernier, setDernier] = useState('pac')
  const courant = moduleOf(pathname) ?? dernier
  useEffect(() => {
    const m = moduleOf(pathname)
    if (m) { try { localStorage.setItem('dernier_module', m) } catch {} ; setDernier(m); return }
    try { const d = localStorage.getItem('dernier_module'); if (d && MODULES[d]) setDernier(d) } catch {}
  }, [pathname])

  useEffect(() => {
    ;(async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) { console.error('AppShell auth.getUser error:', userErr); return }
      if (!user) return
      const { data: p, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profileErr) { console.error('AppShell profiles fetch error:', profileErr); return }
      setRole(p?.role ?? null)
      setModules(modulesOf(p?.role, p?.modules))
      setNom(p?.nom_complet || user.email || '')
    })()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Liens du menu : ceux du CRM courant + pages communes, filtrés par rôle ET par module
  const items = (courant === 'defisc'
    ? [['/defisc', 'Leads'], ['/defisc/import', 'Import']]
    : [['/leads', 'Leads'], ['/appels', 'Appels'], ['/stats', 'Statistiques']]
  ).concat([['/admin', 'Espace admin'], ['/logs', 'Historique']])
    .filter(([href]) => canAccess(role, href, modules))
  // Un seul lien actif : le plus précis (/defisc/import l'emporte sur /defisc)
  const actif = items.map(([h]) => h).filter((h) => pathname === h || pathname.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0]

  const navLink = (href, label) => (
    <Link
      key={href}
      href={href}
      onClick={() => setMenuOpen(false)}
      className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{
        color: actif === href ? 'white' : 'rgba(255,255,255,0.72)',
        background: actif === href ? 'rgba(255,255,255,0.12)' : 'transparent',
      }}
    >
      {label}
    </Link>
  )

  // Nom du CRM en cours ; devient un sélecteur si l'utilisateur a accès aux deux
  const peutChanger = modules.length > 1
  const moduleLabel = (
    <div className="relative hidden sm:block">
      <button
        type="button"
        disabled={!peutChanger}
        onClick={() => setSwitchOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1 text-[12px] font-semibold"
        style={{ color: 'var(--accent)' }}
      >
        {MODULES[courant]?.label}
        {peutChanger && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>
      {switchOpen && peutChanger && (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[180px] rounded-lg p-1 shadow-lg" style={{ background: 'var(--ink-hover)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {modules.map((k) => (
            <Link key={k} href={MODULES[k].home} onClick={() => setSwitchOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
              style={k === courant ? { background: 'rgba(255,255,255,0.12)' } : undefined}>
              {MODULES[k].label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 shadow-sm" style={{ background: 'var(--ink)', borderBottom: '3px solid var(--accent)' }}>
        <div className={`mx-auto flex items-center gap-2 px-4 py-3 sm:px-6 ${wide ? 'max-w-[1800px]' : 'max-w-6xl'}`}>
          <Link href={MODULES[courant]?.home ?? '/choix'} className="mr-2">
            <Logo />
          </Link>
          {moduleLabel}
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {items.map(([href, label]) => navLink(href, label))}
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
            <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>{MODULES[courant]?.label}</p>
            {items.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">{label}</Link>
            ))}
            {peutChanger && modules.filter((k) => k !== courant).map((k) => (
              <Link key={k} href={MODULES[k].home} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/10" style={{ color: 'var(--accent)' }}>Passer à : {MODULES[k].label}</Link>
            ))}
            <button onClick={logout} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/70 hover:bg-white/10">Déconnexion</button>
            {nom && (
              <p className="truncate px-3 text-xs font-semibold" style={{ color: 'var(--accent)' }} title={nom}>{nom}</p>
            )}
          </div>
        )}
      </header>

      <main className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${wide ? 'max-w-[1800px] sm:px-4' : 'max-w-6xl'}`}>
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
                <div className="mr-auto min-w-0">
                  <h1 className="break-words text-xl font-bold sm:text-2xl" style={{ color: 'var(--ink)' }}>{title}</h1>
                  {subtitle && <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full [&>*]:max-sm:flex-1">{actions}</div>}
              </div>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
