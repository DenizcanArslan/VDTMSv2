import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  slots: [],
  loading: false,
  error: null,
};

const slotSlice = createSlice({
  name: 'slot',
  initialState,
  reducers: {
    setSlots: (state, action) => {
      state.slots = action.payload;
      state.loading = false;
      state.error = null;
    },
    addSlot: (state, action) => {
      state.slots.push(action.payload);
    },
    updateSlot: (state, action) => {
      const index = state.slots.findIndex(
        (slot) => slot.id === action.payload.id
      );
      if (index !== -1) {
        state.slots[index] = action.payload;
      }
    },
    removeSlot: (state, action) => {
      state.slots = state.slots.filter(
        (slot) => slot.id !== action.payload
      );
    },
    setSlotLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setSlotError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  setSlots,
  addSlot,
  updateSlot,
  removeSlot,
  setSlotLoading,
  setSlotError,
} = slotSlice.actions;

export default slotSlice.reducer; 