import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Landing = () => {
  return (
    <div style={styles.layoutWrapper}>
      <Navbar />
      <main style={styles.contentArea}>
        <Outlet />
      </main>
    </div>
  );
};

const styles = {
  layoutWrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh" /* Forces the whole app to be exactly the screen height */,
    width: "100vw",
    overflow: "hidden" /* Prevents the 'double scrollbar' bug */,
    backgroundColor: "#030303",
  },
  contentArea: {
    flex: 1 /* Takes up exactly the remaining space below the Navbar */,
    overflowY:
      "auto" /* Allows pages like Payment to scroll if they are long */,
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
};

export default Landing;
