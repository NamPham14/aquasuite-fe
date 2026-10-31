import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import { authReducer, startSession, clearAuthLocal, iamAccessApi, iamAccessReducer, resetIamAccess } from '../features/iam'
import { baseApi } from '../shared/api/baseApi'

const sessionListener = createListenerMiddleware()
sessionListener.startListening({
  matcher: isAnyOf(startSession, clearAuthLocal),
  effect: (action, api) => {
    api.dispatch(resetIamAccess())
    api.dispatch(iamAccessApi.util.resetApiState())
    if (clearAuthLocal.match(action)) api.dispatch(baseApi.util.resetApiState())
  },
})

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    iamAccess: iamAccessReducer,
    [iamAccessApi.reducerPath]: iamAccessApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(sessionListener.middleware).concat(baseApi.middleware, iamAccessApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
