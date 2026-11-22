import { flattenKeys, type Translations } from './check-translations.mts';

/** The part of an OpenAPI document this check reads: the ProblemCode enum (ADR-0008). */
export interface ContractWithCodes {
  components?: { schemas?: { ProblemCode?: { enum?: string[] } } };
}

/** Error codes of a contract; empty if it has no ProblemCode schema. */
export function problemCodesOf(contract: ContractWithCodes): string[] {
  return contract.components?.schemas?.ProblemCode?.enum ?? [];
}

/**
 * Every error code the API can send needs the translation `errors.<code>` in the source
 * language (ADR-0008); checkTranslations already makes en/ru complete. Returns readable
 * problems; an empty array = every code is translated.
 */
export function checkErrorCodes(
  codes: string[],
  source: Translations,
  where: string,
): string[] {
  const keys = flattenKeys(source);
  return codes
    .filter((code) => !keys.has(`errors.${code}`))
    .map(
      (code) =>
        `${where}: error code "${code}" has no translation "errors.${code}"`,
    );
}
