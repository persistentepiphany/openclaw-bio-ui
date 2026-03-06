/**
 * flock.js — Flock.io OpenAI-compatible chat client (Z.AI fallback)
 *
 * Uses x-litellm-api-key header (NOT Authorization: Bearer).
 * Model: qwen3-30b-a3b-instruct-2507
 */

const FLOCK_URL = "https://api.flock.io/v1/chat/completions";
const FLOCK_KEY = import.meta.env.VITE_FLOCK_API_KEY || "";
const MODEL = "qwen3-30b-a3b-instruct-2507";

/**
 * Send a chat completion request to Flock.io.
 *
 * @param {Array} messages — [{role, content}]
 * @param {object} options — { temperature, max_tokens }
 * @returns {object|null} — { content } or null on failure
 */
export async function chatWithFlock(messages, options = {}) {
  if (!FLOCK_KEY) return null;

  try {
    const res = await fetch(FLOCK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-litellm-api-key": FLOCK_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 4096,
        stream: false,
      }),
    });

    if (!res.ok) {
      console.warn(`[Flock] ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) return null;

    return {
      content: choice.message?.content || null,
    };
  } catch (err) {
    console.warn("[Flock] request failed:", err.message);
    return null;
  }
}

/**
 * Check if Flock.io is configured.
 */
export function isFlockConfigured() {
  return !!FLOCK_KEY;
}
