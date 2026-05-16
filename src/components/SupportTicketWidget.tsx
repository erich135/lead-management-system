import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AlertCircle, CheckCircle, Clock, Ticket, ChevronDown, Search, Plus, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitSupportTicket, getUsers, getMyTickets, getUnreadTicketCount, addTicketResponse, markTicketAsRead, markAllTicketsAsRead, SupportTicketFull, getAllTickets, getSupportUnreadCount, updateTicketStatus, markTicketAsReadBySupport } from '../lib/api';

// Types
type Severity = 'low' | 'medium' | 'high' | 'critical';
type Category = 'bug' | 'feature_request' | 'question' | 'other';

// Simplified user for dropdown display
interface DropdownUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

// User Search Dropdown Component
interface UserSearchDropdownProps {
  users: DropdownUser[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const UserSearchDropdown: React.FC<UserSearchDropdownProps> = ({
  users,
  selectedUserId,
  onSelect,
  isOpen,
  onToggle,
  searchTerm,
  onSearchChange,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  }) : [];

  const selectedUser = Array.isArray(users) ? users.find(u => u._id === selectedUserId) : undefined;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'rep': return 'bg-green-100 text-green-700';
      case 'technician': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selectedUser ? 'text-gray-900' : 'text-gray-500'}>
          {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Select a user...'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">No users found</div>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => {
                    onSelect(user._id);
                    onToggle();
                    onSearchChange('');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                    selectedUserId === user._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Ticket View Modal for regular users
interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: SupportTicketFull[];
  onRefresh: () => void;
}

const MyTicketsModal: React.FC<MyTicketsModalProps> = ({ isOpen, onClose, tickets, onRefresh }) => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketFull | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && tickets.length > 0) {
      // Mark all as read when opening
      markAllTicketsAsRead().catch(console.error);
    }
  }, [isOpen, tickets.length]);

  const handleSubmitResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addTicketResponse(selectedTicket._id, newResponse.trim());
      setNewResponse('');
      onRefresh();
      // Refresh selected ticket
      const result = await getMyTickets();
      const refreshed = result.tickets?.find((t: SupportTicketFull) => t._id === selectedTicket._id);
      if (refreshed) setSelectedTicket(refreshed);
    } catch (error) {
      console.error('Failed to submit response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    
    if (!confirm('Are you sure you want to close this ticket? This action will be recorded.')) {
      return;
    }
    
    setIsClosing(true);
    try {
      await updateTicketStatus(selectedTicket._id, 'closed');
      onRefresh();
      // Refresh selected ticket
      const result = await getMyTickets();
      const refreshed = result.tickets?.find((t: SupportTicketFull) => t._id === selectedTicket._id);
      if (refreshed) setSelectedTicket(refreshed);
    } catch (error) {
      console.error('Failed to close ticket:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[75vh] overflow-hidden flex">
        {/* Tickets List */}
        <div className="w-1/3 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold text-gray-900">My Support Tickets</h3>
            <p className="text-sm text-gray-500">{tickets.length} ticket(s)</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tickets yet</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket._id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    if (ticket.unreadByUser) {
                      markTicketAsRead(ticket._id).catch(console.error);
                    }
                  }}
                  className={`w-full p-3 text-left border-b hover:bg-white transition-colors ${
                    selectedTicket?._id === ticket._id ? 'bg-white border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                        {ticket.unreadByUser && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <h4 className="font-medium text-gray-900 truncate">{ticket.subject}</h4>
                      <div className="flex gap-1 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getSeverityColor(ticket.severity)}`}>
                          {ticket.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <h3 className="font-semibold text-gray-900">
              {selectedTicket ? selectedTicket.ticketNumber : 'Select a ticket'}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedTicket ? (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h4>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(selectedTicket.severity)}`}>
                      {selectedTicket.severity}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {selectedTicket.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Responses */}
                {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-700">Responses</h5>
                    {selectedTicket.responses.map((response, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          response.isFromSupport ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {response.respondedByName}
                          </span>
                          {response.isFromSupport && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Admin</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(response.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Response Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitResponse()}
                    />
                    <button
                      onClick={handleSubmitResponse}
                      disabled={isSubmitting || !newResponse.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleCloseTicket}
                    disabled={isClosing}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isClosing ? 'Closing...' : 'Close Ticket'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Ticket Modal for Super Admin
interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('bug');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [reportedBy, setReportedBy] = useState('');
  const [users, setUsers] = useState<DropdownUser[]>([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      const data = await getUsers({ limit: 10000 });
      // Map API users to dropdown users (convert role object to string)
      const mappedUsers: DropdownUser[] = (data.users || []).map(u => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: typeof u.role === 'string' ? u.role : u.role?.name || 'user'
      }));
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !reportedBy) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await submitSupportTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        severity,
        reportedBy,
      });

      setSubmitStatus('success');
      setTimeout(() => {
        resetForm();
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit ticket:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setCategory('bug');
    setSeverity('medium');
    setReportedBy('');
    setSubmitStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Log Support Ticket</h2>
                <p className="text-blue-100 text-sm">Report an issue on behalf of a user</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Reported By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reported By <span className="text-red-500">*</span>
            </label>
            <UserSearchDropdown
              users={users}
              selectedUserId={reportedBy}
              onSelect={setReportedBy}
              isOpen={isUserDropdownOpen}
              onToggle={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              searchTerm={userSearchTerm}
              onSearchChange={setUserSearchTerm}
            />
            <p className="text-xs text-gray-500 mt-1">The user experiencing this issue</p>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category & Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bug">🐛 Bug</option>
                <option value="feature_request">✨ Feature Request</option>
                <option value="question">❓ Question</option>
                <option value="other">📝 Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue, steps to reproduce, expected behavior..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          {/* Submit Status */}
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Ticket submitted successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to submit ticket. Please try again.</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !description.trim() || !reportedBy}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Ticket
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Admin Ticket Dashboard - For Super Admins to manage all tickets
interface AdminTicketDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
}

const AdminTicketDashboard: React.FC<AdminTicketDashboardProps> = ({ isOpen, onClose, onCreateNew }) => {
  const [tickets, setTickets] = useState<SupportTicketFull[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketFull | null>(null);
  const [newResponse, setNewResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('open'); // Default to open tickets

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const result = await getAllTickets(params);
      setTickets(result.tickets || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadTickets();
  }, [statusFilter]);

  const handleSelectTicket = async (ticket: SupportTicketFull) => {
    setSelectedTicket(ticket);
    if (ticket.unreadBySupport) {
      try {
        await markTicketAsReadBySupport(ticket._id);
        // Update local state
        setTickets(prev => prev.map(t => 
          t._id === ticket._id ? { ...t, unreadBySupport: false } : t
        ));
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedTicket || !newResponse.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addTicketResponse(selectedTicket._id, newResponse.trim());
      setNewResponse('');
      loadTickets();
      // Refresh selected ticket
      const result = await getAllTickets({ limit: 100 });
      const refreshed = result.tickets?.find(t => t._id === selectedTicket._id);
      if (refreshed) setSelectedTicket(refreshed);
    } catch (error) {
      console.error('Failed to submit response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket._id, newStatus as any);
      loadTickets();
      setSelectedTicket({ ...selectedTicket, status: newStatus as any });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    
    if (!confirm('Are you sure you want to close this ticket? This action will be recorded.')) {
      return;
    }
    
    setIsClosing(true);
    try {
      await updateTicketStatus(selectedTicket._id, 'closed');
      loadTickets();
      setSelectedTicket({ ...selectedTicket, status: 'closed' });
    } catch (error) {
      console.error('Failed to close ticket:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  const filteredTickets = tickets;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Support Ticket Dashboard</h2>
              <p className="text-blue-100 text-sm">{tickets.length} ticket(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateNew}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tickets List */}
          <div className="w-2/5 border-r bg-gray-50 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No tickets found</p>
                </div>
              ) : (
                filteredTickets.map(ticket => (
                  <button
                    key={ticket._id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full p-3 text-left border-b hover:bg-white transition-colors ${
                      selectedTicket?._id === ticket._id ? 'bg-white border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                          {ticket.unreadBySupport && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" title="New user response" />
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 truncate">{ticket.subject}</h4>
                        <p className="text-xs text-gray-500 truncate">
                          {typeof ticket.reportedBy === 'object' && ticket.reportedBy 
                            ? `${(ticket.reportedBy as any).firstName} ${(ticket.reportedBy as any).lastName}`
                            : 'Unknown user'}
                        </p>
                        <div className="flex gap-1 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('-', ' ')}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getSeverityColor(ticket.severity)}`}>
                            {ticket.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-gray-500">{selectedTicket.ticketNumber}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                      <p className="text-sm text-gray-500">
                        Reported by: {typeof selectedTicket.reportedBy === 'object' && selectedTicket.reportedBy 
                          ? `${(selectedTicket.reportedBy as any).firstName} ${(selectedTicket.reportedBy as any).lastName} (${(selectedTicket.reportedBy as any).email})`
                          : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`text-sm px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(selectedTicket.status)}`}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(selectedTicket.severity)}`}>
                      {selectedTicket.severity}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {selectedTicket.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {/* Original Description */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Original Description:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Responses */}
                  {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                    <div className="space-y-3">
                      {selectedTicket.responses.map((response, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            response.isFromSupport ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {response.respondedByName}
                            </span>
                            {response.isFromSupport && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Support</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(response.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Response Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newResponse}
                        onChange={(e) => setNewResponse(e.target.value)}
                        placeholder="Type your response to the user..."
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitResponse()}
                      />
                      <button
                        onClick={handleSubmitResponse}
                        disabled={isSubmitting || !newResponse.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleCloseTicket}
                      disabled={isClosing}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isClosing ? 'Closing...' : 'Close Ticket'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a ticket to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Support Ticket Button Component - Goes in Header
export const SupportTicketButton: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMyTicketsModal, setShowMyTicketsModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [myTickets, setMyTickets] = useState<SupportTicketFull[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Use isSuperAdmin from auth context OR check user.isSuperAdmin property
  const isSuper = isSuperAdmin || user?.isSuperAdmin === true;

  useEffect(() => {
    if (isSuper) {
      // Super Admin: load support unread count
      loadSupportUnreadCount();
      const interval = setInterval(loadSupportUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      // Regular user: load their ticket unread count
      loadMyTickets();
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isSuper]);

  const loadMyTickets = async () => {
    try {
      const result = await getMyTickets();
      setMyTickets(result.tickets || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadTicketCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadSupportUnreadCount = async () => {
    try {
      const count = await getSupportUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load support unread count:', error);
    }
  };

  const handleClick = () => {
    if (isSuper) {
      setShowAdminDashboard(true);
    } else {
      loadMyTickets();
      setShowMyTicketsModal(true);
    }
  };

  const handleTicketCreated = () => {
    loadSupportUnreadCount();
  };

  const handleRefreshTickets = () => {
    loadMyTickets();
    loadUnreadCount();
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={isSuper ? "Support Dashboard" : "My Support Tickets"}
      >
        <Ticket className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Admin Ticket Dashboard - Super Admin */}
      <AdminTicketDashboard
        isOpen={showAdminDashboard}
        onClose={() => {
          setShowAdminDashboard(false);
          loadSupportUnreadCount();
        }}
        onCreateNew={() => {
          setShowAdminDashboard(false);
          setShowCreateModal(true);
        }}
      />

      {/* Create Ticket Modal - Super Admin Only */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleTicketCreated}
      />

      {/* My Tickets Modal - Regular Users */}
      <MyTicketsModal
        isOpen={showMyTicketsModal}
        onClose={() => {
          setShowMyTicketsModal(false);
          loadUnreadCount();
        }}
        tickets={myTickets}
        onRefresh={handleRefreshTickets}
      />
    </>
  );
};

// Legacy floating widget - keeping for compatibility but not used
export const SupportTicketWidget: React.FC = () => {
  return null; // Replaced by SupportTicketButton in header
};

export default SupportTicketWidget;
