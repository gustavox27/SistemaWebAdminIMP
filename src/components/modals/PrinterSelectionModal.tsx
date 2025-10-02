import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Building, Hand } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface PrinterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (printer: any) => void;
}

export default function PrinterSelectionModal({ isOpen, onClose, onSelect }: PrinterSelectionModalProps) {
  const { printers } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSedeTab, setActiveSedeTab] = useState('all');

  // Agrupar impresoras por sede
  const printersBySede = useMemo(() => {
    const grouped = printers.reduce((acc, printer) => {
      const sede = printer.sede || 'Sin sede';
      if (!acc[sede]) {
        acc[sede] = [];
      }
      acc[sede].push(printer);
      return acc;
    }, {} as Record<string, any[]>);
    
    return grouped;
  }, [printers]);

  // Obtener lista de sedes disponibles
  const availableSedes = useMemo(() => {
    const sedes = Object.keys(printersBySede).sort();
    // Mover 'Sin sede' al final si existe
    const sinSedeIndex = sedes.indexOf('Sin sede');
    if (sinSedeIndex > -1) {
      sedes.splice(sinSedeIndex, 1);
      sedes.push('Sin sede');
    }
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
      printer.ip.includes(searchTerm)
    );
  }, [printersToShow, searchTerm]);

  const handleSelect = (printer: any) => {
    onSelect(printer);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
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
            className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Search size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Seleccionar Impresora</h2>
                    <p className="text-blue-100">Busca y selecciona la impresora por sede</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por modelo, ubicación, serie o IP..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Tabs por Sede */}
            <div className="bg-white border-b border-gray-200">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                <button
                  onClick={() => setActiveSedeTab('all')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeSedeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>Todas las Sedes</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
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
                        ? 'border-blue-500 text-blue-600'
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Impresoras en {activeSedeTab === 'all' ? 'Todas las Sedes' : activeSedeTab}
                </h3>
                <div className="flex items-center text-sm text-gray-600">
                  <Hand className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Arrastra para desplazar horizontalmente</span>
                </div>
              </div>
              
              <div 
                className="overflow-x-auto cursor-grab active:cursor-grabbing max-h-96"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#CBD5E0 #F7FAFC'
                }}
                onMouseDown={(e) => {
                  const container = e.currentTarget;
                  const startX = e.pageX - container.offsetLeft;
                  const scrollLeft = container.scrollLeft;
                  let isDown = true;

                  const handleMouseMove = (e: MouseEvent) => {
                    if (!isDown) return;
                    e.preventDefault();
                    const x = e.pageX - container.offsetLeft;
                    const walk = (x - startX) * 2;
                    container.scrollLeft = scrollLeft - walk;
                  };

                  const handleMouseUp = () => {
                    isDown = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    container.style.cursor = 'grab';
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                  container.style.cursor = 'grabbing';
                }}
              >
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modelo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sede
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Toner
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPrinters.map((printer, index) => (
                      <motion.tr 
                        key={printer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onDoubleClick={() => handleSelect(printer)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{printer.model}</div>
                          <div className="text-sm text-gray-500">{printer.brand}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {printer.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            printer.sede === 'Por definir' || !printer.sede ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {printer.sede || 'Sin sede'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {printer.serial}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {printer.ip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {printer.tonerModel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleSelect(printer)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <Check size={14} className="mr-1" />
                            Seleccionar
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredPrinters.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
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

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredPrinters.length} de {printersToShow.length} impresoras
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}