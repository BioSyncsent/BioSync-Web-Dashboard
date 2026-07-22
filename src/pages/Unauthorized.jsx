import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./Unauthorized.css";


function Unauthorized(){

    const navigate = useNavigate();


    return (

        <div className="biosync-page">

            <div className="biosync-grid" />

            <div className="biosync-scanline" />


            <div className="biosync-content">


                {/* Header */}
                <div className="biosync-header">

                    <div className="biosync-logo-wrap">

                        <div className="biosync-logo-glow" />


                        <svg
                            className="biosync-logo"
                            viewBox="0 0 100 100"
                        >

                            <circle 
                                cx="50"
                                cy="50"
                                r="42"
                                className="biosync-logo-ring-outer"
                            />

                            <circle 
                                cx="50"
                                cy="50"
                                r="32"
                                className="biosync-logo-ring-inner"
                            />


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


                    <h1 className="biosync-title">
                        BioSync Sentinel
                    </h1>


                    <p className="biosync-tagline">
                        Secure Access
                    </p>


                </div>



                <div className="biosync-hairline" />



                {/* Unauthorized Panel */}
                <div className="biosync-panel">


                    <div className="biosync-panel-watermark">

                        <ShieldAlert size={220}/>

                    </div>



                    <h2 className="biosync-panel-title">
                        Access Denied
                    </h2>



                    <div className="unauthorized-body">


                        <ShieldAlert
                            size={60}
                            className="unauthorized-icon"
                        />



                        <p>
                            Your account does not have permission
                            to access this resource.
                        </p>



                        <span className="unauthorized-code">
                            ERROR 403 : FORBIDDEN
                        </span>



                        <div className="unauthorized-buttons">

                            <button
                                className="biosync-button"
                                onClick={() => navigate("/login")}
                            >

                                <Home size={16}/>
                                Home

                            </button>


                        </div>


                    </div>



                    <div className="biosync-panel-footer">

                        Unauthorized Access Is Prohibited &bull; v4.2.1

                    </div>


                </div>


            </div>


        </div>

    );

}


export default Unauthorized;