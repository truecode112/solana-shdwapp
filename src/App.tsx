import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import * as anchor from "@project-serum/anchor";
import { ShdwDrive, StorageAccountV2 } from "@shadow-drive/sdk";

require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const App: FC = () => {
  return (
    <Context>
      <Content />
    </Context>
  );
};
export default App;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      /**
       * Wallets that implement either of these standards will be available automatically.
       *
       *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
       *     (https://github.com/solana-mobile/mobile-wallet-adapter)
       *   - Solana Wallet Standard
       *     (https://github.com/solana-labs/wallet-standard)
       *
       * If you wish to support a wallet that supports neither of those standards,
       * instantiate its legacy wallet adapter here. Common legacy adapters can be found
       * in the npm package `@solana/wallet-adapter-wallets`.
       */
      new UnsafeBurnerWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const Content: FC = () => {
  const [file, setFile] = useState<File>();
  const [uploadUrl, setUploadUrl] = useState<String>('');
  // const [txnSig, setTxnSig] = useState<String>('');
  const { connection } = useConnection();
  const [message, SetMessage] = useState<String>();
  const [drive, SetDrive] = useState<ShdwDrive>();
  const [error, SetError] = useState<String>();
  const [shdwAccount, setShadowAccount] = useState<{
    publicKey: anchor.web3.PublicKey;
    account: StorageAccountV2;
  }>();

  const wallet = useWallet();
  useEffect(() => {
    (async () => {
      if (wallet?.publicKey) {
        try {
          console.log(wallet.publicKey);
          const drive = await new ShdwDrive(connection, wallet).init();
          console.log(drive);
          console.log(wallet);
          SetDrive(drive);
          const accts = await drive.getStorageAccounts();
          setShadowAccount(accts[0]);
        } catch (e) {
          console.log(e);
          setShadowAccount(undefined);
        }
      }
    })();
  }, [wallet?.publicKey])

  const onSubmit = async (e: any) => {
    e.preventDefault()
    if (drive) {
      const accounts = await drive.getStorageAccounts();
      const acc = accounts[0].publicKey;
      const getStorageAccount = await drive.getStorageAccount(acc);
      if (file) {
        const upload = await drive.uploadFile(acc, file);
        console.log(upload);
        if (upload.upload_errors) {
          SetError(upload.upload_errors[0].error);
        } else {
          setUploadUrl(upload.finalized_locations[0]);
          SetMessage(upload.message);
          SetError(undefined);
        }
      }
    }
  }

  const createStorage = async () => {
    try {
      if (drive) {
        const newAcct = await drive.createStorageAccount("MyBucket", "10MB");
        console.log(newAcct);
        const accts = await drive.getStorageAccounts();
        setShadowAccount(accts[0]);
      } else {
      }
    } catch (e: any) {
      console.log(e);
      alert("Failed to create storage account");
    }
  }

  return (
    <div className="App">
      <h1>Shadow Drive File Upload</h1>
      <WalletMultiButton />
      {wallet?.publicKey && (
        shdwAccount?.publicKey ? (
          <div>
            <form
              onSubmit={onSubmit}>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
              <br />
              <button type="submit">Upload</button>
            </form>
            <span>You may have to wait 60-120s for the URL to appear</span>
            <div>
              {error ? (
                <div>
                  <h3>Failed!</h3>
                  <h4>Message: {error}</h4>
                </div>
              ) : (
                <div>
                  <h3>Success!</h3>
                  <h4>URL: {uploadUrl}</h4>
                  <h4>Message: {message}</h4>
                  {/* <h4>Sig: {txnSig}</h4> */}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className='CreateStorage'>
            <h3>No storage account! Please create storage account.</h3>
            <button onClick={createStorage}>Create Storage Account</button>
          </div>
        )
      )}

    </div>
  );
};
