import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  transports: [],
  loading: false,
  error: null,
};

const transportSlice = createSlice({
  name: 'transport',
  initialState,
  reducers: {
    setTransports: (state, action) => {
      state.transports = action.payload;
      state.loading = false;
      state.error = null;
    },
    addTransport: (state, action) => {
      state.transports.push(action.payload);
    },
    updateTransport: (state, action) => {
      const index = state.transports.findIndex(
        (transport) => transport.id === action.payload.id
      );
      if (index !== -1) {
        state.transports[index] = action.payload;
      }
    },
    removeTransport: (state, action) => {
      state.transports = state.transports.filter(
        (transport) => transport.id !== action.payload
      );
    },
    setTransportLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setTransportError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  setTransports,
  addTransport,
  updateTransport,
  removeTransport,
  setTransportLoading,
  setTransportError,
} = transportSlice.actions;

export default transportSlice.reducer; 