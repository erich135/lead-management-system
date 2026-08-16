import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';
import { ChatMessage } from './api';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';

const SOCKET_URL = resolveApiBaseUrl();

interface UseChatSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (receiverId: string, text: string, attachmentIds?: string[]) => Promise<void>;
  markRead: (senderId: string, messageIds?: string[]) => Promise<void>;
  sendTyping: (receiverId: string, isTyping: boolean) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
}

/**
 * Custom hook for Socket.io chat connection.
 * Manages connection state and provides messaging functions.
 */
export function useChatSocket(
  onNewMessage?: (message: ChatMessage) => void,
  onMessageDelivered?: (data: { receiverId: string; count: number }) => void,
  onTyping?: (data: { userId: string; isTyping: boolean }) => void,
  onReactionUpdate?: (data: { messageId: string; reactions: any[] }) => void
): UseChatSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  // Use refs to store callbacks so they don't trigger reconnections
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeliveredRef = useRef(onMessageDelivered);
  const onTypingRef = useRef(onTyping);
  const onReactionUpdateRef = useRef(onReactionUpdate);

  // Update refs when callbacks change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageDeliveredRef.current = onMessageDelivered;
    onTypingRef.current = onTyping;
    onReactionUpdateRef.current = onReactionUpdate;
  }, [onNewMessage, onMessageDelivered, onTyping, onReactionUpdate]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],  // WebSocket only — no HTTP polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Chat socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Message events - use refs to access latest callbacks
    newSocket.on('message:new', (message: ChatMessage) => {
      if (onNewMessageRef.current) {
        onNewMessageRef.current(message);
      }
    });

    newSocket.on('message:delivered', (data: { receiverId: string; count: number }) => {
      if (onMessageDeliveredRef.current) {
        onMessageDeliveredRef.current(data);
      }
    });

    newSocket.on('typing:user', (data: { userId: string; isTyping: boolean }) => {
      if (onTypingRef.current) {
        onTypingRef.current(data);
      }
    });

    newSocket.on('message:reaction:update', (data: { messageId: string; reactions: any[] }) => {
      if (onReactionUpdateRef.current) {
        onReactionUpdateRef.current(data);
      }
    });

    return () => {
      newSocket.removeAllListeners();
      newSocket.close();
      socketRef.current = null;
    };
  }, []); // Empty dependency array - socket only created once

  const sendMessage = async (
    receiverId: string,
    text: string,
    attachmentIds: string[] = []
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('message:send', { receiverId, text, attachmentIds }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  };

  const markRead = async (senderId: string, messageIds?: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('message:read', { senderId, messageIds }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  };

  const sendTyping = (receiverId: string, isTyping: boolean): void => {
    if (!socket) return;

    socket.emit(isTyping ? 'typing:start' : 'typing:stop', { receiverId });
  };

  const addReaction = async (messageId: string, emoji: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('message:reaction', { messageId, emoji }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  };

  return {
    socket,
    isConnected,
    sendMessage,
    markRead,
    sendTyping,
    addReaction,
  };
}
