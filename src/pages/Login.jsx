import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

import { useNavigate } from "react-router-dom";


function Login(){

    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [error,setError] = useState("");

    const navigate = useNavigate();


    async function handleLogin(e){

        e.preventDefault();

        try{

            // Login Firebase Authentication
            const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            const uid = userCredential.user.uid;


            // Get user profile from Firestore
            const userDoc =
            await getDoc(
                doc(db,"users",uid)
            );


            if(userDoc.exists()){

                const userData = userDoc.data();


                console.log(userData);


                // Redirect based on role
                navigate("/dashboard")
                //if(userData.role==="admin"){
                //    navigate("/admin");
                //}

                //else if(userData.role==="teacher"){
                  //  navigate("/teacher");
                //}

                //else if(userData.role==="student"){
                 //   navigate("/student");
                //}

            }
            else{

                setError(
                    "User profile not found"
                );

            }


        }
        catch(err){

            console.log(err);

            setError(
                "Invalid email or password"
            );

        }

    }



return (

<div>

<h1>
BioSync Sentinel
</h1>

<h2>
Login
</h2>


<form onSubmit={handleLogin}>


<input

type="email"

placeholder="Email"

value={email}

onChange={
(e)=>setEmail(e.target.value)
}

/>



<input

type="password"

placeholder="Password"

value={password}

onChange={
(e)=>setPassword(e.target.value)
}

/>



<button type="submit">

Login

</button>


</form>


<p>
{error}
</p>


</div>

);


}


export default Login;