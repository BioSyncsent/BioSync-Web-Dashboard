import DashboardLayout from "../components/layout/DashboardLayout";

function Dashboard() {

  return (
    <DashboardLayout>

      <div>
        <h1 style={{color:"black"}}>
          BioSync Dashboard TEST Hello cbs
          This is BioSync
        </h1>

        <p style={{color:"black"}}>
          If you see this, Dashboard is working.
          If you don't see this then idk.
        </p>

      </div>

    </DashboardLayout>
  );

}

export default Dashboard;