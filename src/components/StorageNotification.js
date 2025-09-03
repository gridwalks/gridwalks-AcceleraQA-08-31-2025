import React, { memo, useState, useEffect } from 'react';
import { X, Database, Info, CheckCircle } from 'lucide-react';
import { isStorageAvailable } from '../utils/storageUtils';

const StorageNotification = memo(({ user, messagesCount = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [notificationType, setNotificationType] = useState('info'); // 'info', 'success', 'warning', 'error'

  useEffect(() => {
    // Show notification after user is authenticated and we have some messages
    if (user && messagesCount > 0) {
      // Check if user has seen the storage notification
      const hasSeenNotification = localStorage.getItem('acceleraqa_storage_notification_seen');
      
      if (!hasSeenNotification) {
        setIsVisible(true);
        setNotificationType(isStorageAvailable() ? 'info' : 'warning');
      }
    }
  }, [user, messagesCount]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember that user has seen this notification
    try {
      localStorage.setItem('acceleraqa_storage_notification_seen', 'true');
    } catch (error) {
      console.warn('Could not save notification preference:', error);
    }
  };

  const handleLearnMore = () => {
    // Could open a modal or navigate to documentation
    alert(
      'AcceleraQA now automatically saves your conversations locally in your browser. ' +
      'Your data stays private and secure on your device. You can manage your stored data ' +
      'using the storage icon in the header.'
    );
  };

  if (!isVisible) return null;

  const getNotificationContent = () => {
    if (!isStorageAvailable()) {
      return {
        icon: <Database className="h-5 w-5 text-orange-600" />,
        title: 'Storage Not Available',
        message: 'Your browser doesn\'t support local storage. Conversations won\'t be saved between sessions.',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        buttonColor: 'text-orange-600 hover:text-orange-800'
      };
    }

    return {
      icon: <CheckCircle className="h-5 w-5 text-blue-600" />,
      title: 'Conversations Now Saved Locally',
      message: 'Your AcceleraQA conversations are automatically saved in your browser and will persist between sessions.',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      buttonColor: 'text-blue-600 hover:text-blue-800'
    };
  };

  const content = getNotificationContent();

  return (
    <div className="fixed top-20 right-4 max-w-sm z-50 animate-slideIn">
      <div className={`${content.bgColor} ${content.borderColor} border rounded-lg shadow-lg p-4`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {content.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${content.textColor} text-sm mb-1`}>
              {content.title}
            </h3>
            <p className={`${content.textColor} text-sm leading-relaxed mb-3`}>
              {content.message}
            </p>
            
            <div className="flex items-center justify-between">
              <button
                onClick={handleLearnMore}
                className={`text-xs font-medium ${content.buttonColor} transition-colors`}
              >
                Learn More
              </button>
              
              <button
                onClick={handleDismiss}
                className={`${content.textColor} hover:${content.textColor.replace('text-', 'text-opacity-70 text-')} transition-colors`}
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Enhanced notification for first-time storage users
const StorageWelcomeModal = memo(({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Welcome to Persistent Storage!
          </h2>
          <p className="text-gray-600">
            AcceleraQA now saves your conversations locally in your browser.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Always Available</h3>
              <p className="text-sm text-gray-600">Your conversations persist between browser sessions</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Privacy First</h3>
              <p className="text-sm text-gray-600">Data stays on your device - never sent to our servers</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Easy Management</h3>
              <p className="text-sm text-gray-600">View storage status and manage data from the header</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <Info className="h-4 w-4 mr-2 text-gray-600" />
            How it Works
          </h4>
          <p className="text-sm text-gray-600">
            Your messages are automatically saved using your browser's local storage. 
            This means your pharmaceutical quality discussions and study notes are always 
            available when you return to AcceleraQA.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Got it, thanks!
        </button>
      </div>
    </div>
  );
});

// Hook to manage storage notifications
export const useStorageNotifications = (user, messagesCount) => {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (user && messagesCount >= 3) {
      const hasSeenWelcome = localStorage.getItem('acceleraqa_storage_welcome_seen');
      const hasSeenNotification = localStorage.getItem('acceleraqa_storage_notification_seen');
      
      // Show welcome modal for first-time users with some conversations
      if (!hasSeenWelcome && !hasSeenNotification && isStorageAvailable()) {
        setShowWelcomeModal(true);
      }
    }
  }, [user, messagesCount]);

  const closeWelcomeModal = () => {
    setShowWelcomeModal(false);
    try {
      localStorage.setItem('acceleraqa_storage_welcome_seen', 'true');
      localStorage.setItem('acceleraqa_storage_notification_seen', 'true');
    } catch (error) {
      console.warn('Could not save welcome modal preference:', error);
    }
  };

  return {
    StorageWelcomeModal: () => (
      <StorageWelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={closeWelcomeModal}
        user={user}
      />
    ),
    showWelcomeModal
  };
};

StorageNotification.displayName = 'StorageNotification';
StorageWelcomeModal.displayName = 'StorageWelcomeModal';

export default StorageNotification;
