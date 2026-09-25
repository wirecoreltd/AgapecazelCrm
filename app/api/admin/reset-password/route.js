import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const { userId, newPassword, accessToken } = await req.json()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey) {
      return Response.json({ error: 'Configuration Supabase manquante sur le serveur.' }, { status: 500 })
    }
    if (!serviceKey) {
      return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur Vercel." }, { status: 500 })
    }
    if (!userId || !newPassword) {
      return Response.json({ error: 'Utilisateur ou mot de passe manquant.' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 })
    }

    const authClient = createClient(url, anonKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(accessToken)
    if (authErr || !user) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createClient(url, serviceKey)
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return Response.json({ error: "Réservé à l'admin." }, { status: 403 })

    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e?.message || 'Erreur serveur inconnue.' }, { status: 500 })
  }
}
