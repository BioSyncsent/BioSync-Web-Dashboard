import "./Loader.css";


function Loader({
  exiting = false,
}) {
  return (
    <div
      className={
        exiting
          ? "warp-loader-screen warp-loader-screen--exit"
          : "warp-loader-screen"
      }
    >
      <div className="warp-loader">

        <div className="ring" />

        <div className="ring" />

        <div className="ring" />

        <div className="ring" />

        <div className="core-glow" />

      </div>
    </div>
  );
}


export default Loader;