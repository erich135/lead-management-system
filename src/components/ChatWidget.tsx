import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, User, Minimize2, Paperclip, FileText, Smile, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  getChatUsers,
  getChatThread,
  uploadChatAttachment,
  getChatAttachmentUrl,
  getUnreadCount,
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({}); // Per-user unread counts
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({}); // Last message per user
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markReadRef = useRef<((senderId: string, messageIds?: string[]) => Promise<void>) | null>(null);

  // Socket.io integration
  const { isConnected, sendMessage: socketSendMessage, markRead, sendTyping, addReaction } = useChatSocket(
    // On new message
    useCallback((message: ChatMessage) => {
      const senderId = message.sender._id;
      const receiverId = message.receiver._id;
      const isForMe = receiverId === user?.id;
      const isFromSelected = selectedUser && (senderId === selectedUser._id || receiverId === selectedUser._id);
      
      // Update last message for this conversation
      const otherUserId = isForMe ? senderId : receiverId;
      setLastMessages(prev => ({ ...prev, [otherUserId]: message }));
      
      if (isFromSelected) {
        // If message is for currently selected user, add to messages
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          
          // Check if this is a real message that should replace a temp message
          // (e.g., sender sent a message, got temp message, now receiving real one)
          const tempMessageIndex = prev.findIndex(m => 
            m._id.startsWith('temp-') &&
            m.sender._id === message.sender._id &&
            m.receiver._id === message.receiver._id &&
            m.text === message.text &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000 // Within 5 seconds
          );
          
          if (tempMessageIndex !== -1) {
            // Replace temp message with real message
            const updated = [...prev];
            updated[tempMessageIndex] = message;
            return updated;
          }
          
          return [...prev, message];
        });
        
        // Scroll to bottom when new message arrives for selected user
        setTimeout(() => scrollToBottom(), 100);
        
        // If message is from selected user (they sent it to me), mark as read
        if (isForMe && senderId === selectedUser._id && markReadRef.current) {
          markReadRef.current(selectedUser._id).then(() => {
            // Update unread count after marking as read
            setUnreadCounts(prev => {
              const updated = { ...prev };
              const removedCount = updated[selectedUser._id] || 0;
              delete updated[selectedUser._id];
              setUnreadCount(prevTotal => Math.max(0, prevTotal - removedCount));
              return updated;
            });
            // Refresh from server to ensure accuracy
            getUnreadCount().then(count => setUnreadCount(count)).catch(console.error);
          });
        }
      } else if (isForMe) {
        // Message is for me but from different user - increment unread count
        setUnreadCounts(prev => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1
        }));
        setUnreadCount(prev => prev + 1);
      }
    }, [selectedUser, user?.id]),
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

  // Store markRead in ref so it can be used in callbacks
  useEffect(() => {
    markReadRef.current = markRead;
  }, [markRead]);

  // Load users and initial unread count
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadInitialUnreadCount();
    } else {
      // Reset unread counts when closing to ensure fresh state on reopen
      setUnreadCounts({});
      // Also reset the total unread count - it will be refreshed from server on reopen
      setUnreadCount(0);
    }
  }, [isOpen]); // Only reload when opening/closing

  // Update user list sorting when lastMessages change
  useEffect(() => {
    if (isOpen && users.length > 0) {
      const sortedUsers = [...users].sort((a, b) => {
        const lastMsgA = lastMessages[a._id];
        const lastMsgB = lastMessages[b._id];
        if (!lastMsgA && !lastMsgB) return 0;
        if (!lastMsgA) return 1;
        if (!lastMsgB) return -1;
        return new Date(lastMsgB.createdAt).getTime() - new Date(lastMsgA.createdAt).getTime();
      });
      setUsers(sortedUsers);
    }
  }, [lastMessages]); // Update sorting when lastMessages change

  // Load messages when user selected
  useEffect(() => {
    if (selectedUser) {
      // Clear messages first to ensure fresh load
      setMessages([]);
      loadMessages();
    } else {
      // Clear messages when no user selected
      setMessages([]);
    }
  }, [selectedUser]);

  // Auto-scroll - use setTimeout to ensure DOM is updated
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Use setTimeout to ensure messages are rendered before scrolling
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, selectedUser, loading]);

  const loadUsers = async () => {
    try {
      const usersData = await getChatUsers();
      setUsers(usersData);
      
      // Load last message for each user
      for (const chatUser of usersData) {
        try {
          const { messages } = await getChatThread(chatUser._id, undefined, 1);
          if (messages.length > 0) {
            setLastMessages(prev => ({ ...prev, [chatUser._id]: messages[messages.length - 1] }));
          }
        } catch (err) {
          // Silently fail for individual user threads
          console.debug(`Could not load last message for ${chatUser._id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadInitialUnreadCount = async () => {
    try {
      const totalUnread = await getUnreadCount();
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  };

  const loadMessages = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const { messages: messagesData } = await getChatThread(selectedUser._id);
      // Merge with existing messages, removing duplicates
      setMessages(prev => {
        const loadedIds = new Set(messagesData.map(m => m._id));
        
        // Keep temp messages that don't have a corresponding real message yet
        // (messages that were just sent but socket hasn't confirmed yet)
        const tempMessages = prev.filter(m => {
          if (!m._id.startsWith('temp-')) return false;
          // Check if this temp message has been replaced by a real one
          const hasRealVersion = messagesData.some(realMsg =>
            realMsg.sender._id === m.sender._id &&
            realMsg.receiver._id === m.receiver._id &&
            realMsg.text === m.text &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(realMsg.createdAt).getTime()) < 5000
          );
          return !hasRealVersion;
        });
        
        // Keep existing socket messages that aren't in the loaded data
        const existingMessages = prev.filter(m => 
          !m._id.startsWith('temp-') && !loadedIds.has(m._id)
        );
        
        // Combine: existing socket messages + loaded REST messages + temp messages
        const allMessages = [...existingMessages, ...messagesData, ...tempMessages];
        
        // Remove duplicates by ID and sort by createdAt
        const uniqueMessages = Array.from(
          new Map(allMessages.map(m => [m._id, m])).values()
        ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        return uniqueMessages;
      });
      
      // Mark messages as read if there are unread ones
      const unreadMessages = messagesData.filter(m => m.sender._id === selectedUser._id && !m.isRead);
      if (unreadMessages.length > 0) {
        // Mark as read on server first
        await markRead(selectedUser._id);
        
        // Clear unread count for this user
        setUnreadCounts(prev => {
          const updated = { ...prev };
          delete updated[selectedUser._id];
          return updated;
        });
        
        // Always refresh from server to ensure accuracy after marking as read
        try {
          const serverUnreadCount = await getUnreadCount();
          setUnreadCount(serverUnreadCount);
        } catch (err) {
          console.error('Error refreshing unread count:', err);
          // Fallback: calculate locally if server refresh fails
          setUnreadCounts(prev => {
            const removedCount = prev[selectedUser._id] || 0;
            setUnreadCount(prevTotal => Math.max(0, prevTotal - removedCount));
            const updated = { ...prev };
            delete updated[selectedUser._id];
            return updated;
          });
        }
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
        className="fixed bottom-24 right-8 bg-[#0969a9] text-white p-4 rounded-full hover:bg-[#0969a9]/90 transition-all z-30"
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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={() => {
          setIsOpen(false);
          setSelectedUser(null);
        }}
      />
      
      {/* Chat Widget */}
      <div className={`fixed bottom-24 right-8 bg-white rounded-lg z-30 flex flex-col ${isMinimized ? 'h-14' : 'h-[600px]'} w-96 transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-[#0969a9] text-white rounded-t-lg">
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
            className="hover:bg-[#0969a9]/80 p-1 rounded"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setSelectedUser(null);
            }}
            className="hover:bg-[#0969a9]/80 p-1 rounded"
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
                {users.map((chatUser) => {
                  const unread = unreadCounts[chatUser._id] || 0;
                  const lastMsg = lastMessages[chatUser._id];
                  const isUnread = unread > 0;
                  
                  return (
                    <button
                      key={chatUser._id}
                      onClick={async () => {
                        setSelectedUser(chatUser);
                        // Clear unread count when selecting user
                        if (unread > 0) {
                          setUnreadCounts(prev => {
                            const updated = { ...prev };
                            delete updated[chatUser._id];
                            return updated;
                          });
                          // Refresh from server to ensure accuracy
                          try {
                            const serverUnreadCount = await getUnreadCount();
                            setUnreadCount(serverUnreadCount);
                          } catch (err) {
                            console.error('Error refreshing unread count:', err);
                            // Fallback to local calculation
                            setUnreadCount(prev => Math.max(0, prev - unread));
                          }
                        }
                      }}
                      className={`w-full flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg transition-colors text-left ${
                        isUnread ? 'bg-blue-50 border-l-4 border-[#0969a9]' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="w-10 h-10 bg-[#0969a9] rounded-full flex items-center justify-center text-white">
                          <User size={20} />
                        </div>
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${isUnread ? 'text-[#0969a9]' : 'text-gray-900'}`}>
                            {chatUser.fullName}
                          </p>
                          {lastMsg && (
                            <span className="text-xs text-gray-400 ml-2">
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        {lastMsg ? (
                          <p className={`text-xs truncate ${isUnread ? 'text-[#0969a9] font-medium' : 'text-gray-500'}`}>
                            {lastMsg.sender._id === user?.id ? 'You: ' : `${lastMsg.sender.firstName}: `}
                            {lastMsg.text || (lastMsg.attachments && lastMsg.attachments.length > 0 ? '📎 Attachment' : '')}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">{chatUser.email}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Back button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-sm text-[#0969a9] hover:bg-gray-50 border-b text-left"
              >
                ← Back to users
              </button>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-[#0969a9]" size={32} />
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
                                ? 'bg-[#0969a9] text-white'
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
                                          isMyMessage ? 'bg-[#0969a9]/80' : 'bg-gray-100'
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

                            <p className={`text-xs mt-1 ${isMyMessage ? 'text-white/70' : 'text-gray-500'}`}>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0969a9] focus:border-[#0969a9] text-sm resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && attachments.length === 0}
                    className="p-2 bg-[#0969a9] text-white rounded-lg hover:bg-[#0969a9]/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
    </>
  );
}
