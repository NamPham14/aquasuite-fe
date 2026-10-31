import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type IamAccessStatus = 'unknown' | 'allowed' | 'denied' | 'checking'

export type ReconciliationTarget =
  | { type: 'role'; roleId?: string }
  | { type: 'permission'; permissionId?: string; permissionCode?: string }

export interface IamAccessState {
  status: IamAccessStatus
  epoch: number
  reconciliationTarget: ReconciliationTarget | null
  needsReconciliation: boolean
  pendingMutations: number
}

const initialState: IamAccessState = {
  status: 'unknown',
  epoch: 0,
  reconciliationTarget: null,
  needsReconciliation: false,
  pendingMutations: 0,
}

export const iamAccessSlice = createSlice({
  name: 'iamAccess',
  initialState,
  reducers: {
    resetIamAccess(state) {
      state.epoch += 1
      state.status = 'unknown'
      state.reconciliationTarget = null
      state.needsReconciliation = false
      state.pendingMutations = 0
    },
    denyIamAccess(state, action: PayloadAction<number>) {
      if (state.epoch === action.payload) {
        state.epoch += 1
        state.status = 'denied'
        state.reconciliationTarget = null
        state.needsReconciliation = false
        state.pendingMutations = 0
      }
    },
    beginIamProbe(state) {
      if (state.status === 'denied') state.status = 'checking'
    },
    finishIamProbe(state, action: PayloadAction<{ epoch: number; allowed: boolean }>) {
      if (state.epoch !== action.payload.epoch || state.status !== 'checking') return
      state.status = action.payload.allowed ? 'allowed' : 'denied'
      if (action.payload.allowed) {
        state.epoch += 1
        state.reconciliationTarget = null
        state.needsReconciliation = false
      }
    },
    markIamAllowed(state, action: PayloadAction<number>) {
      if (state.epoch === action.payload && state.status === 'unknown') state.status = 'allowed'
    },
    beginIamMutation(state) {
      state.pendingMutations += 1
    },
    finishIamMutation(state) {
      state.pendingMutations = Math.max(0, state.pendingMutations - 1)
    },
    requireRoleReconciliation(state, action: PayloadAction<{ roleId?: string | null } | undefined>) {
      state.reconciliationTarget = { type: 'role', roleId: action.payload?.roleId ?? undefined }
      state.needsReconciliation = true
    },
    requirePermissionReconciliation(state, action: PayloadAction<{ permissionId?: string | null; permissionCode?: string | null } | undefined>) {
      const permissionId = action.payload?.permissionId ?? undefined
      const permissionCode = action.payload?.permissionCode ?? undefined
      state.reconciliationTarget = permissionId
        ? { type: 'permission', permissionId }
        : permissionCode
          ? { type: 'permission', permissionCode }
          : { type: 'permission' }
      state.needsReconciliation = true
    },
    clearRoleReconciliation(state, action: PayloadAction<{ roleId?: string | null } | undefined>) {
      if (state.reconciliationTarget?.type === 'role') {
        const requiredRoleId = state.reconciliationTarget.roleId
        const reloadedRoleId = action.payload?.roleId
        if (!requiredRoleId || !reloadedRoleId || requiredRoleId === reloadedRoleId) {
          state.reconciliationTarget = null
          state.needsReconciliation = false
        }
      }
    },
    clearPermissionReconciliation(state, action: PayloadAction<{ permissionId?: string; permissionCode?: string }>) {
      const target = state.reconciliationTarget
      if (
        target?.type === 'permission' &&
        ((target.permissionId && target.permissionId === action.payload.permissionId) ||
          (target.permissionCode && target.permissionCode === action.payload.permissionCode))
      ) {
        state.epoch += 1
        state.reconciliationTarget = null
        state.needsReconciliation = false
      }
    },
    requireIamReconciliation(state, action: PayloadAction<ReconciliationTarget | undefined>) {
      state.reconciliationTarget = action.payload ?? { type: 'role' }
      state.needsReconciliation = true
    },
    clearIamReconciliation(state) {
      state.reconciliationTarget = null
      state.needsReconciliation = false
    },
  },
})

export const {
  resetIamAccess,
  denyIamAccess,
  beginIamProbe,
  finishIamProbe,
  markIamAllowed,
  beginIamMutation,
  finishIamMutation,
  requireRoleReconciliation,
  requirePermissionReconciliation,
  clearRoleReconciliation,
  clearPermissionReconciliation,
  requireIamReconciliation,
  clearIamReconciliation,
} = iamAccessSlice.actions

export const iamAccessReducer = iamAccessSlice.reducer
