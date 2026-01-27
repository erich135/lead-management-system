import { X } from 'lucide-react';
import { NotificationSystem } from './NotificationSystem';
import { useNavigate } from 'react-router-dom';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLeadClick = (leadId: string) => {
    // Navigate to sales-leads view. 
    // Ideally we would pass the leadId to filter or open it, but the current routing 
    // structure uses Dashboard state. For now, switching view is the best we can do.
    navigate('/sales-leads');
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <NotificationSystem onLeadClick={handleLeadClick} />
          </div>
        </div>
      </div>
    </>
  );
}
