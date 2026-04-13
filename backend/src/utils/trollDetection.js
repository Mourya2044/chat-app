const SENSITIVE_PATTERNS = {
  otp: /\b(?:otp|one[\s-]?time[\s-]?password|verification\s*code)\b[:\s-]*\d{4,8}\b/i,
  password: /\b(?:password|passcode|pin)\b\s*[:=\-]?\s*\S{4,}/i,
  cvv: /\b(?:cvv|cvc)\b\s*[:=\-]?\s*\d{3,4}\b/i,
  card: /\b(?:\d[ -]*?){13,19}\b/,
  upi: /\b[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}\b/,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  emailWithSecretHint: /\b(?:email|gmail|mail)\b.+\b(?:password|otp|pin)\b/i,
};

const TROLL_PATTERNS = [
  /\b(?:idiot|moron|loser|dumb|stupid|trash|worthless|clown)\b/i,
  /\b(?:f\*+k|fuck|bitch|bastard|asshole|slut|whore|kys)\b/i,
  /\b(?:i\s+hate\s+you|go\s+die|kill\s+yourself|you\s+are\s+nothing)\b/i,
  /\b(?:shut\s+up|nobody\s+asked|get\s+lost|useless)\b/i,
];

const DEFAULT_RESULT = {
  isSensitive: false,
  isTroll: false,
  severity: 'low',
  warningMessage: null,
};

const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();

const getHeuristicResult = (message, username) => {
  const text = normalize(message);
  const lowered = text.toLowerCase();

  const sensitiveMatches = Object.entries(SENSITIVE_PATTERNS)
    .filter(([, regex]) => regex.test(text))
    .map(([label]) => label);

  const trollScore = TROLL_PATTERNS.reduce((score, regex) => (regex.test(lowered) ? score + 1 : score), 0);
  const isTroll = trollScore > 0;

  return {
    isSensitive: sensitiveMatches.length > 0,
    isTroll,
    severity: trollScore >= 2 ? 'high' : isTroll ? 'medium' : 'low',
    warningMessage: isTroll ? `Hey ${username}, please keep this space respectful for everyone.` : null,
  };
};

const safeParseJson = (raw) => {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const analyzeWithGroq = async (message, heuristicResult) => {
  const prompt = `You are a moderation assistant for a college chat app.
Return JSON only.

Message: "${message}"
Heuristic flags: ${JSON.stringify(heuristicResult)}

Tasks:
1) Decide if message is trolling/abusive/harassing.
2) Decide if message contains sensitive info (credentials, OTP, payment data, personal identifiers).
3) Assign severity: low | medium | high.
4) Provide a short, calm warning message only if troll=true.

Output JSON schema:
{
  "isTroll": boolean,
  "isSensitive": boolean,
  "severity": "low" | "medium" | "high",
  "warningMessage": string | null
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are strict and return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq moderation request failed: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || '';
  const parsed = safeParseJson(content);

  if (!parsed) {
    throw new Error('Unable to parse moderation JSON from Groq');
  }

  return {
    isSensitive: Boolean(parsed.isSensitive),
    isTroll: Boolean(parsed.isTroll),
    severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'medium',
    warningMessage: typeof parsed.warningMessage === 'string' ? parsed.warningMessage : null,
  };
};

const analyzeMessage = async (content, username = 'User') => {
  if (!content || !content.trim()) return DEFAULT_RESULT;

  const heuristic = getHeuristicResult(content, username);

  if (!process.env.GROQ_API_KEY) {
    return heuristic;
  }

  try {
    const aiResult = await analyzeWithGroq(content, heuristic);

    return {
      isSensitive: aiResult.isSensitive || heuristic.isSensitive,
      isTroll: aiResult.isTroll || heuristic.isTroll,
      severity: aiResult.isTroll ? aiResult.severity : heuristic.severity,
      warningMessage:
        aiResult.warningMessage ||
        (aiResult.isTroll || heuristic.isTroll
          ? `Hey ${username}, please keep this space respectful for everyone.`
          : null),
    };
  } catch (error) {
    console.warn('[MODERATION] Groq unavailable, using heuristic fallback:', error.message);
    return heuristic;
  }
};

export { analyzeMessage };