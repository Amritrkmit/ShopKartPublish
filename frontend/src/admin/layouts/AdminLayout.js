// import Sidebar from "../components/Sidebar";
// import { Outlet } from "react-router-dom";

// export default function AdminLayout() {
//   return (
//     <div className="flex">
//       {/* Sidebar on the left */}
//       <Sidebar />

//       {/* Main content */}
//       <main className="flex-1 p-6 md:ml-64">
//         <Outlet /> {/* Render child admin pages here */}
//       </main>
//     </div>
//   );
// }


import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminHeader from "../components/AdminHeader";
import { Menu } from "lucide-react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f3f4f6]">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">

        {/* Admin Header - Desktop */}
        <div className="hidden lg:block">
          <AdminHeader />
        </div>

        {/* Mobile Header */}
        <header className="h-16 bg-white shadow-sm flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-gray-700">Admin Panel</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
