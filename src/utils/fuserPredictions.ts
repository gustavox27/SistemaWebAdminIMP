import { PrinterFuser, FuserPredictionData, Printer } from '../types';
import { differenceInDays, differenceInHours } from 'date-fns';

export function calculateFuserPrediction(printer: Printer, printerFuser: PrinterFuser): FuserPredictionData {
  const { dailyUsage } = printer;
  const { lifespan, pagesUsed, lastUpdate } = printerFuser;
  
  // Calcular el tiempo transcurrido desde la última actualización
  const now = new Date();
  const lastUpdateDate = new Date(lastUpdate);
  const daysElapsed = differenceInDays(now, lastUpdateDate);
  const hoursElapsed = differenceInHours(now, lastUpdateDate);
  
  // Calcular el uso estimado basado en el tiempo transcurrido
  const estimatedDailyUsage = dailyUsage;
  const estimatedHourlyUsage = estimatedDailyUsage / 24;
  
  // Calcular páginas usadas actualizadas automáticamente
  let adjustedPagesUsed = pagesUsed;
  
  // Si han pasado más de 1 hora, actualizar las páginas usadas
  if (hoursElapsed >= 1) {
    const estimatedUsage = hoursElapsed * estimatedHourlyUsage;
    adjustedPagesUsed = Math.min(lifespan, pagesUsed + estimatedUsage);
  }
  
  // Calcular nivel actual del fusor
  const currentLevel = Math.max(0, 100 - ((adjustedPagesUsed / lifespan) * 100));
  
  // Calcular páginas restantes
  const pagesRemaining = Math.max(0, lifespan - adjustedPagesUsed);
  
  // Determinar estado crítico
  let status: 'critical' | 'warning' | 'normal' = 'normal';
  if (currentLevel <= 10) {
    status = 'critical';
  } else if (currentLevel <= 15) {
    status = 'warning';
  }
  
  return {
    currentLevel: Math.round(currentLevel * 100) / 100,
    pagesRemaining: Math.round(pagesRemaining),
    status,
    pagesUsed: Math.round(adjustedPagesUsed),
    lifespan,
    daysElapsed,
    hoursElapsed,
    estimatedUsage: Math.round(hoursElapsed * estimatedHourlyUsage)
  };
}

export function updatePrinterFuserUsage(printer: Printer, printerFuser: PrinterFuser): PrinterFuser {
  const prediction = calculateFuserPrediction(printer, printerFuser);
  
  // Solo actualizar si ha pasado tiempo significativo (más de 1 hora)
  if (prediction.hoursElapsed! >= 1 && prediction.estimatedUsage! > 0) {
    return {
      ...printerFuser,
      pagesUsed: prediction.pagesUsed,
      lastUpdate: new Date(),
      updatedAt: new Date()
    };
  }
  
  return printerFuser;
}

export function getFuserStatusColor(status: 'critical' | 'warning' | 'normal'): string {
  switch (status) {
    case 'critical':
      return 'text-red-600 bg-red-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-green-600 bg-green-50';
  }
}

export function getFuserStatusText(status: 'critical' | 'warning' | 'normal'): string {
  switch (status) {
    case 'critical':
      return 'Crítico - Cambio Urgente';
    case 'warning':
      return 'Advertencia - Cambio Próximo';
    default:
      return 'Normal';
  }
}