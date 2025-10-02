import { Printer, PredictionData } from '../types';
import { getColorPrinterPrediction } from './colorPrinterUtils';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';

export function calculateTonerPrediction(printer: Printer): PredictionData {
  // Para impresoras a color, usar la lógica específica de color
  if (printer.type === 'color') {
    const colorPrediction = getColorPrinterPrediction(printer);
    return {
      daysUntilChange: colorPrediction.daysUntilChange,
      pagesRemaining: colorPrediction.pagesRemaining,
      estimatedChangeDate: colorPrediction.estimatedChangeDate,
      status: colorPrediction.status,
      adjustedTonerLevel: colorPrediction.averageLevel
    };
  }

  const { currentTonerLevel, tonerCapacity, dailyUsage, updatedAt } = printer;
  
  // Calcular el tiempo transcurrido desde la última actualización
  const now = new Date();
  const lastUpdate = new Date(updatedAt);
  const daysElapsed = differenceInDays(now, lastUpdate);
  const hoursElapsed = differenceInHours(now, lastUpdate);
  
  // Calcular el consumo estimado basado en el tiempo transcurrido
  const estimatedDailyConsumption = dailyUsage / tonerCapacity * 100; // Porcentaje por día
  const estimatedHourlyConsumption = estimatedDailyConsumption / 24; // Porcentaje por hora
  
  // Calcular el nivel de toner actualizado automáticamente
  let adjustedTonerLevel = currentTonerLevel;
  
  // Si han pasado más de 1 hora, actualizar el nivel basado en el consumo
  if (hoursElapsed >= 1) {
    const consumedPercentage = hoursElapsed * estimatedHourlyConsumption;
    adjustedTonerLevel = Math.max(0, currentTonerLevel - consumedPercentage);
  }
  
  // Calcular páginas restantes basado en el nivel ajustado
  const pagesRemaining = Math.floor((adjustedTonerLevel / 100) * tonerCapacity);
  
  // Calcular días hasta el cambio
  const daysUntilChange = Math.floor(pagesRemaining / dailyUsage);
  
  // Fecha estimada de cambio
  const estimatedChangeDate = addDays(now, daysUntilChange);
  
  // Determinar estado crítico
  let status: 'critical' | 'warning' | 'normal' = 'normal';
  if (daysUntilChange <= 3 || adjustedTonerLevel <= 10) {
    status = 'critical';
  } else if (daysUntilChange <= 7 || adjustedTonerLevel <= 25) {
    status = 'warning';
  }
  
  return {
    daysUntilChange: Math.max(0, daysUntilChange),
    pagesRemaining: Math.max(0, pagesRemaining),
    estimatedChangeDate,
    status,
    // Información adicional para debugging y monitoreo
    adjustedTonerLevel: Math.round(adjustedTonerLevel * 100) / 100,
    daysElapsed,
    hoursElapsed,
    estimatedConsumption: Math.round(hoursElapsed * estimatedHourlyConsumption * 100) / 100
  };
}

export function getStatusColor(status: 'critical' | 'warning' | 'normal'): string {
  switch (status) {
    case 'critical':
      return 'text-red-600 bg-red-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-green-600 bg-green-50';
  }
}

export function getStatusText(status: 'critical' | 'warning' | 'normal'): string {
  switch (status) {
    case 'critical':
      return 'Crítico';
    case 'warning':
      return 'Advertencia';
    default:
      return 'Normal';
  }
}

// Nueva función para actualizar automáticamente el nivel de toner de una impresora
export function updatePrinterTonerLevel(printer: Printer): Printer {
  if (printer.type === 'color') {
    return updateColorPrinterTonerLevels(printer);
  }

  if (printer.type === 'color') {
    return updateColorPrinterTonerLevels(printer);
  }

  const prediction = calculateTonerPrediction(printer);
  
  // Solo actualizar si ha pasado tiempo significativo (más de 1 hora)
  if (prediction.hoursElapsed! >= 1 && prediction.adjustedTonerLevel !== undefined) {
    return {
      ...printer,
      currentTonerLevel: prediction.adjustedTonerLevel!,
      updatedAt: new Date()
    };
  }
  
  return printer;
}

// Importar función de color printers
import { updateColorPrinterTonerLevels } from './colorPrinterUtils';

// Nueva función para procesar múltiples impresoras y aplicar actualizaciones automáticas
export function processImportedPrinters(printers: Printer[]): Printer[] {
  return printers.map(printer => {
    // Aplicar actualización automática si es necesario
    const updatedPrinter = updatePrinterTonerLevel(printer);
    
    // Asegurar que las fechas sean objetos Date válidos
    return {
      ...updatedPrinter,
      createdAt: updatedPrinter.createdAt instanceof Date ? updatedPrinter.createdAt : new Date(updatedPrinter.createdAt),
      updatedAt: updatedPrinter.updatedAt instanceof Date ? updatedPrinter.updatedAt : new Date(updatedPrinter.updatedAt)
    };
  });
}

// Función para aplicar actualizaciones automáticas a una sola impresora
export function processNewPrinter(printer: Printer): Printer {
  const updatedPrinter = updatePrinterTonerLevel(printer);
  
  return {
    ...updatedPrinter,
    createdAt: updatedPrinter.createdAt instanceof Date ? updatedPrinter.createdAt : new Date(updatedPrinter.createdAt),
    updatedAt: updatedPrinter.updatedAt instanceof Date ? updatedPrinter.updatedAt : new Date(updatedPrinter.updatedAt)
  };
}

// Función para verificar y actualizar automáticamente todas las impresoras del sistema
export function checkAndUpdateAllPrinters(printers: Printer[]): { 
  updatedPrinters: Printer[]; 
  updatedCount: number; 
  criticalCount: number; 
} {
  let updatedCount = 0;
  let criticalCount = 0;
  
  const updatedPrinters = printers.map(printer => {
    const originalLevel = printer.currentTonerLevel;
    const updatedPrinter = updatePrinterTonerLevel(printer);
    const prediction = calculateTonerPrediction(updatedPrinter);
    
    // Contar si se actualizó
    if (Math.abs(originalLevel - updatedPrinter.currentTonerLevel) > 0.1) {
      updatedCount++;
    }
    
    // Contar críticas
    if (prediction.status === 'critical') {
      criticalCount++;
    }
    
    return updatedPrinter;
  });
  
  return {
    updatedPrinters,
    updatedCount,
    criticalCount
  };
}

// Función para obtener información detallada de la predicción
export function getDetailedPredictionInfo(printer: Printer) {
  const prediction = calculateTonerPrediction(printer);
  
  return {
    ...prediction,
    printerInfo: {
      model: printer.model,
      location: printer.location,
      originalLevel: printer.currentTonerLevel,
      lastUpdate: printer.updatedAt
    },
    consumption: {
      dailyPages: printer.dailyUsage,
      dailyPercentage: (printer.dailyUsage / printer.tonerCapacity) * 100,
      hourlyPercentage: ((printer.dailyUsage / printer.tonerCapacity) * 100) / 24
    }
  };
}