import { supabaseService } from './supabaseService';

export interface ExportData {
  version: string;
  exportDate: string;
  metadata: {
    appName: string;
    appVersion: string;
    totalRecords: number;
    exportedBy: string;
  };
  data: {
    printers: any[];
    inventory: any[];
    orders: any[];
    changes: any[];
    loans: any[];
    emptyToners: any[];
    users: any[];
    operators: any[];
    tonerModels: any[];
    fuserModels: any[];
    printerFusers: any[];
    tickets: any[];
    ticketTemplates: any[];
  };
  userPreferences: {
    dailyReportPrinters: any[];
    dailyReportData: any[];
    defaultPrintersTab: string | null;
    copiedTickets: string[];
  };
  checksum: string;
}

class DataExportService {
  private readonly CURRENT_VERSION = '2.0';
  private readonly APP_NAME = 'Sistema de Gestión de Impresoras';

  async exportAllData(): Promise<ExportData> {
    try {
      console.log('📦 Iniciando exportación completa de datos...');
      await supabaseService.init();

      // Obtener todos los datos de Supabase
      console.log('💾 Obteniendo datos de Supabase...');
      const [
        printers,
        inventory,
        orders,
        changes,
        loans,
        emptyToners,
        users,
        operators,
        tonerModels,
        fuserModels,
        printerFusers,
        tickets,
        ticketTemplates
      ] = await Promise.all([
        supabaseService.getAll('printers'),
        supabaseService.getAll('inventory'),
        supabaseService.getAll('orders'),
        supabaseService.getAll('changes'),
        supabaseService.getAll('loans'),
        supabaseService.getAll('emptyToners'),
        supabaseService.getAll('users'),
        supabaseService.getAll('operators'),
        supabaseService.getAll('tonerModels'),
        supabaseService.getAll('fuserModels'),
        supabaseService.getAll('printerFusers'),
        supabaseService.getAll('tickets'),
        supabaseService.getAll('ticketTemplates')
      ]);

      console.log('✅ Datos de Supabase obtenidos:', {
        printers: printers.length,
        inventory: inventory.length,
        orders: orders.length,
        changes: changes.length,
        loans: loans.length,
        emptyToners: emptyToners.length,
        users: users.length,
        operators: operators.length,
        tonerModels: tonerModels.length,
        fuserModels: fuserModels.length,
        printerFusers: printerFusers.length,
        tickets: tickets.length,
        ticketTemplates: ticketTemplates.length
      });

      // Obtener datos de localStorage (preferencias de usuario)
      console.log('💾 Obteniendo preferencias de usuario desde localStorage...');
      const dailyReportPrinters = this.getLocalStorageData('dailyReportPrinters', []);
      const dailyReportData = dailyReportPrinters;
      const defaultPrintersTab = this.getLocalStorageData('defaultPrintersTab', null);
      const copiedTickets = this.getLocalStorageData('copiedTickets', []);

      console.log('✅ Preferencias de usuario obtenidas:', {
        dailyReportPrinters: dailyReportPrinters.length,
        dailyReportData: dailyReportData.length,
        defaultPrintersTab: defaultPrintersTab || 'ninguna',
        copiedTickets: copiedTickets.length
      });

      const data = {
        printers,
        inventory,
        orders,
        changes,
        loans,
        emptyToners,
        users,
        operators,
        tonerModels,
        fuserModels,
        printerFusers,
        tickets,
        ticketTemplates
      };

      const userPreferences = {
        dailyReportPrinters,
        dailyReportData,
        defaultPrintersTab,
        copiedTickets
      };

      const totalRecords = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
      const totalPreferences = dailyReportPrinters.length + dailyReportData.length + copiedTickets.length + (defaultPrintersTab ? 1 : 0);

      console.log('📊 Total de registros:', totalRecords);
      console.log('📊 Total de preferencias:', totalPreferences);

      const exportData: ExportData = {
        version: this.CURRENT_VERSION,
        exportDate: new Date().toISOString(),
        metadata: {
          appName: this.APP_NAME,
          appVersion: this.CURRENT_VERSION,
          totalRecords: totalRecords + totalPreferences,
          exportedBy: 'Sistema Local'
        },
        data,
        userPreferences,
        checksum: ''
      };

      // Generar checksum para validación de integridad
      console.log('🔒 Generando checksum...');
      exportData.checksum = await this.generateChecksum(exportData);
      console.log('✅ Checksum generado:', exportData.checksum.substring(0, 16) + '...');

      console.log('🎉 Exportación completada exitosamente');
      return exportData;
    } catch (error) {
      console.error('❌ Error durante la exportación:', error);
      throw new Error('Error al exportar los datos del sistema');
    }
  }

  private getLocalStorageData<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  }

  private async generateChecksum(data: Omit<ExportData, 'checksum'>): Promise<string> {
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback para navegadores que no soportan crypto.subtle
      return this.simpleHash(dataString);
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async validateChecksum(exportData: ExportData): Promise<boolean> {
    try {
      const { checksum, ...dataWithoutChecksum } = exportData;
      const calculatedChecksum = await this.generateChecksum(dataWithoutChecksum);
      return checksum === calculatedChecksum;
    } catch (error) {
      console.error('Error validating checksum:', error);
      return false;
    }
  }

  getVersionInfo(exportData: ExportData): { version: string; isCompatible: boolean; needsMigration: boolean } {
    const version = exportData.version || '1.0';
    const isCompatible = this.isVersionCompatible(version);
    const needsMigration = version !== this.CURRENT_VERSION;

    return {
      version,
      isCompatible,
      needsMigration
    };
  }

  private isVersionCompatible(version: string): boolean {
    const supportedVersions = ['1.0', '1.1', '1.2', '2.0'];
    return supportedVersions.includes(version);
  }
}

export const dataExportService = new DataExportService();