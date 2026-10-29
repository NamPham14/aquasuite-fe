import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import { authReducer } from '../features/iam/model/authSlice'
import { baseApi } from '../shared/api/baseApi'

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
