import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from './useDatabase';

export const useActivityLogger = () => {
  const { user } = useAuth();
  const { logActivity } = useDatabase();

  const logUserActivity = async (action: string, details?: string) => {
    if (!user) return;

    try {
      // Log activity to Supabase
      await logActivity({
        user_id: user.id,
        user_name: user.name,
        action,
        details: details || '',
        ip_address: 'Unknown' // Would be populated by server in production
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Continue anyway - don't block the UI for logging failures
    }
  };

  return {
    logFileUpload: (fileName: string, fileType: string) => 
      logUserActivity(`Uploaded ${fileType}`, `File: ${fileName}`),
    
    logFileDownload: (fileName: string, version: string) => 
      logUserActivity(`Downloaded file`, `${fileName} v${version}`),
    
    logFileDelete: (fileName: string) => 
      logUserActivity(`Deleted file`, `File: ${fileName}`),
    
    logUserCreation: (userName: string, grade: string) => 
      logUserActivity(`Created user account`, `User: ${userName} (${grade})`),
    
    logUserGradeUpdate: (userName: string, oldGrade: string, newGrade: string) => 
      logUserActivity(`Updated user grade`, `${userName}: ${oldGrade} → ${newGrade}`),
    
    logUserBlock: (userName: string, duration: string) => 
      logUserActivity(`Blocked user`, `${userName} for ${duration}`),
    
    logUserUnblock: (userName: string) => 
      logUserActivity(`Unblocked user`, `User: ${userName}`),
    
    logUserDelete: (userName: string) => 
      logUserActivity(`Deleted user account`, `User: ${userName}`),
    
    logPatchNoteCreate: (version: string, title: string) => 
      logUserActivity(`Created patch note`, `v${version}: ${title}`),
    
    logPatchNoteUpdate: (version: string, title: string) => 
      logUserActivity(`Updated patch note`, `v${version}: ${title}`),
    
    logPatchNoteDelete: (version: string) => 
      logUserActivity(`Deleted patch note`, `Version: ${version}`),
    
    logPatchNotePublish: (version: string) => 
      logUserActivity(`Published patch note`, `Version: ${version}`),
    
    logLogin: (method: string = 'email') => 
      logUserActivity(`Signed in`, `Method: ${method}`),
    
    logLogout: () => 
      logUserActivity(`Signed out`, ''),
    
    logThemeChange: (theme: string) => 
      logUserActivity(`Changed theme`, `Theme: ${theme}`),
    
    logProfileUpdate: (changes: string) => 
      logUserActivity(`Updated profile`, changes),
    
    logSettingsChange: (setting: string, value: string) => 
      logUserActivity(`Changed setting`, `${setting}: ${value}`),
    
    logSystemAction: (action: string, details?: string) => 
      logUserActivity(action, details),

    // Bug report activities
    logBugReportSubmit: (bugTitle: string) => 
      logUserActivity(`Submitted bug report`, `Bug: ${bugTitle}`),
    
    logBugStatusUpdate: (bugTitle: string, oldStatus: string, newStatus: string) => 
      logUserActivity(`Updated bug status`, `${bugTitle}: ${oldStatus} → ${newStatus}`)
  };
};