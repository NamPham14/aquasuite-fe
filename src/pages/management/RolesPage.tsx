import { useRef, useState } from "react";
import { useStore } from "react-redux";
import { ShieldCheck, ShieldMinus, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import {
  IamAccessGate,
  useRolesQuery,
  useRoleQuery,
  usePermissionsQuery,
  useChangeAssignmentMutation,
  requireRoleReconciliation,
  clearRoleReconciliation,
  beginIamMutation,
  finishIamMutation,
  iamAccessApi,
  type IamRole,
  type IamPermission,
} from "../../features/iam";
import {
  useAppDispatch,
  useAppSelector,
  type RootState,
} from "../../app/store";
import {
  ManagementMobileList,
  ManagementPagination,
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from "../../shared/ui/ManagementTable";
import {
  ManagementFilterChip,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
} from "../../shared/ui/ManagementPage";
import { ManagementDialog } from "../../shared/ui/ManagementDialog";
import { Button } from "../../shared/ui/Button";
import { CodeChip, Notice, StatusBadge } from "../../shared/ui/Badge";
import {
  EmptyState,
  ErrorState,
  OPERATIONAL_TOAST_CLASS,
} from "../../shared/ui/FeedbackStates";
import { normalizeApiError } from "../../shared/api/apiError";

export function RolesPage() {
  return (
    <IamAccessGate>
      <RolesContent />
    </IamAccessGate>
  );
}

function RolesContent() {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const needsReload = useAppSelector(
    (state) => state.iamAccess.needsReconciliation,
  );
  const pendingIamMutations = useAppSelector(
    (state) => state.iamAccess.pendingMutations > 0,
  );
  const reconciliationTarget = useAppSelector(
    (state) => state.iamAccess.reconciliationTarget,
  );
  const { data, isLoading, isFetching, isError, error, refetch } =
    useRolesQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const roleQuery = useRoleQuery(selected ?? "", { skip: !selected });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const permissions = usePermissionsQuery(
    {
      page,
      size: 20,
      search: search.trim() || undefined,
      sortBy: "code",
      direction: "asc",
    },
    { skip: !selected },
  );
  const [confirm, setConfirm] = useState<{
    role: IamRole;
    permission: IamPermission;
    assign: boolean;
  } | null>(null);
  const [change, mutation] = useChangeAssignmentMutation();
  const inFlight = useRef(false);
  const role = roleQuery.data?.data;
  const rows = data?.data ?? [];

  const columns: ManagementTableColumn<IamRole>[] = [
    {
      key: "code",
      header: "Vai trò",
      cell: (row) => <CodeChip>{row.code}</CodeChip>,
    },
    {
      key: "description",
      header: "Mô tả",
      cellClassName: "!whitespace-normal min-w-48 text-aqs-ink-muted",
      cell: (row) => row.description || "—",
    },
    {
      key: "active",
      header: "Trạng thái",
      align: "center",
      cell: (row) => (
        <StatusBadge tone={row.active ? "positive" : "neutral"}>
          {row.active ? "Hoạt động" : "Ngừng hoạt động"}
        </StatusBadge>
      ),
    },
    {
      key: "count",
      header: "Số quyền",
      align: "center",
      cell: (row) => (
        <span className="text-[13.5px] font-bold tabular-nums text-aqs-ink">
          {row.permissions?.length ?? 0}
        </span>
      ),
    },
    {
      key: "action",
      header: "Thao tác",
      align: "center",
      cell: (row) => (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => {
              setSelected(row.id);
              setPage(0);
              setSearch("");
            }}
          >
            Xem quyền
          </Button>
        </div>
      ),
    },
  ];

  async function reloadData() {
    try {
      const targetRoleId =
        reconciliationTarget?.type === "role"
          ? reconciliationTarget.roleId
          : selected;
      const promises: Promise<unknown>[] = [refetch().unwrap()];
      if (targetRoleId) {
        promises.push(
          dispatch(
            iamAccessApi.endpoints.role.initiate(targetRoleId, {
              forceRefetch: true,
            }),
          ).unwrap(),
        );
      }
      if (selected && selected !== targetRoleId) {
        promises.push(roleQuery.refetch().unwrap());
      }
      await Promise.all(promises);

      if (reconciliationTarget?.type === "role") {
        dispatch(clearRoleReconciliation({ roleId: targetRoleId }));
        dispatch(iamAccessApi.util.invalidateTags(["Role"]));
        toast.success(
          "Đã tải lại dữ liệu vai trò. Vui lòng kiểm tra trước khi tiếp tục.",
          { className: OPERATIONAL_TOAST_CLASS },
        );
      } else if (reconciliationTarget?.type === "permission") {
        toast.warning(
          "Đã tải lại dữ liệu vai trò. Danh mục quyền đang chờ đối soát, vui lòng tải lại quyền để mở khóa.",
          { className: OPERATIONAL_TOAST_CLASS },
        );
      }
    } catch {
      toast.error("Không tải lại được dữ liệu. Vui lòng thử lại.", {
        className: OPERATIONAL_TOAST_CLASS,
      });
    }
  }

  async function submit() {
    if (
      !confirm ||
      inFlight.current ||
      store.getState().iamAccess.needsReconciliation ||
      store.getState().iamAccess.pendingMutations > 0
    )
      return;
    inFlight.current = true;
    dispatch(beginIamMutation());
    const before = store.getState();
    try {
      const response = await change({
        roleId: confirm.role.id,
        permissionId: confirm.permission.id,
        assign: confirm.assign,
      }).unwrap();
      const current = store.getState();
      if (
        current.auth.sessionGeneration !== before.auth.sessionGeneration ||
        current.iamAccess.epoch !== before.iamAccess.epoch
      )
        return;
      if (
        !response ||
        typeof response !== "object" ||
        !("success" in response) ||
        !response.success ||
        !response.data ||
        response.data.id !== confirm.role.id ||
        !Array.isArray(response.data.permissions)
      ) {
        throw Object.assign(new Error("Phản hồi không hợp lệ"), {
          status: "PARSING_ERROR",
        });
      }
      setConfirm(null);
      toast.success(
        confirm.assign
          ? "Đã gán quyền cho vai trò."
          : "Đã gỡ quyền khỏi vai trò.",
        { className: OPERATIONAL_TOAST_CLASS },
      );
    } catch (err) {
      const current = store.getState();
      if (
        current.auth.sessionGeneration !== before.auth.sessionGeneration ||
        current.iamAccess.epoch !== before.iamAccess.epoch
      )
        return;
      const parsed = normalizeApiError(err);
      setConfirm(null);
      const uncertain =
        parsed.status === "FETCH_ERROR" ||
        parsed.status === "TIMEOUT_ERROR" ||
        parsed.status === "PARSING_ERROR" ||
        (typeof parsed.status === "number" && parsed.status >= 500) ||
        parsed.status === undefined;
      if (uncertain) {
        dispatch(requireRoleReconciliation({ roleId: confirm.role.id }));
        toast.warning(
          "Chưa xác định kết quả. Hãy tải lại dữ liệu vai trò trước khi thao tác tiếp.",
          { className: OPERATIONAL_TOAST_CLASS },
        );
      } else {
        void roleQuery.refetch();
        void refetch();
      }
      if (!uncertain) {
        toast.error(parsed.message, { className: OPERATIONAL_TOAST_CLASS });
      }
    } finally {
      inFlight.current = false;
      dispatch(finishIamMutation());
    }
  }

  const listErrorMessage = isError ? normalizeApiError(error).message : "";
  const permItems = permissions.data?.data?.items ?? [];
  const permTotalElements = permissions.data?.data?.totalElements ?? 0;
  const permTotalPages = permissions.data?.data?.totalPages ?? 0;

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Vai trò"
        description="Xem vai trò và quyền được gán trong hệ thống phân quyền nội bộ."
        group="Hệ thống & Phân quyền"
        breadcrumb="Vai trò"
      />

      {needsReload && (
        <Notice
          tone="warning"
          role="alert"
          title="Cần đối soát dữ liệu phân quyền"
        >
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <span>
              {reconciliationTarget?.type === "role"
                ? "Dữ liệu vai trò cần được đối soát sau thao tác chưa xác định kết quả. Vui lòng tải lại dữ liệu từ máy chủ."
                : "Dữ liệu quyền đang chờ đối soát. Thao tác vai trò bị tạm khóa cho tới khi dữ liệu liên quan được đồng bộ."}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pendingIamMutations}
              onClick={() => void reloadData()}
            >
              Tải lại dữ liệu
            </Button>
          </div>
        </Notice>
      )}

      <ManagementPanel
        headingId="role-list"
        title="Danh sách vai trò"
        description={`Tổng số ${rows.length.toLocaleString("vi-VN")} vai trò được cấu hình trong hệ thống.`}
        refreshing={isFetching && !isLoading}
        busy={isFetching}
      >
        {isLoading ? (
          <ManagementTableSkeleton
            rows={5}
            columns={5}
            label="Đang tải danh sách vai trò"
          />
        ) : isError ? (
          <ErrorState
            sectionLabel="Danh sách vai trò"
            title="Không tải được vai trò."
            message={
              listErrorMessage || "Không thể kết nối tới dịch vụ vai trò."
            }
            retrying={isFetching}
            retryLabel="Thử lại"
            onRetry={() => void refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Không có vai trò."
            description="Hệ thống hiện chưa có vai trò nào được cấu hình."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <ManagementTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                labelledBy="role-list"
                emptyMessage="Không có vai trò."
              />
            </div>

            <ManagementMobileList
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="Không có vai trò."
              renderRow={(row) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CodeChip>{row.code}</CodeChip>
                      <p className="m-0 text-xs text-aqs-ink-muted">
                        {row.description || "Không có mô tả"}
                      </p>
                    </div>
                    <StatusBadge tone={row.active ? "positive" : "neutral"}>
                      {row.active ? "Hoạt động" : "Ngừng hoạt động"}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-aqs-ink-muted">
                      Số quyền:{" "}
                      <strong className="font-bold tabular-nums text-aqs-ink">
                        {row.permissions?.length ?? 0}
                      </strong>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={
                        <ShieldCheck
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      }
                      onClick={() => {
                        setSelected(row.id);
                        setPage(0);
                        setSearch("");
                      }}
                    >
                      Xem quyền
                    </Button>
                  </div>
                </div>
              )}
            />
          </>
        )}
      </ManagementPanel>

      {selected && !confirm && (
        <ManagementDialog
          title="Quyền của vai trò"
          size="wide"
          onClose={() => setSelected(null)}
        >
          <div className="space-y-5 p-5 sm:p-6">
            {roleQuery.isLoading ? (
              <div className="space-y-3" aria-label="Đang tải vai trò">
                <div className="rounded-card border border-aqs-border bg-aqs-surface-subtle p-4">
                  <div className="space-y-2">
                    <span className="aqs-animate-skeleton block h-3.5 w-40 rounded bg-aqs-skeleton" />
                    <span className="aqs-animate-skeleton block h-3 w-72 rounded bg-aqs-skeleton" />
                  </div>
                </div>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-aqs-divider py-3"
                  >
                    <span className="aqs-animate-skeleton h-3 w-48 rounded bg-aqs-skeleton" />
                    <span className="aqs-animate-skeleton h-3 w-24 rounded bg-aqs-skeleton" />
                  </div>
                ))}
              </div>
            ) : roleQuery.isError || !role ? (
              <ErrorState
                sectionLabel="Chi tiết vai trò"
                title="Không tải được chi tiết vai trò."
                message={
                  roleQuery.isError
                    ? normalizeApiError(roleQuery.error).message
                    : "Không tìm thấy thông tin vai trò."
                }
                retrying={roleQuery.isFetching}
                retryLabel="Thử lại"
                onRetry={() => void roleQuery.refetch()}
                compact
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-card border border-aqs-border bg-aqs-surface-subtle px-4 py-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-base font-bold text-aqs-ink">
                        {role.code}
                      </h3>
                      <StatusBadge tone={role.active ? "positive" : "neutral"}>
                        {role.active ? "Hoạt động" : "Ngừng hoạt động"}
                      </StatusBadge>
                    </div>
                    <p className="m-0 text-sm text-aqs-ink-muted">
                      {role.description || "Không có mô tả"}
                    </p>
                  </div>
                  <ManagementFilterChip>
                    {role.permissions?.length ?? 0} quyền đã gán
                  </ManagementFilterChip>
                </div>

                {needsReload && (
                  <Notice
                    tone="warning"
                    role="alert"
                    title="Đang chờ đối soát dữ liệu"
                  >
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                      <span>
                        Thao tác gán/gỡ quyền đang tạm khóa. Hãy tải lại dữ liệu
                        từ máy chủ trước khi tiếp tục.
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pendingIamMutations}
                        onClick={() => void reloadData()}
                      >
                        Tải lại dữ liệu
                      </Button>
                    </div>
                  </Notice>
                )}

                <section
                  aria-labelledby="assigned-heading"
                  className="overflow-hidden rounded-card border border-aqs-border bg-aqs-surface"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-aqs-border bg-aqs-surface-subtle px-4 py-3">
                    <h3
                      id="assigned-heading"
                      className="m-0 text-[13.5px] font-bold text-aqs-ink"
                    >
                      Quyền đã gán ({role.permissions?.length ?? 0})
                    </h3>
                  </div>
                  {(role.permissions ?? []).length ? (
                    <ul className="divide-y divide-aqs-divider">
                      {(role.permissions ?? []).map((permission) => (
                        <li
                          key={permission.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-aqs-surface-subtle"
                        >
                          <div className="min-w-0 flex-1">
                            <CodeChip className="break-all">
                              {permission.code}
                            </CodeChip>
                            <p className="m-0 mt-1 break-words text-xs text-aqs-ink-muted">
                              {permission.description || "Không có mô tả"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger-outline"
                            icon={
                              <ShieldMinus
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            }
                            disabled={
                              mutation.isLoading ||
                              needsReload ||
                              pendingIamMutations
                            }
                            aria-label={`Gỡ quyền ${permission.code}`}
                            onClick={() =>
                              setConfirm({ role, permission, assign: false })
                            }
                          >
                            Gỡ quyền
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 px-4 py-5 text-sm text-aqs-ink-muted">
                      Chưa có quyền được gán.
                    </p>
                  )}
                </section>

                <section
                  aria-labelledby="available-heading"
                  className="overflow-hidden rounded-card border border-aqs-border bg-aqs-surface"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-aqs-border bg-aqs-surface-subtle px-4 py-3">
                    <h3
                      id="available-heading"
                      className="m-0 text-[13.5px] font-bold text-aqs-ink"
                    >
                      Tìm quyền để gán hoặc gỡ
                    </h3>
                    <span className="text-xs tabular-nums text-aqs-ink-faint">
                      {permTotalElements.toLocaleString("vi-VN")} quyền
                    </span>
                  </div>

                  <div className="border-b border-aqs-border p-4">
                    <ManagementSearch
                      id="role-permission-search"
                      label="Tìm quyền"
                      value={search}
                      onChange={(value) => {
                        setSearch(value);
                        setPage(0);
                      }}
                      placeholder="Tìm theo mã hoặc mô tả…"
                      disabled={needsReload || pendingIamMutations}
                    />
                  </div>

                  {permissions.isLoading ? (
                    <div
                      className="divide-y divide-aqs-divider"
                      aria-label="Đang tải quyền"
                    >
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <span className="aqs-animate-skeleton h-3 w-48 rounded bg-aqs-skeleton" />
                          <span className="aqs-animate-skeleton h-3 w-24 rounded bg-aqs-skeleton" />
                        </div>
                      ))}
                    </div>
                  ) : permissions.isError ? (
                    <ErrorState
                      sectionLabel="Danh mục quyền"
                      title="Không tải được quyền."
                      message={normalizeApiError(permissions.error).message}
                      retrying={permissions.isFetching}
                      retryLabel="Thử lại"
                      onRetry={() => void permissions.refetch()}
                      compact
                    />
                  ) : permItems.length === 0 ? (
                    <EmptyState
                      title="Không tìm thấy quyền."
                      search={search}
                      hasFilters={Boolean(search.trim())}
                      onClearSearch={() => {
                        setSearch("");
                        setPage(0);
                      }}
                      onResetFilters={() => {
                        setSearch("");
                        setPage(0);
                      }}
                    />
                  ) : (
                    <>
                      <ul className="divide-y divide-aqs-divider">
                        {permItems.map((permission) => {
                          const assigned = (role.permissions ?? []).some(
                            (item) => item.id === permission.id,
                          );
                          return (
                            <li
                              key={permission.id}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-aqs-surface-subtle"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <CodeChip className="break-all">
                                    {permission.code}
                                  </CodeChip>
                                  {assigned && (
                                    <StatusBadge tone="accent">
                                      Đã gán
                                    </StatusBadge>
                                  )}
                                </div>
                                <p className="m-0 mt-1 break-words text-xs text-aqs-ink-muted">
                                  {permission.description || "Không có mô tả"}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={assigned ? "danger-outline" : "primary"}
                                icon={
                                  assigned ? (
                                    <ShieldMinus
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <ShieldPlus
                                      className="h-3.5 w-3.5"
                                      aria-hidden="true"
                                    />
                                  )
                                }
                                disabled={
                                  mutation.isLoading ||
                                  needsReload ||
                                  pendingIamMutations
                                }
                                aria-label={`${assigned ? "Gỡ" : "Gán"} quyền ${permission.code}`}
                                onClick={() =>
                                  setConfirm({
                                    role,
                                    permission,
                                    assign: !assigned,
                                  })
                                }
                              >
                                {assigned ? "Gỡ quyền" : "Gán quyền"}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>

                      <ManagementPagination
                        page={page}
                        totalPages={permTotalPages}
                        totalElements={permTotalElements}
                        shownCount={permItems.length}
                        noun="quyền"
                        disabled={needsReload || pendingIamMutations}
                        onPageChange={setPage}
                        ariaLabel="Phân trang danh mục quyền"
                      />
                    </>
                  )}
                </section>
              </>
            )}

            <div className="flex justify-end border-t border-aqs-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </ManagementDialog>
      )}

      {confirm && (
        <ManagementDialog
          title={confirm.assign ? "Xác nhận gán quyền" : "Xác nhận gỡ quyền"}
          closeDisabled={mutation.isLoading}
          onClose={() => {
            if (!inFlight.current) setConfirm(null);
          }}
        >
          <div className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-2.5 rounded-card border border-aqs-border bg-aqs-surface-subtle px-4 py-3.5">
              <div className="grid gap-0.5">
                <span className="text-[11.5px] font-semibold text-aqs-ink-faint">
                  Vai trò
                </span>
                <span className="text-[13.5px] font-semibold text-aqs-ink">
                  {confirm.role.code}
                </span>
                <span className="text-xs text-aqs-ink-muted">
                  {confirm.role.description || "Không có mô tả"}
                </span>
              </div>
              <div className="grid gap-0.5 border-t border-aqs-border pt-2.5">
                <span className="text-[11.5px] font-semibold text-aqs-ink-faint">
                  {confirm.assign ? "Quyền sẽ gán" : "Quyền sẽ gỡ"}
                </span>
                <span className="text-[13.5px] font-semibold text-aqs-ink">
                  {confirm.permission.code}
                </span>
                <span className="text-xs text-aqs-ink-muted">
                  {confirm.permission.description || "Không có mô tả"}
                </span>
              </div>
            </div>

            <Notice tone="warning" title="Lưu ý phân quyền">
              Thay đổi có thể ảnh hưởng mọi tài khoản mang vai trò này, kể cả
              bạn.
            </Notice>

            <div className="flex justify-end gap-2 border-t border-aqs-border pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={
                  mutation.isLoading || needsReload || pendingIamMutations
                }
                onClick={() => setConfirm(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant={confirm.assign ? "primary" : "danger"}
                loading={mutation.isLoading}
                icon={
                  confirm.assign ? (
                    <ShieldPlus className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ShieldMinus className="h-4 w-4" aria-hidden="true" />
                  )
                }
                disabled={
                  mutation.isLoading || needsReload || pendingIamMutations
                }
                aria-label={
                  confirm.assign ? "Xác nhận gán quyền" : "Xác nhận gỡ quyền"
                }
                onClick={() => void submit()}
              >
                {mutation.isLoading
                  ? "Đang xử lý..."
                  : confirm.assign
                    ? "Xác nhận gán quyền"
                    : "Xác nhận gỡ quyền"}
              </Button>
            </div>
          </div>
        </ManagementDialog>
      )}
    </ManagementPageShell>
  );
}
