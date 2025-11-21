import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';
import { ChatMessage } from './api';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';

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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Chat socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Chat socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Message events
    if (onNewMessage) {
      newSocket.on('message:new', onNewMessage);
    }

    if (onMessageDelivered) {
      newSocket.on('message:delivered', onMessageDelivered);
    }

    if (onTyping) {
      newSocket.on('typing:user', onTyping);
    }

    if (onReactionUpdate) {
      newSocket.on('message:reaction:update', onReactionUpdate);
    }

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [onNewMessage, onMessageDelivered, onTyping, onReactionUpdate]);

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
