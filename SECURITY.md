# CampusConnect Security Documentation

## Overview
This document outlines the security architecture, practices, and procedures for CampusConnect.

## Security Architecture

### Authentication
- **Provider**: Supabase Auth (JWT-based)
- **Session Management**: HttpOnly cookies with secure flags
- **Token Refresh**: Automatic via Supabase client
- **MFA**: Supported via Supabase (TOTP, SMS)

### Authorization
- **Role-Based Access Control (RBAC)**: 6 roles (Student, Faculty, Coordinator, Volunteer, Placement Cell, Main Admin)
- **Row Level Security (RLS)**: Enabled on all tables
- **Policy Engine**: PostgreSQL policies with `current_campus_role()` helper

### Data Protection
- **Encryption at Rest**: Supabase managed (AES-256)
- **Encryption in Transit**: TLS 1.2+ enforced
- **PII Handling**: Minimal collection, encrypted storage
- **Data Retention**: Configurable per data type

## Security Layers

### 1. Network Security
- **CSP**: Strict Content Security Policy
- **HSTS**: Enabled in production
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **CORS**: Restricted to known origins

### 2. Application Security
- **Input Validation**: All inputs sanitized and validated
- **File Upload**: MIME type verification, size limits, magic byte detection
- **Rate Limiting**: Per-IP and per-user limits on API endpoints
- **SQL Injection**: Prevented via Supabase client (parameterized queries)

### 3. API Security
- **Authentication Required**: All mutating endpoints
- **Role Verification**: Server-side role checks
- **Service Role**: Server-only, never exposed to client
- **Audit Logging**: All sensitive operations logged

### 4. AI Security
- **Prompt Injection Protection**: System prompts treat all input as untrusted
- **Grounded Responses**: Only from indexed/documented sources
- **Usage Limits**: Hourly/daily quotas via RPC
- **Cost Monitoring**: Token usage tracked per user

## Environment Variables

### Required (Production)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY (SERVER ONLY)
AI_CHAT_COMPLETIONS_URL
AI_API_KEY (SERVER ONLY)
AI_MODEL
RESEND_API_KEY (SERVER ONLY)
ATTENDANCE_EMAIL_FROM
ATTENDANCE_DELIVERY_WORKER_SECRET
NEXT_PUBLIC_APP_URL
```

### Security Rules
- **NEVER** commit `.env.local` or `.env.*.local` to git
- **ALWAYS** use deployment platform secrets management
- **ROTATE** keys immediately if exposed
- **USE** different keys for development/staging/production

## Deployment Security Checklist

### Pre-Deployment
- [ ] All secrets rotated and stored in platform secret manager
- [ ] `.env.local` in `.gitignore`
- [ ] `npm audit` passed (no critical/high vulnerabilities)
- [ ] Security headers configured in `next.config.ts`
- [ ] Middleware protecting all routes
- [ ] CSP policy tested and working
- [ ] RLS policies verified on all tables

### Post-Deployment
- [ ] Verify HTTPS enforcement (HSTS)
- [ ] Test authentication flows
- [ ] Verify role-based access works
- [ ] Check audit logs are being written
- [ ] Monitor error rates and unusual activity
- [ ] Set up alerting for security events

## Incident Response

### Secret Exposure
1. **Immediately rotate** exposed keys in their respective consoles
2. **Check audit logs** for unauthorized access
3. **Force logout** all users if session tokens compromised
4. **Document** incident and update procedures

### Suspected Breach
1. **Enable enhanced logging**
2. **Review audit logs** for anomalous patterns
3. **Check Supabase logs** for unusual queries
4. **Contact Supabase support** if database compromised
5. **Notify users** if PII exposed (per regulations)

## Vulnerability Management

### Dependency Updates
```bash
# Weekly
npm audit

# Monthly
npm update

# Before major releases
npm audit fix --force
```

### Security Scanning
- **SAST**: ESLint security rules enabled
- **Dependency**: `npm audit` in CI/CD
- **Secrets**: GitLeaks or similar in pre-commit

## Compliance

### Data Privacy
- **GDPR**: Right to deletion via account delete endpoint
- **Data Minimization**: Only collect necessary data
- **Access Control**: Role-based, least privilege

### Audit Requirements
- All admin actions logged
- Authentication events logged
- Data export/import logged
- Retention: 1 year minimum

## Security Contacts

- **Security Issues**: security@campusconnect.app
- **Supabase Support**: Via dashboard
- **Emergency**: Rotate keys immediately, then investigate

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-10-01 | Initial security documentation |