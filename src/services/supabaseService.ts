import { supabase } from './supabase';
import {
  Printer,
  TonerInventory,
  TonerOrder,
  TonerChange,
  User,
  Operator,
  TonerModel,
  TonerLoan,
  EmptyToner,
  FuserModel,
  PrinterFuser,
  Ticket,
  TicketTemplate
} from '../types';

type TableName =
  | 'printers'
  | 'toner_inventory'
  | 'toner_orders'
  | 'toner_changes'
  | 'users'
  | 'operators'
  | 'toner_models'
  | 'toner_loans'
  | 'empty_toners'
  | 'fuser_models'
  | 'printer_fusers'
  | 'tickets'
  | 'ticket_templates';

type DataType =
  | Printer
  | TonerInventory
  | TonerOrder
  | TonerChange
  | User
  | Operator
  | TonerModel
  | TonerLoan
  | EmptyToner
  | FuserModel
  | PrinterFuser
  | Ticket
  | TicketTemplate;

const tableMapping: Record<string, TableName> = {
  'printers': 'printers',
  'inventory': 'toner_inventory',
  'orders': 'toner_orders',
  'changes': 'toner_changes',
  'users': 'users',
  'operators': 'operators',
  'tonerModels': 'toner_models',
  'loans': 'toner_loans',
  'emptyToners': 'empty_toners',
  'fuserModels': 'fuser_models',
  'printerFusers': 'printer_fusers',
  'tickets': 'tickets',
  'ticketTemplates': 'ticket_templates'
};

const fieldMapping: Record<string, Record<string, string>> = {
  'toner_inventory': {
    'printerId': 'printer_id',
    'tonerModel': 'toner_model',
    'onLoan': 'on_loan',
    'loanMessage': 'loan_message',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'toner_orders': {
    'trackingNumber': 'tracking_number',
    'printerId': 'printer_id',
    'colorTonerId': 'color_toner_id',
    'tonerModel': 'toner_model',
    'orderDate': 'order_date',
    'arrivalDate': 'arrival_date',
    'emailSent': 'email_sent',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'toner_changes': {
    'changeDate': 'change_date',
    'printerId': 'printer_id',
    'printerSerial': 'printer_serial',
    'tonerModel': 'toner_model',
    'motorCycle': 'motor_cycle',
    'printerIp': 'printer_ip',
    'isBackup': 'is_backup',
    'motorCyclePending': 'motor_cycle_pending',
    'createdAt': 'created_at'
  },
  'toner_loans': {
    'inventoryId': 'inventory_id',
    'lenderPrinterId': 'lender_printer_id',
    'borrowerPrinterId': 'borrower_printer_id',
    'lenderLocation': 'lender_location',
    'borrowerLocation': 'borrower_location',
    'tonerModel': 'toner_model',
    'loanDate': 'loan_date',
    'returnDate': 'return_date',
    'loanMessage': 'loan_message',
    'returnedBy': 'returned_by',
    'isReturned': 'is_returned',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'empty_toners': {
    'tonerModel': 'toner_model',
    'printerModel': 'printer_model',
    'printerLocation': 'printer_location',
    'changeDate': 'change_date',
    'isBackup': 'is_backup',
    'motorCycleCaptured': 'motor_cycle_captured',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'fuser_models': {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'printer_fusers': {
    'printerId': 'printer_id',
    'fuserModel': 'fuser_model',
    'pagesUsed': 'pages_used',
    'installationDate': 'installation_date',
    'lastUpdate': 'last_update',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'printers': {
    'hostnameServer': 'hostname_server',
    'ipServer': 'ip_server',
    'tonerCapacity': 'toner_capacity',
    'currentTonerLevel': 'current_toner_level',
    'dailyUsage': 'daily_usage',
    'motorCycle': 'motor_cycle',
    'tonerModel': 'toner_model',
    'colorToners': 'color_toners',
    'hasBackupToner': 'has_backup_toner',
    'motorCyclePending': 'motor_cycle_pending',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'users': {
    'usuarioWindows': 'usuario_windows',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'operators': {
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'toner_models': {
    'tonerModel': 'toner_model',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'tickets': {
    'userName': 'user_name',
    'printerId': 'printer_id',
    'assistanceTitle': 'assistance_title',
    'assistanceDetail': 'assistance_detail',
    'isServiceRequest': 'is_service_request',
    'isIncident': 'is_incident',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  },
  'ticket_templates': {
    'usageCount': 'usage_count',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  }
};

function convertToSnakeCase(storeName: string, obj: any): any {
  const tableName = tableMapping[storeName] || storeName;
  const mapping = fieldMapping[tableName] || {};

  const converted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = mapping[key] || key;
    converted[snakeKey] = value;
  }

  return converted;
}

function convertToCamelCase(storeName: string, obj: any): any {
  if (!obj) return obj;

  const tableName = tableMapping[storeName] || storeName;
  const mapping = fieldMapping[tableName] || {};

  const reverseMapping: Record<string, string> = {};
  for (const [camel, snake] of Object.entries(mapping)) {
    reverseMapping[snake] = camel;
  }

  const converted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = reverseMapping[key] || key;
    converted[camelKey] = value;
  }

  return converted;
}

export class SupabaseService {
  async init(): Promise<void> {
    return Promise.resolve();
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    try {
      const tableName = tableMapping[storeName] || storeName;
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      return data ? convertToCamelCase(storeName, data) as T : null;
    } catch (error) {
      console.error(`Error getting ${storeName}:`, error);
      throw error;
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const tableName = tableMapping[storeName] || storeName;
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data ? data.map(item => convertToCamelCase(storeName, item) as T) : [];
    } catch (error) {
      console.error(`Error getting all ${storeName}:`, error);
      throw error;
    }
  }

  async add<T>(storeName: string, data: T): Promise<void> {
    try {
      const tableName = tableMapping[storeName] || storeName;
      const convertedData = convertToSnakeCase(storeName, data);

      const { error } = await supabase
        .from(tableName)
        .insert(convertedData);

      if (error) throw error;
    } catch (error) {
      console.error(`Error adding ${storeName}:`, error);
      throw error;
    }
  }

  async addBatch<T>(storeName: string, dataArray: T[]): Promise<void> {
    try {
      if (!dataArray || dataArray.length === 0) {
        return;
      }

      const tableName = tableMapping[storeName] || storeName;
      const convertedDataArray = dataArray.map(data => convertToSnakeCase(storeName, data));

      const { error } = await supabase
        .from(tableName)
        .insert(convertedDataArray);

      if (error) throw error;
    } catch (error) {
      console.error(`Error adding batch to ${storeName}:`, error);
      throw error;
    }
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    try {
      const tableName = tableMapping[storeName] || storeName;
      const convertedData = convertToSnakeCase(storeName, data);
      const { id, ...updateData } = convertedData;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating ${storeName}:`, error);
      throw error;
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    try {
      const tableName = tableMapping[storeName] || storeName;
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting ${storeName}:`, error);
      throw error;
    }
  }

  async clear(storeName: string): Promise<void> {
    try {
      const tableName = tableMapping[storeName] || storeName;
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
    } catch (error) {
      console.error(`Error clearing ${storeName}:`, error);
      throw error;
    }
  }

  async getAppSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      return data?.value || null;
    } catch (error) {
      console.error('Error getting app setting:', error);
      return null;
    }
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;
    } catch (error) {
      console.error('Error setting app setting:', error);
      throw error;
    }
  }
}

export const supabaseService = new SupabaseService();
