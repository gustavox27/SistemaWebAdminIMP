import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, 
  Package, 
  ShoppingCart, 
  History, 
  BarChart3,
  Menu,
  X,
  Bell,
  AlertTriangle,
  Trash2,
  Settings,
  Ticket,
  FileText
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { calculateTonerPrediction, updatePrinterTonerLevel } from '../utils/predictions';
import { getColorPrinterPrediction } from '../utils/colorPrinterUtils';
import { calculateFuserPrediction, updatePrinterFuserUsage } from '../utils/fuserPredictions';
import toast, { Toaster } from 'react-hot-toast';
import NotificationsModal from './modals/NotificationsModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { 
    printers, 
    emptyToners, 
    printerFusers,
    tickets,
    ticketTemplates,
    setPrinters, 
    setInventory, 
    setOrders, 
    setChanges, 
    setLoans, 
    setUsers, 
    setOperators, 
    setTonerModels, 
    setEmptyToners,
    setFuserModels, 
    setPrinterFusers,
    setTickets,
    setTicketTemplates,
    updatePrinterFuser
  } = useStore();
  
  useEffect(() => {
    loadInitialData();

    const interval = setInterval(checkCriticalPrinters, 3600000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadActiveTab = async () => {
      const savedTab = await supabaseService.getAppSetting('activeTab');
      if (savedTab && savedTab !== activeTab) {
        onTabChange(savedTab);
      }
    };
    loadActiveTab();
  }, []);

  useEffect(() => {
    supabaseService.setAppSetting('activeTab', activeTab);
  }, [activeTab]);
  
  const loadInitialData = async () => {
    try {
      await supabaseService.init();

      const [printersData, inventoryData, ordersData, changesData, loansData, usersData, operatorsData, tonerModelsData, emptyTonersData, fuserModelsData, printerFusersData, ticketsData, ticketTemplatesData] = await Promise.all([
        supabaseService.getAll('printers'),
        supabaseService.getAll('inventory'),
        supabaseService.getAll('orders'),
        supabaseService.getAll('changes'),
        supabaseService.getAll('loans'),
        supabaseService.getAll('users'),
        supabaseService.getAll('operators'),
        supabaseService.getAll('tonerModels'),
        supabaseService.getAll('emptyToners'),
        supabaseService.getAll('fuserModels'),
        supabaseService.getAll('printerFusers'),
        supabaseService.getAll('tickets'),
        supabaseService.getAll('ticketTemplates')
      ]);

      if (printersData.length > 0) {
        const processedPrinters = printersData.map(printer => {
          const updatedPrinter = updatePrinterTonerLevel(printer);

          if (Math.abs(printer.currentTonerLevel - updatedPrinter.currentTonerLevel) > 0.1) {
            supabaseService.update('printers', updatedPrinter).catch(console.error);
          }

          return updatedPrinter;
        });

        setPrinters(processedPrinters);

        if (printerFusersData.length > 0) {
          const processedFusers = printerFusersData.map(fuser => {
            const printer = processedPrinters.find(p => p.id === fuser.printerId);
            if (!printer) return fuser;

            const updatedFuser = updatePrinterFuserUsage(printer, fuser);

            if (Math.abs(fuser.pagesUsed - updatedFuser.pagesUsed) > 1) {
              supabaseService.update('printerFusers', updatedFuser).catch(console.error);
            }

            return updatedFuser;
          });

          setPrinterFusers(processedFusers);
        }

        const updatedCount = processedPrinters.filter((p, index) =>
          Math.abs(printersData[index].currentTonerLevel - p.currentTonerLevel) > 0.1
        ).length;

        if (updatedCount > 0) {
          setTimeout(() => {
            toast(`${updatedCount} impresora(s) con niveles de toner actualizados automáticamente`, {
              duration: 6000,
              icon: '🔄'
            });
          }, 2000);
        }
      }

      const defaultUser = await supabaseService.getAppSetting('defaultUser');
      const defaultOperator = await supabaseService.getAppSetting('defaultOperator');

      if (defaultUser) useStore.getState().setDefaultUser(defaultUser);
      if (defaultOperator) useStore.getState().setDefaultOperator(defaultOperator);

      if (inventoryData.length > 0) setInventory(inventoryData);
      if (ordersData.length > 0) setOrders(ordersData);
      if (changesData.length > 0) setChanges(changesData);
      if (loansData.length > 0) setLoans(loansData);
      if (usersData.length > 0) setUsers(usersData);
      if (operatorsData.length > 0) setOperators(operatorsData);
      if (tonerModelsData.length > 0) setTonerModels(tonerModelsData);
      if (emptyTonersData.length > 0) setEmptyToners(emptyTonersData);
      if (fuserModelsData.length > 0) setFuserModels(fuserModelsData);
      if (printerFusersData.length > 0) setPrinterFusers(printerFusersData);
      if (ticketsData.length > 0) setTickets(ticketsData);
      if (ticketTemplatesData.length > 0) setTicketTemplates(ticketTemplatesData);

    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar los datos iniciales');
    }
  };

  const checkCriticalPrinters = () => {
    const criticalPrinters = printers.filter(printer => {
      const prediction = printer.type === 'color' 
        ? getColorPrinterPrediction(printer)
        : calculateTonerPrediction(printer);
      return prediction.status === 'critical';
    });

    // Verificar fusores críticos
    const criticalFusers = printerFusers.filter(fuser => {
      const printer = printers.find(p => p.id === fuser.printerId);
      if (!printer) return false;
      
      const fuserPrediction = calculateFuserPrediction(printer, fuser);
      return fuserPrediction.status === 'critical';
    });

    const warningFusers = printerFusers.filter(fuser => {
      const printer = printers.find(p => p.id === fuser.printerId);
      if (!printer) return false;
      
      const fuserPrediction = calculateFuserPrediction(printer, fuser);
      return fuserPrediction.status === 'warning';
    });

    if (criticalPrinters.length > 0) {
      toast.error(
        `¡Atención! ${criticalPrinters.length} impresora(s) necesitan cambio de toner urgente`,
        { duration: 8000 }
      );
    }

    if (criticalFusers.length > 0) {
      toast.error(
        `¡Atención! ${criticalFusers.length} impresora(s) necesitan cambio de fusor urgente`,
        { duration: 8000, icon: '🔥' }
      );
    }

    if (warningFusers.length > 0) {
      toast(
        `Advertencia: ${warningFusers.length} impresora(s) necesitan cambio de fusor próximamente`,
        { duration: 6000, icon: '⚠️' }
      );
    }
    
    // Verificar toners vacíos
    if (emptyToners.length >= 45) {
      toast.error(
        `¡Advertencia! Tienes ${emptyToners.length} toners vacíos. Considera gestionar el envío.`,
        { duration: 8000 }
      );
    }
    
    // Verificar si hay impresoras que necesitan actualización automática de nivel
    const printersNeedingUpdate = printers.filter(printer => {
      if (printer.type === 'color') {
        return false; // Las impresoras a color se actualizan de forma diferente
      }
      const prediction = calculateTonerPrediction(printer);
      return 'hoursElapsed' in prediction && prediction.hoursElapsed! >= 24; // Más de 24 horas sin actualizar
    });
    
    if (printersNeedingUpdate.length > 0) {
      toast(
        `${printersNeedingUpdate.length} impresora(s) tienen niveles de toner actualizados automáticamente`,
        { duration: 6000 }
      );
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'printers', label: 'Impresoras', icon: Printer },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'empty-toners', label: 'Devolución', icon: Trash2 },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'daily-report', label: 'Reporte (D)', icon: FileText },
    { id: 'reports', label: 'Reporte (G)', icon: FileText },
    { id: 'configuration', label: 'Configuración', icon: Settings }
  ];

  const criticalCount = printers.filter(printer => {
    const prediction = printer.type === 'color' 
      ? getColorPrinterPrediction(printer)
      : calculateTonerPrediction(printer);
    return prediction.status === 'critical';
  }).length;

  const criticalFuserCount = printerFusers.filter(fuser => {
    const printer = printers.find(p => p.id === fuser.printerId);
    if (!printer) return false;
    
    const fuserPrediction = calculateFuserPrediction(printer, fuser);
    return fuserPrediction.status === 'critical';
  }).length;

  const emptyTonersWarning = emptyToners.length >= 45;
  
  // Contar tickets del día actual
  const todayTicketsCount = tickets.filter(ticket => {
    const today = new Date();
    const ticketDate = new Date(ticket.createdAt);
    return ticketDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e40af',
            color: '#fff',
          },
        }}
      />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white lg:hidden"
          >
            <div className="flex items-center justify-between h-16 px-6 bg-blue-800">
              <h1 className="text-xl font-bold text-white">Sistema Toner</h1>
              <button
                className="lg:hidden text-white hover:text-gray-200 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <nav className="mt-8 flex-1">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
                    activeTab === item.id
                      ? 'bg-blue-800 text-white border-r-4 border-blue-400'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <item.icon size={20} className="mr-3" />
                  <span className="font-medium">{item.label}</span>
                  {item.id === 'printers' && criticalCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {criticalCount}
                    </span>
                  )}
                  {item.id === 'printers' && criticalFuserCount > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      F{criticalFuserCount}
                    </span>
                  )}
                  {item.id === 'empty-toners' && emptyTonersWarning && (
                    <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      {emptyToners.length}
                    </span>
                  )}
                  {item.id === 'tickets' && todayTicketsCount > 0 && (
                    <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      {todayTicketsCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Notifications section */}
            {(criticalCount > 0 || criticalFuserCount > 0 || emptyTonersWarning) && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="space-y-2">
                  {criticalCount > 0 && (
                    <div className="bg-red-600 text-white p-3 rounded-lg shadow-lg">
                      <div className="flex items-center">
                        <Bell size={16} className="mr-2 animate-pulse" />
                        <span className="text-sm font-medium">
                          {criticalCount} impresora{criticalCount > 1 ? 's' : ''} crítica{criticalCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                  {criticalFuserCount > 0 && (
                    <div className="bg-orange-600 text-white p-3 rounded-lg shadow-lg">
                      <div className="flex items-center">
                        <Settings size={16} className="mr-2 animate-pulse" />
                        <span className="text-sm font-medium">
                          {criticalFuserCount} fusor{criticalFuserCount > 1 ? 'es' : ''} crítico{criticalFuserCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                  {emptyTonersWarning && (
                    <div className="bg-yellow-600 text-white p-3 rounded-lg shadow-lg">
                      <div className="flex items-center">
                        <Trash2 size={16} className="mr-2 animate-pulse" />
                        <span className="text-sm font-medium">
                          {emptyToners.length} toners vacíos
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:bg-blue-900 lg:text-white transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-800">
          {!sidebarCollapsed && <h1 className="text-xl font-bold text-white">Sistema General</h1>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            title={sidebarCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="mt-8 flex-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'px-4 justify-center' : 'px-6'} py-3 text-left transition-colors duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-800 text-white border-r-4 border-blue-400'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon size={20} className="mr-3" />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              {item.id === 'printers' && criticalCount > 0 && !sidebarCollapsed && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {criticalCount}
                </span>
              )}
              {item.id === 'printers' && criticalFuserCount > 0 && !sidebarCollapsed && (
                <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                  F{criticalFuserCount}
                </span>
              )}
              {item.id === 'empty-toners' && emptyTonersWarning && !sidebarCollapsed && (
                <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                  {emptyToners.length}
                </span>
              )}
              {item.id === 'tickets' && todayTicketsCount > 0 && !sidebarCollapsed && (
                <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  {todayTicketsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Notifications section */}
        {(criticalCount > 0 || criticalFuserCount > 0 || emptyTonersWarning) && !sidebarCollapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="space-y-2">
              {criticalCount > 0 && (
                <div className="bg-red-600 text-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Bell size={16} className="mr-2 animate-pulse" />
                    <span className="text-sm font-medium">
                      {criticalCount} impresora{criticalCount > 1 ? 's' : ''} crítica{criticalCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              {criticalFuserCount > 0 && (
                <div className="bg-orange-600 text-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Settings size={16} className="mr-2 animate-pulse" />
                    <span className="text-sm font-medium">
                      {criticalFuserCount} fusor{criticalFuserCount > 1 ? 'es' : ''} crítico{criticalFuserCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
              {emptyTonersWarning && (
                <div className="bg-yellow-600 text-white p-3 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Trash2 size={16} className="mr-2 animate-pulse" />
                    <span className="text-sm font-medium">
                      {emptyToners.length} toners vacíos
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors p-2 touch-target"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div className="flex-1 lg:flex-none px-2 sm:px-0">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 capitalize truncate">
                {activeTab === 'dashboard' ? 'Panel de Control' :
                 activeTab === 'printers' ? 'Gestión de Impresoras' :
                 activeTab === 'inventory' ? 'Inventario de Toner' :
                 activeTab === 'orders' ? 'Pedidos de Toner' :
                 activeTab === 'history' ? 'Historial de Cambios' :
                activeTab === 'empty-toners' ? 'Devolución de Suministros' :
                activeTab === 'tickets' ? 'Gestión de Tickets de Soporte' :
                activeTab === 'daily-report' ? 'Reporte Diario de Impresoras' :
                activeTab === 'reports' ? 'Reportes Generales' :
                activeTab === 'configuration' ? 'Configuración del Sistema' : activeTab}
              </h2>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {(criticalCount > 0 || criticalFuserCount > 0 || emptyTonersWarning) && (
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors touch-target"
                  title="Ver notificaciones"
                >
                  <Bell className={`${criticalCount > 0 || criticalFuserCount > 0 ? 'text-red-500' : 'text-yellow-500'} animate-pulse`} size={20} />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {criticalCount + criticalFuserCount + (emptyTonersWarning ? 1 : 0)}
                  </span>
                </button>
              )}

              <div className="text-xs sm:text-sm text-gray-500 hidden md:block">
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className="text-xs text-gray-500 md:hidden">
                {new Date().toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <div className="max-w-full">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationsModal
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          criticalPrinters={printers.filter(printer => {
            const prediction = calculateTonerPrediction(printer);
            return prediction.status === 'critical';
          })}
          criticalFusers={printerFusers.filter(fuser => {
            const printer = printers.find(p => p.id === fuser.printerId);
            if (!printer) return false;
            
            const fuserPrediction = calculateFuserPrediction(printer, fuser);
            return fuserPrediction.status === 'critical' || fuserPrediction.status === 'warning';
          })}
          emptyTonersCount={emptyToners.length}
          emptyTonersWarning={emptyTonersWarning}
        />
      )}
    </div>
  );
}