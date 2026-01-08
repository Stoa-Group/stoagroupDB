import { Request, Response, NextFunction } from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database';

// ============================================================
// UNDER CONTRACT CONTROLLER
// ============================================================

export const getAllUnderContracts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT uc.*, p.ProjectName
      FROM pipeline.UnderContract uc
      LEFT JOIN core.Project p ON uc.ProjectId = p.ProjectId
      ORDER BY uc.UnderContractId
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    next(error);
  }
};

export const getUnderContractById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM pipeline.UnderContract WHERE UnderContractId = @id');
    
    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Under Contract record not found' } });
      return;
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    next(error);
  }
};

export const createUnderContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      ProjectId, Location, Region, Acreage, Units, Price, PricePerSF,
      ExecutionDate, DueDiligenceDate, ClosingDate, PurchasingEntity,
      CashFlag, OpportunityZone, ExtensionNotes
    } = req.body;

    if (!ProjectId) {
      res.status(400).json({ success: false, error: { message: 'ProjectId is required' } });
      return;
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ProjectId', sql.Int, ProjectId)
      .input('Location', sql.NVarChar, Location)
      .input('Region', sql.NVarChar, Region)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('Units', sql.Int, Units)
      .input('Price', sql.Decimal(18, 2), Price)
      .input('PricePerSF', sql.Decimal(18, 2), PricePerSF)
      .input('ExecutionDate', sql.Date, ExecutionDate)
      .input('DueDiligenceDate', sql.Date, DueDiligenceDate)
      .input('ClosingDate', sql.Date, ClosingDate)
      .input('PurchasingEntity', sql.NVarChar, PurchasingEntity)
      .input('CashFlag', sql.Bit, CashFlag)
      .input('OpportunityZone', sql.Bit, OpportunityZone)
      .input('ExtensionNotes', sql.NVarChar(sql.MAX), ExtensionNotes)
      .query(`
        INSERT INTO pipeline.UnderContract (
          ProjectId, Location, Region, Acreage, Units, Price, PricePerSF,
          ExecutionDate, DueDiligenceDate, ClosingDate, PurchasingEntity,
          CashFlag, OpportunityZone, ExtensionNotes
        )
        OUTPUT INSERTED.*
        VALUES (
          @ProjectId, @Location, @Region, @Acreage, @Units, @Price, @PricePerSF,
          @ExecutionDate, @DueDiligenceDate, @ClosingDate, @PurchasingEntity,
          @CashFlag, @OpportunityZone, @ExtensionNotes
        )
      `);

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 2627) {
      res.status(409).json({ success: false, error: { message: 'Under Contract record for this project already exists' } });
      return;
    }
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const updateUnderContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      ProjectId, Location, Region, Acreage, Units, Price, PricePerSF,
      ExecutionDate, DueDiligenceDate, ClosingDate, PurchasingEntity,
      CashFlag, OpportunityZone, ExtensionNotes
    } = req.body;

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('ProjectId', sql.Int, ProjectId)
      .input('Location', sql.NVarChar, Location)
      .input('Region', sql.NVarChar, Region)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('Units', sql.Int, Units)
      .input('Price', sql.Decimal(18, 2), Price)
      .input('PricePerSF', sql.Decimal(18, 2), PricePerSF)
      .input('ExecutionDate', sql.Date, ExecutionDate)
      .input('DueDiligenceDate', sql.Date, DueDiligenceDate)
      .input('ClosingDate', sql.Date, ClosingDate)
      .input('PurchasingEntity', sql.NVarChar, PurchasingEntity)
      .input('CashFlag', sql.Bit, CashFlag)
      .input('OpportunityZone', sql.Bit, OpportunityZone)
      .input('ExtensionNotes', sql.NVarChar(sql.MAX), ExtensionNotes)
      .query(`
        UPDATE pipeline.UnderContract
        SET ProjectId = @ProjectId, Location = @Location, Region = @Region,
            Acreage = @Acreage, Units = @Units, Price = @Price, PricePerSF = @PricePerSF,
            ExecutionDate = @ExecutionDate, DueDiligenceDate = @DueDiligenceDate,
            ClosingDate = @ClosingDate, PurchasingEntity = @PurchasingEntity,
            CashFlag = @CashFlag, OpportunityZone = @OpportunityZone, ExtensionNotes = @ExtensionNotes
        OUTPUT INSERTED.*
        WHERE UnderContractId = @id
      `);

    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Under Contract record not found' } });
      return;
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const deleteUnderContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM pipeline.UnderContract WHERE UnderContractId = @id');

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ success: false, error: { message: 'Under Contract record not found' } });
      return;
    }

    res.json({ success: true, message: 'Under Contract record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// COMMERCIAL LISTED CONTROLLER
// ============================================================

export const getAllCommercialListed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT cl.*, p.ProjectName
      FROM pipeline.CommercialListed cl
      LEFT JOIN core.Project p ON cl.ProjectId = p.ProjectId
      ORDER BY cl.CommercialListedId
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    next(error);
  }
};

