import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserStore {
  userId: string | null;
  betResult: "win" | "lose" | "tie" | null;
  setUserId: (id: string | null) => void;
  setBetResult: (result: "win" | "lose" | "tie" | null) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userId: null,
      betResult: null,
      setUserId: (id) => set({ userId: id }),
      setBetResult: (result) => set({ betResult: result }),
    }),
    {
      name: "btc_user_store",
      partialize: (state) => ({ userId: state.userId }),
    }
  )
);
