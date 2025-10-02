export interface Printer {
  id: string;
  brand: string;
  model: string;
  location: string;
  type: 'monocromatica' | 'color';
  ip: string;
  hostname?: string;
  serial: string;
  status: 'operativa' | 'disponible' | 'instalada' | 'retirada';
  status: 'operativa' | 'disponible' | 'backup' | 'retirada';
  sede?: string;
  hostnameServer?: string;
  ipServer?: string;
  tonerCapacity: number;
  currentTonerLevel: number;
  dailyUsage: number;
  motorCycle: number;
  tonerModel: string;
  colorToners?: ColorToner[];
  hasBackupToner?: boolean;
  motorCyclePending?: boolean;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColorToner {
  id: string;
  color: 'cian' | 'magenta' | 'amarillo' | 'negro' | 'negro_fotografico' | 'negro_mate' | 'gris' | 'cian_claro' | 'magenta_claro';
  colorCode: string;
  model: string;
  capacity: number;
  currentLevel: number;
}

export interface ColorTonerPrediction {
  color: string;
  colorCode: string;
  currentLevel: number;
  adjustedLevel: number;
  daysUntilChange: number;
  pagesRemaining: number;
  estimatedChangeDate: Date;
  status: 'critical' | 'warning' | 'normal';
}

export interface TonerInventory {
  id: string;
  printerId: string;
  tonerModel: string;
  description: string;
  quantity: number;
  onLoan: boolean;
  loanMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TonerOrder {
  id: string;
  trackingNumber: string;
  printerId: string;
  colorTonerId?: string; // Para pedidos de impresoras a color
  tonerModel: string;
  description: string;
  quantity: number;
  orderDate: Date;
  arrivalDate?: Date;
  status: 'pendiente' | 'llegado';
  reason?: string;
  emailSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TonerChange {
  id: string;
  changeDate: Date;
  printerId: string;
  printerSerial: string;
  tonerModel: string;
  motorCycle: number;
  printerIp: string;
  responsible: string;
  operator: string;
  isBackup?: boolean;
  motorCyclePending?: boolean;
  createdAt: Date;
}

export interface TonerLoan {
  id: string;
  inventoryId: string;
  lenderPrinterId: string;
  borrowerPrinterId: string;
  lenderLocation: string;
  borrowerLocation: string;
  tonerModel: string;
  quantity: number;
  loanDate: Date;
  returnDate?: Date;
  loanMessage: string;
  returnedBy?: string;
  isReturned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmptyToner {
  id: string;
  tonerModel: string;
  printerModel: string;
  printerLocation: string;
  changeDate: Date;
  category?: 'area' | 'warehouse' | 'shipped'; // Opcional, por defecto 'warehouse'
  status: 'pending_cycle' | 'ready_pickup' | 'ready_shipping' | 'shipped';
  isBackup: boolean;
  motorCycleCaptured?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface User {
  id: string;
  name: string;
  contact: string;
  position: string;
  empresa?: string;
  usuarioWindows?: string;
}

export interface Operator {
  id: string;
  name: string;
  contact: string;
  location: string;
}

export interface TonerModel {
  id: string;
  name: string;
  capacity?: number;
  description?: string;
}

export interface FuserModel {
  id: string;
  name: string;
  lifespan: number;
  description?: string;
}

export interface PrinterFuser {
  id: string;
  printerId: string;
  fuserModel: string;
  lifespan: number;
  pagesUsed: number;
  installationDate: Date;
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FuserPredictionData {
  currentLevel: number;
  pagesRemaining: number;
  status: 'critical' | 'warning' | 'normal';
  pagesUsed: number;
  lifespan: number;
  daysElapsed?: number;
  hoursElapsed?: number;
  estimatedUsage?: number;
}

export interface PredictionData {
  daysUntilChange: number;
  pagesRemaining: number;
  estimatedChangeDate: Date;
  status: 'critical' | 'warning' | 'normal';
  adjustedTonerLevel?: number;
  daysElapsed?: number;
  hoursElapsed?: number;
  estimatedConsumption?: number;
}

export interface TicketTemplate {
  id: string;
  title: string;
  detail: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  userName: string;
  printerId: string;
  area: string;
  assistanceTitle: string;
  assistanceDetail: string;
  isServiceRequest: boolean;
  isIncident: boolean;
  createdAt: Date;
  updatedAt: Date;
}