export const getCommercialListedById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM pipeline.CommercialListed WHERE CommercialListedId = @id');
    
    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Commercial Listed record not found' } });
      return;
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    next(error);
  }
};

export const createCommercialListed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      ProjectId, Location, ListedDate, Acreage, Price, Status,
      DueDiligenceDate, ClosingDate, Owner, PurchasingEntity, Broker, Notes
    } = req.body;

    if (!ProjectId) {
      res.status(400).json({ success: false, error: { message: 'ProjectId is required' } });
      return;
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ProjectId', sql.Int, ProjectId)
      .input('Location', sql.NVarChar, Location)
      .input('ListedDate', sql.Date, ListedDate)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('Price', sql.Decimal(18, 2), Price)
      .input('Status', sql.NVarChar, Status)
      .input('DueDiligenceDate', sql.Date, DueDiligenceDate)
      .input('ClosingDate', sql.Date, ClosingDate)
      .input('Owner', sql.NVarChar, Owner)
      .input('PurchasingEntity', sql.NVarChar, PurchasingEntity)
      .input('Broker', sql.NVarChar, Broker)
      .input('Notes', sql.NVarChar(sql.MAX), Notes)
      .query(`
        INSERT INTO pipeline.CommercialListed (
          ProjectId, Location, ListedDate, Acreage, Price, Status,
          DueDiligenceDate, ClosingDate, Owner, PurchasingEntity, Broker, Notes
        )
        OUTPUT INSERTED.*
        VALUES (
          @ProjectId, @Location, @ListedDate, @Acreage, @Price, @Status,
          @DueDiligenceDate, @ClosingDate, @Owner, @PurchasingEntity, @Broker, @Notes
        )
      `);

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 2627) {
      res.status(409).json({ success: false, error: { message: 'Commercial Listed record for this project already exists' } });
      return;
    }
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const updateCommercialListed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      ProjectId, Location, ListedDate, Acreage, Price, Status,
      DueDiligenceDate, ClosingDate, Owner, PurchasingEntity, Broker, Notes
    } = req.body;

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('ProjectId', sql.Int, ProjectId)
      .input('Location', sql.NVarChar, Location)
      .input('ListedDate', sql.Date, ListedDate)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('Price', sql.Decimal(18, 2), Price)
      .input('Status', sql.NVarChar, Status)
      .input('DueDiligenceDate', sql.Date, DueDiligenceDate)
      .input('ClosingDate', sql.Date, ClosingDate)
      .input('Owner', sql.NVarChar, Owner)
      .input('PurchasingEntity', sql.NVarChar, PurchasingEntity)
      .input('Broker', sql.NVarChar, Broker)
      .input('Notes', sql.NVarChar(sql.MAX), Notes)
      .query(`
        UPDATE pipeline.CommercialListed
        SET ProjectId = @ProjectId, Location = @Location, ListedDate = @ListedDate,
            Acreage = @Acreage, Price = @Price, Status = @Status,
            DueDiligenceDate = @DueDiligenceDate, ClosingDate = @ClosingDate,
            Owner = @Owner, PurchasingEntity = @PurchasingEntity, Broker = @Broker, Notes = @Notes
        OUTPUT INSERTED.*
        WHERE CommercialListedId = @id
      `);

    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Commercial Listed record not found' } });
      return;
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const deleteCommercialListed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM pipeline.CommercialListed WHERE CommercialListedId = @id');

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ success: false, error: { message: 'Commercial Listed record not found' } });
      return;
    }

    res.json({ success: true, message: 'Commercial Listed record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// COMMERCIAL ACREAGE CONTROLLER
// ============================================================

export const getAllCommercialAcreage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ca.*, p.ProjectName
      FROM pipeline.CommercialAcreage ca
      LEFT JOIN core.Project p ON ca.ProjectId = p.ProjectId
      ORDER BY ca.CommercialAcreageId
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    next(error);
  }
};

