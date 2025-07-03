import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Calendar,
  Tag,
  AlertCircle,
  FileText,
  List,
  Hash
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { Documentation as DocumentationType } from '../lib/supabase';

const Documentation: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const { getDocumentation, createDocumentation, updateDocumentation, deleteDocumentation, loading } = useDatabase();
  
  const [documentation, setDocumentation] = useState<DocumentationType[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<'v4' | 'v5'>('v4');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentationType | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentationType | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [expandedSpoilers, setExpandedSpoilers] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    category: 'info' as DocumentationType['category'],
    version_type: 'v4' as DocumentationType['version_type'],
    status: 'draft' as DocumentationType['status'],
    meta_description: '',
    tags: [] as string[],
    order_index: 0
  });

  const categories = [
    { id: 'info', label: 'Information', icon: '📋' },
    { id: 'installation', label: 'Installation', icon: '⚙️' },
    { id: 'features', label: 'Features', icon: '✨' },
    { id: 'api', label: 'API Reference', icon: '🔌' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'about', label: 'About', icon: '📖' },
    { id: 'tos', label: 'Terms of Service', icon: '📜' },
    { id: 'changelog', label: 'Changelog', icon: '📝' },
    { id: 'partners', label: 'Partners', icon: '🤝' }
  ];

  useEffect(() => {
    loadDocumentation();
  }, []);

  useEffect(() => {
    // Auto-select first doc when version changes
    const filteredDocs = getFilteredDocs();
    if (filteredDocs.length > 0 && !selectedDoc) {
      setSelectedDoc(filteredDocs[0]);
    }
  }, [selectedVersion, documentation]);

  // Auto-expand first section when content changes
  useEffect(() => {
    if (selectedDoc) {
      const sections = parseContentSections(selectedDoc.content);
      if (sections.length > 0 && expandedSpoilers.size === 0) {
        setExpandedSpoilers(new Set([sections[0].id]));
      }
    }
  }, [selectedDoc?.content]);

  const loadDocumentation = async () => {
    const docs = await getDocumentation();
    setDocumentation(docs);
    
    // Auto-select first published doc
    const publishedDocs = docs.filter(doc => doc.status === 'published');
    if (publishedDocs.length > 0 && !selectedDoc) {
      setSelectedDoc(publishedDocs[0]);
    }
  };

  const getFilteredDocs = () => {
    return documentation
      .filter(doc => {
        const matchesVersion = doc.version_type === selectedVersion;
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             doc.content.toLowerCase().includes(searchTerm.toLowerCase());
        const isVisible = doc.status === 'published' || hasAccess('Admin') || user?.grade === 'Support';
        return matchesVersion && matchesCategory && matchesSearch && isVisible;
      })
      .sort((a, b) => a.order_index - b.order_index);
  };

  const handleEdit = (doc: DocumentationType) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      category: doc.category,
      version_type: doc.version_type,
      status: doc.status,
      meta_description: doc.meta_description || '',
      tags: doc.tags || [],
      order_index: doc.order_index
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;

    let success = false;
    if (editingDoc) {
      success = await updateDocumentation(editingDoc.id, formData);
    } else {
      success = await createDocumentation({
        ...formData,
        author_id: user.id,
        author_name: user.name
      });
    }

    if (success) {
      await loadDocumentation();
      handleCancel();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingDoc(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      category: 'info',
      version_type: 'v4',
      status: 'draft',
      meta_description: '',
      tags: [],
      order_index: 0
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteDoc = async (id: string) => {
    const doc = documentation.find(d => d.id === id);
    if (!doc) return;
    
    const success = await deleteDocumentation(id);
    if (success) {
      await loadDocumentation();
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
    }
    setConfirmDelete(null);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  // Parse content into sections for spoilers and TOC
  const parseContentSections = (content: string) => {
    const sections = content.split(/(?=^##\s)/m).filter(section => section.trim());
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0]?.replace(/^##\s*/, '') || `Section ${index + 1}`;
      const content = lines.slice(1).join('\n').trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Determine if this should be a spoiler
      const shouldBeSpoiler = content.length > 800 || 
        /installation|configuration|troubleshooting|api|advanced|technical|setup|deployment/i.test(title);
      
      return {
        id,
        title,
        content,
        shouldBeSpoiler,
        readingTime: Math.ceil(content.length / 1000) // Rough estimate
      };
    });
  };

  const toggleSpoiler = (sectionId: string) => {
    const newExpanded = new Set(expandedSpoilers);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSpoilers(newExpanded);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Auto-expand spoiler if it's collapsed
      if (!expandedSpoilers.has(sectionId)) {
        toggleSpoiler(sectionId);
      }
    }
  };

  const renderContent = (content: string) => {
    const sections = parseContentSections(content);

    return (
      <div className="space-y-6">
        {sections.map((section, index) => {
          const isExpanded = expandedSpoilers.has(section.id);
          const isFirstSection = index === 0;
          
          return (
            <div key={section.id} id={section.id} className="scroll-mt-4">
              {section.shouldBeSpoiler ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSpoiler(section.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <EyeOff className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-left">
                        {section.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {section.readingTime} min read
                      </span>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                      <div className="prose dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap">{section.content}</div>
                      </div>
                    </div>
                  )}
                  
                  {!isExpanded && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {section.content.substring(0, 150)}...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {section.title}
                  </h3>
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{section.content}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableOfContents = (content: string) => {
    const sections = parseContentSections(content);
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => setTocCollapsed(!tocCollapsed)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center space-x-2">
            <List className="w-4 h-4 text-gray-500" />
            <h4 className="font-medium text-gray-900 dark:text-white">Table of Contents</h4>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              tocCollapsed ? 'rotate-180' : ''
            }`} 
          />
        </button>
        
        {!tocCollapsed && (
          <div className="space-y-2">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="flex items-center justify-between w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Hash className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {section.title}
                  </span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                  {section.shouldBeSpoiler && (
                    <Eye className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {section.readingTime}m
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Check if user can edit documentation (Admin or Support)
  const canEditDocumentation = () => {
    return hasAccess('Admin') || user?.grade === 'Support';
  };

  if (!hasAccess('Guest')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Required</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please sign in to access the documentation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Documentation</h2>
              {canEditDocumentation() && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              )}
            </div>

            {/* Version Selector */}
            <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setSelectedVersion('v4')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                  selectedVersion === 'v4'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                V4 Docs
              </button>
              <button
                onClick={() => setSelectedVersion('v5')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                  selectedVersion === 'v5'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                V5 Docs
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Documentation List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {getFilteredDocs().map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    selectedDoc?.id === doc.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm mb-1 truncate ${
                        selectedDoc?.id === doc.id
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {doc.title}
                      </h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                          {categories.find(c => c.id === doc.category)?.icon} {categories.find(c => c.id === doc.category)?.label}
                        </span>
                        {doc.status === 'draft' && (
                          <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      {doc.meta_description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {doc.meta_description}
                        </p>
                      )}
                    </div>
                    {canEditDocumentation() && (
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(doc);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {getFilteredDocs().length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No documentation found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Try adjusting your search criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <BookOpen size={20} />
              </button>
              {selectedDoc && (
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedDoc.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>{selectedDoc.author_name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{new Date(selectedDoc.updated_at).toLocaleDateString()}</span>
                    </div>
                    {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Tag size={14} />
                        <span>{selectedDoc.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {selectedDoc && canEditDocumentation() && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(selectedDoc)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedDoc.id)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {selectedDoc ? (
            <div className="h-full flex">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                  {renderContent(selectedDoc.content)}
                </div>
              </div>

              {/* Table of Contents */}
              <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
                {renderTableOfContents(selectedDoc.content)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Select Documentation</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose a document from the sidebar to start reading.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCancel}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingDoc ? 'Edit Documentation' : 'Create New Documentation'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Documentation title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="url-friendly-slug"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Version
                      </label>
                      <select
                        value={formData.version_type}
                        onChange={(e) => setFormData({...formData, version_type: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="v4">V4</option>
                        <option value="v5">V5</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meta Description
                    </label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description for search engines..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content (Markdown supported)
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={20}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="Write your documentation content here...

Use ## for section headers to create automatic spoilers and table of contents.

## Installation
This section will automatically become a spoiler if it's long enough.

## Getting Started
Regular sections work normally.

## Advanced Configuration
Technical sections are automatically collapsed."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 <strong>Tip:</strong> Use ## headers to create sections. Long sections (800+ chars) or technical sections will automatically become spoilers.
                  </p>
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
                    Delete Documentation
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this documentation? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => confirmDeleteDoc(confirmDelete)}
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
    </div>
  );
};

export default Documentation;