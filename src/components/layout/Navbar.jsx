import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";


function Navbar(){

const {user}=useAuth();


async function handleLogout(){

    await signOut(auth);

}


return(

<header
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
padding:"15px",
background:"#fff"
}}
>


<h2>
BioSync Sentinel
</h2>



<div>

<span style={{marginRight:"20px"}}>

{user?.fullName || "User"}

</span>


<button onClick={handleLogout}>

Logout

</button>


</div>


</header>


);


}


export default Navbar;