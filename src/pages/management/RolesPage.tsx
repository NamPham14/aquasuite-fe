import { useRef, useState } from "react";
import { useStore } from "react-redux";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
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
  ManagementPageHeader,
  ManagementFilterBar,
  ManagementSearch,
} from "../../shared/ui/ManagementPage";
import {
  ManagementTable,
  type ManagementTableColumn,
} from "../../shared/ui/ManagementTable";
import { ManagementDialog } from "../../shared/ui/ManagementDialog";
import { normalizeApiError } from "../../shared/api/apiError";
import { IamAccessGate } from "./IamAccessGate";
import { ManagementActionButton } from "../../shared/ui/ManagementRowActions";

const btn =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50";

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
  const pendingIamMutations = useAppSelector((state) => state.iamAccess.pendingMutations > 0);
  const reconciliationTarget = useAppSelector(
    (state) => state.iamAccess.reconciliationTarget,
  );
  const { data, isLoading, isError, refetch } = useRolesQuery();
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
  const columns: ManagementTableColumn<IamRole>[] = [
    { key: "code", header: "Vai trò", cell: (row) => row.code },
    {
      key: "description",
      header: "Mô tả",
      cellClassName: "whitespace-normal min-w-48",
      cell: (row) => row.description || "—",
    },
    {
      key: "active",
      header: "Trạng thái",
      cell: (row) => (row.active ? "Hoạt động" : "Ngừng hoạt động"),
    },
    {
      key: "count",
      header: "Số quyền",
      align: "right",
      cell: (row) => row.permissions?.length ?? 0,
    },
    {
      key: "action",
      header: "Thao tác",
      cell: (row) => (
        <button
          type="button"
          className={btn}
          onClick={() => {
            setSelected(row.id);
            setPage(0);
            setSearch("");
          }}
        >
          Xem quyền
        </button>
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
        );
      } else if (reconciliationTarget?.type === "permission") {
        toast.warning(
          "Đã tải lại dữ liệu vai trò. Danh mục quyền đang chờ đối soát, vui lòng tải lại quyền để mở khóa.",
        );
      }
    } catch {
      toast.error("Không tải lại được dữ liệu. Vui lòng thử lại.");
    }
  }

  async function submit() {
    if (!confirm || inFlight.current || store.getState().iamAccess.needsReconciliation || store.getState().iamAccess.pendingMutations > 0) return;
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
      );
    } catch (error) {
      const current = store.getState();
      if (
        current.auth.sessionGeneration !== before.auth.sessionGeneration ||
        current.iamAccess.epoch !== before.iamAccess.epoch
      )
        return;
      const parsed = normalizeApiError(error);
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
        );
      } else {
        void roleQuery.refetch();
        void refetch();
      }
      if (!uncertain) toast.error(parsed.message);
    } finally {
      inFlight.current = false;
      dispatch(finishIamMutation());
    }
  }

  return (
    <div className="space-y-5">
      <ManagementPageHeader
        title="Quản lý Vai trò"
        description="Xem vai trò và quyền được gán"
        breadcrumb="Vai trò"
        icon={<ShieldCheck className="h-6 w-6" />}
      />
      {needsReload && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            {reconciliationTarget?.type === "role"
              ? "Dữ liệu vai trò cần được đối soát sau thao tác chưa xác định kết quả. Vui lòng tải lại dữ liệu từ máy chủ."
              : "Dữ liệu quyền đang chờ đối soát. Thao tác vai trò bị tạm khóa cho tới khi dữ liệu liên quan được đồng bộ."}
          </span>
          <button
            type="button"
            className={btn}
            disabled={pendingIamMutations}
            onClick={() => void reloadData()}
          >
            Tải lại dữ liệu
          </button>
        </div>
      )}
      <section className="rounded-lg border border-slate-200 bg-white">
        <h2 id="role-list" className="p-4 font-semibold">
          Danh sách vai trò
        </h2>
        {isLoading ? (
          <p role="status" className="p-4">
            Đang tải...
          </p>
        ) : isError ? (
          <div className="p-4">
            <p role="alert">Không tải được vai trò.</p>
            <button className={btn} onClick={() => void refetch()}>
              Thử lại
            </button>
          </div>
        ) : (
          <ManagementTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(row) => row.id}
            labelledBy="role-list"
            emptyMessage="Không có vai trò."
          />
        )}
      </section>

      {selected && !confirm && (
        <ManagementDialog
          title="Quyền của vai trò"
          onClose={() => setSelected(null)}
        >
          <div className="space-y-5 p-5 sm:p-6">
            {roleQuery.isLoading ? (
              <p role="status">Đang tải vai trò...</p>
            ) : roleQuery.isError || !role ? (
              <div>
                <p role="alert">Không tải được chi tiết vai trò.</p>
                <button
                  className={btn}
                  onClick={() => void roleQuery.refetch()}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-slate-900">{role.code}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {role.description || "Không có mô tả"}
                  </p>
                </div>
                {needsReload && (
                  <button className={btn} disabled={pendingIamMutations} onClick={() => void reloadData()}>
                    Tải lại dữ liệu
                  </button>
                )}
                <section aria-labelledby="assigned-heading">
                  <h3 id="assigned-heading" className="text-sm font-semibold">
                    Quyền đã gán ({role.permissions?.length ?? 0})
                  </h3>
                  {(role.permissions ?? []).length ? (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {(role.permissions ?? []).map((permission) => (
                        <li
                          key={permission.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                        >
                          <div className="min-w-0">
                            <strong className="break-all">
                              {permission.code}
                            </strong>
                            <p className="break-words text-slate-600">
                              {permission.description || "Không có mô tả"}
                            </p>
                          </div>
                          <ManagementActionButton
                            variant="remove"
                            label="Gỡ quyền"
                            disabled={mutation.isLoading || needsReload || pendingIamMutations}
                            onClick={() =>
                              setConfirm({ role, permission, assign: false })
                            }
                            ariaLabel={`Gỡ quyền ${permission.code}`}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      Chưa có quyền được gán.
                    </p>
                  )}
                </section>
                <section
                  aria-labelledby="available-heading"
                  className="space-y-3"
                >
                  <h3 id="available-heading" className="text-sm font-semibold">
                    Tìm quyền để gán hoặc gỡ
                  </h3>
                  <ManagementFilterBar>
                    <ManagementSearch
                      id="role-permission-search"
                      label="Tìm quyền"
                      value={search}
                      onChange={(value) => {
                        setSearch(value);
                        setPage(0);
                      }}
                      placeholder="Tìm theo mã hoặc mô tả"
                      disabled={needsReload || pendingIamMutations}
                    />
                  </ManagementFilterBar>
                  {permissions.isLoading ? (
                    <p role="status">Đang tải quyền...</p>
                  ) : permissions.isError ? (
                    <div>
                      <p role="alert">
                        Không tải được quyền.{" "}
                        {normalizeApiError(permissions.error).message}
                      </p>
                      <button
                        className={btn}
                        onClick={() => void permissions.refetch()}
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-slate-100">
                        {(permissions.data?.data?.items ?? []).map(
                          (permission) => {
                            const assigned = (role.permissions ?? []).some(
                              (item) => item.id === permission.id,
                            );
                            return (
                              <li
                                key={permission.id}
                                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                              >
                                <div className="min-w-0">
                                  <strong className="break-all">
                                    {permission.code}
                                  </strong>
                                  <p className="break-words text-slate-600">
                                    {permission.description || "Không có mô tả"}
                                  </p>
                                </div>
                                <ManagementActionButton
                                  variant={assigned ? "remove" : "assign"}
                                  label={assigned ? "Gỡ quyền" : "Gán quyền"}
                                  disabled={mutation.isLoading || needsReload || pendingIamMutations}
                                  onClick={() =>
                                    setConfirm({
                                      role,
                                      permission,
                                      assign: !assigned,
                                    })
                                  }
                                  ariaLabel={`${assigned ? "Gỡ" : "Gán"} quyền ${permission.code}`}
                                />
                              </li>
                            );
                          },
                        )}
                      </ul>
                      {permissions.data?.data?.items.length === 0 && (
                        <p className="py-4 text-sm">Không tìm thấy quyền.</p>
                      )}
                      <div className="flex items-center gap-3 pt-3 text-sm">
                        <button
                          className={btn}
                          disabled={page === 0 || needsReload || pendingIamMutations}
                          onClick={() => setPage(page - 1)}
                        >
                          Trước
                        </button>
                        <span>
                          Trang {page + 1} /{" "}
                          {Math.max(1, permissions.data?.data?.totalPages ?? 0)}
                        </span>
                        <button
                          className={btn}
                          disabled={
                            needsReload || pendingIamMutations || page + 1 >=
                            (permissions.data?.data?.totalPages ?? 0)
                          }
                          onClick={() => setPage(page + 1)}
                        >
                          Tiếp
                        </button>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                className={btn}
                onClick={() => setSelected(null)}
              >
                Đóng
              </button>
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
          <div className="space-y-4 p-6">
            <p>
              {confirm.role.code} —{" "}
              {confirm.role.description || "Không có mô tả"}
            </p>
            <p>
              {confirm.permission.code} —{" "}
              {confirm.permission.description || "Không có mô tả"}
            </p>
            <p className="text-sm text-slate-600">
              Thay đổi có thể ảnh hưởng mọi tài khoản mang vai trò này, kể cả
              bạn.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className={btn}
                disabled={mutation.isLoading || needsReload || pendingIamMutations}
                onClick={() => setConfirm(null)}
              >
                Hủy
              </button>
              <ManagementActionButton
                variant={confirm.assign ? "assign" : "remove"}
                label={
                  mutation.isLoading
                    ? "Đang xử lý..."
                    : confirm.assign
                      ? "Xác nhận gán quyền"
                      : "Xác nhận gỡ quyền"
                }
                disabled={mutation.isLoading || needsReload || pendingIamMutations}
                onClick={() => void submit()}
                ariaLabel={
                  confirm.assign ? "Xác nhận gán quyền" : "Xác nhận gỡ quyền"
                }
              />
            </div>
          </div>
        </ManagementDialog>
      )}
    </div>
  );
}
