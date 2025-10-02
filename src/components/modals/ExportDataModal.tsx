import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, CheckCircle, Database, Shield, FileText } from 'lucide-react';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dataStats: {
    printers: number;
    inventory: number;
    orders: number;
    changes: number;
    loans: number;
    emptyToners: number;
    users: number;
    operators: number;
    tonerModels: number;
    total: number;
  };
}

export default function ExportDataModal({ isOpen, onClose, onConfirm, dataStats }: ExportDataModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleConfirm = async () => {
    setIsExporting(true);
    try {
      await onConfirm();
    } finally {
      setIsExporting(false);
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
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-green-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Download size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Exportar Datos del Sistema</h2>
                    <p className="text-green-100">Crear respaldo completo de la información</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                  disabled={isExporting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col max-h-[75vh]">
              <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos a Exportar</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dataStats.printers}</div>
                    <div className="text-sm text-blue-800">Impresoras</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dataStats.inventory}</div>
                    <div className="text-sm text-green-800">Items de Inventario</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{dataStats.orders}</div>
                    <div className="text-sm text-yellow-800">Pedidos</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{dataStats.changes}</div>
                    <div className="text-sm text-purple-800">Cambios de Toner</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{dataStats.loans}</div>
                    <div className="text-sm text-orange-800">Préstamos</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{dataStats.emptyToners}</div>
                    <div className="text-sm text-red-800">Toners Vacíos</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-800">{dataStats.total}</div>
                    <div className="text-sm text-gray-600">Total de Registros</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Características del Respaldo</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle size={16} className="mr-3 text-green-500" />
                    <span>Incluye todos los datos del sistema</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Shield size={16} className="mr-3 text-blue-500" />
                    <span>Archivo JSON con validación de integridad</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Database size={16} className="mr-3 text-purple-500" />
                    <span>Compatible con versiones futuras del sistema</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <FileText size={16} className="mr-3 text-orange-500" />
                    <span>Formato legible y portable</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Información Importante</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• El archivo se descargará automáticamente</li>
                  <li>• Guarda el archivo en un lugar seguro</li>
                  <li>• El respaldo incluye información sensible del sistema</li>
                  <li>• Puedes usar este archivo para restaurar datos en el futuro</li>
                </ul>
              </div>
            </div>

              {/* Footer with buttons */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    disabled={isExporting}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isExporting || dataStats.total === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Exportar Datos
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