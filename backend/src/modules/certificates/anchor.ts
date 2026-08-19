import { config } from '../../config/index.js';
import { logger } from '../../core/logger.js';

/**
 * On-chain anchoring. Writes a certificate's sha256 hash into a blockchain transaction's
 * calldata (cheapest real anchoring — no contract needed). The document stays off-chain;
 * only the hash is public, which is privacy-safe and lets anyone verify integrity.
 *
 * Real anchoring runs when ANCHOR_RPC_URL + ANCHOR_PRIVATE_KEY are set; otherwise a dev
 * pseudo-anchor is returned so the flow is testable end to end.
 */
export interface AnchorResult { network: string; txHash: string; anchoredAt: Date }

export const anchor = {
  configured: () => Boolean(config.anchor.rpcUrl && config.anchor.privateKey),

  async anchorHash(sha256: string): Promise<AnchorResult> {
    if (!this.configured()) {
      return { network: 'dev', txHash: '0xdev-' + sha256.slice(0, 16), anchoredAt: new Date() };
    }
    // Lazy import keeps ethers out of the hot path when anchoring is disabled.
    const { JsonRpcProvider, Wallet } = await import('ethers');
    const provider = new JsonRpcProvider(config.anchor.rpcUrl);
    const wallet = new Wallet(config.anchor.privateKey, provider);
    const tx = await wallet.sendTransaction({
      to: wallet.address,                 // self-send; the proof is in the data field
      value: 0n,
      data: '0x' + sha256,                // embed the certificate hash
    });
    const receipt = await tx.wait();
    const net = await provider.getNetwork();
    logger.info({ txHash: tx.hash }, 'certificate anchored on-chain');
    return { network: String(net.name ?? net.chainId), txHash: receipt?.hash ?? tx.hash, anchoredAt: new Date() };
  },
};
