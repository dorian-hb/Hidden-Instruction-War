import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ethers } from 'ethers';
import { Header } from './Header';
import { CONTRACT_ADDRESS, CONTRACT_ABI, GOLD_COIN_ADDRESS, GOLD_COIN_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';

type BuildingOption = {
  id: number;
  name: string;
  cost: number;
  description: string;
};

const BUILDINGS: BuildingOption[] = [
  { id: 1, name: 'Base', cost: 100, description: 'Foundation of your settlement with sturdy walls.' },
  { id: 2, name: 'Barracks', cost: 10, description: 'Train and house your troops securely.' },
  { id: 3, name: 'Farm', cost: 10, description: 'Feed your forces with encrypted crops.' },
];

export function GameApp() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();

  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const isConfigured = CONTRACT_ADDRESS !== zeroAddress && GOLD_COIN_ADDRESS !== zeroAddress;

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isBuilding, setIsBuilding] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedBuildings, setDecryptedBuildings] = useState<number[]>([]);

  const {
    data: goldBalance,
    refetch: refetchGold,
    isFetching: loadingGold,
  } = useReadContract({
    address: GOLD_COIN_ADDRESS,
    abi: GOLD_COIN_ABI,
    functionName: 'clearBalanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfigured },
  });

  const { data: encryptedBuildings, refetch: refetchBuildings, isFetching: loadingBuildings } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBuildings',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfigured },
  });

  const { data: hasClaimed } = useReadContract({
    address: GOLD_COIN_ADDRESS,
    abi: GOLD_COIN_ABI,
    functionName: 'hasClaimedGold',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfigured },
  });

  const readableGold = useMemo(() => {
    if (typeof goldBalance === 'bigint') {
      return Number(goldBalance);
    }
    return 0;
  }, [goldBalance]);

  const { data: encryptedGold } = useReadContract({
    address: GOLD_COIN_ADDRESS,
    abi: GOLD_COIN_ABI,
    functionName: 'confidentialBalanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfigured },
  });

  const handleClaimGold = async () => {
    if (!signer) {
      setStatusMessage('Connect your wallet to claim gold.');
      return;
    }
    if (!isConfigured) {
      setStatusMessage('Contract addresses are not configured yet.');
      return;
    }
    setStatusMessage(null);
    setDecryptedBuildings([]);

    try {
      setIsClaiming(true);
      const resolvedSigner = await signer;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedSigner);
      const tx = await contract.claimGold();
      await tx.wait();
      await refetchGold();
      await refetchBuildings();
      setStatusMessage('Gold secured! You can start building.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to claim gold');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleBuild = async (buildingId: number) => {
    if (!signer) {
      setStatusMessage('Connect your wallet before building.');
      return;
    }
    if (!isConfigured) {
      setStatusMessage('Contract addresses are not configured yet.');
      return;
    }
    if (!instance) {
      setStatusMessage('Encryption service is still loading.');
      return;
    }
    if (!address) {
      setStatusMessage('Connect your wallet before building.');
      return;
    }

    setStatusMessage(null);
    setIsBuilding(buildingId);
    setDecryptedBuildings([]);

    try {
      const resolvedSigner = await signer;
      const encryptedInput = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      encryptedInput.add32(BigInt(buildingId));
      const encryptedPayload = await encryptedInput.encrypt();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, resolvedSigner);
      const tx = await contract.build(buildingId, encryptedPayload.handles[0], encryptedPayload.inputProof);
      await tx.wait();
      await refetchGold();
      await refetchBuildings();
      setStatusMessage('New construction added to your encrypted city.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to build');
    } finally {
      setIsBuilding(null);
    }
  };

  const decryptBuildings = async () => {
    if (!instance) {
      setStatusMessage('Encryption service is still loading.');
      return;
    }
    if (!isConfigured) {
      setStatusMessage('Contract addresses are not configured yet.');
      return;
    }
    if (!address) {
      setStatusMessage('Connect your wallet to decrypt your buildings.');
      return;
    }
    if (!encryptedBuildings || encryptedBuildings.length === 0) {
      setStatusMessage('No encrypted buildings found for your address.');
      return;
    }

    setIsDecrypting(true);
    setStatusMessage(null);

    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const resolvedSigner = await signer;
      if (!resolvedSigner) {
        throw new Error('Signer unavailable for decryption');
      }

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const handlePairs = (encryptedBuildings as string[]).map((handle) => ({
        handle,
        contractAddress: CONTRACT_ADDRESS,
      }));

      const result = await instance.userDecrypt(
        handlePairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const ids = (encryptedBuildings as string[]).map((handle) => Number(result[handle]) || 0);
      setDecryptedBuildings(ids);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to decrypt buildings');
    } finally {
      setIsDecrypting(false);
    }
  };

  const decryptGold = async () => {
    if (!instance) {
      setStatusMessage('Encryption service is still loading.');
      return;
    }
    if (!isConfigured) {
      setStatusMessage('Contract addresses are not configured yet.');
      return;
    }
    if (!address || !encryptedGold) {
      setStatusMessage('No encrypted gold available to decrypt.');
      return;
    }

    setIsDecrypting(true);
    setStatusMessage(null);

    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [GOLD_COIN_ADDRESS];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const resolvedSigner = await signer;

      if (!resolvedSigner) {
        throw new Error('Signer unavailable for decryption');
      }

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        [
          {
            handle: encryptedGold as string,
            contractAddress: GOLD_COIN_ADDRESS,
          },
        ],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const decryptedValue = Number(result[encryptedGold as string]) || 0;
      setStatusMessage(`Decrypted gold balance: ${decryptedValue}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to decrypt gold');
    } finally {
      setIsDecrypting(false);
    }
  };

  const buildingLog = useMemo(() => {
    if (!encryptedBuildings || encryptedBuildings.length === 0) {
      return <p className="muted">No buildings yet. Use your gold to start constructing.</p>;
    }

    return (
      <ul className="building-list">
        {(encryptedBuildings as string[]).map((handle, index) => {
          const revealed = decryptedBuildings[index];
          return (
            <li key={handle} className="building-row">
              <div>
                <p className="building-title">Building #{index + 1}</p>
                <p className="building-hash">Cipher: {handle.slice(0, 10)}...</p>
              </div>
              <div className="building-badge">
                {revealed ? `Type ${revealed}` : 'Encrypted'}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }, [encryptedBuildings, decryptedBuildings]);

  return (
    <div className="game-app">
      <Header />

      {!isConnected ? (
        <div className="card notice">
          <h3>Connect your wallet</h3>
          <p className="muted">Switch to Sepolia and connect to start building your encrypted city.</p>
        </div>
      ) : (
        <div className="layout">
          <section className="card highlight">
            <div className="stat">
              <p className="stat-label">Gold balance</p>
              <p className="stat-value">{loadingGold ? 'Loading...' : `${readableGold} GOLD`}</p>
              {encryptedGold ? (
                <button className="text-button" onClick={decryptGold} disabled={isDecrypting || isZamaLoading}>
                  {isDecrypting ? 'Decrypting...' : 'Decrypt gold with Zama'}
                </button>
              ) : null}
            </div>
            <div className="actions">
              <button
                className="primary-button"
                onClick={handleClaimGold}
                disabled={isClaiming || !!hasClaimed || loadingGold}
              >
                {isClaiming ? 'Claiming...' : hasClaimed ? 'Gold already claimed' : 'Claim starter gold'}
              </button>
              <p className="muted small">Starter grant: 500 GOLD. One claim per player.</p>
              {statusMessage && <p className="status-message">{statusMessage}</p>}
              {zamaError && <p className="status-message error">Zama error: {zamaError}</p>}
            </div>
          </section>

          <section className="card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Construct</p>
                <h3>Spend gold to add encrypted buildings</h3>
              </div>
            </div>
            <div className="building-grid">
              {BUILDINGS.map((option) => (
                <div key={option.id} className="building-card">
                  <div className="building-head">
                    <p className="building-name">{option.name}</p>
                    <span className="cost-badge">{option.cost} GOLD</span>
                  </div>
                  <p className="muted">{option.description}</p>
                  <button
                    className="secondary-button"
                    onClick={() => handleBuild(option.id)}
                    disabled={isBuilding === option.id || isClaiming || readableGold < option.cost}
                  >
                    {isBuilding === option.id ? 'Building...' : 'Build'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Encrypted ledger</p>
                <h3>Your hidden city</h3>
                <p className="muted small">
                  Building ids are stored with Zama FHE. Decrypt to reveal whether each record is a base, barracks, or
                  farm.
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={decryptBuildings}
                disabled={isDecrypting || isZamaLoading || loadingBuildings}
              >
                {isDecrypting ? 'Decrypting...' : 'Decrypt buildings'}
              </button>
            </div>
            {buildingLog}
          </section>
        </div>
      )}
    </div>
  );
}
