function Sidebar() {
  return (
    <div style={{ width: '250px', background: '#1e293b', color: '#fff', height: '100vh', padding: '20px' }}>
      <h2>BioSync</h2>
      <hr />
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <a href="/dashboard" style={{ color: '#fff', textDecoration: 'none' }}>📊 Dashboard</a>
        <a href="/attendance" style={{ color: '#fff', textDecoration: 'none' }}>📅 Attendance</a>
        <a href="/disputes" style={{ color: '#fff', textDecoration: 'none' }}>⚠️ Disputes</a>
        <a href="/users" style={{ color: '#fff', textDecoration: 'none' }}>👥 Users</a>
      </nav>
    </div>
  );
}

export default Sidebar;