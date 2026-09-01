import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { toastSuccess } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";
import { useAuth } from "../../context/AuthContext";


const Logout = ({
  onLogout,
  buttonClass = "bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600",
}) => {
  const { confirm } = useConfirmation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const performLogout = async () => {
    try {
      logout('admin');
      toastSuccess("Logged out from Admin Panel");
      if (onLogout) onLogout();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed", err);
      logout('admin');
      navigate("/", { replace: true });
    }
  };

  const handleLogoutClick = () => {
    confirm({
      title: "Logout?",
      message: "Are you sure you want to logout? You will need to sign in again to access the dashboard.",
      confirmText: "Logout",
      isDelete: true,
      onConfirm: performLogout
    });
  };

  return (
    <button onClick={handleLogoutClick} className={buttonClass}>
      <LogOut size={20} />
      <span>Logout</span>
    </button>
  );
};

export default Logout;
