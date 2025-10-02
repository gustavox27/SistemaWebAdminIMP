import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  RefreshCcw, 
  Search, 
  Filter, 
  Download,
  Upload,
  Plus,
  ArrowUpDown,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateTonerPrediction, getStatusColor, getStatusText } from '../utils/predictions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Printer } from '../types';
import PrinterDetailsModal from './modals/PrinterDetailsModal';
import ChangeToner from './modals/ChangeToner';
import AddPrinterModal from './modals/AddPrinterModal';
import AddColorPrinterModal from './modals/AddColorPrinterModal';
import PrinterTypeSelectionModal from './modals/PrinterTypeSelectionModal';
import ChangeColorTonerModal from './modals/ChangeColorTonerModal';
import TonerActionSelectionModal from './modals/TonerActionSelectionModal';
import BackupTonerModal from './modals/BackupTonerModal';
import MotorCycleCaptureModal from './modals/MotorCycleCaptureModal';
import { exportToExcel, generatePrinterExportData, downloadPrinterTemplate, parsePrinterExcel } from '../utils/exportUtils';
import { supabaseService } from '../services/supabaseService';
import { processImportedPrinters } from '../utils/predictions';
import { getColorPrinterPrediction, COLOR_OPTIONS, calculateColorTonerPrediction } from '../utils/colorPrinterUtils';
import ConfirmDialog from './modals/ConfirmDialog';
import MassDeleteBySede from './modals/MassDeleteBySede';
import toast from 'react-hot-toast';

