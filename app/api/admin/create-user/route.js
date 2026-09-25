rimport { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const { email, password, nom_complet, role, accessToken } = await req.json()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const authClient = createClient(url, anonKey)
  const { data: { user }, error: authErr } = await authClient.auth.getUser(accessToken)
  if (authErr || !user) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

  const admin = createClient(url, serviceKey)
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return Response.json({ error: "Réservé à l'admin." }, { status: 403 })

  if (!['admin', 'agent'].includes(role)) return Response.json({ error: 'Rôle invalide.' }, { status: 400 })

  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) return Response.json({ error: error.message }, { status: 400 })

  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id, nom_complet, role, email,
  })
  if (profErr) return Response.json({ error: profErr.message }, { status: 400 })

  return Response.json({ ok: true })
}
