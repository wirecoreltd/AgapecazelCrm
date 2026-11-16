import { createClient } from '@supabase/supabase-js'

// Supprimer définitivement un utilisateur — réservé à l'admin
export async function POST(req) {
  try {
    const { userId, accessToken } = await req.json()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey) return Response.json({ error: 'Configuration Supabase manquante sur le serveur.' }, { status: 500 })
    if (!serviceKey) return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur Vercel." }, { status: 500 })
    if (!userId) return Response.json({ error: 'Utilisateur manquant.' }, { status: 400 })

    const authClient = createClient(url, anonKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(accessToken)
    if (authErr || !user) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createClient(url, serviceKey)
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return Response.json({ error: "Réservé à l'admin." }, { status: 403 })
    if (userId === user.id) return Response.json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, { status: 400 })

    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      // Historique rattaché (leads, appels, documents…) : la base refuse la suppression
      if (/foreign key|violates|database error/i.test(error.message)) {
        return Response.json({ error: "Suppression impossible : cet utilisateur a de l'historique (leads, appels, documents…). Bloquez-le plutôt." }, { status: 409 })
      }
      return Response.json({ error: error.message }, { status: 400 })
    }
    // Si le profil n'a pas été supprimé en cascade, on le retire
    await admin.from('profiles').delete().eq('id', userId)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e?.message || 'Erreur serveur inconnue.' }, { status: 500 })
  }
}
