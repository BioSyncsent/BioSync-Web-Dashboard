import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

import { useNavigate } from "react-router-dom";

import "./Login.css";


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

<div className="biosync-page">

  <div className="biosync-grid" />
  <div className="biosync-scanline" />

  <div className="biosync-content">

    <div className="biosync-header">

      <div className="biosync-logo-wrap">
        <div className="biosync-logo-glow" />
        <svg
          className="biosync-logo"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="42" className="biosync-logo-ring-outer" />
          <circle cx="50" cy="50" r="32" className="biosync-logo-ring-inner" />
          <path
            className="biosync-logo-shield"
            d="M50 16 L78 28 V50 C78 68 66 80 50 86 C34 80 22 68 22 50 V28 Z"
          />
          <path
            className="biosync-logo-print"
            d="M50 38 a12 12 0 1 0 0.1 0 M50 44 a6 6 0 1 0 0.1 0 M50 32 v-6 M50 68 v6 M38 50 h-6 M68 50 h6"
          />
        </svg>
      </div>

      <h1 className="biosync-title">BioSync Sentinel</h1>
      <p className="biosync-tagline">Secure Access</p>

    </div>

    <div className="biosync-hairline" />

    <div className="biosync-panel">

      <div className="biosync-panel-watermark" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <path d="M100 30 C130 30 155 55 155 90 C155 140 125 165 100 175 C75 165 45 140 45 90 C45 55 70 30 100 30 Z M100 45 v130 M75 60 C75 60 65 75 65 95 C65 130 85 155 100 160 M125 60 C125 60 135 75 135 95 C135 130 115 155 100 160 M80 80 h40 M78 100 h44 M82 120 h36" />
        </svg>
      </div>

      <h2 className="biosync-panel-title">Login</h2>

      <form onSubmit={handleLogin} className="biosync-form">

        <div className="biosync-field">
          <label className="biosync-label" htmlFor="biosync-email">
            Email
          </label>
          <input
            id="biosync-email"
            className="biosync-input"
            type="email"
            placeholder="user@institution.edu"
            value={email}
            onChange={
              (e)=>setEmail(e.target.value)
            }
          />
        </div>

        <div className="biosync-field">
          <label className="biosync-label" htmlFor="biosync-password">
            Password
          </label>
          <input
            id="biosync-password"
            className="biosync-input"
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={
              (e)=>setPassword(e.target.value)
            }
          />
        </div>

        <button type="submit" className="biosync-button">
          [ Login ]
        </button>

      </form>

      {error && (
        <p className="biosync-error">{error}</p>
      )}

      <div className="biosync-panel-footer">
        Unauthorized Access Is Prohibited &bull; v4.2.1
      </div>

    </div>

  </div>

</div>

);


}


export default Login;