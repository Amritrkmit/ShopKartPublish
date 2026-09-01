// src/utils/toast.js
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Success toast
export const toastSuccess = (message = "Success") => {
  toast.success(message, {
    position: "bottom-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
    closeButton: false,
    style: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: "16px",
      minWidth: "320px", 
      maxWidth: "500px",
      width: "fit-content",
      borderRadius: "0px",
    },
  });
};

// Error toast
export const toastError = (message = "Something went wrong") => {
  // Ignore request cancellation errors to avoid user confusion
  if (message && (
    typeof message === 'string' && (
      message.toLowerCase().includes("aborted") ||
      message.toLowerCase().includes("canceled") ||
      message.toLowerCase().includes("cancelled")
    )
  )) {
    return;
  }

  toast.error(message, {
    position: "bottom-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
    closeButton: false,
    style: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: "16px",
      minWidth: "320px", 
      maxWidth: "500px",
      width: "fit-content",
      borderRadius: "0px",
    },
  });
};

// Info toast
export const toastInfo = (message = "") => {
  toast.info(message, {
    position: "bottom-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
    closeButton: false,
    style: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: "16px",
      minWidth: "320px", 
      maxWidth: "500px",
      width: "fit-content",
      borderRadius: "0px",
    },
  });
};

// Warning toast
export const toastWarning = (message = "") => {
  toast.warn(message, {
    position: "bottom-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
    closeButton: false,
    style: {
      fontFamily: "'Outfit', sans-serif",
      fontSize: "16px",
      minWidth: "320px", 
      maxWidth: "500px",
      width: "fit-content",
      borderRadius: "0px",
    },
  });
};

// Confirm dialog using toast (replacement for window.confirm)
export const toastConfirm = (message, onConfirm, onCancel) => {
  const toastId = toast.info(
    <div>
      <p className="mb-3">{message}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            toast.dismiss(toastId);
            if (onCancel) onCancel();
          }}
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            toast.dismiss(toastId);
            if (onConfirm) onConfirm();
          }}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Confirm
        </button>
      </div>
    </div>,
    {
      position: "bottom-center",
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
      draggable: false,
      theme: "dark",
      style: {
        fontFamily: "'Outfit', sans-serif",
        fontSize: "16px",
        minWidth: "320px", 
        maxWidth: "500px",
        width: "fit-content",
        borderRadius: "0px",
      },
    }
  );
};

// Helper to extract message from Axios errors
export const axiosErrorMessage = (err) => {
  if (!err) return "Unknown error";
  return err.response?.data?.message || err.message || "Request failed";
};
