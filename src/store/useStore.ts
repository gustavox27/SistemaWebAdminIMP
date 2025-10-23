import { create } from 'zustand';
import { Printer, TonerInventory, TonerOrder, TonerChange, User, Operator, TonerModel, TonerLoan, EmptyToner, FuserModel, PrinterFuser, Ticket, TicketTemplate } from '../types';

interface AppState {
  printers: Printer[];
  inventory: TonerInventory[];
  orders: TonerOrder[];
  changes: TonerChange[];
  loans: TonerLoan[];
  emptyToners: EmptyToner[];
  users: User[];
  operators: Operator[];
  tonerModels: TonerModel[];
  fuserModels: FuserModel[];
  printerFusers: PrinterFuser[];
  tickets: Ticket[];
  ticketTemplates: TicketTemplate[];
  
  // Default values for users and operators
  defaultUser: string;
  defaultOperator: string;
  
  // Actions
  setPrinters: (printers: Printer[]) => void;
  addPrinter: (printer: Printer) => void;
  updatePrinter: (id: string, printer: Partial<Printer>) => void;
  deletePrinter: (id: string) => void;
  
  // Nueva acción para actualizar múltiples impresoras
  updateMultiplePrinters: (printers: Printer[]) => void;
  
  setInventory: (inventory: TonerInventory[]) => void;
  addInventory: (item: TonerInventory) => void;
  updateInventory: (id: string, item: Partial<TonerInventory>) => void;
  deleteInventory: (id: string) => void;
  clearAllInventory: () => void;
  
  setOrders: (orders: TonerOrder[]) => void;
  addOrder: (order: TonerOrder) => void;
  updateOrder: (id: string, order: Partial<TonerOrder>) => void;
  deleteOrder: (id: string) => void;
  clearAllOrders: () => void;
  
  // Auto-tracking number generation
  getNextTrackingNumber: () => string;
  
  setChanges: (changes: TonerChange[]) => void;
  addChange: (change: TonerChange) => void;
  deleteTonerChange: (id: string) => void;
  clearAllHistory: () => void;
  deleteChange: (id: string) => void;
  clearAllChanges: () => void;
  updateChange: (id: string, change: Partial<TonerChange>) => void;
  
  setEmptyToners: (emptyToners: EmptyToner[]) => void;
  addEmptyToner: (emptyToner: EmptyToner) => void;
  deleteEmptyToner: (id: string) => void;
  updateEmptyToner: (id: string, emptyToner: Partial<EmptyToner>) => void;
  clearAllEmptyToners: () => void;
  
