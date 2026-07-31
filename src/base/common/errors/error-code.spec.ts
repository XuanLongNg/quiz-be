import { BaseErrorCode } from '@base/common/errors/error-code';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const I18N_ROOT = join(__dirname, '../../../i18n');

function locales(): string[] {
  return readdirSync(I18N_ROOT).filter((entry) =>
    statSync(join(I18N_ROOT, entry)).isDirectory(),
  );
}

function messagesFor(locale: string): Record<string, string> {
  const file = join(I18N_ROOT, locale, 'errors.json');
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
}

describe('error code declarations', () => {
  const declared = Object.values(BaseErrorCode);
  const allLocales = locales();

  it('finds at least one locale to check', () => {
    expect(allLocales.length).toBeGreaterThan(0);
  });

  describe.each(allLocales)('locale "%s"', (locale) => {
    it('has a non-empty message for every declared code', () => {
      const messages = messagesFor(locale);
      const missing = declared.filter((code) => !messages[code]?.trim());

      expect(missing).toEqual([]);
    });

    it('declares no message for an unknown code', () => {
      const messages = messagesFor(locale);
      const orphans = Object.keys(messages).filter(
        (code) => !declared.includes(code as BaseErrorCode),
      );

      expect(orphans).toEqual([]);
    });
  });
});
