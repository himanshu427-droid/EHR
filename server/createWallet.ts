import * as fs from 'fs';
import * as path from 'path';
import { Wallets, type Identity, type X509Identity } from 'fabric-network';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server/wallet directory you want to create
const WALLET_PATH = path.resolve(__dirname, 'wallet');

// Path to the certificate created by registerEnroll.sh for user1
const CERT_PATH = path.resolve(
  __dirname, // current dir (server)
  '..', // EHR root
  'fabric-samples',
  'test-network',
  'organizations',
  'peerOrganizations',
  'org1.example.com',
  'users',
  'User1@org1.example.com',
  'msp',
  'signcerts',
  'cert.pem'
);

// Path to the private key directory
const KEY_DIR = path.resolve(
  __dirname, // current dir (server)
  '..', // EHR root
  'fabric-samples',
  'test-network',
  'organizations',
  'peerOrganizations',
  'org1.example.com',
  'users',
  'User1@org1.example.com',
  'msp',
  'keystore'
);

const MSP_ID = 'Org1MSP';

// The identity name your server code (blockchain.ts) expects
const IDENTITY_NAME = 'appUser'; 

function isX509Identity(identity: Identity | undefined): identity is X509Identity {
  return !!identity && identity.type === 'X.509';
}

async function main() {
  try {
    // 1. Create a new file system based wallet
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    console.log(`Wallet path: ${WALLET_PATH}`);

    // 2. Read the current Org1 user credentials from the active test network.
    if (!fs.existsSync(CERT_PATH)) {
      throw new Error(`Certificate file not found at ${CERT_PATH}.`);
    }

    if (!fs.existsSync(KEY_DIR)) {
      throw new Error(`Keystore directory not found at ${KEY_DIR}.`);
    }

    // 3. Read the certificate (public key)
    const certificate = fs.readFileSync(CERT_PATH, 'utf8');

    // 4. Read the private key
    const keyFiles = fs.readdirSync(KEY_DIR);
    const keyFile = keyFiles.find(file => file.endsWith('_sk')); // Find file ending in _sk
    if (!keyFile) {
      throw new Error('Private key file not found in keystore.');
    }
    const privateKey = fs.readFileSync(path.join(KEY_DIR, keyFile), 'utf8');

    // 5. Create the identity object
    const identity: X509Identity = {
      credentials: {
        certificate: certificate,
        privateKey: privateKey,
      },
      mspId: MSP_ID,
      type: 'X.509',
    };

    // 6. Replace the wallet entry when it is missing or stale.
    const existingIdentity = await wallet.get(IDENTITY_NAME);
    const existingCertificate = isX509Identity(existingIdentity)
      ? existingIdentity.credentials.certificate
      : undefined;
    const existingPrivateKey = isX509Identity(existingIdentity)
      ? existingIdentity.credentials.privateKey
      : undefined;

    const identityChanged =
      !existingIdentity ||
      existingIdentity.mspId !== MSP_ID ||
      existingCertificate !== certificate ||
      existingPrivateKey !== privateKey;

    if (!identityChanged) {
      console.log(`Wallet identity '${IDENTITY_NAME}' is already up to date.`);
      return;
    }

    await wallet.put(IDENTITY_NAME, identity);

    console.log(
      existingIdentity
        ? `Successfully refreshed '${IDENTITY_NAME}' in the wallet at ${WALLET_PATH}`
        : `Successfully imported '${IDENTITY_NAME}' into the wallet at ${WALLET_PATH}`
    );
    console.log(`This identity uses the current credentials of 'User1@org1.example.com'.`);

  } catch (error) {
    console.error('Failed to create wallet:', error);
    process.exit(1);
  }
}

main();
