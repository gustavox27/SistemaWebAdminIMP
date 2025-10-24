import React, { useState } from 'react';
import {
  FileText,
  Users,
  History,
  TrendingUp,
  PieChart,
  BarChart,
  Package,
  ShoppingCart,
  Printer,
  Clock
} from 'lucide-react';
import UserReportModal from './modals/UserReportModal';
import HistoryReportModal from './modals/HistoryReportModal';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  status: 'active' | 'development';
  onClick?: () => void;
}

export default function ReportsContainer() {
  const [showUserReportModal, setShowUserReportModal] = useState(false);
  const [showHistoryReportModal, setShowHistoryReportModal] = useState(false);

  const reportCards: ReportCard[] = [
    {
      id: 'users',
      title: 'Reporte de Usuarios',
      description: 'Genera reportes de tickets por usuario con filtros de fecha',
      icon: Users,
      color: 'bg-blue-500',
      status: 'active',
      onClick: () => setShowUserReportModal(true)
    },
    {
      id: 'history',
      title: 'Reporte de Historial',
      description: 'Genera reportes del historial de cambios de toner',
      icon: History,
      color: 'bg-green-500',
      status: 'active',
      onClick: () => setShowHistoryReportModal(true)
    },
    {
      id: 'printers-analysis',
      title: 'Análisis de Impresoras',
      description: 'Métricas de uso, rendimiento y estado de impresoras',
      icon: Printer,
      color: 'bg-purple-500',
      status: 'development'
    },
    {
      id: 'inventory-trends',
      title: 'Tendencias de Inventario',
      description: 'Análisis de movimientos y niveles de inventario de toner',
      icon: Package,
      color: 'bg-orange-500',
      status: 'development'
    },
    {
      id: 'orders-analysis',
      title: 'Análisis de Pedidos',
      description: 'Estadísticas de pedidos, tiempos de entrega y proveedores',
      icon: ShoppingCart,
      color: 'bg-cyan-500',
      status: 'development'
    },
    {
      id: 'consumption-forecast',
      title: 'Previsión de Consumo',
      description: 'Predicción de necesidades futuras basada en patrones históricos',
      icon: TrendingUp,
      color: 'bg-indigo-500',
      status: 'development'
    },
    {
      id: 'cost-analysis',
      title: 'Análisis de Costos',
      description: 'Reporte de costos operativos y eficiencia económica',
      icon: PieChart,
      color: 'bg-pink-500',
      status: 'development'
    },
    {
      id: 'performance-metrics',
      title: 'Métricas de Rendimiento',
      description: 'KPIs y métricas clave del sistema de gestión',
      icon: BarChart,
      color: 'bg-teal-500',
      status: 'development'
    },
    {
      id: 'maintenance-schedule',
      title: 'Programación de Mantenimiento',
      description: 'Planificación y seguimiento de mantenimientos preventivos',
      icon: Clock,
      color: 'bg-amber-500',
      status: 'development'
    },
    {
      id: 'custom-reports',
      title: 'Reportes Personalizados',
      description: 'Crea y guarda tus propios reportes personalizados',
      icon: FileText,
      color: 'bg-slate-500',
      status: 'development'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes Generales</h1>
          <p className="mt-1 text-sm text-gray-600">
            Genera y analiza reportes del sistema de gestión
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((card) => (
          <div
            key={card.id}
            className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden ${
              card.status === 'active' ? 'cursor-pointer hover:scale-105' : 'opacity-75'
            }`}
            onClick={card.status === 'active' ? card.onClick : undefined}
          >
            <div className={`${card.color} p-4 flex items-center justify-between`}>
              <card.icon size={32} className="text-white" />
              {card.status === 'development' && (
                <span className="bg-white text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                  En Desarrollo
                </span>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {card.description}
              </p>
            </div>

            {card.status === 'active' && (
              <div className="px-6 pb-4">
                <button
                  className={`w-full ${card.color} text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity`}
                >
                  Generar Reporte
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showUserReportModal && (
        <UserReportModal
          isOpen={showUserReportModal}
          onClose={() => setShowUserReportModal(false)}
        />
      )}

      {showHistoryReportModal && (
        <HistoryReportModal
          isOpen={showHistoryReportModal}
          onClose={() => setShowHistoryReportModal(false)}
        />
      )}
    </div>
  );
}
