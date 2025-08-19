import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FaBell } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Notifications = () => {
  const { notifications, fetchNotifications, unreadCount } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Effect to handle closing the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // This is the corrected click handler
  const handleNotificationClick = async (event, notification) => {
    // 1. Prevent the link from navigating immediately
    event.preventDefault();
    setIsOpen(false);

    // 2. Mark the notification as read if it's unread
    if (!notification.is_read) {
      try {
        await axios.put(`http://localhost:5000/api/notifications/${notification.notification_id}/read`);
        await fetchNotifications(); // Wait for the list to refresh
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    }
    
    // 3. NOW, navigate to the link's destination
    navigate(notification.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative">
        <FaBell className="text-xl text-gray-600 hover:text-blue-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 text-xs text-white bg-red-500 rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 border">
          <div className="p-4 font-bold border-b">Notifications</div>
          <div className="py-1 max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <Link
                  key={notif.notification_id}
                  to={notif.link}
                  // We pass the event 'e' to our handler
                  onClick={(e) => handleNotificationClick(e, notif)}
                  className={`block px-4 py-3 text-sm border-b hover:bg-gray-100 ${!notif.is_read ? 'font-bold text-gray-800' : 'text-gray-600'}`}
                >
                  {notif.message}
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">No notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;