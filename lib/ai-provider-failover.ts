type Message = { role: string; content: string }

export type FailoverPayload = {
  model: string
  messages: Message[]
  max_completion_tokens?: number
  include_reasoning?: boolean
}

export type FailoverResult = {
  data: {
    choices?: Array<{ message?: { content?: string } }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      input_tokens?: number
      output_tokens?: number
    }
  }
  provider: string
  model: string
}

type Provider = {
  name: string
  url: string
  key: string
  model: string
}

const cooldowns = new Map<string, number>()
const failures = new Map<string, number>()
const TIMEOUT_MS = 18000
const COOLDOWN_MS = 60000

function configuredProviders(): Provider[] {
  const env = process.env
  const providers: Record<string, Provider | null> = {
    primary: env.AI_CHAT_COMPLETIONS_URL?.trim() &&
      env.AI_API_KEY?.trim() && env.AI_MODEL?.trim()
      ? {
          name: "primary",
          url: env.AI_CHAT_COMPLETIONS_URL.trim(),
          key: env.AI_API_KEY.trim(),
          model: env.AI_MODEL.trim(),
        }
      : null,
    gemini: env.GEMINI_API_KEY?.trim() && env.GEMINI_MODEL?.trim()
      ? {
          name: "gemini",
          url: env.GEMINI_CHAT_COMPLETIONS_URL?.trim() ||
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          key: env.GEMINI_API_KEY.trim(),
          model: env.GEMINI_MODEL.trim(),
        }
      : null,
    groq: env.GROQ_API_KEY?.trim() && env.GROQ_MODEL?.trim()
      ? {
          name: "groq",
          url: env.GROQ_CHAT_COMPLETIONS_URL?.trim() ||
            "https://api.groq.com/openai/v1/chat/completions",
          key: env.GROQ_API_KEY.trim(),
          model: env.GROQ_MODEL.trim(),
        }
      : null,
    openrouter: env.OPENROUTER_API_KEY?.trim() && env.OPENROUTER_MODEL?.trim()
      ? {
          name: "openrouter",
          url: env.OPENROUTER_CHAT_COMPLETIONS_URL?.trim() ||
            "https://openrouter.ai/api/v1/chat/completions",
          key: env.OPENROUTER_API_KEY.trim(),
          model: env.OPENROUTER_MODEL.trim(),
        }
      : null,
    cloudflare: env.CLOUDFLARE_API_TOKEN?.trim() &&
      env.CLOUDFLARE_ACCOUNT_ID?.trim() && env.CLOUDFLARE_MODEL?.trim()
      ? {
          name: "cloudflare",
          url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID.trim()}/ai/v1/chat/completions`,
          key: env.CLOUDFLARE_API_TOKEN.trim(),
          model: env.CLOUDFLARE_MODEL.trim(),
        }
      : null,
  }

  const requested = (env.AI_PROVIDER_CHAIN ||
    "primary,groq,gemini,openrouter,cloudflare")
    .split(",").map(x => x.trim().toLowerCase()).filter(Boolean)

  const unique = [...new Set(requested)]
  return unique
    .map(name => providers[name])
    .filter((provider): provider is Provider => Boolean(provider))
}

export function hasConfiguredAiProvider(): boolean {
  return configuredProviders().length > 0
}

export async function requestWithProviderFailover(
  payload: FailoverPayload,
): Promise<FailoverResult> {
  const providers = configuredProviders()
  if (!providers.length) throw new Error("AI_NO_PROVIDER_CONFIGURED")

  const now = Date.now()
  const available = providers.filter(p => (cooldowns.get(p.name) || 0) <= now)
  const ordered = [
    ...available,
    ...providers.filter(p => (cooldowns.get(p.name) || 0) > now),
  ]

  const errors: string[] = []

  for (const provider of ordered) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(provider.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.key}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: provider.model,
          messages: payload.messages,
          max_tokens: payload.max_completion_tokens ?? 1200,
        }),
        cache: "no-store",
      })

      if (!response.ok) {
        const retryable = response.status === 408 ||
          response.status === 409 ||
          response.status === 425 ||
          response.status === 429 ||
          response.status >= 500

        // Do not print provider response bodies; they may contain sensitive details.
        console.warn("[CampusConnect AI] Provider failed", {
          provider: provider.name,
          status: response.status,
        })

        if (!retryable) {
          errors.push(`${provider.name}:${response.status}`)
          continue
        }

        const count = (failures.get(provider.name) || 0) + 1
        failures.set(provider.name, count)
        if (count >= 2) cooldowns.set(provider.name, Date.now() + COOLDOWN_MS)
        errors.push(`${provider.name}:${response.status}`)
        continue
      }

      const data = await response.json() as FailoverResult["data"]
      const answer = data.choices?.[0]?.message?.content
      if (typeof answer !== "string" || !answer.trim()) {
        errors.push(`${provider.name}:empty`)
        continue
      }

      failures.delete(provider.name)
      cooldowns.delete(provider.name)
      return { data, provider: provider.name, model: provider.model }
    } catch (error) {
      const reason = error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "connection"
      console.warn("[CampusConnect AI] Provider connection failed", {
        provider: provider.name,
        reason,
      })
      const count = (failures.get(provider.name) || 0) + 1
      failures.set(provider.name, count)
      if (count >= 2) cooldowns.set(provider.name, Date.now() + COOLDOWN_MS)
      errors.push(`${provider.name}:${reason}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  console.error("[CampusConnect AI] All configured providers failed", {
    attempted: errors.length,
  })
  throw new Error("AI_ALL_PROVIDERS_FAILED")
}
