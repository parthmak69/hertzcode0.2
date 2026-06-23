"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    // Wait for the exit animation (300ms) to complete before removing
    setTimeout(() => {
      removeToast(id);
    }, 300);
  }, [removeToast]);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);

    // Schedule exit animation
    setTimeout(() => {
      dismissToast(id);
    }, duration - 300);
  }, [dismissToast]);

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <i className="fa-solid fa-circle-check" />;
      case "error":
        return <i className="fa-solid fa-circle-xmark" />;
      case "warning":
        return <i className="fa-solid fa-triangle-exclamation" />;
      case "info":
      default:
        return <i className="fa-solid fa-circle-info" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} ${
              toast.isExiting ? "toast-exit" : ""
            }`}
          >
            <span className="toast-icon">{getIcon(toast.type)}</span>
            <div className="toast-content">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Close notification"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
