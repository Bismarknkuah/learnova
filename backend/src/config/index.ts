import dotenv from 'dotenv';
dotenv.config();

const env = (key: string, fallback?: string): string => {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:3000'),

  mongoUri: env('MONGO_URI', 'mongodb://localhost:27017/learnova'),
  redisUrl: env('REDIS_URL', 'redis://localhost:6379'),

  tenancy: {
    // 'shared'  → all schools in one DB, isolated by tenantId (default; fully working)
    // 'database'→ each school gets its OWN MongoDB database (strong isolation, rental-grade)
    isolation: (process.env.TENANT_ISOLATION ?? 'shared') as 'shared' | 'database',
    // Base cluster URI used to build per-school database URIs in 'database' mode.
    baseUri: process.env.MONGO_BASE_URI ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017',
    // Per-school DB name prefix, e.g. learnova_accra-high
    dbPrefix: process.env.TENANT_DB_PREFIX ?? 'learnova_',
    // Root domain for school subdomains, e.g. accra-high.learnova.app
    rootDomain: process.env.ROOT_DOMAIN ?? 'learnova.app',
  },

  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'claude-sonnet-4-6',
    qdrantUrl: process.env.QDRANT_URL ?? 'http://localhost:6333',
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },

  livekit: {
    url: process.env.LIVEKIT_URL ?? 'ws://localhost:7880',
    apiKey: process.env.LIVEKIT_API_KEY ?? '',
    apiSecret: process.env.LIVEKIT_API_SECRET ?? '',
    recordingsBucket: process.env.LIVEKIT_RECORDINGS_BUCKET ?? 'learnova-recordings',
  },

  asr: {
    provider: process.env.ASR_PROVIDER ?? 'none', // 'deepgram' | 'whisper' | 'none'
    deepgramApiKey: process.env.DEEPGRAM_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  },

  anchor: {
    rpcUrl: process.env.ANCHOR_RPC_URL ?? '',           // e.g. a Polygon/Base testnet RPC
    privateKey: process.env.ANCHOR_PRIVATE_KEY ?? '',   // funded key for the anchoring wallet
  },

  payments: {
    paystackSecret: process.env.PAYSTACK_SECRET_KEY ?? '',
    paystackPublic: process.env.PAYSTACK_PUBLIC_KEY ?? '',
    platformMomo: process.env.PLATFORM_MOMO ?? '+233240715156',   // commissions & subscriptions settle here
    freeYear: (process.env.FREE_FIRST_YEAR ?? 'true') === 'true',   // launch promo: first year free for everyone
    planCodes: { pro_monthly: process.env.PAYSTACK_PLAN_PRO_MONTHLY ?? '', pro_yearly: process.env.PAYSTACK_PLAN_PRO_YEARLY ?? '', premium_monthly: process.env.PAYSTACK_PLAN_PREMIUM_MONTHLY ?? '', premium_yearly: process.env.PAYSTACK_PLAN_PREMIUM_YEARLY ?? '' } as Record<string, string>,
    commissionRate: parseFloat(process.env.COMMISSION_RATE ?? '0.18'),
    currency: 'GHS' as const,
  },
} as const;
