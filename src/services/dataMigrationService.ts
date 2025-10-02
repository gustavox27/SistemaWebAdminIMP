import { supabaseService } from './supabaseService';
import { dataExportService, ExportData } from './dataExportService';
import { processImportedPrinters } from '../utils/predictions';

export interface MigrationResult {
  success: boolean;
  error?: string;
  warnings: string[];
  migratedRecords: number;
  skippedRecords: number;
  version: string;
}

export interface ImportOptions {
  mergeMode: boolean; // true = merge, false = replace
  skipValidation: boolean;
}

class DataMigrationService {
  private readonly CURRENT_VERSION = '2.0';

  async importAndMigrateData(file: File, options: ImportOptions): Promise<MigrationResult> {
    try {
      console.log('🔄 Iniciando proceso de importación...');
      console.log('📁 Archivo:', file.name, '- Tamaño:', (file.size / 1024).toFixed(2), 'KB');
      console.log('⚙️ Opciones:', options);

      // Leer el archivo
      console.log('📖 Leyendo archivo...');
      const fileContent = await this.readFile(file);
      console.log('✅ Archivo leído exitosamente');

      console.log('🔍 Parseando JSON...');
      const importData: ExportData = JSON.parse(fileContent);
      console.log('✅ JSON parseado exitosamente');
      console.log('📊 Datos detectados:', {
        version: importData.version,
        exportDate: importData.exportDate,
        totalRecords: importData.metadata?.totalRecords || 0
      });

      // Validar estructura básica
      console.log('🔍 Validando estructura del archivo...');
      if (!this.validateBasicStructure(importData)) {
        console.error('❌ Estructura inválida');
        return {
          success: false,
          error: 'El archivo no tiene una estructura válida',
          warnings: [],
          migratedRecords: 0,
          skippedRecords: 0,
          version: 'unknown'
        };
      }
      console.log('✅ Estructura válida');

      // Validar checksum si no se omite la validación
      if (!options.skipValidation) {
        console.log('🔒 Validando checksum...');
        const isValidChecksum = await dataExportService.validateChecksum(importData);
        console.log('Checksum válido:', isValidChecksum);
        if (!isValidChecksum) {
          console.error('❌ Checksum inválido');
          return {
            success: false,
            error: 'El archivo está corrupto o ha sido modificado (checksum inválido)',
            warnings: [],
            migratedRecords: 0,
            skippedRecords: 0,
            version: importData.version || 'unknown'
          };
        }
        console.log('✅ Checksum válido');
      } else {
        console.log('⚠️ Validación de checksum omitida');
      }

      // Obtener información de versión
      console.log('📋 Obteniendo información de versión...');
      const versionInfo = dataExportService.getVersionInfo(importData);
      console.log('Versión detectada:', versionInfo.version);
      console.log('¿Compatible?:', versionInfo.isCompatible);
      console.log('¿Necesita migración?:', versionInfo.needsMigration);

      if (!versionInfo.isCompatible) {
        console.error('❌ Versión incompatible:', versionInfo.version);
        return {
          success: false,
          error: `Versión ${versionInfo.version} no es compatible con esta versión del sistema`,
          warnings: [],
          migratedRecords: 0,
          skippedRecords: 0,
          version: versionInfo.version
        };
      }

      // Migrar datos si es necesario
      let migratedData = importData;
      const warnings: string[] = [];

      if (versionInfo.needsMigration) {
        console.log('🔄 Aplicando migración desde', versionInfo.version, 'a', this.CURRENT_VERSION);
        const migrationResult = await this.migrateData(importData);
        migratedData = migrationResult.data;
        warnings.push(...migrationResult.warnings);
        console.log('✅ Migración completada');
        console.log('⚠️ Advertencias:', warnings);
      } else {
        console.log('✅ No se requiere migración');
      }

      // Importar datos
      console.log('💾 Iniciando importación de datos...');
      const importResult = await this.importData(migratedData, options);
      console.log('✅ Importación completada');
      console.log('📊 Resultados:', {
        importedRecords: importResult.importedRecords,
        skippedRecords: importResult.skippedRecords,
        warnings: importResult.warnings.length
      });

      const result = {
        success: true,
        warnings: [...warnings, ...importResult.warnings],
        migratedRecords: importResult.importedRecords,
        skippedRecords: importResult.skippedRecords,
        version: versionInfo.version
      };

      console.log('🎉 Proceso de importación completado exitosamente');
      console.log('📊 Resultado final:', result);

      return result;

    } catch (error) {
      console.error('❌ Error durante el proceso de importación:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No disponible');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido durante la importación',
        warnings: [],
        migratedRecords: 0,
        skippedRecords: 0,
        version: 'unknown'
      };
    }
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  }

  private validateBasicStructure(data: any): data is ExportData {
    return (
      data &&
      typeof data === 'object' &&
      data.data &&
      typeof data.data === 'object' &&
      Array.isArray(data.data.printers)
    );
  }

  private async migrateData(importData: ExportData): Promise<{ data: ExportData; warnings: string[] }> {
    const warnings: string[] = [];
    const version = importData.version || '1.0';

    let migratedData = { ...importData };

    // Migración desde v1.0 a v2.0
    if (version === '1.0') {
      migratedData = await this.migrateFromV1ToV2(migratedData, warnings);
    }

    // Migración desde v1.1 a v2.0
    if (version === '1.1') {
      migratedData = await this.migrateFromV11ToV2(migratedData, warnings);
    }

    // Migración desde v1.2 a v2.0
    if (version === '1.2') {
      migratedData = await this.migrateFromV12ToV2(migratedData, warnings);
    }

    // Actualizar versión
    migratedData.version = this.CURRENT_VERSION;
    migratedData.metadata.appVersion = this.CURRENT_VERSION;

    return { data: migratedData, warnings };
  }

  private async migrateFromV1ToV2(data: ExportData, warnings: string[]): Promise<ExportData> {
    const migratedData = { ...data };

    // Inicializar userPreferences si no existe
    if (!migratedData.userPreferences) {
      migratedData.userPreferences = {
        dailyReportPrinters: [],
        defaultPrintersTab: null,
        copiedTickets: []
      };
    }

    // Migrar impresoras: agregar campos nuevos de v2.0
    migratedData.data.printers = data.data.printers.map((printer: any) => ({
      ...printer,
      hasBackupToner: printer.hasBackupToner || false,
      motorCyclePending: printer.motorCyclePending || false,
      tonerModel: printer.tonerModel || 'W9004mc', // Valor por defecto
      updatedAt: printer.updatedAt || new Date().toISOString(),
      createdAt: printer.createdAt || new Date().toISOString()
    }));

    // Migrar inventario: agregar campos de préstamos
    migratedData.data.inventory = data.data.inventory.map((item: any) => ({
      ...item,
      onLoan: false, // Campo obsoleto en v2.0, pero mantenemos compatibilidad
      loanMessage: '', // Campo obsoleto en v2.0
      updatedAt: item.updatedAt || new Date().toISOString(),
      createdAt: item.createdAt || new Date().toISOString()
    }));

    // Inicializar nuevas colecciones si no existen
    if (!migratedData.data.loans) {
      migratedData.data.loans = [];
    }

    if (!migratedData.data.emptyToners) {
      migratedData.data.emptyToners = [];
    }

    if (!migratedData.data.fuserModels) {
      migratedData.data.fuserModels = [];
    }

    if (!migratedData.data.printerFusers) {
      migratedData.data.printerFusers = [];
    }

    if (!migratedData.data.tickets) {
      migratedData.data.tickets = [];
    }

    if (!migratedData.data.ticketTemplates) {
      migratedData.data.ticketTemplates = [];
    }

    // Migrar cambios: agregar campos nuevos
    migratedData.data.changes = data.data.changes.map((change: any) => ({
      ...change,
      isBackup: change.isBackup || false,
      motorCyclePending: change.motorCyclePending || false,
      createdAt: change.createdAt || change.changeDate
    }));

    // Migrar pedidos: agregar campos nuevos
    migratedData.data.orders = data.data.orders.map((order: any) => ({
      ...order,
      emailSent: order.emailSent || false,
      updatedAt: order.updatedAt || new Date().toISOString()
    }));

    warnings.push('Datos migrados desde v1.0 - Se agregaron campos nuevos con valores por defecto');
    return migratedData;
  }

  private async migrateFromV11ToV2(data: ExportData, warnings: string[]): Promise<ExportData> {
    // Migración incremental desde v1.1
    const migratedData = { ...data };

    // Inicializar userPreferences si no existe
    if (!migratedData.userPreferences) {
      migratedData.userPreferences = {
        dailyReportPrinters: [],
        defaultPrintersTab: null,
        copiedTickets: []
      };
    }

    // Aplicar cambios específicos de v1.1 a v2.0
    migratedData.data.printers = data.data.printers.map((printer: any) => ({
      ...printer,
      motorCyclePending: printer.motorCyclePending || false,
      updatedAt: printer.updatedAt || new Date().toISOString()
    }));

    warnings.push('Datos migrados desde v1.1 - Actualizaciones menores aplicadas');
    return migratedData;
  }

  private async migrateFromV12ToV2(data: ExportData, warnings: string[]): Promise<ExportData> {
    // Migración incremental desde v1.2
    const migratedData = { ...data };

    // Inicializar userPreferences si no existe
    if (!migratedData.userPreferences) {
      migratedData.userPreferences = {
        dailyReportPrinters: [],
        defaultPrintersTab: null,
        copiedTickets: []
      };
    }

    // Cambios mínimos ya que v1.2 es muy similar a v2.0
    warnings.push('Datos migrados desde v1.2 - Migración mínima requerida');
    return migratedData;
  }

  private async importData(data: ExportData, options: ImportOptions): Promise<{ importedRecords: number; skippedRecords: number; warnings: string[] }> {
    console.log('🔧 Inicializando servicio de Supabase...');
    await supabaseService.init();
    console.log('✅ Servicio inicializado');

    let importedRecords = 0;
    let skippedRecords = 0;
    const warnings: string[] = [];

    try {
      // Si no es modo merge, limpiar datos existentes
      if (!options.mergeMode) {
        console.log('🗑️ Modo reemplazo: eliminando datos existentes...');
        await this.clearAllData();
        console.log('✅ Datos existentes eliminados');
        warnings.push('Datos existentes eliminados (modo reemplazo)');
      } else {
        console.log('🔀 Modo combinación: fusionando con datos existentes');
      }

      // Procesar impresoras con actualizaciones automáticas antes de importar
      console.log('🖨️ Procesando impresoras...');
      if (data.data.printers && data.data.printers.length > 0) {
        const processedPrinters = processImportedPrinters(data.data.printers);
        data.data.printers = processedPrinters;

        const updatedCount = processedPrinters.filter((p, index) =>
          Math.abs(data.data.printers[index].currentTonerLevel - p.currentTonerLevel) > 0.1
        ).length;

        if (updatedCount > 0) {
          console.log(`✅ ${updatedCount} impresora(s) actualizadas`);
          warnings.push(`${updatedCount} impresora(s) con niveles de toner actualizados automáticamente durante la importación`);
        }
      } else {
        console.log('ℹ️ No hay impresoras para procesar');
      }

      // Importar cada colección
      const collections = [
        'printers', 'inventory', 'orders', 'changes',
        'loans', 'emptyToners', 'users', 'operators', 'tonerModels',
        'fuserModels', 'printerFusers', 'tickets', 'ticketTemplates'
      ];

      console.log('📦 Importando colecciones...');
      for (const collection of collections) {
        const records = data.data[collection as keyof typeof data.data] || [];
        console.log(`  📋 ${collection}: ${records.length} registro(s)`);

        if (records.length === 0) {
          console.log(`  ℹ️ ${collection}: Sin datos para importar`);
          continue;
        }

        let collectionImported = 0;
        let collectionSkipped = 0;

        try {
          if (options.mergeMode) {
            // En modo merge, procesar registro por registro
            console.log(`  🔀 Procesando en modo merge...`);
            for (const record of records) {
              try {
                const existing = await supabaseService.get(collection, record.id);
                if (existing) {
                  await supabaseService.update(collection, record);
                } else {
                  await supabaseService.add(collection, record);
                }
                importedRecords++;
                collectionImported++;
              } catch (error) {
                console.error(`  ❌ Error importando registro en ${collection}:`, error);
                skippedRecords++;
                collectionSkipped++;
              }
            }
          } else {
            // En modo reemplazo, usar importación por lotes (mucho más rápido)
            console.log(`  🚀 Importando en lotes de 100 registros...`);
            const BATCH_SIZE = 100;
            const totalBatches = Math.ceil(records.length / BATCH_SIZE);

            for (let i = 0; i < totalBatches; i++) {
              const start = i * BATCH_SIZE;
              const end = Math.min(start + BATCH_SIZE, records.length);
              const batch = records.slice(start, end);

              try {
                console.log(`  📦 Lote ${i + 1}/${totalBatches}: ${batch.length} registros`);
                await supabaseService.addBatch(collection, batch);
                const batchCount = batch.length;
                importedRecords += batchCount;
                collectionImported += batchCount;
                console.log(`  ✅ Lote ${i + 1}/${totalBatches} importado exitosamente`);
              } catch (error) {
                console.error(`  ❌ Error importando lote ${i + 1} en ${collection}:`, error);
                console.error(`  📝 Detalles del error:`, error instanceof Error ? error.message : 'Error desconocido');
                // Intentar importar uno por uno para identificar registros problemáticos
                console.log(`  🔄 Intentando importar registros individualmente...`);
                for (const record of batch) {
                  try {
                    await supabaseService.add(collection, record);
                    importedRecords++;
                    collectionImported++;
                  } catch (recordError) {
                    console.error(`  ❌ Error en registro individual:`, recordError);
                    skippedRecords++;
                    collectionSkipped++;
                  }
                }
              }
            }
          }

          console.log(`  ✅ ${collection}: ${collectionImported} importados, ${collectionSkipped} omitidos`);
        } catch (error) {
          console.error(`  ❌ Error procesando colección ${collection}:`, error);
          console.error(`  📝 Stack trace:`, error instanceof Error ? error.stack : 'No disponible');
          skippedRecords += records.length;
          collectionSkipped = records.length;
          console.log(`  ⚠️ ${collection}: Colección omitida por error crítico`);
        }
      }

      console.log('✅ Todas las colecciones importadas');
      console.log('📊 Total: ', importedRecords, 'importados,', skippedRecords, 'omitidos');

      // Importar preferencias de usuario
      if (data.userPreferences) {
        console.log('⚙️ Restaurando preferencias de usuario...');

        // Restaurar impresoras del reporte diario
        if (data.userPreferences.dailyReportPrinters && data.userPreferences.dailyReportPrinters.length > 0) {
          localStorage.setItem('dailyReportPrinters', JSON.stringify(data.userPreferences.dailyReportPrinters));
          console.log(`  ✅ ${data.userPreferences.dailyReportPrinters.length} impresoras del reporte diario restauradas`);
          warnings.push(`${data.userPreferences.dailyReportPrinters.length} impresoras restauradas en el Reporte Diario`);
        }

        // Restaurar pestaña predeterminada
        if (data.userPreferences.defaultPrintersTab) {
          localStorage.setItem('defaultPrintersTab', data.userPreferences.defaultPrintersTab);
          console.log(`  ✅ Pestaña predeterminada restaurada: ${data.userPreferences.defaultPrintersTab}`);
        }

        // Restaurar tickets copiados
        if (data.userPreferences.copiedTickets && data.userPreferences.copiedTickets.length > 0) {
          localStorage.setItem('copiedTickets', JSON.stringify(data.userPreferences.copiedTickets));
          console.log(`  ✅ ${data.userPreferences.copiedTickets.length} tickets copiados restaurados`);
        }

        console.log('✅ Preferencias de usuario restauradas');
      } else {
        console.log('ℹ️ No hay preferencias de usuario para restaurar');
      }

      // Actualizar el store de Zustand
      console.log('🔄 Actualizando store...');
      await this.refreshStoreData();
      console.log('✅ Store actualizado');

    } catch (error) {
      console.error('❌ Error durante la importación:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No disponible');
      throw new Error('Error durante la importación de datos');
    }

    return { importedRecords, skippedRecords, warnings };
  }

  private async clearAllData(): Promise<void> {
    const collections = [
      'printers', 'inventory', 'orders', 'changes',
      'loans', 'emptyToners', 'users', 'operators', 'tonerModels',
      'fuserModels', 'printerFusers', 'tickets', 'ticketTemplates'
    ];

    console.log('🗑️ Limpiando todas las colecciones...');
    for (const collection of collections) {
      console.log(`  🗑️ Limpiando ${collection}...`);
      await supabaseService.clear(collection);
    }
    console.log('✅ Todas las colecciones limpiadas');
  }

  private async refreshStoreData(): Promise<void> {
    // Esta función se ejecutará después de la importación
      // Esta función se ejecutará después de la importación
      // El store se actualizará cuando se recargue la página
      console.log('Data import completed - page will reload to refresh store');
  }

  async deleteAllData(): Promise<void> {
    await this.clearAllData();
  }
}

export const dataMigrationService = new DataMigrationService();