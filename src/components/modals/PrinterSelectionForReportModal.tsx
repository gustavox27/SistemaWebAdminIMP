import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  Building, 
  Printer, 
  Check, 
  Trash2,
  Plus,
  Eye
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Printer as PrinterType } from '../../types';

interface PrinterSelectionForReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPrinters: PrinterType[]) => void;
  initialSelectedPrinters: PrinterType[];
}

export default function PrinterSelectionForReportModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialSelectedPrinters 
}: PrinterSelectionForReportModalProps) {
  const { printers } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSedeTab, setActiveSedeTab] = useState('all');
  const [selectedPrinters, setSelectedPrinters] = useState<PrinterType[]>(initialSelectedPrinters);

  // Agrupar impresoras por sede
  const printersBySede = useMemo(() => {
    const grouped = printers.reduce((acc, printer) => {
      const sede = printer.sede || 'Sin sede';
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

  // Filtrar impresoras según la sede activa
  const printersToShow = useMemo(() => {
    if (activeSedeTab === 'all') {
      return printers;
    }
    return printersBySede[activeSedeTab] || [];
  }, [printers, printersBySede, activeSedeTab]);

  const filteredPrinters = useMemo(() => {
    return printersToShow.filter(printer => 
      printer.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.ip.includes(searchTerm) ||
      (printer.hostname && printer.hostname.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [printersToShow, searchTerm]);

  const handlePrinterToggle = (printer: PrinterType) => {
    const isSelected = selectedPrinters.some(p => p.id === printer.id);
    
    if (isSelected) {
      setSelectedPrinters(prev => prev.filter(p => p.id !== printer.id));
    } else {
      setSelectedPrinters(prev => [...prev, printer]);
    }
  };

  const handleRemoveFromPreview = (printerId: string) => {
    setSelectedPrinters(prev => prev.filter(p => p.id !== printerId));
  };

  const handleConfirm = () => {
    // Filtrar solo las impresoras que realmente existen en el sistema
    const validSelectedPrinters = selectedPrinters.filter(selectedPrinter => 
      printers.some(systemPrinter => systemPrinter.id === selectedPrinter.id)
    );
    
    onConfirm(validSelectedPrinters);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
                    <Printer size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Impresoras en el Sistema</h2>
                    <p className="text-indigo-100 mt-1">Selecciona las impresoras para incluir en el reporte</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{printers.length}</div>
                  <div className="text-sm opacity-90">Total</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{filteredPrinters.length}</div>
                  <div className="text-sm opacity-90">Filtradas</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{selectedPrinters.length}</div>
                  <div className="text-sm opacity-90">Seleccionadas</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{availableSedes.length}</div>
                  <div className="text-sm opacity-90">Sedes</div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por modelo, ubicación, serie, IP o hostname..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Tabs por Sede */}
              <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <nav className="flex space-x-8 px-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveSedeTab('all')}
                    className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeSedeTab === 'all'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Todas las Sedes</span>
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                        {printers.length}
                      </span>
                    </div>
                  </button>
                  {availableSedes.map((sede) => (
                    <button
                      key={sede}
                      onClick={() => setActiveSedeTab(sede)}
                      className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeSedeTab === sede
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Building size={16} />
                        <span>{sede}</span>
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          {printersBySede[sede]?.length || 0}
                        </span>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Printers Table */}
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seleccionar
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Modelo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ubicación
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Serie
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          HostName
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPrinters.map((printer, index) => {
                        const isSelected = selectedPrinters.some(p => p.id === printer.id);
                        
                        return (
                          <motion.tr
                            key={printer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                            }`}
                            onDoubleClick={() => handlePrinterToggle(printer)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handlePrinterToggle(printer)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{printer.model}</div>
                              <div className="text-sm text-gray-500">{printer.brand}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {printer.location}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {printer.ip}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {printer.serial}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {printer.hostname || 'No definido'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                printer.status === 'operativa' ? 'bg-green-100 text-green-800' :
                                printer.status === 'disponible' ? 'bg-blue-100 text-blue-800' :
                                printer.status === 'backup' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {printer.status}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredPrinters.length === 0 && (
                    <div className="text-center py-12">
                      <Printer className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron impresoras</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {printersToShow.length === 0 ? 
                          (activeSedeTab === 'all' ? 'No hay impresoras registradas' : `No hay impresoras en la sede "${activeSedeTab}"`) : 
                          'Intenta con otros términos de búsqueda'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Printers Preview */}
              {selectedPrinters.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Eye size={20} className="mr-2 text-indigo-600" />
                      Vista Previa - Impresoras Seleccionadas ({selectedPrinters.length})
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {selectedPrinters.map((printer) => (
                      <div key={printer.id} className="bg-white border border-indigo-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm truncate">{printer.model}</h4>
                            <p className="text-xs text-gray-600 truncate">{printer.location}</p>
                            <p className="text-xs text-indigo-600">{printer.ip}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveFromPreview(printer.id)}
                            className="text-red-500 hover:text-red-700 transition-colors ml-2"
                            title="Eliminar de la selección"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {selectedPrinters.length} impresora(s) seleccionada(s) para el reporte
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Agregar Impresoras para Reporte
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