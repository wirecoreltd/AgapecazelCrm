import { createClient } from '@supabase/supabase-js'

// Modifier un utilisateur existant (nom, email, rôle) — réservé à l'admin
export async function POST(req) {
  try {
    const { userId, nom_complet, email, role, accessToken } = await req.json()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey) {
      return Response.json({ error: 'Configuration Supabase manquante sur le serveur.' }, { status: 500 })
    }
    if (!serviceKey) {
      return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur Vercel." }, { status: 500 })
    }
    if (!userId || !nom_complet?.trim() || !email?.trim()) {
      return Response.json({ error: 'Nom, email et utilisateur sont obligatoires.' }, { status: 400 })
    }
    if (!['admin', 'agent', 'call_center'].includes(role)) {
      return Response.json({ error: 'Rôle invalide.' }, { status: 400 })
    }

    const authClient = createClient(url, anonKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(accessToken)
    if (authErr || !user) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createClient(url, serviceKey)
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return Response.json({ error: "Réservé à l'admin." }, { status: 403 })

    // Évite de se retirer soi-même les droits admin (verrouillage du CRM)
    if (userId === user.id && role !== 'admin') {
      return Response.json({ error: 'Vous ne pouvez pas retirer votre propre rôle admin.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const { data: current, error: curErr } = await admin.from('profiles').select('email').eq('id', userId).single()
    if (curErr || !current) return Response.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

    if (current.email?.toLowerCase() !== cleanEmail) {
      const { error } = await admin.auth.admin.updateUserById(userId, { email: cleanEmail, email_confirm: true })
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    const { error: profErr } = await admin.from('profiles')
      .update({ nom_complet: nom_complet.trim(), email: cleanEmail, role })
      .eq('id', userId)
    if (profErr) return Response.json({ error: profErr.message }, { status: 400 })

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e?.message || 'Erreur serveur inconnue.' }, { status: 500 })
  }
}
