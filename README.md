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

### For Local Deployment with Hyperledger Fabric
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+
- Git
- **Hyperledger Fabric** fabric-samples repository
  

## ⛓️ Local Deployment with Hyperledger Fabric

### Step 1: Set Up Hyperledger Fabric Network

1. **Clone project repository:**

```bash
cd ~
git clone https://github.com/himanshu427-droid/EHR.git

```

2. **Start the test network:**

```bash
cd fabric-samples/test-network
./network.sh up createChannel -c ehrchannel -ca
```

This command:
- Starts the Fabric network with 2 organizations (Org1, Org2)
- Creates 1 orderer node
- Creates 2 peer nodes (one per organization)
- Creates a channel named `ehrchannel`
- Starts Certificate Authorities

3. **Verify the network is running:**

```bash
docker ps
```

You should see containers for:
- `peer0.org1.example.com`
- `peer0.org2.example.com`
- `orderer.example.com`
- `ca_org1` and `ca_org2`

### Step 2: Deploy the Chaincode
Go to fabric-samples/test-network, then run:
```bash
./network.sh deployCC -c ehrchannel \
                      -ccn ehr \
                      -ccv 1 \
                      -ccs 1 \
                      -ccp "Your_project_root/chaincode" \
                      -ccl javascript
```


### Step 3: Configure Backend to Use Fabric

1. **Generate and configure secrets:**

```bash
# Generate a strong JWT secret
openssl rand -base64 32
```

2. **Create `.env` file in your project root:**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ehr_db
JWT_SECRET=<your-generated-secret-from-above>
USE_FABRIC=true
FABRIC_NETWORK_PATH=./server/fabric/network-config.yaml
FABRIC_CHANNEL_NAME=ehrchannel
FABRIC_CHAINCODE_NAME=ehr
FABRIC_MSP_ID=Org1MSP
FABRIC_WALLET_PATH=./fabric-wallet
FABRIC_USER=admin
```


### Step 4: Start the Application

1. **Start backend after setting up neon connection in .env**
```bash
npm run db:generate
npm run db:push
```

2. **Start your app(frontend+backend): **

```bash
npm install
npm run dev
```

**Access:**
-App can be accessed at http://localhost:5000/


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
/ (EHR Project Root)
├── .env                  # Environment variables (DB URL, etc.)
├── README.md             # Project documentation
├── chaincode/            # Hyperledger Fabric smart contract
│   └── ehr_contract.js   # The main smart contract logic
├── client/               # React frontend application
│   ├── index.html
│   └── src/
│       ├── App.tsx       # Main app component
│       ├── components/   # Reusable UI components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Helper functions (api.ts, auth.ts)
│       ├── main.tsx      # React entry point
│       └── pages/        # All app pages (login, dashboard, etc.)
├── drizzle.config.ts     # Drizzle ORM configuration
├── drizzle/              # Generated database migration files
│   └── ...
├── fabric-samples/       # Hyperledger Fabric test network
│   └── test-network/
│       ├── network.sh    # Script to start/stop the network
│       └── ...
├── server/               # Node.js/Express backend API
│   ├── db/
│   │   ├── db.ts         # Drizzle client connection
│   │   └── schema.ts     # Drizzle database table definitions
│   ├── fabric/
│   │   └── blockchain.ts # Service for interacting with Fabric
│   ├── wallet/           # Fabric wallet for storing user certs
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # All API routes
│   └── storage.ts        # Database logic (PostgresStorage class)
├── shared/               # Code shared between frontend and backend
│   └── schema.ts         # Zod schemas and shared types
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```


## 🔐 Security

- **JWT tokens** with 7-day expiration
- **Bcrypt password hashing** (10 rounds)
- **File upload size limits** (10MB)
- **CORS configuration**
- **Blockchain-based audit logging**
- **Permission-based access control**


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