export const getCommercialAcreageById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM pipeline.CommercialAcreage WHERE CommercialAcreageId = @id');
    
    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Commercial Acreage record not found' } });
      return;
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    next(error);
  }
};

export const createCommercialAcreage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ProjectId, Location, Acreage, SquareFootage, BuildingFootprintSF } = req.body;

    if (!ProjectId) {
      res.status(400).json({ success: false, error: { message: 'ProjectId is required' } });
      return;
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ProjectId', sql.Int, ProjectId)
      .input('Location', sql.NVarChar, Location)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('SquareFootage', sql.Decimal(18, 2), SquareFootage)
      .input('BuildingFootprintSF', sql.Decimal(18, 2), BuildingFootprintSF)
      .query(`
        INSERT INTO pipeline.CommercialAcreage (ProjectId, Location, Acreage, SquareFootage, BuildingFootprintSF)
        OUTPUT INSERTED.*
        VALUES (@ProjectId, @Location, @Acreage, @SquareFootage, @BuildingFootprintSF)
      `);

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 2627) {
      res.status(409).json({ success: false, error: { message: 'Commercial Acreage record for this project already exists' } });
      return;
    }
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const updateCommercialAcreage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { ProjectId, Location, Acreage, SquareFootage, BuildingFootprintSF } = req.body;

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('ProjectId', sql.Int, ProjectId)
      .input('Location', sql.NVarChar, Location)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('SquareFootage', sql.Decimal(18, 2), SquareFootage)
      .input('BuildingFootprintSF', sql.Decimal(18, 2), BuildingFootprintSF)
      .query(`
        UPDATE pipeline.CommercialAcreage
        SET ProjectId = @ProjectId, Location = @Location, Acreage = @Acreage,
            SquareFootage = @SquareFootage, BuildingFootprintSF = @BuildingFootprintSF
        OUTPUT INSERTED.*
        WHERE CommercialAcreageId = @id
      `);

    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Commercial Acreage record not found' } });
      return;
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const deleteCommercialAcreage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM pipeline.CommercialAcreage WHERE CommercialAcreageId = @id');

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ success: false, error: { message: 'Commercial Acreage record not found' } });
      return;
    }

    res.json({ success: true, message: 'Commercial Acreage record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CLOSED PROPERTY CONTROLLER
// ============================================================

export const getAllClosedProperties = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT cp.*, p.ProjectName
      FROM pipeline.ClosedProperty cp
      LEFT JOIN core.Project p ON cp.ProjectId = p.ProjectId
      ORDER BY cp.ClosedPropertyId
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    next(error);
  }
};

export const getClosedPropertyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM pipeline.ClosedProperty WHERE ClosedPropertyId = @id');
    
    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Closed Property record not found' } });
      return;
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    next(error);
  }
};

