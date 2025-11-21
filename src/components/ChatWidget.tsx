import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, User, Minimize2, Paperclip, FileText, Smile, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  getChatUsers,
  getChatThread,
  uploadChatAttachment,
  getChatAttachmentUrl,
  type ChatUser,
  type ChatMessage,
  type ChatAttachment,
} from '../lib/api';
import { useChatSocket } from '../lib/useChatSocket';

export function ChatWidget() {
  const { user } = useAuth();
  const allowedRoles = new Set(['super_admin','admin','manager']);
  if (!user || !allowedRoles.has(user.role.name)) {
    return null; // Hide chat for disallowed roles
  }
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Socket.io integration
  const { isConnected, sendMessage: socketSendMessage, markRead, sendTyping, addReaction } = useChatSocket(
    // On new message
    useCallback((message: ChatMessage) => {
      if (selectedUser && (
        message.sender._id === selectedUser._id ||
        message.receiver._id === selectedUser._id
      )) {
        setMessages(prev => [...prev, message]);
        if (message.sender._id === selectedUser._id) {
          markRead(selectedUser._id);
        }
      } else {
        setUnreadCount(prev => prev + 1);
      }
    }, [selectedUser]),
    // On message delivered
    undefined,
    // On typing
    useCallback((data: { userId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    }, []),
    // On reaction update
    useCallback((data: { messageId: string; reactions: any[] }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
      ));
    }, [])
  );

  // Load users
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Load messages when user selected
  useEffect(() => {
    if (selectedUser) {
      loadMessages();
    }
  }, [selectedUser]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUsers = async () => {
    try {
      const usersData = await getChatUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadMessages = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const { messages: messagesData } = await getChatThread(selectedUser._id);
      setMessages(messagesData);
      if (messagesData.some(m => m.sender._id === selectedUser._id && !m.isRead)) {
        await markRead(selectedUser._id);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!selectedUser || !user) return;

    const text = newMessage.trim();
    const attachmentIds = attachments.map(a => a._id);

    // Optimistic update
    const tempMessage: ChatMessage = {
      _id: `temp-${Date.now()}`,
      sender: {
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      receiver: {
        _id: selectedUser._id,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
      },
      text,
      attachments: attachments,
      reactions: [],
      isRead: false,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setAttachments([]);

    try {
      await socketSendMessage(selectedUser._id, text, attachmentIds);
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, DOCX, XLSX, and image files (PNG, JPEG, JPG) are allowed');
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit');
        continue;
      }

      setUploadingFiles(prev => [...prev, file.name]);

      try {
        const attachment = await uploadChatAttachment(file);
        setAttachments(prev => [...prev, attachment]);
      } catch (err) {
        console.error('Error uploading file:', err);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleTyping = () => {
    if (!selectedUser) return;

    sendTyping(selectedUser._id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedUser._id, false);
    }, 3000);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a._id !== attachmentId));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    return '📎';
  };

  const isImage = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  // Adjusted positioning to avoid overlap with Add Job floating action button
  // Previous: bottom-6 right-6. New: bottom-24 right-8.
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50"
        title="Open Chat"
        aria-label="Open Chat"
      >
        <MessageSquare size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-orange-500 rounded-full border-2 border-white"></span>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-24 right-8 bg-white rounded-lg shadow-2xl z-50 flex flex-col ${isMinimized ? 'h-14' : 'h-[600px]'} w-96 transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} />
          <span className="font-semibold">
            {selectedUser ? selectedUser.fullName : 'Chat'}
          </span>
          {!isConnected && (
            <span className="text-xs bg-orange-500 px-2 py-0.5 rounded">Offline</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-blue-700 p-1 rounded"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setSelectedUser(null);
            }}
            className="hover:bg-blue-700 p-1 rounded"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!selectedUser ? (
            /* User Selection */
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-gray-600 mb-3">Select a user to chat with:</p>
              <div className="space-y-2">
                {users.map((chatUser) => (
                  <button
                    key={chatUser._id}
                    onClick={() => setSelectedUser(chatUser)}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{chatUser.fullName}</p>
                      <p className="text-xs text-gray-500">{chatUser.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Back button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border-b text-left"
              >
                ← Back to users
              </button>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isMyMessage = msg.sender._id === user?.id;
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-4 py-2 ${
                              isMyMessage
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border'
                            }`}
                          >
                            {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                            
                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((att) => (
                                  <div key={att._id}>
                                    {isImage(att.mimeType) ? (
                                      /* Image preview */
                                      <a
                                        href={getChatAttachmentUrl(att._id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={getChatAttachmentUrl(att._id)}
                                          alt={att.originalName}
                                          className="max-w-full max-h-64 rounded cursor-pointer hover:opacity-90"
                                          loading="lazy"
                                        />
                                      </a>
                                    ) : (
                                      /* File attachment */
                                      <a
                                        href={getChatAttachmentUrl(att._id)}
                                        download={att.originalName}
                                        className={`flex items-center space-x-2 p-2 rounded ${
                                          isMyMessage ? 'bg-blue-700' : 'bg-gray-100'
                                        } hover:opacity-80`}
                                      >
                                        <span className="text-lg">{getFileIcon(att.mimeType)}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs truncate">{att.originalName}</p>
                                          <p className="text-xs opacity-75">
                                            {(att.size / 1024).toFixed(1)} KB
                                          </p>
                                        </div>
                                        <Download size={14} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reactions */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                                  const count = msg.reactions.filter(r => r.emoji === emoji).length;
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg._id, emoji)}
                                      className="text-xs px-2 py-0.5 bg-white/20 rounded-full hover:bg-white/30"
                                    >
                                      {emoji} {count}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {typingUsers.has(selectedUser._id) && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 rounded-lg px-4 py-2">
                          <p className="text-sm text-gray-600">typing...</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white rounded-b-lg">
                {/* Attachment preview */}
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <div key={att._id} className="flex items-center space-x-2 bg-gray-100 rounded px-2 py-1">
                        <FileText size={14} />
                        <span className="text-xs truncate max-w-[150px]">{att.originalName}</span>
                        <button onClick={() => removeAttachment(att._id)} className="text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Uploading indicator */}
                {uploadingFiles.length > 0 && (
                  <div className="mb-2 text-xs text-gray-600">
                    Uploading {uploadingFiles.length} file(s)...
                  </div>
                )}

                {/* Emoji picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-20 right-4">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}

                <div className="flex items-end space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Attach file (PDF, DOCX, XLSX, PNG, JPEG)"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Add emoji"
                  >
                    <Smile size={20} />
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && attachments.length === 0}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
