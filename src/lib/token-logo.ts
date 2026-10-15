import type { Address } from 'viem'
import { tokenLogos } from '@/config/token-logos'
import type { XToken } from '@/config/tokens'

/**
 * Canonical token logo lookup.
 *
 * `token-logos.ts` is generated with every URL verified to return an image, so
 * an entry existing means the asset exists. Anything else (a pasted address, a
 * token added after generation) resolves to `undefined` and the UI draws a
 * monogram instead — deliberately no speculative URL that 404s on every render.
 */
export function tokenLogo(token: Pick<XToken, 'chainId'>, address: Address | string): string | undefined {
  return tokenLogos[`${token.chainId}:${address.toLowerCase()}`]
}

/** True when a real logo is known for this token. */
export function hasTokenLogo(token: Pick<XToken, 'chainId'>, address: Address | string): boolean {
  return tokenLogo(token, address) !== undefined
}