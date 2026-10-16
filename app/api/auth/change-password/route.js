import { createClient } from '@supabase/supabase-js'

// Change le mot de passe de l'utilisateur connecté et lève l'obligation
// de changement (app_metadata.must_change_password), modifiable uniquement côté serveur.
export async function POST(req) {
  try {
    const { newPassword, accessToken } = await req.json()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey) {
      return Response.json({ error: 'Configuration Supabase manquante sur le serveur.' }, { status: 500 })
    }
    if (!serviceKey) {
      return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur Vercel." }, { status: 500 })
    }
    if (!newPassword || newPassword.length < 8) {
      return Response.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }

    const authClient = createClient(url, anonKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(accessToken)
    if (authErr || !user) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

    const admin = createClient(url, serviceKey)
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
      app_metadata: { must_change_password: false },
    })
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ ok: true, email: user.email })
  } catch (e) {
    return Response.json({ error: e?.message || 'Erreur serveur inconnue.' }, { status: 500 })
  }
}
