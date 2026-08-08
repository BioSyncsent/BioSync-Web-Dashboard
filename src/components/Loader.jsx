import "./Loader.css";

function Loader() {
  return (
    <div className="warp-loader-screen">
      {/* From Uiverse.io by risabbir */}
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
