import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Database,
  Shield,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File, options: { mergeMode: boolean; skipValidation: boolean }) => Promise<void>;
  currentDataStats: {
    total: number;
  };
}

interface ProgressState {
  stage: 'idle' | 'reading' | 'validating' | 'migrating' | 'importing' | 'complete' | 'error';
  message: string;
  percentage: number;
  details?: string;
}

export default function ImportDataModal({ isOpen, onClose, onConfirm, currentDataStats }: ImportDataModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [skipValidation, setSkipValidation] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
    percentage: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Intentar leer información básica del archivo
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      setFileInfo({
        version: data.version || 'Desconocida',
        exportDate: data.exportDate ? new Date(data.exportDate).toLocaleDateString('es-ES') : 'Desconocida',
        totalRecords: data.metadata?.totalRecords || 0,
        appName: data.metadata?.appName || 'Sistema de Impresoras'
      });
    } catch (error) {
      setFileInfo({
        version: 'Error',
        exportDate: 'No disponible',
        totalRecords: 0,
        appName: 'Archivo inválido'
      });
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;

    setIsImporting(true);

    try {
      setProgress({
        stage: 'reading',
        message: 'Leyendo archivo...',
        percentage: 10,
        details: 'Cargando datos del archivo JSON'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress({
        stage: 'validating',
        message: 'Validando estructura...',
        percentage: 30,
        details: skipValidation ? 'Validación omitida' : 'Verificando integridad de datos'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress({
        stage: 'migrating',
        message: 'Procesando datos...',
        percentage: 50,
        details: 'Aplicando migraciones y transformaciones'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress({
        stage: 'importing',
        message: mergeMode ? 'Combinando datos...' : 'Reemplazando datos...',
        percentage: 70,
        details: `${fileInfo?.totalRecords || 0} registros en proceso`
      });

      await onConfirm(selectedFile, { mergeMode, skipValidation });

      setProgress({
        stage: 'complete',
        message: 'Importación completada',
        percentage: 100,
        details: 'Recargando aplicación...'
      });

    } catch (error) {
      setProgress({
        stage: 'error',
        message: 'Error durante la importación',
        percentage: 0,
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileInfo(null);
    setMergeMode(false);
    setSkipValidation(false);
    setProgress({
      stage: 'idle',
      message: '',
      percentage: 0
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      resetForm();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Upload size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Importar Datos del Sistema</h2>
                    <p className="text-blue-100">Restaurar información desde respaldo</p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                  disabled={isImporting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col max-h-[75vh]">
              <div className="p-6 overflow-y-auto flex-1">
              {/* Advertencia si hay datos existentes */}
              {currentDataStats.total > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">Datos Existentes Detectados</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Actualmente tienes <strong>{currentDataStats.total} registros</strong> en el sistema. 
                    Puedes elegir combinar los datos o reemplazarlos completamente.
                  </p>
                </div>
              )}

              {/* Selección de archivo */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Archivo de Respaldo</h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  
                  {!selectedFile ? (
                    <>
                      <p className="text-gray-600 mb-4">
                        Selecciona un archivo de respaldo (.json) para importar
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Seleccionar Archivo
                      </button>
                    </>
                  ) : (
                    <div className="text-left">
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-medium text-green-800">Archivo Seleccionado</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nombre:</span>
                            <span className="font-medium truncate ml-2">{selectedFile.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tamaño:</span>
                            <span className="font-medium">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                          </div>
                          {fileInfo && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Versión:</span>
                                <span className="font-medium">{fileInfo.version}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Fecha de Exportación:</span>
                                <span className="font-medium">{fileInfo.exportDate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Registros:</span>
                                <span className="font-medium">{fileInfo.totalRecords}</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <button
                          onClick={() => {
                            resetForm();
                          }}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Seleccionar otro archivo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Opciones de importación */}
              {selectedFile && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Opciones de Importación</h3>
                  
                  <div className="space-y-4">
                    {/* Modo de importación */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Modo de Importación</h4>
                      
                      <div className="space-y-3">
                        <label className="flex items-start">
                          <input
                            type="radio"
                            name="importMode"
                            checked={!mergeMode}
                            onChange={() => setMergeMode(false)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Reemplazar Datos</div>
                            <div className="text-sm text-gray-600">
                              Elimina todos los datos actuales y los reemplaza con los del archivo
                            </div>
                          </div>
                        </label>
                        
                        <label className="flex items-start">
                          <input
                            type="radio"
                            name="importMode"
                            checked={mergeMode}
                            onChange={() => setMergeMode(true)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">Combinar Datos</div>
                            <div className="text-sm text-gray-600">
                              Mantiene los datos actuales y agrega/actualiza con los del archivo
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Validación */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={skipValidation}
                          onChange={(e) => setSkipValidation(e.target.checked)}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Omitir Validación de Integridad</div>
                          <div className="text-sm text-gray-600">
                            Solo usar si el archivo es confiable pero falla la validación
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Información sobre migración */}
              {selectedFile && fileInfo && fileInfo.version !== '2.0' && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                  <div className="flex items-center mb-2">
                    <RefreshCw className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Migración Automática</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    El archivo es de la versión <strong>{fileInfo.version}</strong>. 
                    Se aplicará migración automática a la versión 2.0 durante la importación.
                  </p>
                </div>
              )}

              {/* Barra de progreso durante importación */}
              {isImporting && (
                <div className="mb-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Loader2 className="animate-spin h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">{progress.message}</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">{progress.percentage}%</span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          progress.stage === 'error' ? 'bg-red-500' :
                          progress.stage === 'complete' ? 'bg-green-500' :
                          'bg-blue-500'
                        }`}
                      />
                    </div>

                    {progress.details && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        {progress.details}
                      </p>
                    )}

                    {/* Indicadores de etapa */}
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      {['reading', 'validating', 'migrating', 'importing', 'complete'].map((stage, index) => {
                        const stageNames = {
                          reading: 'Leyendo',
                          validating: 'Validando',
                          migrating: 'Migrando',
                          importing: 'Importando',
                          complete: 'Completo'
                        };
                        const isActive = progress.stage === stage;
                        const isComplete = ['reading', 'validating', 'migrating', 'importing', 'complete'].indexOf(progress.stage) > index;

                        return (
                          <div key={stage} className="text-center">
                            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${
                              isActive ? 'bg-blue-500 text-white animate-pulse' :
                              isComplete ? 'bg-green-500 text-white' :
                              'bg-gray-200 text-gray-500'
                            }`}>
                              {isComplete ? '✓' : index + 1}
                            </div>
                            <p className={`text-xs ${
                              isActive || isComplete ? 'text-gray-900 font-medium' : 'text-gray-500'
                            }`}>
                              {stageNames[stage as keyof typeof stageNames]}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Características del proceso */}
              {!isImporting && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Proceso de Importación</h3>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-700">
                      <Shield size={16} className="mr-3 text-blue-500" />
                      <span>Validación de integridad del archivo</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Database size={16} className="mr-3 text-green-500" />
                      <span>Migración automática entre versiones</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle size={16} className="mr-3 text-green-500" />
                      <span>Verificación de compatibilidad</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <RefreshCw size={16} className="mr-3 text-orange-500" />
                      <span>Actualización automática de la interfaz</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

              {/* Footer with buttons */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    disabled={isImporting}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedFile || isImporting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Importar Datos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}