import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Plus, Search, User, Printer, MapPin, FileText, AlertTriangle, CheckCircle, Copy, Trash2, Calendar, Clock, Filter, CreditCard as Edit, Check, Eye, ArrowRight, Hash, Hand, ChevronDown, Download, MoreVertical } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Ticket as TicketType } from '../types';
import { format, startOfDay, endOfDay, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale/es';
import AddTicketModal from './modals/AddTicketModal';
import EditTicketModal from './modals/EditTicketModal';
import TicketDetailsModal from './modals/TicketDetailsModal';
import ConfirmDialog from './modals/ConfirmDialog';
import TicketExportModal from './modals/TicketExportModal';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

export default function TicketsContainer() {
  const { tickets, printers, clearAllTickets, deleteTicket, updateTicket, updateMultipleTickets } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'incident'>('all');
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [hoveredTicket, setHoveredTicket] = useState<TicketType | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [copiedTickets, setCopiedTickets] = useState<Set<string>>(() => {
    // Cargar estado de tickets copiados desde localStorage
    const saved = localStorage.getItem('copiedTickets');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Guardar estado de tickets copiados en localStorage
  useEffect(() => {
    localStorage.setItem('copiedTickets', JSON.stringify([...copiedTickets]));
  }, [copiedTickets]);

  // Verificar automáticamente tickets que deben moverse al historial
  useEffect(() => {
    const checkTicketsForAutoMove = async () => {
      const now = new Date();
      const ticketsToUpdate: Array<{ id: string; ticket: Partial<TicketType> }> = [];
      const ticketsToRemoveFromCopied: string[] = [];

      for (const ticketId of copiedTickets) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          // Verificar si el ticket fue copiado (debe tener copiedAt)
          const copiedAt = (ticket as any).copiedAt;
          if (copiedAt) {
            const hoursSinceCopy = differenceInHours(now, new Date(copiedAt));
            if (hoursSinceCopy >= 20) {
              ticketsToUpdate.push({
                id: ticketId,
                ticket: {
                  movedToHistory: true,
                  historyMoveDate: now
                }
              });
              ticketsToRemoveFromCopied.push(ticketId);
            }
          } else {
            // Si está en copiedTickets pero no tiene copiedAt, moverlo también (MODIFICADO AQUI)
            ticketsToUpdate.push({
              id: ticketId,
              ticket: {
                movedToHistory: false,
                historyMoveDate: now
              }
            });
            ticketsToRemoveFromCopied.push(ticketId);
          }
        }
      }

      if (ticketsToUpdate.length > 0) {
        // Actualizar todos los tickets en una sola operación
        updateMultipleTickets(ticketsToUpdate);
        
        // Actualizar la base de datos para cada ticket
        for (const { id, ticket: ticketUpdate } of ticketsToUpdate) {
          const fullTicket = tickets.find(t => t.id === id);
          if (fullTicket) {
            const updatedTicket = { ...fullTicket, ...ticketUpdate, updatedAt: now };
            await supabaseService.update('tickets', updatedTicket);
          }
        }
        
        // Remover de copiedTickets los tickets que se movieron
        setCopiedTickets(prev => {
          const newSet = new Set(prev);
          ticketsToRemoveFromCopied.forEach(id => newSet.delete(id));
          return newSet;
        });
        
        if (ticketsToUpdate.length > 0) {
          toast.success(`${ticketsToUpdate.length} ticket(s) movido(s) automáticamente al historial`);
        }
      }
    };

    // Verificar cada 5 minutos
    const interval = setInterval(checkTicketsForAutoMove, 5 * 60 * 1000);
    
    // Verificar inmediatamente al cargar
    checkTicketsForAutoMove();

    return () => clearInterval(interval);
  }, [copiedTickets, updateMultipleTickets]); // Removed 'tickets' and 'updateTicket' from dependencies

  // Tickets del día actual (pestaña "Hoy")
  const todayTickets = useMemo(() => {
    const today = new Date();
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      const isToday = format(ticketDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      const isNotInHistory = !(ticket as any).movedToHistory;
      return isToday && isNotInHistory;
    });
  }, [tickets]);

  // Tickets del historial (pestaña "Historial")
  const historyTickets = useMemo(() => {
    const today = new Date();
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      const isNotToday = format(ticketDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd');
      const isInHistory = (ticket as any).movedToHistory;
      return isNotToday || isInHistory;
    });
  }, [tickets]);

  // Filtrar tickets según la pestaña activa
  const ticketsToShow = activeTab === 'today' ? todayTickets : historyTickets;

  // Filtrar tickets
  const filteredTickets = useMemo(() => {
    return ticketsToShow.filter(ticket => {
      const printer = printers.find(p => p.id === ticket.printerId);
      const printerInfo = printer ? `${printer.model} ${printer.location}` : '';
      
      const matchesSearch = 
        ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.assistanceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.assistanceDetail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printerInfo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = !dateFilter || 
        format(ticket.createdAt, 'yyyy-MM-dd') === dateFilter;

      const matchesType = typeFilter === 'all' || 
        (typeFilter === 'service' && ticket.isServiceRequest) ||
        (typeFilter === 'incident' && ticket.isIncident);

      return matchesSearch && matchesDate && matchesType;
    });
  }, [ticketsToShow, printers, searchTerm, dateFilter, typeFilter]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = tickets.length;
    const serviceRequests = tickets.filter(t => t.isServiceRequest).length;
    const incidents = tickets.filter(t => t.isIncident).length;
    const copied = todayTickets.filter(t => copiedTickets.has(t.id)).length;
    
    return { total, serviceRequests, incidents, copied };
  }, [tickets, todayTickets, copiedTickets]);

  // Agrupar tickets por día para la pestaña "Hoy"
  const ticketsByDay = useMemo(() => {
    if (activeTab !== 'today') return {};
    
    const grouped = filteredTickets.reduce((acc, ticket) => {
      const ticketDate = new Date(ticket.createdAt);
      const localYear = ticketDate.getFullYear();
      const localMonth = String(ticketDate.getMonth() + 1).padStart(2, '0');
      const localDay = String(ticketDate.getDate()).padStart(2, '0');
      const dayKey = `${localYear}-${localMonth}-${localDay}`;
      
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(ticket);
      return acc;
    }, {} as Record<string, TicketType[]>);

    // Ordenar cada día por hora de creación (más reciente primero)
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return grouped;
  }, [filteredTickets, activeTab]);

  // Obtener días ordenados (más reciente primero)
  const sortedDays = Object.keys(ticketsByDay).sort((a, b) => b.localeCompare(a));

  const handleEdit = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setShowEditModal(true);
  };

  const handleViewDetails = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const handleDelete = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedTicket) return;

    try {
      deleteTicket(selectedTicket.id);
      await supabaseService.delete('tickets', selectedTicket.id);
      
      // Remover de tickets copiados si existe
      if (copiedTickets.has(selectedTicket.id)) {
        setCopiedTickets(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedTicket.id);
          return newSet;
        });
      }
      
      toast.success('Ticket eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el ticket');
    }
  };

  const handleCopyTicket = async (ticket: TicketType) => {
    const printer = printers.find(p => p.id === ticket.printerId);
    const type = ticket.isServiceRequest ? 'Solicitud de Servicio' : 'Incidente';
    
    const ticketText = `TICKET - ${type}
Fecha: ${format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
Usuario: ${ticket.userName}
Área: ${ticket.area}
Impresora: ${printer?.model || 'No encontrada'} - ${printer?.location || 'N/A'}
IP: ${printer?.ip || 'N/A'}
Serie: ${printer?.serial || 'N/A'}
Título: ${ticket.assistanceTitle}
Detalle: ${ticket.assistanceDetail}`;

    try {
      await navigator.clipboard.writeText(ticketText);
      
      // Agregar el ticket a la lista de copiados
      setCopiedTickets(prev => new Set([...prev, ticket.id]));
      
      // Actualizar el ticket con timestamp de copiado
      const updatedTicket = {
        ...ticket,
        copiedAt: new Date(),
        updatedAt: new Date()
      };
      updateTicket(ticket.id, updatedTicket);
      await supabaseService.update('tickets', updatedTicket);
      
      toast.success('Ticket copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar el ticket');
    }
  };

  const handleMoveToHistory = async (ticket: TicketType) => {
    const hasBeenCopied = (ticket as any).copiedAt !== undefined;
    const isCopied = copiedTickets.has(ticket.id);
    
    if (!hasBeenCopied || !isCopied) {
      toast.error('Solo se pueden mover tickets que han sido copiados');
      return;
    }

    try {
      const updatedTicket = {
        ...ticket,
        movedToHistory: true,
        historyMoveDate: new Date(),
        updatedAt: new Date()
      };
      
      updateTicket(ticket.id, updatedTicket);
      await supabaseService.update('tickets', updatedTicket);
      
      // Remover de copiedTickets al mover manualmente
      setCopiedTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticket.id);
        return newSet;
      });
      
      toast.success('Ticket movido al historial');
    } catch (error) {
      toast.error('Error al mover el ticket al historial');
    }
  };

  const handleCopyAll = async () => {
    if (filteredTickets.length === 0) {
      toast.error('No hay tickets para copiar');
      return;
    }

    const ticketsText = filteredTickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((ticket, index) => {
        const printer = printers.find(p => p.id === ticket.printerId);
        const type = ticket.isServiceRequest ? 'Solicitud de Servicio' : 'Incidente';
        
        return `${index + 1}. TICKET - ${type}
Fecha: ${format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
Usuario: ${ticket.userName}
Área: ${ticket.area}
Impresora: ${printer?.model || 'No encontrada'} - ${printer?.location || 'N/A'}
IP: ${printer?.ip || 'N/A'}
Serie: ${printer?.serial || 'N/A'}
Título: ${ticket.assistanceTitle}
Detalle: ${ticket.assistanceDetail}
---`;
      }).join('\n\n');

    try {
      await navigator.clipboard.writeText(ticketsText);
      toast.success(`${filteredTickets.length} ticket(s) copiado(s) al portapapeles`);
    } catch (error) {
      toast.error('Error al copiar los tickets');
    }
  };

  const handleDeleteAll = async () => {
    try {
      for (const ticket of tickets) {
        await supabaseService.delete('tickets', ticket.id);
      }
      clearAllTickets();
      setCopiedTickets(new Set()); // Limpiar tickets copiados
      toast.success(`${tickets.length} ticket(s) eliminado(s) exitosamente`);
    } catch (error) {
      toast.error('Error al eliminar los tickets');
    }
  };

  const handleUserHover = (ticket: TicketType, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredTicket(ticket);
  };

  const handleUserLeave = () => {
    setHoveredTicket(null);
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg mr-4">
              <Ticket size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sistema de Tickets</h2>
              <p className="text-gray-600">Gestión de solicitudes de servicio e incidentes</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Nuevo Ticket
          </button>
        </div>

        {/* Estadísticas - Solo las más relevantes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-xl text-center shadow-lg">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90">Total</div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-xl text-center shadow-lg">
            <div className="text-3xl font-bold">{stats.serviceRequests}</div>
            <div className="text-sm opacity-90">Solicitudes</div>
          </div>
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-xl text-center shadow-lg">
            <div className="text-3xl font-bold">{stats.incidents}</div>
            <div className="text-sm opacity-90">Incidentes</div>
          </div>
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-4 rounded-xl text-center shadow-lg">
            <div className="text-3xl font-bold">{stats.copied}</div>
            <div className="text-sm opacity-90">Copiados</div>
          </div>
        </div>
      </div>

      {/* Filtros y controles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por usuario, área, título o impresora..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value="service">Solicitudes de Servicio</option>
                <option value="incident">Incidentes</option>
              </select>
            </div>
          </div>

          {/* Botones de acción - Solo mostrar en pestaña Historial */}
          {activeTab === 'history' && (
            <div className="flex gap-2">
              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <MoreVertical size={20} />
                  Acciones
                  <ChevronDown size={16} />
                </button>
                
                {showActionsDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        handleCopyAll();
                        setShowActionsDropdown(false);
                      }}
                      disabled={filteredTickets.length === 0}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Copy size={16} />
                      Copiar Todo
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowExportModal(true);
                        setShowActionsDropdown(false);
                      }}
                      disabled={filteredTickets.length === 0}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      Exportar
                    </button>
                    
                    <hr className="my-1" />
                    
                    {tickets.length > 0 && (
                      <button
                        onClick={() => {
                          setShowDeleteAllDialog(true);
                          setShowActionsDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 size={16} />
                        Limpiar Historial
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'today'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>Hoy</span>
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  {todayTickets.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === 'history'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={16} />
                <span>Historial</span>
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                  {historyTickets.length}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'today' ? (
            // Pestaña "Hoy" - Vista de tarjetas
            sortedDays.length > 0 ? (
              <div className="space-y-8">
                {sortedDays.map((dayKey, dayIndex) => {
                  const dayTickets = ticketsByDay[dayKey];
                  const [year, month, day] = dayKey.split('-').map(Number);
                  const dayDate = new Date(year, month - 1, day);
                  
                  const today = new Date();
                  const todayKey = format(today, 'yyyy-MM-dd');
                  const isToday = dayKey === todayKey;
                  
                  let dayLabel = format(dayDate, 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es });
                  if (isToday) dayLabel = `Hoy - ${dayLabel}`;
                  
                  return (
                    <motion.div
                      key={dayKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: dayIndex * 0.1 }}
                      className="space-y-4"
                    >
                      {/* Day Header */}
                      <div className={`sticky top-0 z-10 p-4 rounded-lg shadow-sm ${
                        isToday ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 
                        'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold flex items-center">
                            <Calendar size={20} className="mr-2" />
                            {dayLabel}
                          </h3>
                          <div className="flex items-center space-x-3">
                            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                              {dayTickets.length} ticket{dayTickets.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Day Tickets */}
                      <div className="space-y-4">
                        {dayTickets.map((ticket, ticketIndex) => {
                          const printer = printers.find(p => p.id === ticket.printerId);
                          const isCopied = copiedTickets.has(ticket.id);
                          const hasBeenCopied = (ticket as any).copiedAt !== undefined;
                          
                          return (
                            <motion.div
                              key={ticket.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: (dayIndex * 0.1) + (ticketIndex * 0.05) }}
                              className={`rounded-lg p-6 hover:shadow-md transition-all ${
                                isToday ? 'bg-purple-50' : 'bg-gray-50'
                              } border ${
                                hasBeenCopied && isCopied 
                                  ? 'border-green-500 border-2 shadow-green-100 shadow-lg' 
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-4">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className={`p-2 rounded-lg ${
                                      ticket.isServiceRequest ? 'bg-green-100' : 'bg-red-100'
                                    }`}>
                                      {ticket.isServiceRequest ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                      ) : (
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-lg font-bold text-gray-900">
                                        {ticket.assistanceTitle}
                                      </h4>
                                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                                        <span className="flex items-center">
                                          <User size={14} className="mr-1" />
                                          {ticket.userName}
                                        </span>
                                        <span className="flex items-center">
                                          <MapPin size={14} className="mr-1" />
                                          {ticket.area}
                                        </span>
                                        <span className="flex items-center">
                                          <Clock size={14} className="mr-1" />
                                          {format(ticket.createdAt, 'HH:mm', { locale: es })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mb-4">
                                    <p className="text-gray-700 leading-relaxed">
                                      {ticket.assistanceDetail}
                                    </p>
                                  </div>

                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                                      <Printer size={16} className="mr-2 text-blue-600" />
                                      Información de la Impresora
                                    </h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div>
                                        <span className="text-gray-600">Modelo:</span>
                                        <p className="font-medium">{printer?.model || 'No encontrada'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Ubicación:</span>
                                        <p className="font-medium">{printer?.location || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">IP:</span>
                                        <p className="font-medium">{printer?.ip || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Serie:</span>
                                        <p className="font-medium">{printer?.serial || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col space-y-3">
                                  {/* Type Badge */}
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    ticket.isServiceRequest 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {ticket.isServiceRequest ? 'Solicitud de Servicio' : 'Incidente'}
                                  </span>
                                  
                                  {/* Indicador visual de estado de copiado */}
                                  
                                  
                                  {/* Action Buttons */}
                                  <div className="flex flex-col space-y-2">
                                    <button
                                      onClick={() => handleCopyTicket(ticket)}
                                      className={`p-2 rounded-lg transition-all flex items-center justify-center border ${
                                        hasBeenCopied && isCopied
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300' 
                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300'
                                      }`}
                                      title="Copiar ticket"
                                    >
                                      {hasBeenCopied && isCopied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                    
                                    {hasBeenCopied && isCopied && (
                                      <button
                                        onClick={() => handleMoveToHistory(ticket)}
                                        className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
                                        title="Mover al historial"
                                      >
                                        <ArrowRight size={16} />
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => handleEdit(ticket)}
                                      className="p-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors flex items-center justify-center"
                                      title="Editar ticket"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    
                                    <button
                                      onClick={() => handleDelete(ticket)}
                                      className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors flex items-center justify-center"
                                      title="Eliminar ticket"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => setShowAddModal(ticket)}
                                      className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center justify-center"
                                      title="Duplicar ticket"
                                    >
                                      <Copy size={16} />
                                      
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-purple-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <Calendar className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Sin tickets para hoy
                </h3>
                <p className="text-gray-500 mt-2">
                  No hay tickets registrados para el día de hoy
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus size={20} />
                  Crear Primer Ticket
                </button>
              </div>
            )
          ) : (
            // Pestaña "Historial" - Vista de tabla
            filteredTickets.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Historial de Tickets
                  </h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <Hand className="h-4 w-4 mr-2 text-blue-600" />
                    <span>Arrastra para desplazar horizontalmente</span>
                  </div>
                </div>
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          ID
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Nombre de Usuario
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                          Ubicación
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Serie
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Fecha
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Tipo
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTickets
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((ticket, index) => {
                          const printer = printers.find(p => p.id === ticket.printerId);
                          
                          return (
                            <motion.tr
                              key={ticket.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  {ticket.id.slice(0, 8)}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div 
                                  className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                  onMouseEnter={(e) => handleUserHover(ticket, e)}
                                  onMouseLeave={handleUserLeave}
                                >
                                  {ticket.userName}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{printer?.location || 'N/A'}</div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm font-mono text-gray-900">{printer?.serial || 'N/A'}</div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  ticket.isServiceRequest 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {ticket.isServiceRequest ? 'Servicio' : 'Incidente'}
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => handleViewDetails(ticket)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Ver detalles"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(ticket)}
                                    className="text-yellow-600 hover:text-yellow-800 transition-colors"
                                    title="Editar ticket"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(ticket)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Eliminar ticket"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Sin tickets en el historial
                </h3>
                <p className="text-gray-500 mt-2">
                  {historyTickets.length === 0 
                    ? 'No hay tickets en el historial' 
                    : 'No se encontraron tickets con los filtros aplicados'}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <AddTicketModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && selectedTicket && (
        <EditTicketModal
          ticket={selectedTicket}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Ticket Details Modal */}
      {showDetailsModal && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <TicketExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          tickets={tickets}
          printers={printers}
        />
      )}

      {/* Hover Tooltip */}
      {hoveredTicket && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm"
          >
            {/* Header */}
            <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
              <div className={`p-1.5 rounded-lg ${
                hoveredTicket.isServiceRequest ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {hoveredTicket.isServiceRequest ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm leading-tight">
                  {hoveredTicket.assistanceTitle}
                </h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  hoveredTicket.isServiceRequest 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {hoveredTicket.isServiceRequest ? 'Servicio' : 'Incidente'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              {/* Detalle */}
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Detalle</span>
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                  {hoveredTicket.assistanceDetail}
                </p>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</span>
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <Calendar size={12} className="mr-1 text-blue-600" />
                    {format(hoveredTicket.createdAt, 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora</span>
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <Clock size={12} className="mr-1 text-blue-600" />
                    {format(hoveredTicket.createdAt, 'HH:mm', { locale: es })}
                  </p>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ubicación</span>
                <p className="text-sm font-medium text-gray-900 flex items-center">
                  <MapPin size={12} className="mr-1 text-blue-600" />
                  {hoveredTicket.area}
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Single Ticket Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Ticket"
        message={
          selectedTicket ? (
            <div>
              <p className="mb-2">
                ¿Estás seguro de que deseas eliminar este ticket?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Título:</strong> {selectedTicket.assistanceTitle}</p>
                  <p><strong>Usuario:</strong> {selectedTicket.userName}</p>
                  <p><strong>Área:</strong> {selectedTicket.area}</p>
                  <p><strong>Fecha:</strong> {format(selectedTicket.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>
              </div>
              <p className="text-sm text-red-600 mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>
          ) : ''
        }
        confirmText="Eliminar Ticket"
        type="danger"
      />

      {/* Delete All Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        onConfirm={handleDeleteAll}
        title="Limpiar Historial de Tickets"
        message={
          <div>
            <p className="mb-2">
              Estás a punto de eliminar <strong>{tickets.length} ticket(s)</strong> del historial.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-2">Tickets a eliminar:</p>
              {tickets.slice(0, 10).map((ticket, index) => (
                <p key={ticket.id} className="text-xs text-gray-600">
                  {index + 1}. {ticket.assistanceTitle} - {ticket.userName} ({ticket.area})
                </p>
              ))}
              {tickets.length > 10 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... y {tickets.length - 10} más
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