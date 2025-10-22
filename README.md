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
