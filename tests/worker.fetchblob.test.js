import { describe, it, expect, afterEach } from 'vitest';
import worker from '../kleinanzeigen-duplizieren.user.js';

const { fetchAsBlob } = worker;

// Regressionsschutz: img.kleinanzeigen.de sendet `Access-Control-Allow-Origin: *`
// ohne `Access-Control-Allow-Credentials`. Mit Cookies verwirft der Browser
// die Antwort, und der Snapshot enthielte kein einziges Bild. jsdom setzt CORS
// nicht durch -- deshalb wird hier festgehalten, WIE angefragt wird.
describe('fetchAsBlob', () => {
    afterEach(() => { delete globalThis.fetch; });

    it('fragt Bilder ohne Cookies an', async () => {
        const aufrufe = [];
        globalThis.fetch = async (url, opts) => {
            aufrufe.push({ url, opts });
            return { ok: true, blob: async () => ({ type: 'image/jpeg' }) };
        };

        await fetchAsBlob('https://img.kleinanzeigen.de/api/v1/prod-ads/images/de/abc?rule=$_57.JPG');

        expect(aufrufe.length).toBe(1);
        expect(aufrufe[0].opts.credentials).toBe('omit');
    });

    it('liefert den Blob bei Erfolg', async () => {
        const blob = { type: 'image/jpeg' };
        globalThis.fetch = async () => ({ ok: true, blob: async () => blob });
        expect(await fetchAsBlob('https://img.kleinanzeigen.de/x')).toBe(blob);
    });

    it('wirft bei HTTP-Fehler, damit der Aufrufer einen Platzhalter setzt', async () => {
        globalThis.fetch = async () => ({ ok: false, status: 404 });
        await expect(fetchAsBlob('https://img.kleinanzeigen.de/x')).rejects.toThrow('HTTP 404');
    });
});
