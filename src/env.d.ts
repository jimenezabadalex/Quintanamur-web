/// <reference path="../.astro/types.d.ts" />

declare module 'cloudflare:workers' {
    export const env: {
        NEON_DATABASE_URL?: string;
        TELEGRAM_BOT_TOKEN?: string;
        TELEGRAM_CHAT_ID?: string;
        SESSION?: any;
        ASSETS?: any;
        [key: string]: any;
    };
}
