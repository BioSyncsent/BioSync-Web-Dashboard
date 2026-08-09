import {
  useEffect,
  useRef,
  useState,
} from "react";

import AppRoutes from "./routes/AppRoutes";

import {
  useAuth,
} from "./contexts/AuthContext";

import Loader from "./components/Loader";


function App() {
  const {
    loading,
  } = useAuth();


  /* =========================================================
     STARTUP STATE
  ========================================================= */

  const [
    appReady,
    setAppReady,
  ] = useState(false);


  const [
    showStartupLoader,
    setShowStartupLoader,
  ] = useState(true);


  const [
    loaderExiting,
    setLoaderExiting,
  ] = useState(false);


  /*
   * This remembers that the INITIAL startup
   * has already completed.
   *
   * It does NOT cause a React re-render,
   * which prevents the loader timers
   * from cancelling themselves.
   */

  const startupFinishedRef =
    useRef(false);


  /* =========================================================
     INITIAL STARTUP ONLY
  ========================================================= */

  useEffect(() => {

    /*
     * Do nothing while Firebase is performing
     * the first authentication check.
     */

    if (loading) {
      return undefined;
    }


    /*
     * IMPORTANT:
     *
     * If startup already happened,
     * never show the global loader again.
     *
     * This is especially important when
     * logging in because AuthContext may
     * temporarily set loading=true again.
     */

    if (
      startupFinishedRef.current
    ) {
      return undefined;
    }


    startupFinishedRef.current =
      true;


    /*
     * Allow Landing/Login/Dashboard to render
     * underneath the loader.
     */

    setAppReady(true);


    let frameOne;
    let frameTwo;
    let fadeTimer;
    let removeTimer;


    /*
     * Give React + browser two frames
     * to paint the page underneath.
     */

    frameOne =
      requestAnimationFrame(() => {

        frameTwo =
          requestAnimationFrame(() => {

            /*
             * Begin fading the black loader.
             */

            fadeTimer =
              window.setTimeout(() => {

                setLoaderExiting(true);

              }, 50);


            /*
             * Completely remove loader
             * after the fade.
             */

            removeTimer =
              window.setTimeout(() => {

                setShowStartupLoader(false);

              }, 380);

          });

      });


    return () => {

      if (frameOne) {
        cancelAnimationFrame(
          frameOne
        );
      }


      if (frameTwo) {
        cancelAnimationFrame(
          frameTwo
        );
      }


      if (fadeTimer) {
        clearTimeout(
          fadeTimer
        );
      }


      if (removeTimer) {
        clearTimeout(
          removeTimer
        );
      }

    };

  }, [loading]);


  /* =========================================================
     INITIAL FIREBASE CHECK
  ========================================================= */

  if (!appReady) {

    return (
      <Loader
        exiting={false}
      />
    );

  }


  /* =========================================================
     NORMAL APPLICATION
  ========================================================= */

  return (
    <>
      <AppRoutes />


      {showStartupLoader && (

        <Loader
          exiting={
            loaderExiting
          }
        />

      )}
    </>
  );
}


export default App;