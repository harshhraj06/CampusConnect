import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('public branding route exists and is configured for unauthenticated access', () => {
  const brandingApiPath = path.join(process.cwd(), 'app/api/branding/route.ts')
  assert.ok(fs.existsSync(brandingApiPath), 'app/api/branding/route.ts must exist')

  const content = fs.readFileSync(brandingApiPath, 'utf8')
  assert.match(content, /createAdminClient/, 'Must use admin client to fetch active asset')
  assert.match(content, /is_active/, 'Must query active branding asset')
  assert.match(content, /heroImageUrl/, 'Must return heroImageUrl')
})

test('admin branding route allows unauthenticated GET for active asset', () => {
  const adminBrandingPath = path.join(process.cwd(), 'app/api/admin/branding/route.ts')
  assert.ok(fs.existsSync(adminBrandingPath), 'app/api/admin/branding/route.ts must exist')

  const content = fs.readFileSync(adminBrandingPath, 'utf8')
  assert.match(content, /requireAuth:\s*false/, 'GET in admin branding must not require auth')
})

test('AuthScreen in page.tsx loads active hero image with fallbacks and caching', () => {
  const pagePath = path.join(process.cwd(), 'app/page.tsx')
  assert.ok(fs.existsSync(pagePath), 'app/page.tsx must exist')

  const content = fs.readFileSync(pagePath, 'utf8')
  assert.match(content, /\/api\/branding/, 'AuthScreen must fetch from /api/branding')
  assert.match(content, /cc_active_hero_image/, 'AuthScreen must use cached active hero image')
  assert.match(content, /<Image\s+src=\{heroImageUrl\}/, 'AuthScreen must render Image with heroImageUrl')
})

test('migration grants SELECT on branding_assets to anon', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261016130000_grant_branding_assets_select.sql')
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist')

  const sql = fs.readFileSync(migrationPath, 'utf8')
  assert.match(sql, /grant\s+select\s+on\s+table\s+public\.branding_assets\s+to\s+anon/i, 'Must grant select to anon')
})

test('branding-manager.tsx exports GlassFolder and BrandingManager with interactive cards and styles', () => {
  const managerPath = path.join(process.cwd(), 'app/components/admin/branding-manager.tsx')
  assert.ok(fs.existsSync(managerPath), 'branding-manager.tsx must exist')

  const content = fs.readFileSync(managerPath, 'utf8')
  assert.match(content, /export\s+default\s+function\s+GlassFolder/, 'Must include default export GlassFolder')
  assert.match(content, /export\s+function\s+BrandingManager/, 'Must export BrandingManager for lazy load in page.tsx')
  assert.match(content, /export\s*\{\s*GlassFolder\s*\}/, 'Must export named GlassFolder')
  assert.match(content, /ART_PRESETS/, 'Must include ART_PRESETS')
  assert.match(content, /GF_CSS/, 'Must include GF_CSS styles')
  assert.match(content, /createArtJob/, 'Must include procedural liquid canvas generator')
})
