# MediChain EHR - Decentralized Electronic Health Record System

A complete MERN + Hyperledger Fabric application for managing electronic health records on a permissioned blockchain network.

## 🌐 Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS + Wouter + TanStack Query
- **Backend**: Node.js + Express + JWT Authentication
- **Blockchain**: Hyperledger Fabric 2.5
- **Database**: MongoDB 7
- **Deployment**: Docker + Docker Compose

## 👥 User Roles

The system supports 6 distinct user roles, each with specific permissions:

1. **Patient**: View and share health records, manage consent
2. **Doctor**: Create prescriptions, view patient records (with consent)
3. **Lab/Diagnostics**: Upload lab reports
4. **Hospital Admin**: Manage users, verify blockchain data integrity
5. **Insurance Company**: Review and approve claims
6. **Researcher**: Access anonymized medical datasets

## 🔗 Features

- ✅ JWT-based authentication for all roles
- ✅ Blockchain logging for all record operations
- ✅ Smart contract functions: `addRecord`, `getRecordHistory`, `grantAccess`, `revokeAccess`
- ✅ File upload system with cryptographic hashing
- ✅ Role-based dashboards and permissions
- ✅ Consent management system
- ✅ Blockchain verification interface
- ✅ Complete audit trail

## 📦 Prerequisites

### For Replit Development
- Node.js 20+
- npm or yarn

### For Local Deployment with Hyperledger Fabric
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+
- Git
- **Hyperledger Fabric** fabric-samples repository

## 🚀 Quick Start (Replit - Development Mode)

The application is configured to run on Replit without Docker using:
- **In-memory storage** instead of MongoDB
- **Blockchain simulation service** instead of Hyperledger Fabric

This allows you to test all features without infrastructure setup. All blockchain operations are simulated but behave identically to the production Fabric implementation.

1. The workflow automatically starts with `npm run dev`
2. Access the application at the Replit URL
3. Register a new account with any role
4. Login and explore the dashboard
5. All features work including blockchain logging and verification

**Note:** For production deployment with real Hyperledger Fabric, see the "Local Deployment with Hyperledger Fabric" section below.

## 🐳 Local Deployment with Docker (Without Fabric)

Run the complete stack using Docker Compose:

```bash
# Clone the repository
git clone <your-repo-url>
cd medichain-ehr

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

## ⛓️ Local Deployment with Hyperledger Fabric

### Step 1: Set Up Hyperledger Fabric Network

1. **Clone fabric-samples repository:**

```bash
cd ~
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/test-network
```

2. **Download Fabric binaries and Docker images:**

```bash
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
```

3. **Start the test network:**

```bash
./network.sh up createChannel -c ehrchannel -ca
```

This command:
- Starts the Fabric network with 2 organizations (Org1, Org2)
- Creates 1 orderer node
- Creates 2 peer nodes (one per organization)
- Creates a channel named `ehrchannel`
- Starts Certificate Authorities

4. **Verify the network is running:**

```bash
docker ps
```

You should see containers for:
- `peer0.org1.example.com`
- `peer0.org2.example.com`
- `orderer.example.com`
- `ca_org1` and `ca_org2`

### Step 2: Deploy the Chaincode

1. **Copy chaincode to fabric-samples:**

```bash
# From your project directory
cp -r chaincode ~/fabric-samples/test-network/chaincode/ehr
```

2. **Package the chaincode:**

```bash
cd ~/fabric-samples/test-network
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/

peer lifecycle chaincode package ehr.tar.gz \
  --path ../chaincode/ehr \
  --lang node \
  --label ehr_1.0
```

3. **Install chaincode on Org1 peer:**

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install ehr.tar.gz
```

4. **Install chaincode on Org2 peer:**

```bash
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install ehr.tar.gz
```

5. **Query installed chaincode to get package ID:**

```bash
peer lifecycle chaincode queryinstalled
```

Copy the Package ID (format: `ehr_1.0:hash`)

6. **Approve chaincode for Org1:**

```bash
export CC_PACKAGE_ID=<your-package-id>

export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID ehrchannel \
  --name ehr \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

7. **Approve chaincode for Org2:**

```bash
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID ehrchannel \
  --name ehr \
  --version 1.0 \
  --package-id $CC_PACKAGE_ID \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

8. **Check commit readiness:**

```bash
peer lifecycle chaincode checkcommitreadiness \
  --channelID ehrchannel \
  --name ehr \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --output json
```

9. **Commit the chaincode:**

