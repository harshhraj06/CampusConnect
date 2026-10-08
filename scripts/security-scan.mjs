import {
  execFileSync,
} from 'node:child_process'

import {
  existsSync,
  readFileSync,
} from 'node:fs'

function git(args) {
  try {
    return execFileSync(
      'git',
      args,
      {
        encoding: 'utf8',
        stdio: [
          'ignore',
          'pipe',
          'ignore',
        ],
      }
    )
  } catch {
    return ''
  }
}

const tracked =
  git(['ls-files'])
    .split('\n')
    .map((value) =>
      value.trim()
    )
    .filter(Boolean)

let failed =
  false

const envFiles =
  tracked.filter(
    (file) =>
      file === '.env' ||
      file === '.env.local' ||
      file === '.env.production' ||
      file === '.env.development' ||
      /^\.env\..+\.local$/.test(
        file
      )
  )

if (envFiles.length) {
  failed = true

  console.error(
    'Sensitive environment files are tracked by Git:'
  )

  for (
    const file
    of envFiles
  ) {
    console.error(
      ` - ${file}`
    )
  }
}

const patterns = [
  [
    'Groq API key',
    /\bgsk_[A-Za-z0-9_-]{20,}\b/g,
  ],
  [
    'Resend API key',
    /\bre_[A-Za-z0-9_-]{20,}\b/g,
  ],
  [
    'Supabase secret key',
    /\bsb_secret_[A-Za-z0-9_-]{15,}\b/g,
  ],
  [
    'Private key',
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  ],
]

for (
  const file
  of tracked
) {
  if (
    !existsSync(file) ||
    file === '.env.example'
  ) {
    continue
  }

  let content

  try {
    content =
      readFileSync(
        file,
        'utf8'
      )
  } catch {
    continue
  }

  for (
    const [
      label,
      pattern,
    ]
    of patterns
  ) {
    pattern.lastIndex = 0

    if (
      pattern.test(
        content
      )
    ) {
      failed = true

      console.error(
        `Possible ${label} found in ${file}`
      )
    }
  }

  const header =
    content
      .split('\n')
      .slice(0, 8)
      .join('\n')

  if (
    /['"]use client['"]/.test(
      header
    ) &&
    /SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|AI_API_KEY|ATTENDANCE_DELIVERY_WORKER_SECRET/.test(
      content
    )
  ) {
    failed = true

    console.error(
      `Server secret referenced by client code: ${file}`
    )
  }
}

const envHistory =
  git([
    'log',
    '--all',
    '--format=%H',
    '--',
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
  ]).trim()

if (envHistory) {
  console.warn(
    'WARNING: an environment file exists in Git history.'
  )

  console.warn(
    'Any credentials that were stored there must be rotated.'
  )
}

if (failed) {
  console.error(
    'Security source scan FAILED.'
  )

  process.exit(1)
}

console.log(
  'Security source scan passed.'
)
