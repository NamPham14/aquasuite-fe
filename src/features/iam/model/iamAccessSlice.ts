import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type IamAccessStatus = 'unknown' | 'allowed' | 'denied' | 'checking'
export interface IamAccessState { status: IamAccessStatus; epoch: number }

const initialState: IamAccessState = { status: 'unknown', epoch: 0 }
export const iamAccessSlice = createSlice({
  name: 'iamAccess', initialState,
  reducers: {
    resetIamAccess(state) { state.epoch += 1; state.status = 'unknown' },
    denyIamAccess(state, action: PayloadAction<number>) { if (state.epoch === action.payload) { state.epoch += 1; state.status = 'denied' } },
    beginIamProbe(state) { if (state.status === 'denied') state.status = 'checking' },
    finishIamProbe(state, action: PayloadAction<{ epoch: number; allowed: boolean }>) {
      if (state.epoch !== action.payload.epoch || state.status !== 'checking') return
      state.status = action.payload.allowed ? 'allowed' : 'denied'
      if (action.payload.allowed) state.epoch += 1
    },
    markIamAllowed(state, action: PayloadAction<number>) { if (state.epoch === action.payload && state.status === 'unknown') state.status = 'allowed' },
  },
})
export const { resetIamAccess, denyIamAccess, beginIamProbe, finishIamProbe, markIamAllowed } = iamAccessSlice.actions
export const iamAccessReducer = iamAccessSlice.reducer
