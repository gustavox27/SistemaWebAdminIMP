import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, TimeScale } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { 
  Printer, 
  Package, 
  ShoppingCart, 
  History, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  Calendar,
  Settings,
  Eye,
  Filter,
  ChevronDown,
  RefreshCcw,
  User,
  MapPin,
  Bell
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateTonerPrediction, getStatusColor, getStatusText } from '../utils/predictions';
import { getColorPrinterPrediction } from '../utils/colorPrinterUtils';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale/es';
import PrinterDetailsModal from './modals/PrinterDetailsModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, TimeScale);

export default function Dashboard() {
  const { printers, inventory, orders, changes, emptyToners } = useStore();
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showPrinterDetails, setShowPrinterDetails] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedSede, setSelectedSede] = useState<string>('all');

  // Obtener lista de sedes disponibles
  const availableSedes = useMemo(() => {
    const sedes = [...new Set(printers.map(p => p.sede || 'Sin sede'))].sort();
    return sedes;
  }, [printers]);

  // Filtrar datos por sede seleccionada
  const filteredPrinters = useMemo(() => {
    if (selectedSede === 'all') return printers;
    return printers.filter(p => (p.sede || 'Sin sede') === selectedSede);
  }, [printers, selectedSede]);

  const filteredInventory = useMemo(() => {
    if (selectedSede === 'all') return inventory;
    const sedeprinterIds = filteredPrinters.map(p => p.id);
    return inventory.filter(item => sedeprinterIds.includes(item.printerId));
  }, [inventory, filteredPrinters, selectedSede]);

  const filteredOrders = useMemo(() => {
    if (selectedSede === 'all') return orders;
    const sedeprinterIds = filteredPrinters.map(p => p.id);
    return orders.filter(order => sedeprinterIds.includes(order.printerId));
  }, [orders, filteredPrinters, selectedSede]);

  const filteredChanges = useMemo(() => {
    if (selectedSede === 'all') return changes;
    const sedeprinterIds = filteredPrinters.map(p => p.id);
    return changes.filter(change => sedeprinterIds.includes(change.printerId));
  }, [changes, filteredPrinters, selectedSede]);

  // Calcular métricas principales
  const metrics = useMemo(() => {
    const totalPrinters = filteredPrinters.length;
    const totalInventory = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);
    const pendingOrders = filteredOrders.filter(order => order.status === 'pendiente').length;
    const recentChanges = filteredChanges.filter(change => {
      const changeDate = new Date(change.changeDate);
      const sevenDaysAgo = subDays(new Date(), 7);
      return changeDate >= sevenDaysAgo;
    }).length;
    const pendingMotorCycles = filteredPrinters.filter(printer => printer.motorCyclePending).length;

    return {
      totalPrinters,
      totalInventory,
      pendingOrders,
      recentChanges,
      pendingMotorCycles
    };
  }, [filteredPrinters, filteredInventory, filteredOrders, filteredChanges]);

  // Impresoras críticas ordenadas por proximidad de cambio
  const criticalPrinters = useMemo(() => {
    return filteredPrinters
      .map(printer => ({
        ...printer,
        prediction: printer.type === 'color' 
          ? getColorPrinterPrediction(printer)
          : calculateTonerPrediction(printer)
      }))
      .filter(printer => printer.prediction.status === 'critical')
      .sort((a, b) => a.prediction.daysUntilChange - b.prediction.daysUntilChange);
  }, [filteredPrinters]);

  // Próximos cambios (próximos 7 días)
  const upcomingChanges = useMemo(() => {
    return filteredPrinters
      .map(printer => ({
        ...printer,
        prediction: printer.type === 'color' 
          ? getColorPrinterPrediction(printer)
          : calculateTonerPrediction(printer)
      }))
      .filter(printer => 
        printer.prediction.daysUntilChange <= 7 && 
        printer.prediction.status !== 'critical'
      )
      .sort((a, b) => a.prediction.daysUntilChange - b.prediction.daysUntilChange);
  }, [filteredPrinters]);

  // Datos para gráfico de pastel - Estado de impresoras
  const printerStatusData = useMemo(() => {
    const statusCounts = filteredPrinters.reduce((acc, printer) => {
      acc[printer.status] = (acc[printer.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(statusCounts).map(status => 
        status.charAt(0).toUpperCase() + status.slice(1)
      ),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#10B981', // green - operativa
          '#3B82F6', // blue - disponible
          '#F59E0B', // yellow - backup
          '#6B7280'  // gray - retirada
        ],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4
      }]
    };
  }, [filteredPrinters]);

  // Datos para gráfico de barras - Cambios por período
  const changesChartData = useMemo(() => {
    const now = new Date();
    let labels: string[] = [];
    let data: number[] = [];

    if (chartPeriod === 'daily') {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        labels.push(format(date, 'dd/MM', { locale: es }));
        
        const dayChanges = filteredChanges.filter(change => {
          const changeDate = new Date(change.changeDate);
          return format(changeDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        }).length;
        
        data.push(dayChanges);
      }
    } else if (chartPeriod === 'weekly') {
      // Últimas 4 semanas
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
        
        labels.push(`Sem ${format(weekStart, 'dd/MM', { locale: es })}`);
        
        const weekChanges = filteredChanges.filter(change => {
          const changeDate = new Date(change.changeDate);
          return isWithinInterval(changeDate, { start: weekStart, end: weekEnd });
        }).length;
        
        data.push(weekChanges);
      }
    } else {
      // Últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subDays(now, i * 30));
        const monthEnd = endOfMonth(subDays(now, i * 30));
        
        labels.push(format(monthStart, 'MMM', { locale: es }));
        
        const monthChanges = filteredChanges.filter(change => {
          const changeDate = new Date(change.changeDate);
          return isWithinInterval(changeDate, { start: monthStart, end: monthEnd });
        }).length;
        
        data.push(monthChanges);
      }
    }

    return {
      labels,
      datasets: [{
        label: 'Cambios de Toner',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
  }, [filteredChanges, chartPeriod]);

  // Actividad reciente (última semana)
  const recentActivity = useMemo(() => {
    const oneWeekAgo = subDays(new Date(), 7);
    const activities = [];
    
    // Cambios recientes
    const recentChanges = filteredChanges
      .filter(change => new Date(change.changeDate) >= oneWeekAgo)
      .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime())
      .slice(0, 8)
      .map(change => {
        const printer = filteredPrinters.find(p => p.id === change.printerId);
        return {
          type: 'change',
          icon: RefreshCcw,
          title: 'Se cambió de tóner',
          description: `${change.tonerModel} - ${printer?.location || 'Impresora eliminada'}`,
          operator: change.operator,
          time: change.changeDate,
          color: 'text-green-600 bg-green-100'
        };
      });

    // Pedidos recientes
    const recentOrders = filteredOrders
      .filter(order => new Date(order.orderDate) >= oneWeekAgo)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 4)
      .map(order => {
        const printer = filteredPrinters.find(p => p.id === order.printerId);
        return {
          type: 'order',
          icon: ShoppingCart,
          title: order.status === 'llegado' ? 'Pedido recibido' : 'Nuevo pedido',
          description: `${order.tonerModel} - ${printer?.location || 'Impresora eliminada'}`,
          operator: `${order.quantity} unidades`,
          time: order.status === 'llegado' && order.arrivalDate ? order.arrivalDate : order.orderDate,
          color: order.status === 'llegado' ? 'text-blue-600 bg-blue-100' : 'text-yellow-600 bg-yellow-100'
        };
      });

    return [...recentChanges, ...recentOrders]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);
  }, [filteredChanges, filteredOrders, filteredPrinters]);

  // Resumen por estado de toner
  const tonerStatusSummary = useMemo(() => {
    const summary = filteredPrinters.reduce((acc, printer) => {
      const prediction = printer.type === 'color' 
        ? getColorPrinterPrediction(printer)
        : calculateTonerPrediction(printer);
      
      if (prediction.status === 'critical') {
        acc.critical++;
      } else if (prediction.status === 'warning') {
        acc.warning++;
      } else {
        acc.normal++;
      }
      
      return acc;
    }, { critical: 0, warning: 0, normal: 0 });

    return summary;
  }, [filteredPrinters]);

  const handleViewPrinter = (printer: any) => {
    setSelectedPrinter(printer);
    setShowPrinterDetails(true);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `Cambios de Toner - Vista ${chartPeriod === 'daily' ? 'Diaria' : chartPeriod === 'weekly' ? 'Semanal' : 'Mensual'}`,
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#374151'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 12
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Filtro por Sede */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-100"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
              <Filter className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Monitoreo por Sede</h2>
              <p className="text-sm md:text-base text-gray-600 hidden sm:block">Filtra el dashboard por sede específica</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <label className="text-sm font-medium text-gray-700 sm:inline-block">Sede:</label>
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium sm:min-w-48"
              >
                <option value="all">Todas las Sedes</option>
                {availableSedes.map((sede) => (
                  <option key={sede} value={sede}>
                    {sede}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {selectedSede !== 'all' && (
              <div className="bg-blue-50 px-3 py-1 rounded-full text-center sm:text-left">
                <span className="text-sm font-medium text-blue-800">
                  {filteredPrinters.length} impresoras
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs md:text-sm font-medium uppercase tracking-wide">Total Impresoras</p>
              <p className="text-3xl md:text-4xl font-bold mt-1 md:mt-2">{metrics.totalPrinters}</p>
              <p className="text-blue-200 text-xs mt-1 hidden sm:block">Registradas en el sistema</p>
            </div>
            <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">
              <Printer className="h-6 w-6 md:h-8 md:w-8 text-blue-200" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-600 to-green-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Inventario Total</p>
              <p className="text-4xl font-bold mt-2">{metrics.totalInventory}</p>
              <p className="text-green-200 text-xs mt-1">Toners disponibles</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Package className="h-8 w-8 text-green-200" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-600 to-yellow-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium uppercase tracking-wide">Pedidos Pendientes</p>
              <p className="text-4xl font-bold mt-2">{metrics.pendingOrders}</p>
              <p className="text-yellow-200 text-xs mt-1">En proceso</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <ShoppingCart className="h-8 w-8 text-yellow-200" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium uppercase tracking-wide">Cambios Recientes</p>
              <p className="text-4xl font-bold mt-2">{metrics.recentChanges}</p>
              <p className="text-purple-200 text-xs mt-1">Última semana</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <History className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium uppercase tracking-wide">Ciclos Pendientes</p>
              <p className="text-4xl font-bold mt-2">{metrics.pendingMotorCycles}</p>
              <p className="text-orange-200 text-xs mt-1">Por capturar</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Settings className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Primera fila - Impresoras críticas y Estado de impresoras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Impresoras Críticas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="bg-red-100 p-2 rounded-lg mr-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              Impresoras Críticas
            </h3>
            <div className="flex items-center space-x-2">
              <span className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full">
                {criticalPrinters.length}
              </span>
              {criticalPrinters.length > 0 && (
                <Bell className="h-5 w-5 text-red-500 animate-pulse" />
              )}
            </div>
          </div>
          
          <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
            {criticalPrinters.length > 0 ? (
              criticalPrinters.map((printer, index) => (
                <motion.div
                  key={printer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 hover:bg-red-100 transition-all duration-200 cursor-pointer group"
                  onClick={() => handleViewPrinter(printer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                        {printer.model}
                      </h4>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin size={14} className="mr-1" />
                        {printer.location}
                      </p>
                      <div className="flex items-center mt-3">
                        <div className="w-20 bg-gray-200 rounded-full h-3 mr-3">
                          <div
                            className="bg-red-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${printer.prediction.adjustedTonerLevel || printer.currentTonerLevel}%` }}
                          />
                        </div>
                        <span className="text-sm text-red-600 font-bold">
                          {Math.round(printer.prediction.adjustedTonerLevel || printer.currentTonerLevel)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-red-600">
                        {printer.prediction.daysUntilChange <= 0 ? 'HOY' : `${printer.prediction.daysUntilChange}d`}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {format(printer.prediction.estimatedChangeDate, 'dd/MM/yyyy', { locale: es })}
                      </p>
                      <Eye className="h-5 w-5 text-gray-400 mt-2 mx-auto group-hover:text-red-500 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">¡Excelente!</h4>
                <p className="text-gray-600 mt-2">No hay impresoras en estado crítico</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Estado de Impresoras */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            Estado de Impresoras
          </h3>
          
          <div className="h-72">
            {filteredPrinters.length > 0 ? (
              <Pie data={printerStatusData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                    <Printer className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Sin impresoras registradas</p>
                  <p className="text-gray-400 text-sm mt-1">en la sede seleccionada</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Segunda fila - Gráfico de cambios y Próximos cambios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Cambios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              Cambios de Toner
            </h3>
            <select
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          
          <div className="h-72">
            <Bar data={changesChartData} options={barChartOptions} />
          </div>
        </motion.div>

        {/* Próximos Cambios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              Próximos Cambios
            </h3>
            <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
              Próximos 7 días
            </span>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {upcomingChanges.length > 0 ? (
              upcomingChanges.map((printer, index) => (
                <motion.div
                  key={printer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + index * 0.1 }}
                  className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 hover:bg-yellow-100 transition-all duration-200 cursor-pointer group"
                  onClick={() => handleViewPrinter(printer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 group-hover:text-yellow-700 transition-colors">
                        {printer.model}
                      </h4>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin size={14} className="mr-1" />
                        {printer.location}
                      </p>
                      <div className="flex items-center mt-3">
                        <div className="w-20 bg-gray-200 rounded-full h-3 mr-3">
                          <div
                            className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${
                              printer.type === 'color' && 'averageLevel' in printer.prediction
                                ? printer.prediction.averageLevel
                                : 'adjustedTonerLevel' in printer.prediction 
                                  ? printer.prediction.adjustedTonerLevel || printer.currentTonerLevel
                                  : printer.currentTonerLevel
                            }%` }}
                          />
                        </div>
                        <span className="text-sm text-yellow-600 font-bold">
                          {Math.round(
                            printer.type === 'color' && 'averageLevel' in printer.prediction
                              ? printer.prediction.averageLevel
                              : 'adjustedTonerLevel' in printer.prediction 
                                ? printer.prediction.adjustedTonerLevel || printer.currentTonerLevel
                                : printer.currentTonerLevel
                          )}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-yellow-600">
                        {printer.prediction.daysUntilChange}d
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {format(printer.prediction.estimatedChangeDate, 'dd/MM/yyyy', { locale: es })}
                      </p>
                      <Eye className="h-5 w-5 text-gray-400 mt-2 mx-auto group-hover:text-yellow-500 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Calendar className="h-12 w-12 text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Sin cambios próximos</h4>
                <p className="text-gray-600 mt-2">No hay cambios programados para los próximos 7 días</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tercera fila - Actividad reciente y Resumen por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Actividad Reciente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-green-100 p-2 rounded-lg mr-3">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            Actividad Reciente
            <span className="ml-3 bg-gray-100 text-gray-800 text-sm font-bold px-2 py-1 rounded-full">
              Última semana
            </span>
          </h3>
          
          <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + index * 0.05 }}
                  className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                >
                  <div className={`p-3 rounded-full shadow-sm ${activity.color}`}>
                    <activity.icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500 flex items-center">
                        <User size={12} className="mr-1" />
                        {activity.operator}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {format(new Date(activity.time), 'dd/MM HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Activity className="h-12 w-12 text-gray-400" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Sin actividad reciente</h4>
                <p className="text-gray-600 mt-2">No hay actividad registrada en la última semana</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Resumen por Estado de Toner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-indigo-100 p-2 rounded-lg mr-3">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            Resumen por Estado de Toner
          </h3>
          
          <div className="space-y-6">
            {/* Estado Crítico */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg hover:shadow-md transition-all duration-200">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full mr-4 shadow-lg"></div>
                <div>
                  <p className="font-bold text-red-800 text-lg">Crítico</p>
                  <p className="text-sm text-red-600">Cambio urgente requerido</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-red-600">{tonerStatusSummary.critical}</span>
                <p className="text-sm text-red-500 font-medium">impresoras</p>
              </div>
            </div>

            {/* Estado Advertencia */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg hover:shadow-md transition-all duration-200">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-yellow-500 rounded-full mr-4 shadow-lg"></div>
                <div>
                  <p className="font-bold text-yellow-800 text-lg">Advertencia</p>
                  <p className="text-sm text-yellow-600">Cambio próximo (≤7 días)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-yellow-600">{tonerStatusSummary.warning}</span>
                <p className="text-sm text-yellow-500 font-medium">impresoras</p>
              </div>
            </div>

            {/* Estado Normal */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg hover:shadow-md transition-all duration-200">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full mr-4 shadow-lg"></div>
                <div>
                  <p className="font-bold text-green-800 text-lg">Normal</p>
                  <p className="text-sm text-green-600">Funcionamiento óptimo</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-green-600">{tonerStatusSummary.normal}</span>
                <p className="text-sm text-green-500 font-medium">impresoras</p>
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-lg p-5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-400 rounded-full mr-3"></div>
                  <span className="text-gray-700 font-medium">Toners vacíos almacenados:</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg ${emptyToners.length >= 45 ? 'text-red-600' : 'text-gray-900'}`}>
                    {emptyToners.length}
                  </span>
                  <span className="text-gray-500 text-sm">/50</span>
                </div>
              </div>
              {emptyToners.length >= 45 && (
                <div className="mt-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                  <p className="text-sm text-red-600 font-medium">
                    Cerca del límite de almacenamiento
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal de detalles de impresora */}
      {showPrinterDetails && selectedPrinter && (
        <PrinterDetailsModal
          printer={selectedPrinter}
          isOpen={showPrinterDetails}
          onClose={() => setShowPrinterDetails(false)}
        />
      )}

      {/* Estilos personalizados para scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    </div>
  );
}