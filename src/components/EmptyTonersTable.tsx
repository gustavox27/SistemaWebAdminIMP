import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Trash2, 
  Search, 
  Download,
  AlertTriangle,
  Package,
  ArrowRight,
  Clock,
  CheckCircle,
  Truck,
  BarChart3,
  MapPin,
  Settings,
  Send
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import ConfirmDialog from './modals/ConfirmDialog';
import TransferToWarehouseModal from './modals/TransferToWarehouseModal';
import TransferToShippedModal from './modals/TransferToShippedModal';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

export default function EmptyTonersTable() {
  const { emptyToners, fuserModels, deleteEmptyToner, clearAllEmptyToners, updateEmptyToner } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'area' | 'warehouse' | 'shipped'>('area');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferToShippedModal, setShowTransferToShippedModal] = useState(false);
  const [selectedEmptyToner, setSelectedEmptyToner] = useState<string | null>(null);
  const [selectedForTransfer, setSelectedForTransfer] = useState<string[]>([]);
  const [selectedForShipping, setSelectedForShipping] = useState<string[]>([]);

  // Filtrar toners por categoría
  const areaEmptyToners = useMemo(() => {
    return emptyToners.filter(empty => empty.category === 'area');
  }, [emptyToners]);

  const warehouseEmptyToners = useMemo(() => {
    return emptyToners.filter(empty => empty.category === 'warehouse' || !empty.category);
  }, [emptyToners]);

  const shippedEmptyToners = useMemo(() => {
    return emptyToners.filter(empty => empty.category === 'shipped');
  }, [emptyToners]);
  // Filtrar según búsqueda y pestaña activa
  const filteredEmptyToners = useMemo(() => {
    const tonersToFilter = activeTab === 'area' ? areaEmptyToners : 
                          activeTab === 'warehouse' ? warehouseEmptyToners : 
                          shippedEmptyToners;
    
    return tonersToFilter.filter(emptyToner => 
      emptyToner.tonerModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emptyToner.printerModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emptyToner.printerLocation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [areaEmptyToners, warehouseEmptyToners, shippedEmptyToners, activeTab, searchTerm]);

  // Contadores por modelo para cada categoría
  const areaModelCounts = useMemo(() => {
    const counts: Record<string, { total: number; pending: number; ready: number }> = {};
    areaEmptyToners.forEach(emptyToner => {
      if (!counts[emptyToner.tonerModel]) {
        counts[emptyToner.tonerModel] = { total: 0, pending: 0, ready: 0 };
      }
      counts[emptyToner.tonerModel].total++;
      if (emptyToner.status === 'pending_cycle') {
        counts[emptyToner.tonerModel].pending++;
      } else if (emptyToner.status === 'ready_pickup') {
        counts[emptyToner.tonerModel].ready++;
      }
    });
    return Object.entries(counts).sort(([,a], [,b]) => b.total - a.total);
  }, [areaEmptyToners]);

  const warehouseModelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    warehouseEmptyToners.forEach(emptyToner => {
      counts[emptyToner.tonerModel] = (counts[emptyToner.tonerModel] || 0) + 1;
    });
    return Object.entries(counts).sort(([,a], [,b]) => b - a);
  }, [warehouseEmptyToners]);

  const shippedModelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shippedEmptyToners.forEach(emptyToner => {
      counts[emptyToner.tonerModel] = (counts[emptyToner.tonerModel] || 0) + 1;
    });
    return Object.entries(counts).sort(([,a], [,b]) => b - a);
  }, [shippedEmptyToners]);
  // Métricas del dashboard
  const dashboardMetrics = useMemo(() => {
    const totalEmpty = emptyToners.length;
    const inArea = areaEmptyToners.length;
    const inWarehouse = warehouseEmptyToners.length;
    const shipped = shippedEmptyToners.length;
    const capacityPercentage = (totalEmpty / 50) * 100;
    
    const pendingCycle = areaEmptyToners.filter(t => t.status === 'pending_cycle').length;
    const readyPickup = areaEmptyToners.filter(t => t.status === 'ready_pickup').length;

    return {
      totalEmpty,
      inArea,
      inWarehouse,
      shipped,
      capacityPercentage,
      pendingCycle,
      readyPickup
    };
  }, [emptyToners, areaEmptyToners, warehouseEmptyToners, shippedEmptyToners]);

  const handleDelete = (id: string) => {
    setSelectedEmptyToner(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedEmptyToner) return;

    try {
      deleteEmptyToner(selectedEmptyToner);
      await supabaseService.delete('emptyToners', selectedEmptyToner);
      toast.success('Toner vacío eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el toner vacío');
    }
  };

  const handleDeleteAll = async () => {
    try {
      for (const emptyToner of emptyToners) {
        await supabaseService.delete('emptyToners', emptyToner.id);
      }
      clearAllEmptyToners();
      toast.success(`${emptyToners.length} toners vacíos eliminados exitosamente`);
    } catch (error) {
      toast.error('Error al eliminar los toners vacíos');
    }
  };

  const handleTransferToWarehouse = (ids: string[]) => {
    setSelectedForTransfer(ids);
    setShowTransferModal(true);
  };

  const handleTransferToShipped = (ids: string[]) => {
    setSelectedForShipping(ids);
    setShowTransferToShippedModal(true);
  };
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending_cycle':
        return {
          label: 'Pendiente Ciclo Motor',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock
        };
      case 'ready_pickup':
        return {
          label: 'Listo para Recoger',
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle
        };
      case 'ready_shipping':
        return {
          label: 'Listo para Envío',
          color: 'bg-green-100 text-green-800',
          icon: Truck
        };
      case 'shipped':
        return {
          label: 'Enviado',
          color: 'bg-purple-100 text-purple-800',
          icon: Send
        };
      default:
        return {
          label: 'Desconocido',
          color: 'bg-gray-100 text-gray-800',
          icon: AlertTriangle
        };
    }
  };

  const isNearLimit = emptyToners.length >= 45;

  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      {isNearLimit && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                ¡Advertencia! Límite de almacenamiento
              </h3>
              <p className="text-yellow-700">
                Tienes {emptyToners.length} toners vacíos de 50 permitidos. 
                Considera gestionar el envío de toners vacíos pronto.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dashboard Superior */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white p-4 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mx-auto mb-3">
              <Trash2 className="h-6 w-6 text-slate-200" />
            </div>
            <div className="text-2xl font-bold">{dashboardMetrics.totalEmpty}</div>
            <div className="text-xs opacity-90 font-medium">Total Vacíos</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-4 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mx-auto mb-3">
              <MapPin className="h-6 w-6 text-indigo-200" />
            </div>
            <div className="text-2xl font-bold">{dashboardMetrics.inArea}</div>
            <div className="text-xs opacity-90 font-medium">En Área</div>
            <div className="text-xs opacity-75 mt-1">
              {dashboardMetrics.pendingCycle} pendientes | {dashboardMetrics.readyPickup} listos
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mx-auto mb-3">
              <Package className="h-6 w-6 text-emerald-200" />
            </div>
            <div className="text-2xl font-bold">{dashboardMetrics.inWarehouse}</div>
            <div className="text-xs opacity-90 font-medium">En Almacén</div>
          </div>
          <div className="bg-gradient-to-br from-violet-600 to-violet-700 text-white p-4 rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mx-auto mb-3">
              <Send className="h-6 w-6 text-violet-200" />
            </div>
            <div className="text-2xl font-bold">{dashboardMetrics.shipped}</div>
            <div className="text-xs opacity-90 font-medium">Enviados</div>
          </div>
          <div className={`p-4 rounded-xl text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
            dashboardMetrics.capacityPercentage >= 90 ? 'bg-gradient-to-br from-rose-600 to-rose-700' :
            dashboardMetrics.capacityPercentage >= 75 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
            'bg-gradient-to-br from-teal-600 to-teal-700'
          }`}>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg w-fit mx-auto mb-3">
              <BarChart3 className={`h-6 w-6 ${
                dashboardMetrics.capacityPercentage >= 90 ? 'text-rose-200' :
                dashboardMetrics.capacityPercentage >= 75 ? 'text-amber-200' :
                'text-teal-200'
              }`} />
            </div>
            <div className="text-2xl font-bold">{Math.round(dashboardMetrics.capacityPercentage)}%</div>
            <div className="text-xs opacity-90 font-medium">Capacidad</div>
            <div className="text-xs opacity-75">{dashboardMetrics.totalEmpty}/50</div>
          </div>
        </div>
      </div>

      {/* Contadores por Modelo - Antes de las pestañas */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package size={20} className="mr-2 text-purple-600" />
            Cantidad por Modelo - {activeTab === 'area' ? 'En Área' : activeTab === 'warehouse' ? 'En Almacén' : 'Enviados'}
          </h3>
          
          {activeTab === 'area' ? (
            areaModelCounts.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {areaModelCounts.map(([model, counts]) => (
                  <div key={model} className="flex flex-col items-center">
                    <div className="relative">
                      <div 
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                          counts.pending > 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                        }`}
                      >
                        {counts.total}
                      </div>
                      {counts.pending > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                          {counts.pending}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 mt-2 text-center">
                      {model}
                    </span>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {counts.pending > 0 && <span className="text-amber-600 font-medium">{counts.pending} pendientes</span>}
                      {counts.pending > 0 && counts.ready > 0 && <span className="mx-1">|</span>}
                      {counts.ready > 0 && <span className="text-indigo-600 font-medium">{counts.ready} listos</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-indigo-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                  <MapPin className="mx-auto h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-gray-500 mt-2 font-medium">No hay toners en área de trabajo</p>
              </div>
            )
          ) : activeTab === 'warehouse' ? (
            warehouseModelCounts.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {warehouseModelCounts.map(([model, count]) => (
                  <div key={model} className="flex flex-col items-center">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg"
                    >
                      {count}
                    </div>
                    <span className="text-sm font-medium text-gray-700 mt-2 text-center">
                      {model}
                    </span>
                    <span className="text-xs text-emerald-600 mt-1 font-medium">
                      Listo para envío
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-emerald-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                  <Package className="mx-auto h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-gray-500 mt-2 font-medium">No hay toners en almacén</p>
              </div>
            )
          ) : (
            shippedModelCounts.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {shippedModelCounts.map(([model, count]) => (
                  <div key={model} className="flex flex-col items-center">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg"
                    >
                      {count}
                    </div>
                    <span className="text-sm font-medium text-gray-700 mt-2 text-center">
                      {model}
                    </span>
                    <span className="text-xs text-violet-600 mt-1 font-medium">
                      Enviado
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-violet-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                  <Send className="mx-auto h-8 w-8 text-violet-600" />
                </div>
                <p className="text-gray-500 mt-2 font-medium">No hay toners enviados</p>
              </div>
            )
          )}
        </div>
        
        {/* Tabs con controles integrados */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('area')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'area'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MapPin size={16} />
                <span>En Área</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {dashboardMetrics.inArea}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'warehouse'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package size={16} />
                <span>En Almacén</span>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {dashboardMetrics.inWarehouse}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('shipped')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'shipped'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Send size={16} />
                <span>Enviados</span>
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  {dashboardMetrics.shipped}
                </span>
              </div>
            </button>
            
            {/* Controles integrados en la misma fila */}
            <div className="flex-1"></div>
            <div className="flex items-center space-x-3 py-2">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Botón Trasladar (solo en área) */}
              {activeTab === 'area' && (
                <button
                  onClick={() => {
                    const readyForTransfer = areaEmptyToners
                      .filter(t => t.status === 'ready_pickup')
                      .map(t => t.id);
                    if (readyForTransfer.length > 0) {
                      handleTransferToWarehouse(readyForTransfer);
                    } else {
                      toast.error('No hay toners listos para trasladar');
                    }
                  }}
                  disabled={areaEmptyToners.filter(t => t.status === 'ready_pickup').length === 0}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
                >
                  <ArrowRight size={16} />
                  Trasladar
                </button>
              )}
              
              {/* Botón Trasladar (solo en almacén) */}
              {activeTab === 'warehouse' && (
                <button
                  onClick={() => {
                    if (selectedForShipping.length > 0) {
                      handleTransferToShipped(selectedForShipping);
                    } else {
                      toast.error('Selecciona toners para enviar');
                    }
                  }}
                  disabled={selectedForShipping.length === 0}
                  className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
                >
                  <Send size={16} />
                  Trasladar
                </button>
              )}
              
              {/* Botón Eliminar Todo */}
              {emptyToners.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Trash2 size={16} />
                  Eliminar Todo
                </button>
              )}
            </div>
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
                {(activeTab === 'area' || activeTab === 'warehouse') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (activeTab === 'area') {
                            const readyIds = areaEmptyToners
                              .filter(t => t.status === 'ready_pickup')
                              .map(t => t.id);
                            setSelectedForTransfer(readyIds);
                          } else {
                            const warehouseIds = warehouseEmptyToners.map(t => t.id);
                            setSelectedForShipping(warehouseIds);
                          }
                        } else {
                          if (activeTab === 'area') {
                            setSelectedForTransfer([]);
                          } else {
                            setSelectedForShipping([]);
                          }
                        }
                      }}
                      checked={activeTab === 'area' ? 
                        selectedForTransfer.length > 0 && selectedForTransfer.length === areaEmptyToners.filter(t => t.status === 'ready_pickup').length : 
                        selectedForShipping.length > 0 && selectedForShipping.length === warehouseEmptyToners.length}
                      className="rounded"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo de Toner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo de Impresora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Cambio
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmptyToners
                .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime())
                .map((emptyToner, index) => {
                  const statusInfo = getStatusInfo(emptyToner.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <motion.tr
                      key={emptyToner.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {(activeTab === 'area' || activeTab === 'warehouse') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={activeTab === 'area' ? 
                              selectedForTransfer.includes(emptyToner.id) : 
                              selectedForShipping.includes(emptyToner.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (activeTab === 'area') {
                                  setSelectedForTransfer(prev => [...prev, emptyToner.id]);
                                } else {
                                  setSelectedForShipping(prev => [...prev, emptyToner.id]);
                                }
                              } else {
                                if (activeTab === 'area') {
                                  setSelectedForTransfer(prev => prev.filter(id => id !== emptyToner.id));
                                } else {
                                  setSelectedForShipping(prev => prev.filter(id => id !== emptyToner.id));
                                }
                              }
                            }}
                            disabled={activeTab === 'area' && emptyToner.status !== 'ready_pickup'}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {emptyToner.tonerModel}
                        {fuserModels.some(model => model.name === emptyToner.tonerModel) && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Fusor
                          </span>
                        )}
                        {emptyToner.isBackup && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Backup
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emptyToner.printerModel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {emptyToner.printerLocation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon size={12} className="mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(emptyToner.changeDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {activeTab === 'area' && emptyToner.status === 'ready_pickup' && (
                            <button
                              onClick={() => handleTransferToWarehouse([emptyToner.id])}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Trasladar a almacén"
                            >
                              <ArrowRight size={18} />
                            </button>
                          )}
                          {activeTab === 'warehouse' && (
                            <button
                              onClick={() => handleTransferToShipped([emptyToner.id])}
                              className="text-purple-600 hover:text-purple-800 transition-colors"
                              title="Marcar como enviado"
                            >
                              <Send size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(emptyToner.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
          
          {filteredEmptyToners.length === 0 && (
            <div className="text-center py-12">
              {activeTab === 'area' ? <MapPin className="mx-auto h-12 w-12 text-gray-400" /> : 
               activeTab === 'warehouse' ? <Package className="mx-auto h-12 w-12 text-gray-400" /> :
               <Send className="mx-auto h-12 w-12 text-gray-400" />}
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeTab === 'area' ? 'Sin toners en área' : 
                 activeTab === 'warehouse' ? 'Sin toners en almacén' : 
                 'Sin toners enviados'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {emptyToners.length === 0 ? 'No hay toners vacíos registrados' : 
                 `No se encontraron toners ${activeTab === 'area' ? 'en área de trabajo' : 
                  activeTab === 'warehouse' ? 'en almacén' : 'enviados'} con los filtros aplicados`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transfer to Warehouse Modal */}
      {showTransferModal && (
        <TransferToWarehouseModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          selectedIds={selectedForTransfer}
          emptyToners={areaEmptyToners.filter(t => selectedForTransfer.includes(t.id))}
        />
      )}

      {/* Transfer to Shipped Modal */}
      {showTransferToShippedModal && (
        <TransferToShippedModal
          isOpen={showTransferToShippedModal}
          onClose={() => setShowTransferToShippedModal(false)}
          selectedIds={selectedForShipping}
          emptyToners={warehouseEmptyToners.filter(t => selectedForShipping.includes(t.id))}
        />
      )}
      {/* Delete Single Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Toner Vacío"
        message="¿Estás seguro de que deseas eliminar este toner vacío del registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Delete All Dialog */}
      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        onConfirm={handleDeleteAll}
        title="Eliminar Todos los Toners Vacíos"
        message={
          <div>
            <p className="mb-2">
              Estás a punto de eliminar <strong>{emptyToners.length} toners vacíos</strong>.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-2">Toners a eliminar:</p>
              {emptyToners.slice(0, 10).map((emptyToner, index) => (
                <p key={emptyToner.id} className="text-xs text-gray-600">
                  {index + 1}. {emptyToner.tonerModel} - {emptyToner.printerLocation}
                </p>
              ))}
              {emptyToners.length > 10 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... y {emptyToners.length - 10} más
                </p>
              )}
            </div>
            <p className="text-sm text-red-600 mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar Todo"
        type="danger"
      />
    </div>
  );
}