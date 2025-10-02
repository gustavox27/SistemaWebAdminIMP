import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Printer,
  MapPin,
  Type,
  Building
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Printer as PrinterType } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface MassDeleteBySedeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MassDeleteBySede({ isOpen, onClose }: MassDeleteBySedeProps) {
  const { printers, deletePrinter } = useStore();
  const [activeTab, setActiveTab] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSedes, setSelectedSedes] = useState<string[]>([]);

  const CONFIRMATION_PHRASE = 'ELIMINAR IMPRESORAS';

  // Agrupar impresoras por sede
  const printersBySede = useMemo(() => {
    const grouped = printers.reduce((acc, printer) => {
      const sede = printer.sede || 'Sin sede definida';
      if (!acc[sede]) {
        acc[sede] = [];
      }
      acc[sede].push(printer);
      return acc;
    }, {} as Record<string, PrinterType[]>);
    
    return grouped;
  }, [printers]);

  // Obtener lista de sedes disponibles
  const availableSedes = useMemo(() => {
    const sedes = Object.keys(printersBySede).sort();
    return sedes;
  }, [printersBySede]);

  // Establecer tab activo inicial
  React.useEffect(() => {
    if (availableSedes.length > 0 && !activeTab) {
      setActiveTab(availableSedes[0]);
    }
  }, [availableSedes, activeTab]);

  const isConfirmationValid = confirmationText === CONFIRMATION_PHRASE;

  const handleSedeSelection = (sede: string, checked: boolean) => {
    if (checked) {
      setSelectedSedes(prev => [...prev, sede]);
    } else {
      setSelectedSedes(prev => prev.filter(s => s !== sede));
    }
  };

  const totalSelectedPrinters = selectedSedes.reduce((sum, sede) => {
    return sum + (printersBySede[sede]?.length || 0);
  }, 0);

  const getSedeDetails = (sede: string) => {
    const sedeprinters = printersBySede[sede] || [];
    return {
      printers: sedeprinters,
      summary: `${sedeprinters.length} impresora${sedeprinters.length !== 1 ? 's' : ''} en ${sede}`,
      operativas: sedeprinters.filter(p => p.status === 'operativa').length,
      disponibles: sedeprinters.filter(p => p.status === 'disponible').length,
      backup: sedeprinters.filter(p => p.status === 'backup').length,
      retiradas: sedeprinters.filter(p => p.status === 'retirada').length
    };
  };

  const handleConfirm = async () => {
    if (!isConfirmationValid || selectedSedes.length === 0) return;

    setIsDeleting(true);
    try {
      let deletedCount = 0;

      for (const sede of selectedSedes) {
        const sedeprinters = printersBySede[sede] || [];
        
        for (const printer of sedeprinters) {
          await supabaseService.delete('printers', printer.id);
          deletePrinter(printer.id);
          deletedCount++;
        }
      }

      toast.success(`${deletedCount} impresora(s) eliminada(s) exitosamente de ${selectedSedes.length} sede(s)`);
      onClose();
    } catch (error) {
      toast.error('Error al eliminar las impresoras');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('');
      setSelectedSedes([]);
      setActiveTab('');
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
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trash2 size={24} className="mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold">Eliminación Masiva por Sede</h2>
                    <p className="text-red-100 text-sm">Selecciona las sedes de impresoras a eliminar</p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-50 border-b border-red-200 p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <span className="font-bold text-red-800">¡ADVERTENCIA CRÍTICA!</span>
                  <p className="text-red-700 text-xs">
                    Esta acción eliminará PERMANENTEMENTE todas las impresoras de las sedes seleccionadas. NO HAY FORMA DE RECUPERARLAS.
                  </p>
                </div>
              </div>
            </div>

            {/* Content - Scroll padre para todo el modal */}
            <div className="flex-1 overflow-y-auto max-h-[calc(85vh-200px)]">
              {/* Sede Selection */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Seleccionar Sedes a Eliminar
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableSedes.map((sede) => {
                    const sedeDetails = getSedeDetails(sede);
                    return (
                      <label
                        key={sede}
                        className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedSedes.includes(sede)
                            ? 'bg-red-50 border-red-200 shadow-md'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSedes.includes(sede)}
                          onChange={(e) => handleSedeSelection(sede, e.target.checked)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-2 w-full">
                          <div className={`p-2 rounded-lg ${selectedSedes.includes(sede) ? 'bg-white' : 'bg-blue-50'}`}>
                            <Building size={16} className="text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{sede}</div>
                            <div className="text-xs text-gray-600">{sedeDetails.printers.length} impresoras</div>
                            <div className="text-xs text-gray-500">
                              {sedeDetails.operativas > 0 && `${sedeDetails.operativas} operativas`}
                              {sedeDetails.disponibles > 0 && ` • ${sedeDetails.disponibles} disponibles`}
                              {sedeDetails.backup > 0 && ` • ${sedeDetails.backup} backup`}
                              {sedeDetails.retiradas > 0 && ` • ${sedeDetails.retiradas} retiradas`}
                            </div>
                          </div>
                          {selectedSedes.includes(sede) && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <X size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {selectedSedes.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Sedes seleccionadas:</strong> {selectedSedes.length} de {availableSedes.length}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Total de impresoras a eliminar:</strong> {totalSelectedPrinters}
                    </p>
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                <nav className="flex space-x-1 px-4 overflow-x-auto">
                  {availableSedes.filter(sede => selectedSedes.includes(sede)).map((sede) => (
                    <button
                      key={sede}
                      onClick={() => setActiveTab(sede)}
                      className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                        activeTab === sede
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Building size={14} />
                      <span>{sede}</span>
                      <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full">
                        {printersBySede[sede]?.length || 0}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {selectedSedes.includes(activeTab) && (
                  <div>
                    <div className="mb-4">
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <div className="flex items-center mb-3">
                          <Building size={18} className="text-red-600 mr-2" />
                          <h4 className="font-bold text-gray-900">{activeTab}</h4>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {getSedeDetails(activeTab).summary}
                        </p>
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          <div className="bg-green-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-green-600">{getSedeDetails(activeTab).operativas}</div>
                            <div className="text-xs text-green-800">Operativas</div>
                          </div>
                          <div className="bg-blue-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-blue-600">{getSedeDetails(activeTab).disponibles}</div>
                            <div className="text-xs text-blue-800">Disponibles</div>
                          </div>
                          <div className="bg-yellow-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-yellow-600">{getSedeDetails(activeTab).backup}</div>
                            <div className="text-xs text-yellow-800">Backup</div>
                          </div>
                          <div className="bg-gray-100 p-2 rounded text-center">
                            <div className="text-sm font-bold text-gray-600">{getSedeDetails(activeTab).retiradas}</div>
                            <div className="text-xs text-gray-800">Retiradas</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Printers List */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Impresoras a eliminar en {activeTab}:
                      </h5>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {getSedeDetails(activeTab).printers.slice(0, 20).map((printer, index) => (
                          <div key={printer.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                            <div className="flex items-center space-x-2">
                              <Printer size={14} className="text-gray-500" />
                              <div>
                                <p className="text-xs font-medium text-gray-900">
                                  {printer.model}
                                </p>
                                <p className="text-xs text-gray-600 truncate max-w-48">
                                  {printer.location} - {printer.ip}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                printer.status === 'operativa' ? 'bg-green-100 text-green-800' :
                                printer.status === 'disponible' ? 'bg-blue-100 text-blue-800' :
                                printer.status === 'backup' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {printer.status}
                              </span>
                              {printer.type === 'color' && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Color
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {getSedeDetails(activeTab).printers.length > 20 && (
                          <p className="text-xs text-gray-500 font-medium text-center py-1">
                            ... y {getSedeDetails(activeTab).printers.length - 20} impresoras más
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedSedes.includes(activeTab) && (
                  <div className="text-center py-8">
                    <AlertTriangle className="mx-auto h-10 w-10 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Sede no seleccionada
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Selecciona esta sede para ver los detalles de eliminación
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation Section - Ahora dentro del scroll padre */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Confirmación Requerida</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Para confirmar que entiendes las consecuencias, escribe exactamente la siguiente frase:
                  </p>
                  
                  <div className="bg-gray-100 p-2 rounded-lg mb-3 text-center">
                    <code className="font-bold text-red-600">{CONFIRMATION_PHRASE}</code>
                  </div>
                  
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Escribe la frase de confirmación aquí"
                      className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${
                        confirmationText && !isConfirmationValid 
                          ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                          : confirmationText && isConfirmationValid
                          ? 'border-green-300 focus:ring-green-500 bg-green-50'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      disabled={isDeleting}
                    />
                  </div>
                  
                  {confirmationText && !isConfirmationValid && (
                    <p className="text-sm text-red-600 mt-2">
                      La frase no coincide. Debe ser exactamente: "{CONFIRMATION_PHRASE}"
                    </p>
                  )}
                  
                  {isConfirmationValid && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Confirmación válida
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-red-100 border border-red-300 p-3 rounded-lg mb-4">
                  <h4 className="font-bold text-red-800 mb-2">Resumen de Eliminación</h4>
                  <div className="text-sm text-red-700 space-y-1">
                    <p><strong>Sedes seleccionadas:</strong> {selectedSedes.length}</p>
                    <p><strong>Total de impresoras:</strong> {totalSelectedPrinters}</p>
                    <p><strong>Acción:</strong> Eliminación permanente e irreversible</p>
                    {selectedSedes.length > 0 && (
                      <div className="mt-1">
                        <p><strong>Sedes afectadas:</strong></p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 text-xs">
                          {selectedSedes.map(sede => (
                            <li key={sede}>
                              {sede}: {printersBySede[sede]?.length || 0} impresora(s)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons - Ahora dentro del scroll padre */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-300">
                  <button
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!isConfirmationValid || isDeleting || selectedSedes.length === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        ELIMINAR SELECCIONADAS
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