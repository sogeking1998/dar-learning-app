import { supabase } from './supabaseClient'

export async function getAuditLogs({ entityType = 'all', limit = 200 } = {}) {
  let query = supabase
    .from('audit_logs')
    .select('id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_label, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityType !== 'all') query = query.eq('entity_type', entityType)
  const { data, error } = await query
  if (error) console.error('Load audit history failed:', error.message)
  return { data: data || [], error }
}

export async function addAuditLog({ action, entityType, entityId, entityLabel, details = {} }) {
  const { data: auth } = await supabase.auth.getUser()
  const actor = auth?.user
  if (!actor) return { error: { message: 'No signed-in actor for audit entry.' } }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', actor.id)
    .single()

  return supabase.from('audit_logs').insert({
    actor_id: actor.id,
    actor_name: profile?.name || actor.user_metadata?.name || null,
    actor_email: profile?.email || actor.email || null,
    action,
    entity_type: entityType,
    entity_id: entityId != null ? String(entityId) : null,
    entity_label: entityLabel || null,
    details,
  })
}
