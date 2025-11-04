import { toast } from 'sonner';

/**
 * Mostra una notifica toast di successo
 */
export const showSuccessToast = (message) => {
  toast.success(message);
};

/**
 * Mostra una notifica toast di errore
 */
export const showErrorToast = (message) => {
  toast.error(message);
};

/**
 * Mostra una notifica toast di info
 */
export const showInfoToast = (message) => {
  toast.info(message);
};

/**
 * Mostra una notifica toast di warning
 */
export const showWarningToast = (message) => {
  toast.warning(message);
};

/**
 * Mostra una notifica toast personalizzata
 */
export const showToast = (message, type = 'info') => {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    default:
      toast.info(message);
  }
};

export default {
  success: showSuccessToast,
  error: showErrorToast,
  info: showInfoToast,
  warning: showWarningToast,
  show: showToast,
};

