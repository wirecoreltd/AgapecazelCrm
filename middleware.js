import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { canAccess } from '@/lib/roles'

export async function middleware(req) {
  // Webhook OnOff : pas de session utilisateur, protégé par X-API-KEY dans la route
  if (req.nextUrl.pathname.startsWith('/api/onoff')) return NextResponse.next()
  let res = NextResponse.next({ request: req })
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    } }
  )
  const { data: { user } } = await sb.auth.getUser()
  const path = req.nextUrl.pathname
  const onLogin = path.startsWith('/login')
  const onChange = path.startsWith('/change-password')
  const isApi = path.startsWith('/api')
  // Drapeau posé côté serveur (app_metadata : non modifiable par l'utilisateur)
  const mustChange = user?.app_metadata?.must_change_password === true
  if (!user && !onLogin) return NextResponse.redirect(new URL('/login', req.url))
  if (user && mustChange && !onChange && !isApi) return NextResponse.redirect(new URL('/change-password', req.url))
  if (user && !mustChange && onChange) return NextResponse.redirect(new URL('/leads', req.url))
  if (user && onLogin) return NextResponse.redirect(new URL(mustChange ? '/change-password' : '/leads', req.url))
  // Contrôle d'accès par rôle (pages + API appels)
  if (user && !onLogin && !onChange && (!isApi || path.startsWith('/api/appels'))) {
    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (!canAccess(prof?.role, path)) {
      if (isApi) return Response.json({ error: 'Accès refusé.' }, { status: 403 })
      return NextResponse.redirect(new URL('/leads', req.url))
    }
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)'],
}
