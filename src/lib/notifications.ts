import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.min.css';

// Configure default settings
iziToast.settings({
  timeout: 4000,
  resetOnHover: true,
  transitionIn: 'flipInX',
  transitionOut: 'flipOutX',
  position: 'topRight',
});

export const showNotification = {
  success: (message: string, title?: string) => {
    iziToast.success({
      title: title || 'Success',
      message,
      color: 'green',
      icon: 'ico-success',
    });
  },

  error: (message: string, title?: string) => {
    iziToast.error({
      title: title || 'Error',
      message,
      color: 'red',
      icon: 'ico-error',
    });
  },

  warning: (message: string, title?: string) => {
    iziToast.warning({
      title: title || 'Warning',
      message,
      color: 'yellow',
      icon: 'ico-warning',
    });
  },

  info: (message: string, title?: string) => {
    iziToast.info({
      title: title || 'Info',
      message,
      color: 'blue',
      icon: 'ico-info',
    });
  },

  download: (fileName: string) => {
    iziToast.success({
      title: 'Download Started',
      message: `${fileName} download has begun`,
      color: 'green',
      icon: 'ico-success',
      timeout: 3000,
    });
  },

  upload: (fileName: string) => {
    iziToast.success({
      title: 'Upload Complete',
      message: `${fileName} has been uploaded successfully`,
      color: 'green',
      icon: 'ico-success',
    });
  },

  login: (userName: string) => {
    iziToast.success({
      title: 'Welcome Back',
      message: `Hello ${userName}! You've successfully signed in.`,
      color: 'green',
      icon: 'ico-success',
      timeout: 3000,
    });
  },

  logout: () => {
    iziToast.info({
      title: 'Goodbye',
      message: 'You have been signed out successfully',
      color: 'blue',
      icon: 'ico-info',
      timeout: 2000,
    });
  },

  userCreated: (userName: string, email: string) => {
    iziToast.success({
      title: 'User Created',
      message: `${userName} has been created and credentials sent to ${email}`,
      color: 'green',
      icon: 'ico-success',
      timeout: 5000,
    });
  },

  themeChanged: (theme: string) => {
    iziToast.info({
      title: 'Theme Changed',
      message: `Switched to ${theme} mode`,
      color: 'blue',
      icon: 'ico-info',
      timeout: 2000,
    });
  },

  fileDeleted: (fileName: string) => {
    iziToast.warning({
      title: 'File Deleted',
      message: `${fileName} has been removed`,
      color: 'yellow',
      icon: 'ico-warning',
      timeout: 3000,
    });
  },

  userBlocked: (userName: string) => {
    iziToast.warning({
      title: 'User Blocked',
      message: `${userName} has been temporarily blocked`,
      color: 'yellow',
      icon: 'ico-warning',
    });
  },

  userUnblocked: (userName: string) => {
    iziToast.success({
      title: 'User Unblocked',
      message: `${userName} has been unblocked`,
      color: 'green',
      icon: 'ico-success',
    });
  },

  gradeUpdated: (userName: string, newGrade: string) => {
    iziToast.info({
      title: 'Grade Updated',
      message: `${userName} is now ${newGrade}`,
      color: 'blue',
      icon: 'ico-info',
    });
  },

  patchNotePublished: (version: string) => {
    iziToast.success({
      title: 'Patch Note Published',
      message: `Version ${version} patch notes are now live`,
      color: 'green',
      icon: 'ico-success',
    });
  },

  guestSession: (timeRemaining: string) => {
    iziToast.info({
      title: 'Guest Session',
      message: `Welcome! Your session expires in ${timeRemaining}`,
      color: 'blue',
      icon: 'ico-info',
      timeout: 5000,
    });
  },

  sessionExpiring: () => {
    iziToast.warning({
      title: 'Session Expiring',
      message: 'Your guest session will expire in 1 minute',
      color: 'yellow',
      icon: 'ico-warning',
      timeout: 10000,
    });
  },

  ipBlocked: (duration: string) => {
    iziToast.warning({
      title: 'IP Protection Active',
      message: `Your IP has been blocked for ${duration} to prevent guest session abuse`,
      color: 'yellow',
      icon: 'ico-warning',
      timeout: 8000,
    });
  },

  ipUnblocked: (ip: string) => {
    iziToast.success({
      title: 'IP Unblocked',
      message: `IP address ${ip} has been manually unblocked`,
      color: 'green',
      icon: 'ico-success',
    });
  }
};