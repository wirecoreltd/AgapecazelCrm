import { createClient } from '@supabase/supabase-js'

// Bloquer / débloquer un utilisateur — réservé à l'admin
// Bloqué : connexion impossible (ban Supabase Auth) + déconnecté dès sa prochaine page (middleware)
export async function POST(req) {
  try {
    const { userId, blocked, accessToken } = await req.json()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey) return Response.json({ error: 'Configuration Supabase manquante sur le serveur.' }, { status: 500 })
    if (!serviceKey) return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur Vercel." }, { status: 500 })
    if (!userId || typeof blocked !== 'boolean') return Response.json({ error: 'Requête invalide.' }, { status: 400 })

    const authClient = createClient(url, anonKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(accessToken)
    if (authErr || !user) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createClient(url, serviceKey)
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return Response.json({ error: "Réservé à l'admin." }, { status: 403 })
    if (userId === user.id) return Response.json({ error: 'Vous ne pouvez pas vous bloquer vous-même.' }, { status: 400 })

    const { data: cible } = await admin.from('profiles').select('id').eq('id', userId).single()
    if (!cible) return Response.json({ error: 'Utilisateur introuvable.' }, { status: 404 })

    // 1) indicateur dans profiles (échoue proprement si la migration SQL n'a pas été lancée)
    const { error: profErr } = await admin.from('profiles').update({ bloque: blocked }).eq('id', userId)
    if (profErr) {
      const manque = /bloque/i.test(profErr.message)
      return Response.json({ error: manque ? "Colonne « bloque » absente : lancez d'abord sql/admin_bloquer.sql dans Supabase." : profErr.message }, { status: 400 })
    }
    // 2) verrou de connexion côté Supabase Auth (~100 ans = bloqué ; 'none' = débloqué)
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: blocked ? '876000h' : 'none' })
    if (error) {
      await admin.from('profiles').update({ bloque: !blocked }).eq('id', userId) // annule
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e?.message || 'Erreur serveur inconnue.' }, { status: 500 })
  }
}
