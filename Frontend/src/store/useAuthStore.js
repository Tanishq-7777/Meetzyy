import axios from "axios";
import { create } from "zustand";
import { BASE_URL } from "../../constants";

const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isLoading: false,
    }),

  fetchUser: async () => {
    set({ isLoading: true }); // add this
    try {
      const { data } = await axios.get(BASE_URL + "/auth/profile", {
        withCredentials: true,
      });
      set({ user: data.data, isLoading: false });
    } catch (err) {
      console.log("Not logged in", err.message);
      set({ user: null, isLoading: false });
    }
  },

  logout: () =>
    set({
      user: null,
      isLoading: false,
    }),
}));

export default useAuthStore;