export default function PrintersTable() {
  const { printers, addPrinter, deletePrinter } = useStore();
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showChangeToner, setShowChangeToner] = useState(false);
  const [showChangeColorToner, setShowChangeColorToner] = useState(false);
  const [showActionSelection, setShowActionSelection] = useState(false);
  const [showBackupToner, setShowBackupToner] = useState(false);
  const [showMotorCycleCapture, setShowMotorCycleCapture] = useState(false);
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [showAddColorPrinter, setShowAddColorPrinter] = useState(false);
  const [showPrinterTypeSelection, setShowPrinterTypeSelection] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nextChange' | 'model' | 'location'>('nextChange');
  const [activeSedeTab, setActiveSedeTab] = useState<string>(() => {
    // Cargar pestaña predeterminada desde localStorage
    const defaultTab = localStorage.getItem('defaultPrintersTab');
    return defaultTab || 'all';
  });
  const [defaultSedeTab, setDefaultSedeTab] = useState<string>(() => {
    // Cargar pestaña predeterminada desde localStorage
    return localStorage.getItem('defaultPrintersTab') || '';
  });

  const hasAnyPrinterWithBackupOrPendingCycle = useMemo(() => {
    return printers.some(printer => printer.hasBackupToner || printer.motorCyclePending);
  }, [printers]);

  // Agrupar impresoras por sede
  const printersBySede = useMemo(() => {
    const grouped = printers.reduce((acc, printer) => {
      const sede = printer.sede || 'Global';
      if (!acc[sede]) {
        acc[sede] = [];
      }
      acc[sede].push(printer);
      return acc;
    }, {} as Record<string, Printer[]>);
    
    return grouped;
  }, [printers]);

  // Obtener lista de sedes disponibles
  const availableSedes = useMemo(() => {
    const sedes = Object.keys(printersBySede).sort();
    // Mover 'Global' al final si existe
    const globalIndex = sedes.indexOf('Global');
    if (globalIndex > -1) {
      sedes.splice(globalIndex, 1);
      sedes.push('Global');
    }
    return sedes;
  }, [printersBySede]);

  // Función para manejar el cambio de pestaña predeterminada
  const handleSetDefaultTab = (tabId: string) => {
    if (defaultSedeTab === tabId) {
      // Deseleccionar pestaña predeterminada
      setDefaultSedeTab('');
      localStorage.removeItem('defaultPrintersTab');
      toast.success('Pestaña predeterminada removida');
    } else {
      // Establecer nueva pestaña predeterminada
      setDefaultSedeTab(tabId);
      localStorage.setItem('defaultPrintersTab', tabId);
      const tabName = tabId === 'all' ? 'Todas las Sedes' : tabId;
      toast.success(`"${tabName}" establecida como pestaña predeterminada`);
    }
  };

  // Función para manejar el cambio de pestaña activa
  const handleTabChange = (tabId: string) => {
    setActiveSedeTab(tabId);
  };
  // Filtrar impresoras según la sede activa
  const printersToShow = useMemo(() => {
    if (activeSedeTab === 'all') {
      return printers;
    }
    return printersBySede[activeSedeTab] || [];
  }, [printers, printersBySede, activeSedeTab]);
  const filteredAndSortedPrinters = useMemo(() => {
    let filtered = printersToShow.filter(printer => {
      const matchesSearch = 
        printer.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printer.ip.includes(searchTerm) ||
        printer.serial.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || printer.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Separar impresoras por estado operativo y ciclo de motor pendiente
    const pendingMotorCycle = filtered.filter(printer => printer.motorCyclePending);
    const operativePrinters = filtered.filter(printer => 
      !printer.motorCyclePending && printer.status === 'operativa'
    );
    const nonOperativePrinters = filtered.filter(printer => 
      !printer.motorCyclePending && printer.status !== 'operativa'
    );

    // Ordenar cada grupo por separado
    if (sortBy === 'nextChange') {
      pendingMotorCycle.sort((a, b) => {
        const predictionA = calculateTonerPrediction(a);
        const predictionB = calculateTonerPrediction(b);
        return predictionA.daysUntilChange - predictionB.daysUntilChange;
      });
      operativePrinters.sort((a, b) => {
        const predictionA = calculateTonerPrediction(a);
        const predictionB = calculateTonerPrediction(b);
        return predictionA.daysUntilChange - predictionB.daysUntilChange;
      });
      // Para impresoras no operativas, ordenar por modelo
      nonOperativePrinters.sort((a, b) => a.model.localeCompare(b.model));
    } else if (sortBy === 'model') {
      pendingMotorCycle.sort((a, b) => a.model.localeCompare(b.model));
      operativePrinters.sort((a, b) => a.model.localeCompare(b.model));
      nonOperativePrinters.sort((a, b) => a.model.localeCompare(b.model));
    } else if (sortBy === 'location') {
      pendingMotorCycle.sort((a, b) => a.location.localeCompare(b.location));
      operativePrinters.sort((a, b) => a.location.localeCompare(b.location));
      nonOperativePrinters.sort((a, b) => a.location.localeCompare(b.location));
    }

    // Combinar: primero las pendientes, luego las operativas, al final las no operativas (en reposo)
    return [...pendingMotorCycle, ...operativePrinters, ...nonOperativePrinters];
  }, [printersToShow, searchTerm, filterStatus, sortBy]);

  const handleViewDetails = (printer: Printer) => {
    setSelectedPrinter(printer);
    setShowDetails(true);
  };

  const handleChangeToner = (printer: Printer) => {
    setSelectedPrinter(printer);
    
    if (printer.type === 'color') {
      // Para impresoras a color, ir directo al modal de cambio de color
      setShowChangeColorToner(true);
    } else {
      // Para impresoras monocromáticas, verificar si tiene ciclo de motor pendiente
      if (printer.motorCyclePending) {
        setShowMotorCycleCapture(true);
      } else {
        setShowActionSelection(true);
      }
    }
  };

  const handleActionSelection = (action: 'change' | 'backup') => {
    setShowActionSelection(false);
    if (action === 'change') {
      setShowChangeToner(true);
    } else {
      setShowBackupToner(true);
    }
  };

  const handleDeleteAll = async () => {
    try {
      for (const printer of printers) {
        await supabaseService.delete('printers', printer.id);
      }
      // Clear all printers from store
      printers.forEach(printer => {
        deletePrinter(printer.id);
      });
      toast.success(`${printers.length} impresoras eliminadas exitosamente`);
    } catch (error) {
      toast.error('Error al eliminar las impresoras');
    }
  };
  const handleExportData = () => {
    const data = generatePrinterExportData(filteredAndSortedPrinters);
    exportToExcel(data, 'impresoras');
    toast.success('Datos exportados exitosamente');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const printersData = await parsePrinterExcel(file);
      
      // Aplicar cálculos automáticos a las impresoras importadas
      const processedPrinters = processImportedPrinters(printersData);
      
      for (const printerData of processedPrinters) {
        if (printerData.model && printerData.serial) {
          const newPrinter: Printer = {
            ...printerData,
            id: crypto.randomUUID()
          };
          
          addPrinter(newPrinter);
          await supabaseService.add('printers', newPrinter);
        }
      }
      
      // Mostrar información sobre actualizaciones automáticas
      const updatedCount = processedPrinters.filter(p => {
        const original = printersData.find(orig => orig.serial === p.serial);
        return original && Math.abs(original.currentTonerLevel - p.currentTonerLevel) > 0.1;
      }).length;
      
      if (updatedCount > 0) {
        toast.success(`${printersData.length} impresoras importadas. ${updatedCount} con niveles de toner actualizados automáticamente.`);
      } else {
        toast.success(`${printersData.length} impresoras importadas exitosamente`);
      }
    } catch (error) {
      toast.error('Error al importar el archivo Excel');
      console.error('Import error:', error);
    }

    // Reset input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por modelo, ubicación, IP o serie..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="operativa">Operativa</option>
              <option value="disponible">Disponible</option>
              <option value="backup">Backup</option>
              <option value="retirada">Retirada</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="nextChange">Próximo cambio</option>
              <option value="model">Modelo</option>
              <option value="location">Ubicación</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPrinterTypeSelection(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Agregar
              </button>

              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  Acciones
                  <ChevronDown size={16} />
                </button>
                
                {showActionsDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        handleExportData();
                        setShowActionsDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Download size={16} />
                      Exportar
                    </button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          handleFileUpload(e);
                          setShowActionsDropdown(false);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                        <Upload size={16} />
                        Importar
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        downloadPrinterTemplate();
                        setShowActionsDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Download size={16} />
                      Plantilla
                    </button>
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={() => {
                        setShowMassDeleteModal(true);
                        setShowActionsDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={16} />
                      Eliminar por Sede
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs por Sede */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            <button
              onClick={() => handleTabChange('all')}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDefaultTab('all');
                  }}
                  className={`p-1 rounded-full transition-all duration-200 hover:scale-110 ${
                    defaultSedeTab === 'all'
                      ? 'text-yellow-400 hover:text-yellow-500'
                      : 'text-gray-300 hover:text-yellow-400'
                  }`}
                  title={defaultSedeTab === 'all' ? 'Remover como predeterminada' : 'Establecer como predeterminada'}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              </div>
            </button>
            {availableSedes.map((sede) => (
              <button
                key={sede}
                onClick={() => handleTabChange(sede)}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeSedeTab === sede
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{sede}</span>
                  <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                    {printersBySede[sede]?.length || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefaultTab(sede);
                    }}
                    className={`p-1 rounded-full transition-all duration-200 hover:scale-110 ${
                      defaultSedeTab === sede
                        ? 'text-yellow-400 hover:text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                    title={defaultSedeTab === sede ? 'Remover como predeterminada' : 'Establecer como predeterminada'}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div 
          className="overflow-x-auto cursor-grab active:cursor-grabbing"
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
            <thead className="bg-gray-50">
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
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toner Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => setSortBy('nextChange')}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Próximo Cambio
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedPrinters.map((printer, index) => {
                const prediction = calculateTonerPrediction(printer);
                const statusColor = getStatusColor(prediction.status);
                
                return (
                  <motion.tr
                    key={printer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`hover:bg-gray-50 transition-colors ${
                      printer.motorCyclePending ? 'bg-yellow-100 border-l-4 border-yellow-500' : 
                      printer.hasBackupToner ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{printer.model}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          {printer.brand}
                          {printer.type === 'color' && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Color
                            </span>
                          )}
                        </div>
                        {printer.motorCyclePending && (
                          <div className="text-xs text-orange-600 font-medium flex items-center">
                            <AlertTriangle size={12} className="mr-1" />
                            Ciclo de motor pendiente
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {printer.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        printer.sede === 'Por definir' || !printer.sede ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {printer.sede || 'Por definir'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <a
                        href={`http://${printer.ip}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          window.open(`http://${printer.ip}`, '_blank');
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        title={`Abrir ${printer.ip} en nueva pestaña`}
                      >
                        {printer.ip}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          {printer.status === 'operativa' ? (
                            printer.type === 'color' ? (
                              <>
                                {/* Mostrar círculos de colores para impresoras a color */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {printer.colorToners?.map((colorToner) => {
                                    const colorPrediction = calculateColorTonerPrediction(printer, colorToner);
                                    return (
                                      <div key={colorToner.id} className="flex flex-col items-center">
                                        <div
                                          className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                                          style={{ backgroundColor: colorToner.colorCode }}
                                          title={`${COLOR_OPTIONS.find(c => c.id === colorToner.color)?.name}: ${Math.round(colorPrediction.adjustedLevel)}%`}
                                        />
                                        <span className="text-xs text-gray-600 mt-1">
                                          {Math.round(colorPrediction.adjustedLevel)}%
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-blue-600">
                                  Promedio: {Math.round(getColorPrinterPrediction(printer).averageLevel)}%
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      prediction.adjustedTonerLevel !== undefined ? 
                                        (prediction.adjustedTonerLevel < 20 ? 'bg-red-500' :
                                         prediction.adjustedTonerLevel < 50 ? 'bg-yellow-500' : 'bg-green-500') :
                                        (printer.currentTonerLevel < 20 ? 'bg-red-500' :
                                         printer.currentTonerLevel < 50 ? 'bg-yellow-500' : 'bg-green-500')
                                    }`}
                                    style={{ width: `${prediction.adjustedTonerLevel || printer.currentTonerLevel}%` }}
                                  />
                                </div>
                               <div className="flex justify-between items-center mt-1">
                                 <div className="flex flex-col">
                                   <span className="text-xs text-gray-600">
                                     {Math.round(prediction.adjustedTonerLevel || printer.currentTonerLevel)}%
                                   </span>
                                   {prediction.adjustedTonerLevel !== undefined && prediction.hoursElapsed! > 1 && (
                                     <span className="text-xs text-blue-500">
                                       (actualizado automáticamente)
                                     </span>
                                   )}
                                 </div>
                                 <span className="text-xs text-blue-600">
                                   ~{prediction.pagesRemaining.toLocaleString()} pág.
                                 </span>
                               </div>
                              </>
                            )
                          ) : (
                            <div className="flex items-center justify-center py-2">
                              <div className="flex items-center text-gray-400">
                                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-2">
                                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                </div>
                                <span className="text-xs">En reposo</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {printer.status === 'operativa' ? (
                        printer.type === 'color' ? (
                          (() => {
                            const colorPrediction = getColorPrinterPrediction(printer);
                            const statusColor = colorPrediction.status === 'critical' ? 'text-red-600 bg-red-50' :
                                              colorPrediction.status === 'warning' ? 'text-yellow-600 bg-yellow-50' :
                                              'text-green-600 bg-green-50';
                            return (
                              <>
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                  {colorPrediction.status === 'critical' && <AlertCircle size={14} className="mr-1" />}
                                  {colorPrediction.criticalColor?.color}: {colorPrediction.daysUntilChange} días
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {format(colorPrediction.estimatedChangeDate, 'dd/MM/yyyy', { locale: es })}
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {prediction.status === 'critical' && <AlertCircle size={14} className="mr-1" />}
                              {prediction.daysUntilChange} días
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {format(prediction.estimatedChangeDate, 'dd/MM/yyyy', { locale: es })}
                            </div>
                          </>
                        )
                      ) : (
                        <div className="flex items-center justify-center">
                          <div className="flex items-center text-gray-400">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-2">
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            </div>
                            <span className="text-xs">En reposo</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        printer.status === 'operativa' ? 'bg-green-100 text-green-800' :
                        printer.status === 'disponible' ? 'bg-blue-100 text-blue-800' :
                        printer.status === 'backup' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {printer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(printer)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleChangeToner(printer)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Cambiar toner"
                        >
                          <RefreshCcw size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredAndSortedPrinters.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay impresoras</h3>
              <p className="mt-1 text-sm text-gray-500">
                {printersToShow.length === 0 ? 
                  (activeSedeTab === 'all' ? 'Comienza agregando tu primera impresora' : `No hay impresoras en la sede "${activeSedeTab}"`) : 
                  'No se encontraron impresoras con los filtros aplicados'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDetails && selectedPrinter && (
        <PrinterDetailsModal
          printer={selectedPrinter}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showChangeToner && selectedPrinter && (
        <ChangeToner
          printer={selectedPrinter}
          isOpen={showChangeToner}
          onClose={() => setShowChangeToner(false)}
        />
      )}

      {showChangeColorToner && selectedPrinter && (
        <ChangeColorTonerModal
          printer={selectedPrinter}
          isOpen={showChangeColorToner}
          onClose={() => setShowChangeColorToner(false)}
        />
      )}

      {showActionSelection && selectedPrinter && (
        <TonerActionSelectionModal
          isOpen={showActionSelection}
          onClose={() => setShowActionSelection(false)}
          onChangeToner={() => handleActionSelection('change')}
          onBackupToner={() => handleActionSelection('backup')}
          printerModel={selectedPrinter.model}
          printerLocation={selectedPrinter.location}
        />
      )}

      {showBackupToner && selectedPrinter && (
        <BackupTonerModal
          printer={selectedPrinter}
          isOpen={showBackupToner}
          onClose={() => setShowBackupToner(false)}
        />
      )}

      {showMotorCycleCapture && selectedPrinter && (
        <MotorCycleCaptureModal
          printer={selectedPrinter}
          isOpen={showMotorCycleCapture}
          onClose={() => setShowMotorCycleCapture(false)}
        />
      )}

      {showAddPrinter && (
        <AddPrinterModal
          isOpen={showAddPrinter}
          onClose={() => setShowAddPrinter(false)}
        />
      )}

      {showAddColorPrinter && (
        <AddColorPrinterModal
          isOpen={showAddColorPrinter}
          onClose={() => setShowAddColorPrinter(false)}
        />
      )}

      {showPrinterTypeSelection && (
        <PrinterTypeSelectionModal
          isOpen={showPrinterTypeSelection}
          onClose={() => setShowPrinterTypeSelection(false)}
          onSelectMonochrome={() => {
            setShowPrinterTypeSelection(false);
            setShowAddPrinter(true);
          }}
          onSelectColor={() => {
            setShowPrinterTypeSelection(false);
            setShowAddColorPrinter(true);
          }}
        />
      )}

      {/* Mass Delete Modal */}
      <MassDeleteBySede
        isOpen={showMassDeleteModal}
        onClose={() => setShowMassDeleteModal(false)}
      />
    </div>
  );
}