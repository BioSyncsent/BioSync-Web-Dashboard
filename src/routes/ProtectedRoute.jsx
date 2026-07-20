import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";


function ProtectedRoute({children,role}){


const {user,loading}=useAuth();



if(loading){

return <h1>Loading...</h1>;

}



if(!user){

return <Navigate to="/login" />;

}



if(role && user.role !== role){

return <Navigate to="/unauthorized"/>

}



return children;


}


export default ProtectedRoute;