import * as fs from 'fs';
import * as path from 'path';
import { Wallets } from 'fabric-network';

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

async function main() {
  try {
    // 1. Create a new file system based wallet
    const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
    console.log(`Wallet path: ${WALLET_PATH}`);

    // 2. Check if the appUser identity already exists
    const identityExists = await wallet.get(IDENTITY_NAME);
    if (identityExists) {
      console.log(`An identity for '${IDENTITY_NAME}' already exists in the wallet.`);
      return;
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
    const identity = {
      credentials: {
        certificate: certificate,
        privateKey: privateKey,
      },
      mspId: MSP_ID,
      type: 'X.509',
    };

    // 6. Add the identity to the wallet
    await wallet.put(IDENTITY_NAME, identity);

    console.log(`Successfully imported '${IDENTITY_NAME}' into the wallet at ${WALLET_PATH}`);
    console.log(`This identity uses the credentials of 'User1@org1.example.com'.`);

  } catch (error) {
    console.error('Failed to create wallet:', error);
    process.exit(1);
  }
}

main();