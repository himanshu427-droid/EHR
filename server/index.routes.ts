import type { Express} from 'express';
import { createServer, type Server } from 'http';
import authRouter from './routes/auth.routes';
import recordsRouter from './routes/records.routes';
import labRouter from './routes/lab.routes';
import insuranceRouter from './routes/insurance.routes';
import accessRouter from './routes/access.routes';
import adminRouter from './routes/admin.routes';
import blockchainRouter from './routes/blockchain.routes';
import researcherRouter from './routes/researcher.routes';


export async function registerRoutes(app: Express): Promise<Server> {
  app.use('/api/auth', authRouter);
  app.use('/api/records', recordsRouter);
  app.use('/api/lab', labRouter);
  app.use('/api/insurance', insuranceRouter);
  app.use('/api/access', accessRouter); 
  app.use('/api/admin', adminRouter);
  app.use('/api/blockchain', blockchainRouter);
  app.use('/api/researcher', researcherRouter);


  const httpServer = createServer(app);
  return httpServer;
}

