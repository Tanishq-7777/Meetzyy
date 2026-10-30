import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Landing from "./components/Landing";
import HomePage from "./components/HomePage";
import Signup from "./components/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import { useEffect } from "react";
import useAuthStore from "./store/useAuthStore";
import Meeting from "./components/Meeting";
import MeetingHistory from "./components/MeetingHistory";
import NewMeeting from "./components/NewMeeting";
import Payment from "./components/Payment";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/signup", element: <Signup /> },
      { path: "/login", element: <Login /> },
      {
        path: "/meeting",
        element: (
          <ProtectedRoute>
            <Meeting />
          </ProtectedRoute>
        ),
      },
      {
        path: "/meeting/:meetingId",
        element: (
          <ProtectedRoute>
            <MeetingHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: "/meeting/newmeeting/:meetingId",
        element: (
          <ProtectedRoute>
            <NewMeeting />
          </ProtectedRoute>
        ),
      },
      {
        path: "/payment",
        element: (
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

const App = () => {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, []);

  return <RouterProvider router={router} />;
};

export default App;
