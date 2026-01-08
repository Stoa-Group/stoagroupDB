import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import coreRoutes from './routes/coreRoutes';
import bankingRoutes from './routes/bankingRoutes';
import pipelineRoutes from './routes/pipelineRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { getConnection } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await getConnection();
    res.json({
      success: true,
      message: 'API is running and database connection is active',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'API is running but database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use('/api/core', coreRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/pipeline', pipelineRoutes);

// API Documentation endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Stoa Group Database API - Write Operations Only (Domo handles GET)',
    version: '1.0.0',
    endpoints: {
      core: {
        projects: {
          create: 'POST /api/core/projects',
          update: 'PUT /api/core/projects/:id',
        },
        banks: {
          create: 'POST /api/core/banks',
          update: 'PUT /api/core/banks/:id',
        },
        persons: {
          create: 'POST /api/core/persons',
          update: 'PUT /api/core/persons/:id',
        },
        equityPartners: {
          create: 'POST /api/core/equity-partners',
          update: 'PUT /api/core/equity-partners/:id',
        },
      },
      banking: {
        loans: {
          create: 'POST /api/banking/loans',
          update: 'PUT /api/banking/loans/:id',
        },
        dscrTests: {
          create: 'POST /api/banking/dscr-tests',
          update: 'PUT /api/banking/dscr-tests/:id',
        },
        participations: {
          create: 'POST /api/banking/participations',
          update: 'PUT /api/banking/participations/:id',
        },
        guarantees: {
          create: 'POST /api/banking/guarantees',
          update: 'PUT /api/banking/guarantees/:id',
        },
        covenants: {
          create: 'POST /api/banking/covenants',
          update: 'PUT /api/banking/covenants/:id',
        },
        liquidityRequirements: {
          create: 'POST /api/banking/liquidity-requirements',
          update: 'PUT /api/banking/liquidity-requirements/:id',
        },
        bankTargets: {
          create: 'POST /api/banking/bank-targets',
          update: 'PUT /api/banking/bank-targets/:id',
        },
        equityCommitments: {
          create: 'POST /api/banking/equity-commitments',
          update: 'PUT /api/banking/equity-commitments/:id',
        },
      },
      pipeline: {
        underContracts: {
          create: 'POST /api/pipeline/under-contracts',
          update: 'PUT /api/pipeline/under-contracts/:id',
        },
        commercialListed: {
          create: 'POST /api/pipeline/commercial-listed',
          update: 'PUT /api/pipeline/commercial-listed/:id',
        },
        commercialAcreage: {
          create: 'POST /api/pipeline/commercial-acreage',
          update: 'PUT /api/pipeline/commercial-acreage/:id',
        },
        closedProperties: {
          create: 'POST /api/pipeline/closed-properties',
          update: 'PUT /api/pipeline/closed-properties/:id',
        },
      },
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  const { closeConnection } = await import('./config/database');
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  const { closeConnection } = await import('./config/database');
  await closeConnection();
  process.exit(0);
});

export default app;

