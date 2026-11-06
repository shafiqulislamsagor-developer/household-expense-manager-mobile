import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SyncStatus } from '../sync/syncEngine';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
}

const initialState: SyncState = {
  status: 'IDLE',
  pendingCount: 0,
  lastSyncedAt: null,
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncStatus: (
      state,
      action: PayloadAction<{ status: SyncStatus; pendingCount?: number }>
    ) => {
      state.status = action.payload.status;
      if (action.payload.pendingCount !== undefined) {
        state.pendingCount = action.payload.pendingCount;
      }
      if (action.payload.status === 'IDLE') {
        state.lastSyncedAt = Date.now();
      }
    },
    setPendingCount: (state, action: PayloadAction<number>) => {
      state.pendingCount = action.payload;
    },
  },
});

export const { setSyncStatus, setPendingCount } = syncSlice.actions;
export default syncSlice.reducer;

