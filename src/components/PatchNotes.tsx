import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Calendar,
  User,
  FileText,
  AlertCircle,
  Bell,
  CheckCircle,
  Download,
  ExternalLink,
  Eye,
  HeadsetIcon,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { showNotification } from '../lib/notifications';
import { PatchNote } from '../lib/supabase';

const PatchNotes: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const { getPatchNotes, createPatchNote, updatePatchNote, deletePatchNote, loading } = useDatabase();
  const { logPatchNoteCreate, logPatchNoteUpdate, logPatchNoteDelete, logPatchNotePublish } = useActivityLogger();
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<PatchNote | null>(null);
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    content: '',
    status: 'draft' as 'draft' | 'published'
  });

  useEffect(() => {
    loadPatchNotes();
  }, []);

  const loadPatchNotes = async () => {
    const notes = await getPatchNotes();
    setPatchNotes(notes);
  };

  const handleEdit = (note: PatchNote) => {
    setEditingNote(note);
    setFormData({
      version: note.version,
      title: note.title,
      content: note.content,
      status: note.status
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;

    let success = false;
    const wasPublished = editingNote?.status === 'published';
    const isPublishing = formData.status === 'published' && editingNote?.status !== 'published';
    
    if (editingNote) {
      // Update existing note
      success = await updatePatchNote(editingNote.id, formData);
      if (success) {
        await logPatchNoteUpdate(formData.version, formData.title);
        
        // If status changed from draft to published, log it and show notification
        if (isPublishing) {
          await logPatchNotePublish(formData.version);
          showNotification.patchNotePublished(formData.version);
          
          // Create notifications for all users
          createGlobalNotification(
            'New Patch Notes Published',
            `Version ${formData.version} patch notes are now available: ${formData.title}`,
            'success'
          );
        }
      }
    } else {
      // Create new note
      success = await createPatchNote({
        ...formData,
        author_id: user.id,
        author_name: user.name
      });
      
      if (success) {
        await logPatchNoteCreate(formData.version, formData.title);
        
        // If publishing directly, log it and show notification
        if (formData.status === 'published') {
          await logPatchNotePublish(formData.version);
          showNotification.patchNotePublished(formData.version);
          
          // Create notifications for all users
          createGlobalNotification(
            'New Patch Notes Published',
            `Version ${formData.version} patch notes are now available: ${formData.title}`,
            'success'
          );
        }
      }
    }

    if (success) {
      await loadPatchNotes();
      handleCancel();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingNote(null);
    setFormData({ version: '', title: '', content: '', status: 'draft' });
  };

  const handleDelete = async (id: string) => {
    const note = patchNotes.find(n => n.id === id);
    if (!note) return;
    
    setConfirmDelete(id);
  };

  const confirmDeleteNote = async (id: string) => {
    const note = patchNotes.find(n => n.id === id);
    if (!note) return;
    
    const success = await deletePatchNote(id);
    if (success) {
      await logPatchNoteDelete(note.version);
      await loadPatchNotes();
      showNotification.warning(`Patch note for version ${note.version} deleted`);
    } else {
      showNotification.error('Failed to delete patch note');
    }
    setConfirmDelete(null);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  const handlePublish = async (id: string) => {
    const note = patchNotes.find(n => n.id === id);
    if (!note || note.status === 'published') return;
    
    const success = await updatePatchNote(id, { status: 'published' });
    if (success) {
      await logPatchNotePublish(note.version);
      await loadPatchNotes();
      showNotification.patchNotePublished(note.version);
      
      // Create notifications for all users
      createGlobalNotification(
        'New Patch Notes Published',
        `Version ${note.version} patch notes are now available: ${note.title}`,
        'success'
      );
    }
  };

  // Create a notification for all users
  const createGlobalNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    try {
      // Get all users from localStorage
      const usersKey = 'prodomo_users';
      const usersJson = localStorage.getItem(usersKey);
      if (!usersJson) return;
      
      const users = JSON.parse(usersJson);
      
      // Create notification for each user
      users.forEach((user: any) => {
        const notificationKey = `prodomo_notifications_${user.id}`;
        const existingNotifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
        
        const newNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          message,
          type,
          read: false,
          created_at: new Date().toISOString(),
          related_id: 'patch_notes',
          action_url: '/patch-notes'
        };
        
        const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 50);
        localStorage.setItem(notificationKey, JSON.stringify(updatedNotifications));
      });
      
      console.log('Global notification created for all users:', title);
    } catch (error) {
      console.error('Failed to create global notification:', error);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'published' 
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
  };

  // Check if user can edit patch notes (Admin or Support)
  const canEditPatchNotes = () => {
    return hasAccess('Admin') || user?.grade === 'Support';
  };

  // Filter notes based on user access
  const visibleNotes = patchNotes.filter(note => {
    // Admins and Support can see all notes
    if (hasAccess('Admin') || user?.grade === 'Support') return true;
    
    // Non-admins can only see published notes
    return note.status === 'published';
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Patch Notes</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {canEditPatchNotes() 
              ? 'Create and manage patch notes for server updates.'
              : 'View the latest server updates and changes.'}
          </p>
        </div>
        {canEditPatchNotes() && (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Plus size={18} />
            <span>New Patch Note</span>
          </button>
        )}
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCancel}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingNote ? 'Edit Patch Note' : 'Create New Patch Note'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({...formData, version: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2.1.4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'draft' | 'published'})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                    {formData.status === 'published' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        <Bell className="inline-block w-3 h-3 mr-1" />
                        Publishing will notify all users
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter patch note title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content (Markdown supported)
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Enter patch note content using Markdown..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <Save size={18} />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={cancelDelete}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Delete Patch Note
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this patch note? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => confirmDeleteNote(confirmDelete)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patch Notes List */}
      <div className="space-y-4">
        {visibleNotes.map((note) => (
          <div key={note.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {note.title}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                      v{note.version}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(note.status)}`}>
                      {note.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-1">
                      <User size={16} />
                      <span>{note.author_name}</span>
                      {note.author_name.includes('Admin') && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 flex items-center">
                          <Shield size={10} className="mr-0.5" />
                          Admin
                        </span>
                      )}
                      {note.author_name.includes('Support') && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 flex items-center">
                          <HeadsetIcon size={10} className="mr-0.5" />
                          Support
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                    {note.updated_at !== note.created_at && (
                      <div className="flex items-center space-x-1">
                        <Edit size={16} />
                        <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {canEditPatchNotes() && (
                    <>
                      <button
                        onClick={() => handleEdit(note)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                      >
                        <Edit size={18} />
                      </button>
                      {note.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(note.id)}
                          className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                          title="Publish"
                        >
                          <Bell size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  
                  {/* Share button for all users */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/patch-notes?v=${note.version}`);
                      showNotification.success('Link copied to clipboard');
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                    title="Copy link"
                  >
                    <ExternalLink size={18} />
                  </button>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900 dark:text-gray-100 overflow-x-auto">
                    {note.content}
                  </pre>
                </div>
              </div>
              
              {/* Download related files section */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <Download size={16} className="text-blue-500" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Related Downloads</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      showNotification.info('Navigating to Downloads section');
                      // In a real app, you would navigate to the downloads section
                      // or filter downloads for this version
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm transition-colors duration-200"
                  >
                    <Download size={14} />
                    <span>Download v{note.version}</span>
                  </button>
                  <button
                    onClick={() => {
                      showNotification.info('Navigating to Documentation');
                      // In a real app, you would navigate to the documentation section
                    }}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors duration-200"
                  >
                    <Eye size={14} />
                    <span>View Documentation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {visibleNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No patch notes</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {canEditPatchNotes() 
                ? 'Get started by creating your first patch note.'
                : 'Patch notes will appear here when they are published.'}
            </p>
            {canEditPatchNotes() && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Plus size={18} />
                <span>Create Patch Note</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatchNotes;