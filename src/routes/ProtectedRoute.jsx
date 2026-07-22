import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";


function ProtectedRoute({children, allowedRoles}){

const {user, loading}=useAuth();


if(loading){
    return <h1>Loading...</h1>;
}


if(!user){
    return <Navigate to="/login" replace />;
}


if(
    allowedRoles &&
    !allowedRoles.includes(user.role)
){
    return <Navigate to="/unauthorized" />;
}


return children;

}


export default ProtectedRoute;