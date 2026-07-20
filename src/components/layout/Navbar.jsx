import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Search, Bell, LogOut } from "lucide-react";
import "./Navbar.css";


function Navbar(){

const {user}=useAuth();


async function handleLogout(){

    await signOut(auth);

}


return(

<header className="db-navbar">

  <h2 className="db-navbar-title">
    BioSync Sentinel
  </h2>

  <div className="db-navbar-search">
    <Search size={16} className="db-navbar-search-icon" />
    <input
      type="text"
      placeholder="Search..."
      className="db-navbar-search-input"
    />
  </div>

  <div className="db-navbar-actions">

    <button className="db-navbar-icon-btn" aria-label="Notifications">
      <Bell size={18} />
    </button>

    <div className="db-navbar-user">
      <div className="db-navbar-avatar">
        {(user?.name || "U").charAt(0).toUpperCase()}
      </div>
      <span className="db-navbar-username">
        {user?.name || "User"}
      </span>
    </div>

    <button onClick={handleLogout} className="db-navbar-logout">
      <LogOut size={15} />
      Logout
    </button>

  </div>

</header>


);


}


export default Navbar;