  setLoans: (loans: TonerLoan[]) => void;
  addLoan: (loan: TonerLoan) => void;
  updateLoan: (id: string, loan: Partial<TonerLoan>) => void;
  deleteLoan: (id: string) => void;
  clearAllLoans: () => void;
  
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  
  setOperators: (operators: Operator[]) => void;
  addOperator: (operator: Operator) => void;
  updateOperator: (id: string, operator: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  
  setTonerModels: (models: TonerModel[]) => void;
  addTonerModel: (model: TonerModel) => void;
  updateTonerModel: (id: string, model: Partial<TonerModel>) => void;
  deleteTonerModel: (id: string) => void;
  
  setFuserModels: (models: FuserModel[]) => void;
  addFuserModel: (model: FuserModel) => void;
  updateFuserModel: (id: string, model: Partial<FuserModel>) => void;
  deleteFuserModel: (id: string) => void;
  
  setPrinterFusers: (fusers: PrinterFuser[]) => void;
  addPrinterFuser: (fuser: PrinterFuser) => void;
  updatePrinterFuser: (id: string, fuser: Partial<PrinterFuser>) => void;
  deletePrinterFuser: (id: string) => void;
  
  
  // Tickets actions
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, ticket: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  clearAllTickets: () => void;
  
  // Ticket Templates actions
  setTicketTemplates: (templates: TicketTemplate[]) => void;
  addTicketTemplate: (template: TicketTemplate) => void;
  updateTicketTemplate: (id: string, template: Partial<TicketTemplate>) => void;
  deleteTicketTemplate: (id: string) => void;
  
  // Default values actions
  setDefaultUser: (userName: string) => void;
  setDefaultOperator: (operatorName: string) => void;
}

export const useStore = create<AppState>((set) => ({
  printers: [],
  inventory: [],
  orders: [],
  changes: [],
  loans: [],
  emptyToners: [],
  users: [
    { 
      id: '1', 
      name: 'Freddy Moscoso', 
      contact: '', 
      position: 'Responsable',
      empresa: 'Gloria S.A.',
      usuarioWindows: 'fmoscoso'
    }
  ],
  operators: [
    { id: '1', name: 'Gustavo Corrales', contact: '960950894', location: 'Planta Gloria - Huachipa' }
  ],
  tonerModels: [
    { id: '1', name: 'W9004mc', description: '' },
    { id: '2', name: 'W9008mc', description: '' }
  ],
  fuserModels: [
    { id: '1', name: 'RM2-5425', lifespan: 100000, description: 'Fusor HP LaserJet' },
    { id: '2', name: 'RM2-6308', lifespan: 150000, description: 'Fusor HP LaserJet Pro' }
  ],
  printerFusers: [],
  tickets: [],
  ticketTemplates: [
    {
      id: '1',
      title: 'Problema de Impresión',
      detail: 'La impresora no está imprimiendo correctamente. Se requiere revisión técnica para identificar y solucionar el problema.',
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      title: 'Atasco de Papel',
      detail: 'Se ha detectado un atasco de papel en la impresora. Se necesita asistencia para remover el papel atascado y verificar el funcionamiento.',
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      title: 'Mantenimiento Preventivo',
      detail: 'Solicitud de mantenimiento preventivo programado para la impresora. Incluye limpieza, calibración y verificación de componentes.',
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  // Default values
  defaultUser: 'Freddy Moscoso',
  defaultOperator: 'Gustavo',
  
  setPrinters: (printers) => set({ printers }),
  addPrinter: (printer) => set((state) => ({ printers: [...state.printers, printer] })),
  updatePrinter: (id, printer) => set((state) => ({
    printers: state.printers.map(p => p.id === id ? { ...p, ...printer, updatedAt: new Date() } : p)
  })),
  deletePrinter: (id) => set((state) => ({
    printers: state.printers.filter(p => p.id !== id)
  })),
  
  updateMultiplePrinters: (updatedPrinters) => set({ printers: updatedPrinters }),
  
  setInventory: (inventory) => set({ inventory }),
  addInventory: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
  updateInventory: (id, item) => set((state) => ({
    inventory: state.inventory.map(i => i.id === id ? { ...i, ...item, updatedAt: new Date() } : i)
  })),
  deleteInventory: (id) => set((state) => ({
    inventory: state.inventory.filter(i => i.id !== id)
  })),
  clearAllInventory: () => set({ inventory: [] }),
  
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  updateOrder: (id, order) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, ...order } : o)
  })),
  deleteOrder: (id) => set((state) => ({
    orders: state.orders.filter(o => o.id !== id)
  })),
  clearAllOrders: () => set({ orders: [] }),
  
