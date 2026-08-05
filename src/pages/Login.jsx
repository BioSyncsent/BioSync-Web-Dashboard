import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";

import { auth, db } from "../firebase/firebase";

import logoMark from "../assets/biosync-mark.png";
import "./Login.css";


function Login(){

    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [error,setError] = useState("");

    const navigate = useNavigate();
    const location = useLocation();


    // Header logo/nav behavior — kept identical to LandingPage.jsx's
    // handleLogoClick / handleGetStarted so the header behaves exactly
    // the same on every page.
    function handleLogoClick(){

        if(location.pathname === "/"){

            // Already on the landing page — reload so entrance animations replay
            window.location.reload();

        }
        else{

            // Elsewhere in the app — return to the landing page
            navigate("/");

        }

    }

    function handleGetStarted(){

        navigate("/login");

    }


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
                if(userData.role === "admin"){

                    navigate("/admin/dashboard");

                }

                else if(userData.role === "teacher"){

                    navigate("/teacher/dashboard");

                }

                else if(userData.role === "student"){

                    navigate("/student/dashboard");

                }

                else{

                    setError("Invalid user role");

                }

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

<div className="landing-layout">

  {/* Background decoration — same visual family as the Landing Page */}
  <div className="landing-bg-glows">
    <div className="bg-glow bg-glow-1"></div>
    <div className="bg-glow bg-glow-2"></div>
  </div>
  <div className="landing-cyber-grid"></div>

  {/* ================= Header =================
      Same markup, classes, and styling as LandingPage.jsx's header.
      Only difference: no nav links and no hamburger menu, since this
      page has nothing else to link to. Keep this block in sync with
      LandingPage.jsx if the header ever changes. */}
  <header className="landing-header glass-panel">
    <div className="header-container">

      <button
        type="button"
        className="header-logo"
        onClick={handleLogoClick}
        aria-label="Bio-Sync Sentinel — return to homepage"
      >
        <img src={logoMark} alt="" className="logo-mark" />
        <span className="logo-text">Bio-Sync <span className="text-accent">Sentinel</span></span>
      </button>

      <div className="header-actions">
        <button onClick={handleGetStarted} className="btn-signin">
          Sign In
        </button>
        <button onClick={handleGetStarted} className="btn-getstarted btn-glow">
          Get Started
        </button>
      </div>

    </div>
  </header>

  {/* ================= Auth card ================= */}
  <div className="login-content">

    <div className="login-panel glass-panel">

      <div className="login-panel-glow" aria-hidden="true" />

      <div className="login-panel-header">
        <div className="login-panel-logo">
          <Shield size={22} className="login-panel-logo-icon" />
        </div>
        <h1 className="login-panel-title">Welcome back</h1>
        <p className="login-panel-subtitle">Sign in to Bio-Sync Sentinel</p>
      </div>

      <form onSubmit={handleLogin} className="login-form">

        <div className="login-field">
          <label className="login-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="login-input"
            type="email"
            placeholder="user@institution.edu"
            value={email}
            onChange={
              (e)=>setEmail(e.target.value)
            }
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="login-input"
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={
              (e)=>setPassword(e.target.value)
            }
          />
        </div>

        <button type="submit" className="login-button">
          Login
        </button>

      </form>

      {error && (
        <p className="login-error">{error}</p>
      )}

      <div className="login-panel-footer">
        Unauthorized Access Is Prohibited &bull; v4.2.1
      </div>

    </div>

  </div>

</div>

);


}


export default Login;