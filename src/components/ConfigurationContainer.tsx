import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Cloud
} from 'lucide-react';
import { useStore } from '../store/useStore';
import ExportDataModal from './modals/ExportDataModal';
import ImportDataModal from './modals/ImportDataModal';
import DeleteAllDataModal from './modals/DeleteAllDataModal';
import MigrateToSupabaseModal from './modals/MigrateToSupabaseModal';
import { dataExportService } from '../services/dataExportService';
import { dataMigrationService } from '../services/dataMigrationService';
import { localToSupabaseMigration } from '../services/localToSupabaseMigration';
import toast from 'react-hot-toast';

export default function ConfigurationContainer() {
  const {
    printers,
    inventory,
    orders,
    changes,
    loans,
    emptyToners,
    users,
    operators,
    tonerModels
  } = useStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    const checkLocalData = async () => {
      const exists = await localToSupabaseMigration.checkLocalDataExists();
      setHasLocalData(exists);
    };
    checkLocalData();
  }, []);

  // Calcular estadísticas de datos
  const dataStats = {
    printers: printers.length,
    inventory: inventory.length,
    orders: orders.length,
    changes: changes.length,
    loans: loans.length,
    emptyToners: emptyToners.length,
    users: users.length,
    operators: operators.length,
    tonerModels: tonerModels.length,
    total: printers.length + inventory.length + orders.length + changes.length + 
           loans.length + emptyToners.length + users.length + operators.length + tonerModels.length
  };

  const handleExportData = async () => {
    try {
      const exportData = await dataExportService.exportAllData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sistema-impresoras-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Datos exportados exitosamente');
      setShowExportModal(false);
    } catch (error) {
      toast.error('Error al exportar los datos');
      console.error('Export error:', error);
    }
  };

  const handleImportData = async (file: File, options: { mergeMode: boolean; skipValidation: boolean }) => {
    try {
      const result = await dataMigrationService.importAndMigrateData(file, options);
      
      if (result.success) {
        toast.success(`Datos importados exitosamente. ${result.migratedRecords} registros procesados.`);
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => toast(warning, { icon: '⚠️' }));
        }
        // Recargar la página para refrescar todos los datos
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(`Error en la importación: ${result.error}`);
      }
      
      setShowImportModal(false);
    } catch (error) {
      toast.error('Error al procesar el archivo de importación');
      console.error('Import error:', error);
      setShowImportModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Settings size={24} className="mr-3 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuración del Sistema</h2>
            <p className="text-gray-600">Gestión de datos y configuración de la aplicación</p>
          </div>
        </div>

        {/* Estadísticas de datos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{dataStats.printers}</div>
            <div className="text-xs text-blue-800">Impresoras</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{dataStats.inventory}</div>
            <div className="text-xs text-green-800">Inventario</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{dataStats.orders}</div>
            <div className="text-xs text-yellow-800">Pedidos</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{dataStats.changes}</div>
            <div className="text-xs text-purple-800">Cambios</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600">{dataStats.total}</div>
            <div className="text-xs text-gray-800">Total</div>
          </div>
        </div>
      </div>

      {hasLocalData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Cloud className="text-blue-600 mr-3" size={24} />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Datos locales detectados
              </h3>
              <p className="text-sm text-blue-800">
                Se encontraron datos almacenados localmente. Puedes migrarlos a Supabase para acceder desde cualquier dispositivo.
              </p>
            </div>
            <button
              onClick={() => setShowMigrateModal(true)}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Migrar Ahora
            </button>
          </div>
        </div>
      )}

      {/* Acciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exportar Datos */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
        >
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Download className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Exportar Datos</h3>
              <p className="text-sm text-gray-600">Crear respaldo completo</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle size={16} className="mr-2 text-green-500" />
              Incluye todos los registros
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={16} className="mr-2 text-blue-500" />
              Formato JSON seguro
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FileText size={16} className="mr-2 text-purple-500" />
              Compatible con versiones futuras
            </div>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            disabled={dataStats.total === 0}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Exportar Datos
          </button>
        </motion.div>

        {/* Importar Datos */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
        >
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Importar Datos</h3>
              <p className="text-sm text-gray-600">Restaurar desde respaldo</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle size={16} className="mr-2 text-green-500" />
              Migración automática
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={16} className="mr-2 text-blue-500" />
              Validación de integridad
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Database size={16} className="mr-2 text-orange-500" />
              Soporte multi-versión
            </div>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            Importar Datos
          </button>
        </motion.div>

        {/* Eliminar Todos los Datos */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-red-200"
        >
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Eliminar Datos</h3>
              <p className="text-sm text-gray-600">Limpiar toda la información</p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle size={16} className="mr-2" />
              Acción irreversible
            </div>
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle size={16} className="mr-2" />
              Elimina todos los registros
            </div>
            <div className="flex items-center text-sm text-red-600">
              <AlertTriangle size={16} className="mr-2" />
              Requiere confirmación
            </div>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={dataStats.total === 0}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Eliminar Todo
          </button>
        </motion.div>
      </div>

      {/* Información del sistema */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Versión Actual</h4>
            <p className="text-sm text-gray-600">Sistema de Gestión de Impresoras v2.0</p>
            <p className="text-xs text-gray-500 mt-1">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Almacenamiento</h4>
            <p className="text-sm text-gray-600">Supabase Cloud Database</p>
            <p className="text-xs text-gray-500 mt-1">Datos almacenados en la nube con acceso desde cualquier dispositivo</p>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ExportDataModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportData}
        dataStats={dataStats}
      />

      <ImportDataModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleImportData}
        currentDataStats={dataStats}
      />

      <DeleteAllDataModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        dataStats={dataStats}
      />

      <MigrateToSupabaseModal
        isOpen={showMigrateModal}
        onClose={() => setShowMigrateModal(false)}
        onComplete={() => {
          setShowMigrateModal(false);
          setHasLocalData(false);
        }}
      />
    </div>
  );
}