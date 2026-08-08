import {
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

import Loader from "../components/Loader";

function ProtectedRoute({
  allowedRoles,
  children,
}) {
  const {
    user,
    loading,
  } = useAuth();

  /* =========================================================
     WAIT FOR FIREBASE
  ========================================================= */

  if (loading) {
    return <Loader />;
  }

  /* =========================================================
     NOT LOGGED IN
  ========================================================= */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /* =========================================================
     DISABLED ACCOUNT
  ========================================================= */

  if (user.active === false) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  /* =========================================================
     WRONG ROLE
  ========================================================= */

  if (
    allowedRoles &&
    !allowedRoles.includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  /* =========================================================
     ACCESS ALLOWED
  ========================================================= */

  return children
    ? children
    : <Outlet />;
}

export default ProtectedRoute;