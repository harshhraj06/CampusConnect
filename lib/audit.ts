/**
 * CampusConnect Audit Logging
 * Security event logging for compliance and monitoring
 */

type AuditEventType =
  | 'user.login'
  | 'user.logout'
  | 'user.failed_login'
  | 'user.password_change'
  | 'user.account_delete'
  | 'user.role_change'
  | 'user.profile_update'
  | 'admin.user_create'
  | 'admin.user_update'
  | 'admin.user_delete'
  | 'admin.role_assign'
  | 'admin.config_change'
  | 'data.export'
  | 'data.import'
  | 'data.delete'
  | 'file.upload'
  | 'file.delete'
  | 'email.send'
  | 'api.rate_limit_exceeded'
  | 'api.unauthorized_access'
  | 'security.suspicious_activity'
  | 'ai.chat'

interface AuditLogEntry {
  event_type: AuditEventType
  user_id?: string
  actor_id?: string
  target_id?: string
  resource_type?: string
  resource_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  success: boolean
  error_message?: string
  timestamp: string
}

const auditQueue: AuditLogEntry[] = []
let flushInterval: NodeJS.Timeout | null = null

/**
 * Add entry to audit queue (non-blocking)
 */
export function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  auditQueue.push(logEntry)

  // Flush immediately for security events
  const securityEvents: AuditEventType[] = [
    'security.suspicious_activity',
    'api.unauthorized_access',
    'api.rate_limit_exceeded',
    'user.failed_login',
    'user.account_delete',
    'admin.user_delete',
  ]

  if (securityEvents.includes(entry.event_type)) {
    flushAuditQueue()
  }

  // Start periodic flush if not already running
  if (!flushInterval) {
    flushInterval = setInterval(flushAuditQueue, 30_000) // Every 30 seconds
  }
}

/**
 * Flush audit queue to storage (Supabase, file, or external service)
 */
async function flushAuditQueue(): Promise<void> {
  if (auditQueue.length === 0) return

  const entries = auditQueue.splice(0, auditQueue.length)

  try {
    // Option 1: Write to Supabase audit_logs table
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )

      const { error } = await admin.from('audit_logs').insert(entries)
      if (error) {
        console.error('[Audit] Failed to write to Supabase:', error)
        // Fallback to console
        fallbackLog(entries)
      }
    } else {
      // Option 2: Console fallback (development)
      fallbackLog(entries)
    }
  } catch (error) {
    console.error('[Audit] Flush failed:', error)
    fallbackLog(entries)
  }
}

/**
 * Fallback logging to console
 */
function fallbackLog(entries: AuditLogEntry[]): void {
  for (const entry of entries) {
    const level = entry.success ? 'info' : 'warn'
    console[level]('[AUDIT]', JSON.stringify(entry))
  }
}

/**
 * Helper to log authentication events
 */
export function auditAuth(
  event: 'login' | 'logout' | 'failed_login' | 'password_change',
  userId: string,
  success: boolean,
  metadata?: Record<string, unknown>,
  request?: Request
): void {
  auditLog({
    event_type: `user.${event}`,
    user_id: userId,
    success,
    metadata,
    ip_address:
      request?.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      request?.headers
        .get("x-real-ip")
        ?.trim() ||
      undefined,

    user_agent:
      request?.headers
        .get("user-agent") ||
      undefined,
  })
}

/**
 * Helper to log admin actions
 */
export function auditAdmin(
  event: 'user_create' | 'user_update' | 'user_delete' | 'role_assign' | 'config_change',
  actorId: string,
  targetId: string,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  auditLog({
    event_type: `admin.${event}`,
    actor_id: actorId,
    target_id: targetId,
    success,
    metadata,
  })
}

/**
 * Helper to log data operations
 */
export function auditData(
  event: 'export' | 'import' | 'delete',
  userId: string,
  resourceType: string,
  resourceId: string,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  auditLog({
    event_type: `data.${event}`,
    user_id: userId,
    resource_type: resourceType,
    resource_id: resourceId,
    success,
    metadata,
  })
}

/**
 * Helper to log file operations
 */
export function auditFile(
  event: 'upload' | 'delete',
  userId: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  success: boolean
): void {
  auditLog({
    event_type: `file.${event}`,
    user_id: userId,
    resource_type: 'file',
    resource_id: fileId,
    success,
    metadata: { file_name: fileName, file_size: fileSize, mime_type: mimeType },
  })
}

/**
 * Helper to log security events
 */
export function auditSecurity(
  event: 'suspicious_activity' | 'unauthorized_access' | 'rate_limit_exceeded',
  userId: string | undefined,
  metadata: Record<string, unknown>,
  request?: Request
): void {
  const eventType: AuditEventType =
    event === "suspicious_activity"
      ? "security.suspicious_activity"
      : event === "unauthorized_access"
        ? "api.unauthorized_access"
        : "api.rate_limit_exceeded"

  auditLog({
    event_type: eventType,
    user_id: userId,
    success: false,
    metadata,
    ip_address:
      request?.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      request?.headers
        .get("x-real-ip")
        ?.trim() ||
      undefined,

    user_agent:
      request?.headers
        .get("user-agent") ||
      undefined,
  })
}

/**
 * Graceful shutdown - flush remaining logs
 */
export async function shutdownAudit(): Promise<void> {
  if (flushInterval) {
    clearInterval(flushInterval)
    flushInterval = null
  }
  await flushAuditQueue()
}

// Auto-flush on process exit (Node.js)
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    flushAuditQueue()
  })
}