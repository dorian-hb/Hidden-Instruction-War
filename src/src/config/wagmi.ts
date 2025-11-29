import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Hidden Instruction War',
  projectId: '8f9c5f1a4b6d4c15b8e629c3b31022c1', // WalletConnect cloud id, no env vars allowed
  chains: [sepolia],
  ssr: false,
});
