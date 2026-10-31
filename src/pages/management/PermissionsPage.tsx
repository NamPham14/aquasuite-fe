import { useEffect, useRef, useState, type FormEvent } from "react";
import { useStore } from "react-redux";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  usePermissionsQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
  requirePermissionReconciliation,
  clearPermissionReconciliation,
  beginIamMutation,
  finishIamMutation,
  iamAccessApi,
  type IamPermission,
  type PermissionQuery,
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
  ManagementSelect,
} from "../../shared/ui/ManagementPage";
import {
  ManagementTable,
  type ManagementTableColumn,
} from "../../shared/ui/ManagementTable";
import {
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from "../../shared/ui/ManagementDialog";
import { normalizeApiError } from "../../shared/api/apiError";
import { IamAccessGate } from "./IamAccessGate";
import { ManagementRowActions } from "../../shared/ui/ManagementRowActions";

const btn =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50";

function isPermissionRecord(value: unknown): value is IamPermission {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.code === "string" &&
    (record.description === undefined ||
      record.description === null ||
      typeof record.description === "string")
  );
}

function isPermissionEnvelope(value: unknown): value is {
  success: true;
  data: IamPermission;
} {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return response.success === true && isPermissionRecord(response.data);
}

function isPermissionPageEnvelope(value: unknown): value is {
  success: true;
  data: {
    items: IamPermission[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
} {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  if (!response.data || typeof response.data !== "object") return false;
  const data = response.data as Record<string, unknown>;
  return (
    response.success === true &&
    Array.isArray(data.items) &&
    data.items.every(isPermissionRecord) &&
    Number.isInteger(data.page) &&
    Number.isInteger(data.size) &&
    Number.isInteger(data.totalElements) &&
    Number.isInteger(data.totalPages) &&
    (data.totalPages as number) >= 0
  );
}

function invalidReconciliationResponse(): Error & { status: string } {
  return Object.assign(new Error("Phản hồi đối soát quyền không hợp lệ"), {
    status: "PARSING_ERROR",
  });
}
type Dialog =
  | { mode: "create" }
  | { mode: "edit" | "delete" | "view"; item: IamPermission };
export function PermissionsPage() {
  return (
    <IamAccessGate>
      <PermissionsContent />
    </IamAccessGate>
  );
}

function PermissionsContent() {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const needsReload = useAppSelector(
    (state) => state.iamAccess.needsReconciliation,
  );
  const pendingIamMutations = useAppSelector((state) => state.iamAccess.pendingMutations > 0);
  const reconciliationTarget = useAppSelector(
    (state) => state.iamAccess.reconciliationTarget,
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortBy, setSort] = useState<PermissionQuery["sortBy"]>("code");
  const [direction, setDirection] =
    useState<PermissionQuery["direction"]>("asc");
  const queryArg: PermissionQuery = {
    page,
    size: 20,
    search: search.trim() || undefined,
    sortBy,
    direction,
  };
  const queryArgRef = useRef(queryArg);
  useEffect(() => {
    queryArgRef.current = {
      page,
      size: 20,
      search: search.trim() || undefined,
      sortBy,
      direction,
    };
  }, [page, search, sortBy, direction]);
  const list = usePermissionsQuery(queryArg);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<
    "code" | "description" | null
  >(null);
  const [create, createState] = useCreatePermissionMutation();
  const [update, updateState] = useUpdatePermissionMutation();
  const [remove, removeState] = useDeletePermissionMutation();
  const inFlight = useRef(false);
  const pending =
    pendingIamMutations || createState.isLoading || updateState.isLoading || removeState.isLoading;
  const open = (next: Dialog) => {
    setError("");
    setInvalidField(null);
    setCode(next.mode === "create" ? "" : next.item.code);
    setDescription(next.mode === "create" ? "" : (next.item.description ?? ""));
    setDialog(next);
  };
  const columns: ManagementTableColumn<IamPermission>[] = [
    { key: "code", header: "Mã quyền", cell: (item) => item.code },
    {
      key: "description",
      header: "Mô tả",
      cellClassName: "whitespace-normal min-w-48",
      cell: (item) => item.description || "—",
    },
    {
      key: "actions",
      header: "Thao tác",
      cell: (item) => (
        <ManagementRowActions
          actions={[
            {
              variant: "view",
              label: "Xem",
              ariaLabel: `Xem ${item.code}`,
              disabled: needsReload || pendingIamMutations,
              onClick: () => open({ mode: "view", item }),
            },
            {
              variant: "edit",
              label: "Sửa",
              ariaLabel: `Sửa ${item.code}`,
              disabled: needsReload || pendingIamMutations,
              onClick: () => open({ mode: "edit", item }),
            },
            {
              variant: "delete",
              label: "Xóa",
              ariaLabel: `Xóa ${item.code}`,
              disabled: needsReload || pendingIamMutations,
              onClick: () => open({ mode: "delete", item }),
            },
          ]}
        />
      ),
    },
  ];

  async function reloadData() {
    try {
      const waitForRunningIamWork = async () => {
        for (;;) {
          const runningQueries = dispatch(iamAccessApi.util.getRunningQueriesThunk());
          const runningMutations = dispatch(iamAccessApi.util.getRunningMutationsThunk());
          await Promise.all([...runningQueries, ...runningMutations]);
          if (store.getState().iamAccess.pendingMutations === 0) return;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      };
      await waitForRunningIamWork();
      const activeTarget = store.getState().iamAccess.reconciliationTarget;
      const refreshVisibleList = async () => {
        const visibleQueryArg = queryArgRef.current;
        const request = dispatch(
          iamAccessApi.endpoints.permissions.initiate(visibleQueryArg, {
            forceRefetch: true,
            subscribe: false,
          }),
        );
        try {
          const response: unknown = await request.unwrap();
          if (!isPermissionPageEnvelope(response)) {
            throw invalidReconciliationResponse();
          }
        } finally {
          request.unsubscribe();
        }
      };
      if (
        activeTarget?.type === "permission" &&
        activeTarget.permissionId
      ) {
        const request = dispatch(
          iamAccessApi.endpoints.permission.initiate(
            activeTarget.permissionId,
            { forceRefetch: true, subscribe: false },
          ),
        );
        try {
          const response: unknown = await request.unwrap();
          if (
            !isPermissionEnvelope(response) ||
            response.data.id !== activeTarget.permissionId
          ) {
            throw invalidReconciliationResponse();
          }
        } catch (error) {
          if (normalizeApiError(error).status !== 404) throw error;
        } finally {
          request.unsubscribe();
        }
        // Keep the lock while dropping all cached IAM data and repopulating the
        // currently visible list from the server. First let older requests
        // settle so delayed RTK Query invalidations cannot race the cache reset.
        await waitForRunningIamWork();
        dispatch(iamAccessApi.util.resetApiState());
        await refreshVisibleList();
        dispatch(
          clearPermissionReconciliation({
            permissionId: activeTarget.permissionId,
          }),
        );
        toast.success(
          "Đã tải lại dữ liệu quyền. Vui lòng kiểm tra trước khi tiếp tục.",
        );
      } else if (
        activeTarget?.type === "permission" &&
        activeTarget.permissionCode
      ) {
        let currentPage = 0;
        let totalPages = 1;
        let codeExists = false;
        while (currentPage < totalPages && !codeExists) {
          const request = dispatch(
            iamAccessApi.endpoints.permissions.initiate(
              {
                page: currentPage,
                size: 100,
                search: activeTarget.permissionCode,
                sortBy: "code",
                direction: "asc",
              },
              { forceRefetch: true, subscribe: false },
            ),
          );
          let response: unknown;
          try {
            response = await request.unwrap();
          } finally {
            request.unsubscribe();
          }
          if (!isPermissionPageEnvelope(response)) {
            throw invalidReconciliationResponse();
          }
          codeExists = response.data.items.some(
            (item) => item.code === activeTarget.permissionCode,
          );
          totalPages = response.data.totalPages;
          currentPage += 1;
        }
        // Search confirms the submitted code; drain old requests, then drop
        // every old IAM cache and reload the visible list before unlocking.
        await waitForRunningIamWork();
        dispatch(iamAccessApi.util.resetApiState());
        await refreshVisibleList();
        dispatch(
          clearPermissionReconciliation({
            permissionCode: activeTarget.permissionCode,
          }),
        );
        toast.success(
          codeExists
            ? "Đã xác nhận quyền vừa tạo trên máy chủ."
            : "Đã xác nhận mã quyền chưa tồn tại trên máy chủ.",
        );
      } else if (activeTarget?.type === "role") {
        await list.refetch().unwrap();
        toast.warning(
          "Đã tải lại danh mục quyền. Vai trò bị ảnh hưởng chưa được đối soát, vui lòng tải lại vai trò để mở khóa.",
        );
      } else {
        await list.refetch().unwrap();
      }
    } catch {
      toast.error("Không tải lại được dữ liệu. Vui lòng thử lại.");
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!dialog || dialog.mode === "view" || inFlight.current || needsReload || store.getState().iamAccess.needsReconciliation || store.getState().iamAccess.pendingMutations > 0) return;
    const normalized = code.trim().toUpperCase();
    if (
      dialog.mode === "create" &&
      (!/^[A-Z][A-Z0-9_]*$/.test(normalized) ||
        normalized.length > 150 ||
        normalized.startsWith("ROLE_"))
    ) {
      setInvalidField("code");
      setError(
        "Mã phải bắt đầu bằng chữ cái, chỉ gồm chữ hoa, số, dấu gạch dưới, tối đa 150 ký tự và không bắt đầu ROLE_.",
      );
      return;
    }
    if (description.trim().length > 500) {
      setInvalidField("description");
      setError("Mô tả tối đa 500 ký tự.");
      return;
    }
    setError("");
    setInvalidField(null);
    inFlight.current = true;
    dispatch(beginIamMutation());
    const before = store.getState();
    try {
      const result =
        dialog.mode === "create"
          ? await create({
              code: normalized,
              description: description.trim() || null,
            }).unwrap()
          : dialog.mode === "edit"
            ? await update({
                id: dialog.item.id,
                description: description.trim() || null,
              }).unwrap()
            : await remove(dialog.item.id).unwrap();
      const current = store.getState();
      if (
        current.auth.sessionGeneration !== before.auth.sessionGeneration ||
        current.iamAccess.epoch !== before.iamAccess.epoch
      )
        return;
      const isValidEnvelope = Boolean(
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === true,
      );
      const isValidData =
        dialog.mode === "delete" ||
        Boolean(
          result &&
          typeof result === "object" &&
          "data" in result &&
          result.data &&
          typeof result.data === "object",
        );
      if (!isValidEnvelope || !isValidData)
        throw Object.assign(new Error("Phản hồi không hợp lệ"), {
          status: "PARSING_ERROR",
        });
      setDialog(null);
      toast.success(
        dialog.mode === "create"
          ? "Đã tạo quyền."
          : dialog.mode === "edit"
            ? "Đã cập nhật quyền."
            : "Đã xóa quyền.",
      );
    } catch (err) {
      const current = store.getState();
      if (
        current.auth.sessionGeneration !== before.auth.sessionGeneration ||
        current.iamAccess.epoch !== before.iamAccess.epoch
      )
        return;
      const parsed = normalizeApiError(err);
      const uncertain =
        parsed.status === "FETCH_ERROR" ||
        parsed.status === "TIMEOUT_ERROR" ||
        parsed.status === "PARSING_ERROR" ||
        (typeof parsed.status === "number" && parsed.status >= 500) ||
        parsed.status === undefined;
      if (uncertain) {
        setDialog(null);
        dispatch(
          requirePermissionReconciliation({
            permissionId:
              dialog.mode !== "create" ? dialog.item.id : undefined,
            permissionCode: dialog.mode === "create" ? normalized : undefined,
          }),
        );
        toast.warning(
          "Chưa xác định kết quả. Hãy tải lại dữ liệu quyền trước khi thao tác tiếp.",
        );
      } else {
        const message =
          parsed.code === "IAM_006"
            ? "Không thể xóa quyền đang được gán cho vai trò."
            : parsed.code === "IAM_005"
              ? "Mã quyền đã tồn tại."
              : parsed.message;
        setError(message);
        toast.error(message);
        if (parsed.status === 404 || parsed.status === 409) void list.refetch();
      }
    } finally {
      inFlight.current = false;
      dispatch(finishIamMutation());
    }
  }
  return (
    <div className="space-y-5">
      <ManagementPageHeader
        title="Quản lý Quyền"
        description="Danh mục quyền trong hệ thống"
        breadcrumb="Quyền"
        icon={<KeyRound className="h-6 w-6" />}
      />
      <div className="flex justify-end">
        <button
          disabled={needsReload || pendingIamMutations}
          className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => open({ mode: "create" })}
        >
          <Plus className="h-4 w-4" />
          Thêm quyền
        </button>
      </div>
      <ManagementFilterBar>
        <ManagementSearch
          id="permission-search"
          label="Tìm kiếm"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Tìm mã hoặc mô tả"
          disabled={needsReload || pendingIamMutations}
        />
        <ManagementSelect
          id="permission-sort"
          label="Sắp xếp theo"
          value={sortBy}
          disabled={needsReload || pendingIamMutations}
          onChange={(value) => {
            setSort(value as PermissionQuery["sortBy"]);
            setPage(0);
          }}
        >
          <option value="code">Mã</option>
          <option value="description">Mô tả</option>
          <option value="id">ID</option>
        </ManagementSelect>
        <ManagementSelect
          id="permission-direction"
          label="Thứ tự"
          value={direction}
          disabled={needsReload || pendingIamMutations}
          onChange={(value) => {
            setDirection(value as PermissionQuery["direction"]);
            setPage(0);
          }}
        >
          <option value="asc">Tăng dần</option>
          <option value="desc">Giảm dần</option>
        </ManagementSelect>
      </ManagementFilterBar>
      {needsReload && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            {reconciliationTarget?.type === "permission"
              ? "Dữ liệu quyền cần được đối soát sau thao tác chưa xác định kết quả. Vui lòng tải lại dữ liệu từ máy chủ."
              : "Dữ liệu vai trò đang chờ đối soát. Thao tác quyền bị tạm khóa cho tới khi dữ liệu liên quan được đồng bộ."}
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
        <h2 id="permission-list" className="p-4 font-semibold">
          Danh sách quyền
        </h2>
        {list.isLoading ? (
          <p role="status" className="p-4">
            Đang tải...
          </p>
        ) : list.isError ? (
          <div className="p-4">
            <p role="alert">
              Không tải được danh sách quyền.{" "}
              {normalizeApiError(list.error).message}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Mã lỗi:{" "}
              {normalizeApiError(list.error).code ||
                String(
                  normalizeApiError(list.error).status || "không xác định",
                )}
            </p>
            <button
              className={`${btn} mt-3`}
              onClick={() => void list.refetch()}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <ManagementTable
              columns={columns}
              rows={list.data?.data?.items ?? []}
              rowKey={(item) => item.id}
              labelledBy="permission-list"
              emptyMessage="Không tìm thấy quyền."
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-4 text-sm">
              <button
                className={btn}
                disabled={page === 0 || needsReload || pendingIamMutations}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </button>
              <span>
                Trang {page + 1} /{" "}
                {Math.max(1, list.data?.data?.totalPages ?? 0)}
              </span>
              <button
                className={btn}
                disabled={needsReload || pendingIamMutations || page + 1 >= (list.data?.data?.totalPages ?? 0)}
                onClick={() => setPage(page + 1)}
              >
                Tiếp
              </button>
              <span>Tổng số: {list.data?.data?.totalElements ?? 0}</span>
            </div>
          </>
        )}
      </section>
      {dialog && (
        <ManagementDialog
          title={
            dialog.mode === "create"
              ? "Thêm quyền"
              : dialog.mode === "edit"
                ? "Sửa quyền"
                : dialog.mode === "view"
                  ? "Chi tiết quyền"
                  : "Xác nhận xóa quyền"
          }
          closeDisabled={pending}
          onClose={() => {
            if (!inFlight.current) setDialog(null);
          }}
        >
          <ManagementForm
            onSubmit={submit}
            onClose={() => {
              if (!inFlight.current) setDialog(null);
            }}
            readOnly={dialog.mode === "view"}
            submitDisabled={pending}
            closeDisabled={pending}
            submitLabel={
              pending
                ? "Đang xử lý..."
                : dialog.mode === "delete"
                  ? "Xóa quyền"
                  : "Lưu"
            }
          >
            {dialog.mode === "delete" ? (
              <p>
                Bạn muốn xóa quyền {dialog.item.code}? Quyền đang được gán cho
                vai trò sẽ không thể xóa.
              </p>
            ) : (
              <>
                <ManagementFormField
                  id="iam-permission-code"
                  label="Mã quyền"
                  hint="Chữ cái, chữ số và dấu gạch dưới; không bắt đầu ROLE_."
                  error={invalidField === "code" ? error : undefined}
                >
                  <input
                    id="iam-permission-code"
                    className={managementFieldClass}
                    value={code}
                    disabled={dialog.mode !== "create" || pending}
                    onChange={(event) => setCode(event.target.value)}
                    aria-invalid={invalidField === "code"}
                    aria-describedby={
                      invalidField === "code"
                        ? "iam-permission-code-error"
                        : "iam-permission-code-hint"
                    }
                  />
                </ManagementFormField>
                <ManagementFormField
                  id="iam-permission-description"
                  label="Mô tả"
                  hint="Không bắt buộc, tối đa 500 ký tự."
                  error={invalidField === "description" ? error : undefined}
                >
                  <textarea
                    id="iam-permission-description"
                    className={managementFieldClass}
                    rows={4}
                    value={description}
                    disabled={dialog.mode === "view" || pending}
                    onChange={(event) => setDescription(event.target.value)}
                    aria-invalid={invalidField === "description"}
                    aria-describedby={
                      invalidField === "description"
                        ? "iam-permission-description-error"
                        : "iam-permission-description-hint"
                    }
                  />
                </ManagementFormField>
              </>
            )}
            {error && !invalidField && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </ManagementForm>
        </ManagementDialog>
      )}
    </div>
  );
}