export const createClosedProperty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      ProjectId, Status, ClosingDate, Location, Address, Acreage,
      Units, Price, PricePerSF, ActOfSale, DueDiligenceDate,
      PurchasingEntity, CashFlag
    } = req.body;

    if (!ProjectId) {
      res.status(400).json({ success: false, error: { message: 'ProjectId is required' } });
      return;
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ProjectId', sql.Int, ProjectId)
      .input('Status', sql.NVarChar, Status)
      .input('ClosingDate', sql.Date, ClosingDate)
      .input('Location', sql.NVarChar, Location)
      .input('Address', sql.NVarChar(500), Address)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('Units', sql.Int, Units)
      .input('Price', sql.Decimal(18, 2), Price)
      .input('PricePerSF', sql.Decimal(18, 2), PricePerSF)
      .input('ActOfSale', sql.NVarChar, ActOfSale)
      .input('DueDiligenceDate', sql.Date, DueDiligenceDate)
      .input('PurchasingEntity', sql.NVarChar, PurchasingEntity)
      .input('CashFlag', sql.Bit, CashFlag)
      .query(`
        INSERT INTO pipeline.ClosedProperty (
          ProjectId, Status, ClosingDate, Location, Address, Acreage,
          Units, Price, PricePerSF, ActOfSale, DueDiligenceDate,
          PurchasingEntity, CashFlag
        )
        OUTPUT INSERTED.*
        VALUES (
          @ProjectId, @Status, @ClosingDate, @Location, @Address, @Acreage,
          @Units, @Price, @PricePerSF, @ActOfSale, @DueDiligenceDate,
          @PurchasingEntity, @CashFlag
        )
      `);

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 2627) {
      res.status(409).json({ success: false, error: { message: 'Closed Property record for this project already exists' } });
      return;
    }
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const updateClosedProperty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      ProjectId, Status, ClosingDate, Location, Address, Acreage,
      Units, Price, PricePerSF, ActOfSale, DueDiligenceDate,
      PurchasingEntity, CashFlag
    } = req.body;

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('ProjectId', sql.Int, ProjectId)
      .input('Status', sql.NVarChar, Status)
      .input('ClosingDate', sql.Date, ClosingDate)
      .input('Location', sql.NVarChar, Location)
      .input('Address', sql.NVarChar(500), Address)
      .input('Acreage', sql.Decimal(18, 4), Acreage)
      .input('Units', sql.Int, Units)
      .input('Price', sql.Decimal(18, 2), Price)
      .input('PricePerSF', sql.Decimal(18, 2), PricePerSF)
      .input('ActOfSale', sql.NVarChar, ActOfSale)
      .input('DueDiligenceDate', sql.Date, DueDiligenceDate)
      .input('PurchasingEntity', sql.NVarChar, PurchasingEntity)
      .input('CashFlag', sql.Bit, CashFlag)
      .query(`
        UPDATE pipeline.ClosedProperty
        SET ProjectId = @ProjectId, Status = @Status, ClosingDate = @ClosingDate,
            Location = @Location, Address = @Address, Acreage = @Acreage,
            Units = @Units, Price = @Price, PricePerSF = @PricePerSF,
            ActOfSale = @ActOfSale, DueDiligenceDate = @DueDiligenceDate,
            PurchasingEntity = @PurchasingEntity, CashFlag = @CashFlag
        OUTPUT INSERTED.*
        WHERE ClosedPropertyId = @id
      `);

    if (result.recordset.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Closed Property record not found' } });
      return;
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error: any) {
    if (error.number === 547) {
      res.status(400).json({ success: false, error: { message: 'Invalid ProjectId' } });
      return;
    }
    next(error);
  }
};

export const deleteClosedProperty = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM pipeline.ClosedProperty WHERE ClosedPropertyId = @id');

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ success: false, error: { message: 'Closed Property record not found' } });
      return;
    }

    res.json({ success: true, message: 'Closed Property record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

