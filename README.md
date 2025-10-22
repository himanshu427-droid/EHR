# 🏥 MediChain EHR - Decentralized Electronic Health Record System

A complete **MERN + Hyperledger Fabric** application for managing electronic health records on a permissioned blockchain network.

---

## 🌐 Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS + Wouter + TanStack Query  
- **Backend**: Node.js + Express + JWT Authentication  
- **Blockchain**: Hyperledger Fabric 2.5  
- **Database**: MongoDB 7  
- **Deployment**: Docker + Docker Compose

---

## 👥 User Roles

The system supports **6 distinct user roles**, each with specific permissions:

1. **Patient** — View and share health records, manage consent  
2. **Doctor** — Create prescriptions, view patient records (with consent)  
3. **Lab/Diagnostics** — Upload lab reports  
4. **Hospital Admin** — Manage users, verify blockchain data integrity  
5. **Insurance Company** — Review and approve claims  
6. **Researcher** — Access anonymized medical datasets

---

## 🔗 Features

- ✅ JWT-based authentication for all roles  
- ✅ Blockchain logging for all record operations  
- ✅ Smart contract functions: `addRecord`, `getRecordHistory`, `grantAccess`, `revokeAccess`  
- ✅ File upload system with cryptographic hashing  
- ✅ Role-based dashboards and permissions  
- ✅ Consent management system  
- ✅ Blockchain verification interface  
- ✅ Complete audit trail

---

## 📦 Prerequisites

### For Replit Development
- Node.js 20+
- npm or yarn

### For Local Deployment with Hyperledger Fabric
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+
- Git
- Hyperledger Fabric `fabric-samples` repository

---

## 🚀 Quick Start (Replit - Development Mode)

The app is configured to run on **Replit** without Docker using:
- In-memory storage instead of MongoDB  
- Blockchain simulation instead of Fabric  

This allows full testing without infrastructure setup — all blockchain operations are simulated but mimic Fabric behavior.

**Steps:**
1. Run `npm run dev`  
2. Access the app at your Replit URL  
3. Register a new account with any role  
4. Login and explore the dashboard  
5. All features work, including simulated blockchain verification  

> **Note:** For production deployment with real Hyperledger Fabric, see below.

---

## 🐳 Local Deployment with Docker (Without Fabric)

```bash
# Clone the repository
git clone <your-repo-url>
cd medichain-ehr

# Create .env file
cp .env.example .env

# Generate JWT secret
openssl rand -base64 32
# Add this to .env:
# JWT_SECRET=<your-secret>

# Build and run services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
Access the application:

Frontend → http://localhost:3000

Backend API → http://localhost:5000

MongoDB → localhost:27017

⛓️ Local Deployment with Hyperledger Fabric
Step 1: Set Up Fabric Network
bash
Copy code
cd ~
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/test-network
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
./network.sh up createChannel -c ehrchannel -ca
Verify network:

bash
Copy code
docker ps
You should see peers, orderers, and certificate authorities running.

Step 2: Deploy Chaincode
bash
Copy code
# Copy chaincode
cp -r chaincode ~/fabric-samples/test-network/chaincode/ehr

# Package chaincode
cd ~/fabric-samples/test-network
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/

peer lifecycle chaincode package ehr.tar.gz \
  --path ../chaincode/ehr \
  --lang node \
  --label ehr_1.0
Install on Org1:

bash
Copy code
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
peer lifecycle chaincode install ehr.tar.gz
Install on Org2:

bash
Copy code
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051
peer lifecycle chaincode install ehr.tar.gz
Query and approve chaincode:

bash
Copy code
peer lifecycle chaincode queryinstalled
Copy the Package ID and approve for both Orgs using approveformyorg.

Commit and verify:

bash
Copy code
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID ehrchannel \
  --name ehr \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
Step 3: Configure Backend for Fabric
Create .env in project root:

env
Copy code
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ehr_db
JWT_SECRET=<your-generated-secret>
USE_FABRIC=true
FABRIC_NETWORK_PATH=./server/fabric/network-config.yaml
FABRIC_CHANNEL_NAME=ehrchannel
FABRIC_CHAINCODE_NAME=ehr
FABRIC_MSP_ID=Org1MSP
FABRIC_WALLET_PATH=./fabric-wallet
FABRIC_USER=admin
Backend Fabric integration (server/fabric/blockchain.ts):

typescript
Copy code
import { Gateway, Wallets } from 'fabric-network';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ccpPath = resolve(__dirname, 'network-config.yaml');
const ccp = JSON.parse(readFileSync(ccpPath, 'utf8'));

// Connect to Fabric Gateway and submit transactions
Step 4: Start the Application
bash
Copy code
# Start MongoDB
docker run -d -p 27017:27017 --name ehr-mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:7

# Start backend
npm install
npm run dev

# Start frontend
cd client
npm run build
npx serve -s dist -p 3000
Access:

Frontend → http://localhost:3000

Backend → http://localhost:5000

Fabric Network → Running locally via fabric-samples

Step 5: Test the Integration
bash
Copy code
cd ~/fabric-samples/test-network
peer chaincode query \
  -C ehrchannel \
  -n ehr \
  -c '{"function":"getRecordHistory","Args":["<patient-id>"]}' \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
🧹 Cleanup
bash
Copy code
# Stop Docker
docker-compose down -v

# Stop Fabric
cd ~/fabric-samples/test-network
./network.sh down
📁 Project Structure
graphql
Copy code
├── chaincode/              # Hyperledger Fabric smart contracts
│   ├── ehr_contract.js
│   ├── index.js
│   └── package.json
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/
├── server/                 # Express backend
│   ├── fabric/
│   │   ├── blockchain.ts
│   │   └── network-config.yaml
│   ├── middleware/
│   ├── routes.ts
│   └── storage.ts
├── shared/                 # Shared types and schemas
│   └── schema.ts
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.backend
└── README.md
🔐 Security
JWT tokens with 7-day expiration

Bcrypt password hashing (10 rounds)

File upload limits (10MB)

CORS configuration

Blockchain audit logs

Permission-based access control

Setup:

bash
Copy code
openssl rand -base64 32
export JWT_SECRET="your-secret"
Never commit secrets. Use .env and environment variables only.

🤝 Contributing
For production deployment:

Implement proper certificate management

Use IPFS for file storage

Add monitoring & alerting

Improve error handling

Harden Fabric and MongoDB configs

📄 License
This project is for educational purposes only.

🆘 Troubleshooting
Fabric not starting
Check Docker is running: docker ps

Resolve port conflicts: lsof -i :7050,7051,9051

Clean up old containers: docker system prune -a

Chaincode deployment fails
Validate Node.js version in chaincode

Run npm install inside chaincode/

Check peer logs: docker logs peer0.org1.example.com

Backend connection issues
Verify network-config.yaml paths

Ensure peers are reachable

Wallet permissions are correct

MongoDB issues
Check with docker ps | grep mongo

Verify connection string in .env

Test: mongosh mongodb://admin:password123@localhost:27017

📞 Support
Hyperledger Fabric Docs: https://hyperledger-fabric.readthedocs.io

Docker Docs: https://docs.docker.com

Project Issues: Open an issue in the repo

Built with ❤️ for decentralized healthcare.