```bash
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
```

10. **Verify chaincode is committed:**

```bash
peer lifecycle chaincode querycommitted \
  --channelID ehrchannel \
  --name ehr \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

### Step 3: Configure Backend to Use Fabric

1. **Update backend environment variables:**

Create a `.env` file in your project root:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ehr_db
JWT_SECRET=your-secret-key-change-in-production
USE_FABRIC=true
FABRIC_NETWORK_PATH=./server/fabric/network-config.yaml
FABRIC_CHANNEL_NAME=ehrchannel
FABRIC_CHAINCODE_NAME=ehr
FABRIC_MSP_ID=Org1MSP
FABRIC_WALLET_PATH=./fabric-wallet
FABRIC_USER=admin
```

2. **Replace the blockchain simulation with real Fabric SDK:**

Update `server/fabric/blockchain.ts` to use the actual `fabric-network` SDK:

```typescript
import { Gateway, Wallets } from 'fabric-network';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load connection profile
const ccpPath = resolve(__dirname, 'network-config.yaml');
const ccp = JSON.parse(readFileSync(ccpPath, 'utf8'));

// Connect to Fabric gateway and submit transactions
```

### Step 4: Start the Application

1. **Start MongoDB:**

```bash
docker run -d -p 27017:27017 --name ehr-mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:7
```

2. **Start the backend:**

```bash
npm install
npm run dev
```

3. **Start the frontend (separate terminal):**

```bash
cd client
npm run build
npx serve -s dist -p 3000
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Fabric Network: Running locally via fabric-samples

### Step 5: Test the Integration

1. Register a new patient account
2. Upload a health record
3. Check the blockchain audit log - you should see real Fabric transaction IDs
4. Verify the transaction on Fabric:

```bash
cd ~/fabric-samples/test-network
peer chaincode query \
  -C ehrchannel \
  -n ehr \
  -c '{"function":"getRecordHistory","Args":["<patient-id>"]}' \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
```

## 🧹 Cleanup

### Stop Docker services:
```bash
docker-compose down -v
```

### Stop Fabric network:
```bash
cd ~/fabric-samples/test-network
./network.sh down
```

## 📁 Project Structure

```
├── chaincode/              # Hyperledger Fabric smart contracts
│   ├── ehr_contract.js    # Main chaincode implementation
│   ├── index.js
│   └── package.json
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components (dashboards, forms)
│   │   ├── components/    # Reusable UI components
│   │   └── lib/           # Utilities and auth
├── server/                 # Express backend
│   ├── fabric/            # Blockchain integration
│   │   ├── blockchain.ts  # Blockchain service
│   │   └── network-config.yaml
│   ├── middleware/        # Auth middleware
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data storage interface
├── shared/                 # Shared types and schemas
│   └── schema.ts
├── docker-compose.yml      # Docker orchestration
├── Dockerfile.frontend
├── Dockerfile.backend
└── README.md
```

## 🔐 Security

- JWT tokens with 7-day expiration
- Bcrypt password hashing (10 rounds)
- File upload size limits (10MB)
- CORS configuration
- Blockchain-based audit logging
- Permission-based access control

## 🤝 Contributing

This is an MVP prototype. For production deployment:

1. Use proper certificate management for Fabric
2. Implement IPFS for distributed file storage
3. Add comprehensive error handling
4. Set up monitoring and alerting
5. Configure production-grade databases
6. Implement rate limiting and DDoS protection

## 📄 License

This project is for educational purposes.

## 🆘 Troubleshooting

### Fabric network won't start
- Ensure Docker is running: `docker ps`
- Check port conflicts: `lsof -i :7050,7051,9051`
- Clean up old containers: `docker system prune -a`

### Chaincode deployment fails
- Verify Node.js version in chaincode: `node --version`
- Check chaincode syntax: `cd chaincode && npm install`
- Review peer logs: `docker logs peer0.org1.example.com`

### Backend can't connect to Fabric
- Verify network-config.yaml paths
- Check peer addresses are accessible
- Ensure wallet directory has proper permissions

### MongoDB connection issues
- Verify MongoDB is running: `docker ps | grep mongo`
- Check connection string in environment variables
- Test connection: `mongosh mongodb://admin:password123@localhost:27017`

## 📞 Support

For issues specific to:
- **Hyperledger Fabric**: [Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- **Docker**: [Docker Documentation](https://docs.docker.com/)
- **This Project**: Open an issue in the repository

---

Built with ❤️ for decentralized healthcare
