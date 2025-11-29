import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div>
          <p className="eyebrow">Zama FHE City Builder</p>
          <h1 className="header-title">Hidden Instruction War</h1>
          <p className="header-subtitle">
            Claim gold, build encrypted structures, and reveal them only when you choose.
          </p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
