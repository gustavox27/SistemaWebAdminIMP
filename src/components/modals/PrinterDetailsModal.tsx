import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, MapPin, Calendar, Hash, Info, Activity, Package, ShoppingCart, History, Server, Network, Settings, AlertTriangle, CheckCircle, Clock, Eye, Palette, CreditCard as Edit, Trash2, Plus, RefreshCcw } from 'lucide-react';
import { Printer as PrinterType, TonerInventory, TonerOrder, TonerChange, PrinterFuser } from '../../types';
import { useStore } from '../../store/useStore';
import { calculateTonerPrediction } from '../../utils/predictions';
import { getColorPrinterPrediction, COLOR_OPTIONS, calculateColorTonerPrediction } from '../../utils/colorPrinterUtils';
import { calculateFuserPrediction } from '../../utils/fuserPredictions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import EditPrinterModal from './EditPrinterModal';
import TonerModelManagementModal from './TonerModelManagementModal';
import ColorSelectionModal from './ColorSelectionModal';
import EditTonerLevelModal from './EditTonerLevelModal';
import ConfirmDialog from './ConfirmDialog';
import RegisterFuserModal from './RegisterFuserModal';
import ChangeFuserModal from './ChangeFuserModal';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface PrinterDetailsModalProps {
  printer: PrinterType;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrinterDetailsModal({ printer, isOpen, onClose }: PrinterDetailsModalProps) {
  const { inventory, orders, changes, printerFusers, fuserModels, deletePrinter, updatePrinter, updatePrinterFuser } = useStore();
  const [activeTab, setActiveTab] = useState('details');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTonerManagement, setShowTonerManagement] = useState(false);
  const [showColorSelection, setShowColorSelection] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditTonerLevel, setShowEditTonerLevel] = useState(false);
  const [selectedColorToner, setSelectedColorToner] = useState<any>(null);
  const [showRegisterFuser, setShowRegisterFuser] = useState(false);
  const [showChangeFuser, setShowChangeFuser] = useState(false);

  // Calcular predicción de toner
  const tonerPrediction = useMemo(() => {
    return printer.type === 'color' 
      ? getColorPrinterPrediction(printer)
      : calculateTonerPrediction(printer);
  }, [printer]);

  // Obtener fusor de la impresora
  const printerFuser = printerFusers.find(f => f.printerId === printer.id);
  const fuserPrediction = printerFuser ? calculateFuserPrediction(printer, printerFuser) : null;

  // Filtrar datos relacionados con esta impresora
  const printerInventory = inventory.filter(item => item.printerId === printer.id);
  const printerOrders = orders.filter(order => order.printerId === printer.id);
  const printerChanges = changes.filter(change => change.printerId === printer.id);

  const handleDelete = async () => {
    try {
      deletePrinter(printer.id);
      await supabaseService.delete('printers', printer.id);
      toast.success('Impresora eliminada exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al eliminar la impresora');
      console.error('Error:', error);
    }
  };

  const handleTonerEdit = () => {
    if (printer.type === 'color') {
      setShowColorSelection(true);
    } else {
      setShowTonerManagement(true);
    }
  };

  const handleEditTonerLevel = (colorToner?: any) => {
    if (colorToner) {
      setSelectedColorToner(colorToner);
    } else {
      setSelectedColorToner(null);
    }
    setShowEditTonerLevel(true);
  };

  const handleColorTonerUpdate = async (colorToners: any[]) => {
    try {
      // Calcular nuevo nivel promedio
      const averageLevel = Math.round(
        colorToners.reduce((sum, t) => sum + t.currentLevel, 0) / colorToners.length
      );

      const updatedPrinter: PrinterType = {
        ...printer,
        colorToners,
        currentTonerLevel: averageLevel,
        updatedAt: new Date()
      };

      updatePrinter(printer.id, updatedPrinter);
      await supabaseService.update('printers', updatedPrinter);
      
      setShowColorSelection(false);
      toast.success('Configuración de toners de color actualizada');
    } catch (error) {
      toast.error('Error al actualizar la configuración de toners');
      console.error('Error:', error);
    }
  };

  const handleTonerModelUpdate = async (tonerModel: string, capacity?: number) => {
    try {
      const updatedPrinter: PrinterType = {
        ...printer,
        tonerModel,
        tonerCapacity: capacity || printer.tonerCapacity,
        updatedAt: new Date()
      };

      updatePrinter(printer.id, updatedPrinter);
      await supabaseService.update('printers', updatedPrinter);
      
      setShowTonerManagement(false);
      toast.success('Modelo de toner actualizado');
    } catch (error) {
      toast.error('Error al actualizar el modelo de toner');
      console.error('Error:', error);
    }
  };

  const handleTonerLevelUpdate = async (newLevel: number, colorTonerId?: string) => {
    try {
      if (printer.type === 'color' && colorTonerId && printer.colorToners) {
        // Actualizar toner de color específico
        const updatedColorToners = printer.colorToners.map(toner => 
          toner.id === colorTonerId 
            ? { ...toner, currentLevel: newLevel }
            : toner
        );

        // Calcular nuevo nivel promedio
        const averageLevel = Math.round(
          updatedColorToners.reduce((sum, t) => sum + t.currentLevel, 0) / updatedColorToners.length
        );

        const updatedPrinter: PrinterType = {
          ...printer,
          colorToners: updatedColorToners,
          currentTonerLevel: averageLevel,
          updatedAt: new Date()
        };

        updatePrinter(printer.id, updatedPrinter);
        await supabaseService.update('printers', updatedPrinter);
        
        toast.success('Nivel de toner de color actualizado');
      } else {
        // Actualizar toner monocromático
        const updatedPrinter: PrinterType = {
          ...printer,
          currentTonerLevel: newLevel,
          updatedAt: new Date()
        };

        updatePrinter(printer.id, updatedPrinter);
        await supabaseService.update('printers', updatedPrinter);
        
        toast.success('Nivel de toner actualizado');
      }
      
      setShowEditTonerLevel(false);
    } catch (error) {
      toast.error('Error al actualizar el nivel de toner');
      console.error('Error:', error);
    }
  };

  const handleEditFuserLevel = () => {
    if (!printerFuser) return;
    
    // Usar el modal de edición de toner pero adaptado para fusor
    setSelectedColorToner({ 
      id: 'fuser', 
      type: 'fuser',
      currentLevel: Math.round(fuserPrediction?.currentLevel || 0),
      model: printerFuser.fuserModel,
      capacity: printerFuser.lifespan
    });
    setShowEditTonerLevel(true);
  };

  const handleChangeFuser = () => {
    if (!printerFuser || !fuserPrediction) return;
    setShowChangeFuser(true);
  };

  const handleFuserLevelUpdate = async (newLevel: number) => {
    if (!printerFuser) return;
    
    try {
      // Calcular nuevas páginas usadas basado en el nuevo nivel
      const newPagesUsed = Math.round(((100 - newLevel) / 100) * printerFuser.lifespan);
      
      const updatedFuser = {
        ...printerFuser,
        pagesUsed: newPagesUsed,
        lastUpdate: new Date(),
        updatedAt: new Date()
      };
      
      updatePrinterFuser(printerFuser.id, updatedFuser);
      await supabaseService.update('printerFusers', updatedFuser);
      
      toast.success('Nivel de fusor actualizado exitosamente');
      setShowEditTonerLevel(false);
    } catch (error) {
      toast.error('Error al actualizar el nivel de fusor');
      console.error('Error:', error);
    }
  };
  const tabs = [
    { id: 'details', label: 'Detalles', icon: Info },
    { id: 'status', label: 'Estado', icon: Activity },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'history', label: 'Historial', icon: History }
  ];

  const getStatusColor = (status: 'critical' | 'warning' | 'normal') => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const renderDetailsTab = () => (
    <div className="space-y-4">
      {/* Primera fila: Información General y Ubicación y Red */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Información General */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Printer size={16} className="mr-2 text-blue-600" />
            Información General
          </h4>
          <div className="space-y-2 text-sm">
            <div className="bg-white p-2 rounded border border-blue-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Marca</span>
              <p className="font-semibold text-gray-900">{printer.brand}</p>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Modelo</span>
              <p className="font-semibold text-gray-900">{printer.model}</p>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Serie</span>
              <p className="font-semibold text-gray-900">{printer.serial}</p>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Estado</span>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  printer.status === 'operativa' ? 'bg-green-100 text-green-800' :
                  printer.status === 'disponible' ? 'bg-blue-100 text-blue-800' :
                  printer.status === 'backup' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {printer.status}
                </span>
                {printer.type === 'color' && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Palette size={12} className="mr-1" />
                    Color
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ubicación y Red */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Network size={16} className="mr-2 text-green-600" />
            Ubicación y Red
          </h4>
          <div className="space-y-2 text-sm">
            <div className="bg-white p-2 rounded border border-green-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Ubicación</span>
              <p className="font-semibold text-gray-900">{printer.location}</p>
            </div>
            <div className="bg-white p-2 rounded border border-green-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Dirección IP</span>
              <p className="font-semibold text-blue-600">{printer.ip}</p>
            </div>
            <div className="bg-white p-2 rounded border border-green-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">HostName</span>
              <p className="font-semibold text-gray-900">{printer.hostname || 'No definido'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda fila: Servidor y Configuración de Toner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Servidor */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Server size={16} className="mr-2 text-purple-600" />
            Servidor
          </h4>
          <div className="space-y-2 text-sm">
            <div className="bg-white p-2 rounded border border-purple-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">Sede</span>
              <p className="font-semibold text-gray-900">{printer.sede || 'Por definir'}</p>
            </div>
            <div className="bg-white p-2 rounded border border-purple-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">HostName - Server</span>
              <p className="font-semibold text-gray-900">{printer.hostnameServer || 'Por definir'}</p>
            </div>
            <div className="bg-white p-2 rounded border border-purple-100">
              <span className="text-gray-600 text-xs uppercase tracking-wide">IP Server</span>
              <p className="font-semibold text-gray-900">{printer.ipServer || 'Por definir'}</p>
            </div>
          </div>
        </div>

        {/* Configuración de Toner */}
        {printer.status === 'operativa' && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Settings size={16} className="mr-2 text-orange-600" />
              Configuración de Toner
            </h4>
            <div className="space-y-2 text-sm">
              <div className="bg-white p-2 rounded border border-orange-100">
                <span className="text-gray-600 text-xs uppercase tracking-wide">Modelo Toner</span>
                <p className="font-semibold text-gray-900">{printer.tonerModel}</p>
              </div>
              <div className="bg-white p-2 rounded border border-orange-100">
                <span className="text-gray-600 text-xs uppercase tracking-wide">Capacidad</span>
                <p className="font-semibold text-gray-900">{printer.tonerCapacity.toLocaleString()} pág.</p>
              </div>
              <div className="bg-white p-2 rounded border border-orange-100">
                <span className="text-gray-600 text-xs uppercase tracking-wide">Uso Diario</span>
                <p className="font-semibold text-gray-900">{printer.dailyUsage} pág/día</p>
              </div>
              <div className="bg-white p-2 rounded border border-orange-100">
                <span className="text-gray-600 text-xs uppercase tracking-wide">Ciclo Motor</span>
                <p className="font-semibold text-gray-900">{printer.motorCycle.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tercera fila: Comentario (ancho completo) */}
      {printer.comment && (
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Eye size={16} className="mr-2" />
            Comentario
          </h4>
          <div className="bg-white p-3 rounded border border-slate-100">
            <p className="text-sm text-slate-800 italic leading-relaxed">"{printer.comment}"</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStatusTab = () => (
    <div className="space-y-4">
      {/* Estado del Toner */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Package size={16} className="mr-2 text-blue-600" />
          Estado del Toner
        </h4>
        
        {printer.type === 'color' && printer.colorToners ? (
          <div className="space-y-3">
            {printer.colorToners.map((colorToner) => {
              const colorPrediction = calculateColorTonerPrediction(printer, colorToner);
              const colorOption = COLOR_OPTIONS.find(c => c.id === colorToner.color);
              
              return (
                <div key={colorToner.id} className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: colorToner.colorCode }}
                      />
                      <span className="font-semibold text-gray-900 text-sm">{colorOption?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-700">
                        {Math.round(colorPrediction.adjustedLevel)}%
                      </span>
                      <button
                        onClick={() => handleEditTonerLevel(colorToner)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="Editar nivel de toner"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        colorPrediction.adjustedLevel < 20 ? 'bg-red-500' :
                        colorPrediction.adjustedLevel < 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${colorPrediction.adjustedLevel}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-500">Páginas:</span>
                      <p className="font-medium">{colorPrediction.pagesRemaining.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Días restantes:</span>
                      <p className="font-medium">{colorPrediction.daysUntilChange}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estado:</span>
                      <p className={`font-medium ${
                        colorPrediction.status === 'critical' ? 'text-red-600' :
                        colorPrediction.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {colorPrediction.status === 'critical' ? 'Crítico' :
                         colorPrediction.status === 'warning' ? 'Advertencia' : 'Normal'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 font-medium">Nivel Actual:</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 text-lg">
                  {Math.round(tonerPrediction.adjustedTonerLevel || printer.currentTonerLevel)}%
                </span>
                <button
                  onClick={() => handleEditTonerLevel()}
                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  title="Editar nivel de toner"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  (tonerPrediction.adjustedTonerLevel || printer.currentTonerLevel) < 20 ? 'bg-red-500' :
                  (tonerPrediction.adjustedTonerLevel || printer.currentTonerLevel) < 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${tonerPrediction.adjustedTonerLevel || printer.currentTonerLevel}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="text-gray-500">Páginas restantes:</span>
                <p className="font-medium">{tonerPrediction.pagesRemaining.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Días restantes:</span>
                <p className="font-medium">{tonerPrediction.daysUntilChange}</p>
              </div>
              <div>
                <span className="text-gray-500">Estado:</span>
                <p className={`font-medium ${getStatusColor(tonerPrediction.status).split(' ')[0]}`}>
                  {tonerPrediction.status === 'critical' ? 'Crítico' :
                   tonerPrediction.status === 'warning' ? 'Advertencia' : 'Normal'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estado del Fusor */}
      {printerFuser && fuserPrediction ? (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Settings size={16} className="mr-2 text-orange-600" />
            Estado del Fusor
          </h4>
          
          <div className="bg-white border border-amber-100 rounded-lg p-3 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Modelo:</span>
              <span className="font-bold text-gray-900">{printerFuser.fuserModel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Nivel Actual:</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900 text-lg">{Math.round(fuserPrediction.currentLevel)}%</span>
                <button
                  onClick={() => handleEditFuserLevel()}
                  className="p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                  title="Editar nivel de fusor"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  fuserPrediction.currentLevel <= 10 ? 'bg-red-500' :
                  fuserPrediction.currentLevel <= 15 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${fuserPrediction.currentLevel}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Páginas Restantes:</span>
                <p className="font-bold text-gray-900">{fuserPrediction.pagesRemaining.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-600">Páginas Usadas:</span>
                <p className="font-bold text-gray-900">{fuserPrediction.pagesUsed.toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                fuserPrediction.status === 'critical' ? 'bg-red-100 text-red-800' :
                fuserPrediction.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {fuserPrediction.status === 'critical' ? 'Crítico - Cambio Urgente' :
                 fuserPrediction.status === 'warning' ? 'Advertencia - Cambio Próximo' : 'Normal'}
              </span>
              <button
                onClick={() => handleChangeFuser()}
                className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Cambiar fusor"
              >
                <RefreshCcw size={12} />
                Cambiar Fusor
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sin Fusor Asignado - Mostrar botón para agregar */
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Settings size={16} className="mr-2 text-gray-600" />
            Estado del Fusor
          </h4>
          
          <div className="bg-white border border-gray-100 rounded-lg p-4 text-center">
            <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4">
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
            <h5 className="font-medium text-gray-900 mb-2">Sin Fusor Asignado</h5>
            <p className="text-sm text-gray-600 mb-4">
              Esta impresora no tiene un fusor registrado en el sistema
            </p>
            <button
              onClick={() => setShowRegisterFuser(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              Registrar Fusor
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderInventoryTab = () => (
    <div className="space-y-3">
      {printerInventory.length > 0 ? (
        printerInventory.map((item) => {
          const isFuser = fuserModels.some(model => model.name === item.tonerModel);
          return (
            <div key={item.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-semibold text-gray-900 flex items-center text-sm">
                    {item.tonerModel}
                    {isFuser && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Fusor
                      </span>
                    )}
                  </h5>
                  <p className="text-xs text-gray-600">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Actualizado: {format(item.updatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-bold ${
                    item.quantity === 0 ? 'text-red-600' :
                    item.quantity <= 2 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {item.quantity}
                  </span>
                  <p className="text-xs text-gray-500">unidades</p>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-6">
          <Package className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin inventario</h3>
          <p className="mt-1 text-xs text-gray-500">No hay toners asignados a esta impresora</p>
        </div>
      )}
    </div>
  );

  const renderOrdersTab = () => (
    <div className="space-y-3">
      {printerOrders.length > 0 ? (
        printerOrders
          .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
          .map((order) => (
            <div key={order.id} className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-semibold text-gray-900 text-sm">#{order.trackingNumber}</h5>
                  <p className="text-xs text-gray-600">{order.tonerModel}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pedido: {format(order.orderDate, 'dd/MM/yyyy', { locale: es })}
                  </p>
                  {order.arrivalDate && (
                    <p className="text-xs text-green-600 mt-1">
                      Llegó: {format(order.arrivalDate, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">{order.quantity}</span>
                  <p className="text-xs text-gray-500">unidades</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    order.status === 'llegado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'llegado' ? (
                      <>
                        <CheckCircle size={8} className="mr-1" />
                        Llegado
                      </>
                    ) : (
                      <>
                        <Clock size={8} className="mr-1" />
                        Pendiente
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))
      ) : (
        <div className="text-center py-6">
          <ShoppingCart className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin pedidos</h3>
          <p className="mt-1 text-xs text-gray-500">No hay pedidos registrados para esta impresora</p>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-3">
      {printerChanges.length > 0 ? (
        printerChanges
          .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime())
          .map((change) => {
            const isFuser = fuserModels.some(model => model.name === change.tonerModel);
            return (
              <div key={change.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-gray-900 flex items-center text-sm">
                      {change.tonerModel}
                      {isFuser && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Fusor
                        </span>
                      )}
                      {change.isBackup && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Backup
                        </span>
                      )}
                    </h5>
                    <div className="text-xs text-gray-600 space-y-1 mt-1">
                      <p><span className="font-medium">Responsable:</span> {change.responsible}</p>
                      <p><span className="font-medium">Operador:</span> {change.operator}</p>
                      <p><span className="font-medium">Ciclo Motor:</span> {change.motorCycle.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">
                      {format(change.changeDate, 'dd/MM/yyyy', { locale: es })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(change.changeDate, 'HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
      ) : (
        <div className="text-center py-6">
          <History className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h3>
          <p className="mt-1 text-xs text-gray-500">No hay cambios registrados para esta impresora</p>
        </div>
      )}
    </div>
  );

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
            className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header Compacto con información integrada */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{printer.model}</h2>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-blue-100">
                          <MapPin size={14} className="mr-1" />
                          <span className="text-sm font-medium">{printer.location}</span>
                        </div>
                        <div className="flex items-center text-blue-100">
                          <Network size={14} className="mr-1" />
                          <span className="text-sm font-medium">{printer.ip}</span>
                        </div>
                        {/* Próximo Cambio integrado */}
                        {printer.status === 'operativa' && (
                          <>
                            <div className="flex items-center text-blue-100">
                              <Clock size={14} className="mr-1" />
                              <span className="text-sm font-medium">
                                Próximo cambio: {tonerPrediction.daysUntilChange <= 0 ? 'HOY' : `${tonerPrediction.daysUntilChange}d`}
                              </span>
                            </div>
                            <div className="flex items-center text-blue-100">
                              <Calendar size={14} className="mr-1" />
                              <span className="text-sm font-medium">
                                {format(tonerPrediction.estimatedChangeDate, 'dd/MM/yyyy', { locale: es })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2 hover:bg-blue-600 rounded-lg transition-colors shadow-lg"
                        title="Editar impresora"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="p-2 hover:bg-red-600 rounded-lg transition-colors shadow-lg"
                        title="Eliminar impresora"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-blue-600 rounded-lg transition-colors shadow-lg"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <nav className="flex space-x-1 px-4 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-3 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'details' && renderDetailsTab()}
                  {activeTab === 'status' && renderStatusTab()}
                  {activeTab === 'inventory' && renderInventoryTab()}
                  {activeTab === 'orders' && renderOrdersTab()}
                  {activeTab === 'history' && renderHistoryTab()}
                </motion.div>
              </div>
            </div>

            {/* Footer con información de actualización */}
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex-shrink-0">
              <div className="text-xs text-gray-500 text-center font-medium">
                Actualizado: {format(printer.updatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}
              </div>
            </div>
          </motion.div>

          {/* Edit Printer Modal */}
          {showEditModal && (
            <EditPrinterModal
              printer={printer}
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
            />
          )}

          {/* Toner Model Management Modal */}
          {showTonerManagement && (
            <TonerModelManagementModal
              isOpen={showTonerManagement}
              onClose={() => setShowTonerManagement(false)}
              onSelect={(model) => handleTonerModelUpdate(model.name, model.capacity)}
            />
          )}

          {/* Color Selection Modal */}
          {showColorSelection && (
            <ColorSelectionModal
              isOpen={showColorSelection}
              onClose={() => setShowColorSelection(false)}
              onConfirm={handleColorTonerUpdate}
              initialToners={printer.colorToners || []}
            />
          )}

          {/* Edit Toner Level Modal */}
          {showEditTonerLevel && (
            <EditTonerLevelModal
              isOpen={showEditTonerLevel}
              onClose={() => setShowEditTonerLevel(false)}
              onConfirm={selectedColorToner?.type === 'fuser' ? handleFuserLevelUpdate : handleTonerLevelUpdate}
              printer={printer}
              selectedColorToner={selectedColorToner}
              isFuser={selectedColorToner?.type === 'fuser'}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onConfirm={handleDelete}
            title="Eliminar Impresora"
            message={
              <div>
                <p className="mb-2">
                  ¿Estás seguro de que deseas eliminar la impresora <strong>{printer.model}</strong>?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Información de la impresora:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Modelo: {printer.model}</p>
                    <p>• Ubicación: {printer.location}</p>
                    <p>• Serie: {printer.serial}</p>
                    <p>• IP: {printer.ip}</p>
                    <p>• Estado: {printer.status}</p>
                  </div>
                </div>
                <p className="text-sm text-red-600 mt-2">
                  Esta acción no se puede deshacer y eliminará toda la información relacionada con esta impresora.
                </p>
              </div>
            }
            confirmText="Eliminar Impresora"
            type="danger"
          />

          {/* Register Fuser Modal */}
          {showRegisterFuser && (
            <RegisterFuserModal
              isOpen={showRegisterFuser}
              onClose={() => setShowRegisterFuser(false)}
             printer={printer}
            />
          )}

          {/* Change Fuser Modal */}
          {showChangeFuser && printerFuser && (
            <ChangeFuserModal
              isOpen={showChangeFuser}
              onClose={() => setShowChangeFuser(false)}
              printer={printer}
              currentFuser={printerFuser}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}