  getNextTrackingNumber: () => {
    const state = useStore.getState();
    const existingNumbers = state.orders.map(order => {
      const match = order.trackingNumber.match(/(\d{6})$/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = Math.max(0, ...existingNumbers);
    return (maxNumber + 1).toString().padStart(6, '0');
  },
  
  setChanges: (changes) => set({ changes }),
  addChange: (change) => set((state) => ({ changes: [...state.changes, change] })),
  deleteTonerChange: (id) => set((state) => ({
    changes: state.changes.filter(c => c.id !== id)
  })),
  clearAllHistory: () => set({ changes: [] }),
  deleteChange: (id) => set((state) => ({
    changes: state.changes.filter(c => c.id !== id)
  })),
  clearAllChanges: () => set({ changes: [] }),
  updateChange: (id, change) => set((state) => ({
    changes: state.changes.map(c => c.id === id ? { ...c, ...change } : c)
  })),
  
  setEmptyToners: (emptyToners) => set({ emptyToners }),
  addEmptyToner: (emptyToner) => set((state) => ({ emptyToners: [...state.emptyToners, emptyToner] })),
  deleteEmptyToner: (id) => set((state) => ({
    emptyToners: state.emptyToners.filter(e => e.id !== id)
  })),
  updateEmptyToner: (id, emptyToner) => set((state) => ({
    emptyToners: state.emptyToners.map(e => e.id === id ? { ...e, ...emptyToner } : e)
  })),
  clearAllEmptyToners: () => set({ emptyToners: [] }),
  
  setLoans: (loans) => set({ loans }),
  addLoan: (loan) => set((state) => ({ loans: [...state.loans, loan] })),
  updateLoan: (id, loan) => set((state) => ({
    loans: state.loans.map(l => l.id === id ? { ...l, ...loan, updatedAt: new Date() } : l)
  })),
  deleteLoan: (id) => set((state) => ({
    loans: state.loans.filter(l => l.id !== id)
  })),
  clearAllLoans: () => set({ loans: [] }),
  
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, user) => set((state) => ({
    users: state.users.map(u => u.id === id ? { ...u, ...user } : u)
  })),
  deleteUser: (id) => set((state) => ({
    users: state.users.filter(u => u.id !== id)
  })),
  
  setOperators: (operators) => set({ operators }),
  addOperator: (operator) => set((state) => ({ operators: [...state.operators, operator] })),
  updateOperator: (id, operator) => set((state) => ({
    operators: state.operators.map(o => o.id === id ? { ...o, ...operator } : o)
  })),
  deleteOperator: (id) => set((state) => ({
    operators: state.operators.filter(o => o.id !== id)
  })),
  
  setTonerModels: (models) => set({ tonerModels: models }),
  addTonerModel: (model) => set((state) => ({ tonerModels: [...state.tonerModels, model] })),
  updateTonerModel: (id, model) => set((state) => ({
    tonerModels: state.tonerModels.map(m => m.id === id ? { ...m, ...model } : m)
  })),
  deleteTonerModel: (id) => set((state) => ({
    tonerModels: state.tonerModels.filter(m => m.id !== id)
  })),
  
  setFuserModels: (models) => set({ fuserModels: models }),
  addFuserModel: (model) => set((state) => ({ fuserModels: [...state.fuserModels, model] })),
  updateFuserModel: (id, model) => set((state) => ({
    fuserModels: state.fuserModels.map(m => m.id === id ? { ...m, ...model } : m)
  })),
  deleteFuserModel: (id) => set((state) => ({
    fuserModels: state.fuserModels.filter(m => m.id !== id)
  })),
  
  setPrinterFusers: (fusers) => set({ printerFusers: fusers }),
  addPrinterFuser: (fuser) => set((state) => ({ printerFusers: [...state.printerFusers, fuser] })),
  updatePrinterFuser: (id, fuser) => set((state) => ({
    printerFusers: state.printerFusers.map(f => f.id === id ? { ...f, ...fuser, updatedAt: new Date() } : f)
  })),
  deletePrinterFuser: (id) => set((state) => ({
    printerFusers: state.printerFusers.filter(f => f.id !== id)
  })),
  
  // Tickets actions
  setTickets: (tickets) => set({ tickets }),
  addTicket: (ticket) => set((state) => ({ tickets: [...state.tickets, ticket] })),
  updateTicket: (id, ticket) => set((state) => ({
    tickets: state.tickets.map(t => t.id === id ? { ...t, ...ticket, updatedAt: new Date() } : t)
  })),
  updateMultipleTickets: (updates: Array<{ id: string; ticket: Partial<Ticket> }>) => set((state) => ({
    tickets: state.tickets.map(t => {
      const update = updates.find(u => u.id === t.id);
      return update ? { ...t, ...update.ticket, updatedAt: new Date() } : t;
    })
  })),
  deleteTicket: (id) => set((state) => ({
    tickets: state.tickets.filter(t => t.id !== id)
  })),
  clearAllTickets: () => set({ tickets: [] }),
  
  // Ticket Templates actions
  setTicketTemplates: (templates) => set({ ticketTemplates: templates }),
  addTicketTemplate: (template) => set((state) => ({ ticketTemplates: [...state.ticketTemplates, template] })),
  updateTicketTemplate: (id, template) => set((state) => ({
    ticketTemplates: state.ticketTemplates.map(t => t.id === id ? { ...t, ...template, updatedAt: new Date() } : t)
  })),
  deleteTicketTemplate: (id) => set((state) => ({
    ticketTemplates: state.ticketTemplates.filter(t => t.id !== id)
  })),
  
  setDefaultUser: (userName) => set({ defaultUser: userName }),
  setDefaultOperator: (operatorName) => set({ defaultOperator: operatorName }),
}));