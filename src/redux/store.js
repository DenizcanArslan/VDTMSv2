import { configureStore } from '@reduxjs/toolkit';
import planningReducer from './features/planningSlice';
import transportReducer from './features/transportSlice';
import slotReducer from './features/slotSlice';

export const store = configureStore({
  reducer: {
    planning: planningReducer,
    transport: transportReducer,
    slot: slotReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
}); 