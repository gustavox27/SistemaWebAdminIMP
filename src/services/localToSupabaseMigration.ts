import { dbService } from './indexedDB';
import { supabaseService } from './supabaseService';

export interface MigrationProgress {
  total: number;
  current: number;
  collection: string;
  status: 'in_progress' | 'completed' | 'error';
  message: string;
}

export class LocalToSupabaseMigration {
  async migrateAllData(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<{ success: boolean; message: string; errors: string[] }> {
    const errors: string[] = [];

    const collections = [
      'users',
      'operators',
      'tonerModels',
      'fuserModels',
      'printers',
      'inventory',
      'orders',
      'changes',
      'loans',
      'emptyToners',
      'printerFusers',
      'tickets',
      'ticketTemplates'
    ];

    let totalRecords = 0;
    let migratedRecords = 0;

    try {
      await dbService.init();
      await supabaseService.init();

      const collectionsData: Record<string, any[]> = {};
      for (const collection of collections) {
        try {
          const data = await dbService.getAll(collection);
          collectionsData[collection] = data;
          totalRecords += data.length;
        } catch (error) {
          console.error(`Error loading ${collection} from IndexedDB:`, error);
          errors.push(`No se pudieron cargar datos de ${collection}`);
        }
      }

      if (totalRecords === 0) {
        return {
          success: false,
          message: 'No hay datos locales para migrar',
          errors
        };
      }

      for (const collection of collections) {
        const data = collectionsData[collection] || [];

        if (data.length === 0) {
          continue;
        }

        if (onProgress) {
          onProgress({
            total: totalRecords,
            current: migratedRecords,
            collection,
            status: 'in_progress',
            message: `Migrando ${data.length} registros de ${collection}...`
          });
        }

        for (const record of data) {
          try {
            const existing = await supabaseService.get(collection, record.id);

            if (existing) {
              await supabaseService.update(collection, record);
            } else {
              await supabaseService.add(collection, record);
            }

            migratedRecords++;

            if (onProgress && migratedRecords % 10 === 0) {
              onProgress({
                total: totalRecords,
                current: migratedRecords,
                collection,
                status: 'in_progress',
                message: `Progreso: ${migratedRecords}/${totalRecords}`
              });
            }
          } catch (error) {
            console.error(`Error migrating record from ${collection}:`, error);
            errors.push(`Error en ${collection}: ${record.id}`);
          }
        }
      }

      const defaultUser = localStorage.getItem('defaultUser');
      const defaultOperator = localStorage.getItem('defaultOperator');
      const activeTab = localStorage.getItem('activeTab');

      if (defaultUser) {
        await supabaseService.setAppSetting('defaultUser', defaultUser);
      }
      if (defaultOperator) {
        await supabaseService.setAppSetting('defaultOperator', defaultOperator);
      }
      if (activeTab) {
        await supabaseService.setAppSetting('activeTab', activeTab);
      }

      if (onProgress) {
        onProgress({
          total: totalRecords,
          current: migratedRecords,
          collection: 'completed',
          status: 'completed',
          message: `Migración completada: ${migratedRecords}/${totalRecords} registros`
        });
      }

      return {
        success: true,
        message: `Migración completada exitosamente. ${migratedRecords} registros migrados.`,
        errors
      };

    } catch (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido durante la migración',
        errors
      };
    }
  }

  async checkLocalDataExists(): Promise<boolean> {
    try {
      await dbService.init();
      const printers = await dbService.getAll('printers');
      return printers.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export const localToSupabaseMigration = new LocalToSupabaseMigration();
