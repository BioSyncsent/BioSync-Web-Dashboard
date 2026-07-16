import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function DashboardLayout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left side: Persistent Sidebar */}
      <Sidebar />

      {/* Right side: Top Navbar + Scrollable Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, padding: '20px', background: '#f8fafc', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}


export default DashboardLayout;