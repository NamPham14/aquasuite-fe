import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useStore } from "react-redux";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  IamAccessGate,
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
  ManagementMobileList,
  ManagementPagination,
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from "../../shared/ui/ManagementTable";
import {
  ManagementFilterCard,
  ManagementFilterChip,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
} from "../../shared/ui/ManagementPage";
import {
  DeleteConfirmDialog,
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from "../../shared/ui/ManagementDialog";
import { Button, IconButton, SakugaActionButton } from "../../shared/ui/Button";
import { CodeChip, Notice } from "../../shared/ui/Badge";
import {
  EmptyState,
  ErrorState,
  OPERATIONAL_TOAST_CLASS,
  ValidationSummary,
  type ValidationIssue,
} from "../../shared/ui/FeedbackStates";
import { normalizeApiError } from "../../shared/api/apiError";

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
  const pendingIamMutations = useAppSelector(
    (state) => state.iamAccess.pendingMutations > 0,
  );
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
    pendingIamMutations ||
    createState.isLoading ||
    updateState.isLoading ||
    removeState.isLoading;

  const hasActiveFilters = Boolean(
    search || sortBy !== "code" || direction !== "asc",
  );
  const rows = list.data?.data?.items ?? [];
  const totalElements = list.data?.data?.totalElements ?? 0;
  const totalPages = list.data?.data?.totalPages ?? 0;

  const open = (next: Dialog) => {
    setError("");
    setInvalidField(null);
    setCode(next.mode === "create" ? "" : next.item.code);
    setDescription(next.mode === "create" ? "" : (next.item.description ?? ""));
    setDialog(next);
  };

  function resetFilters() {
    setSearch("");
    setSort("code");
    setDirection("asc");
    setPage(0);
  }

  const validationIssues = useMemo<ValidationIssue[]>(() => {
    if (!error || !invalidField) return [];
    if (invalidField === "code") {
      return [
        { fieldId: "iam-permission-code", label: "Mã quyền", message: error },
      ];
    }
    return [
      { fieldId: "iam-permission-description", label: "Mô tả", message: error },
    ];
  }, [error, invalidField]);

  const columns: ManagementTableColumn<IamPermission>[] = [
    {
      key: "code",
      header: "Mã quyền",
      cell: (item) => <CodeChip>{item.code}</CodeChip>,
    },
    {
      key: "description",
      header: "Mô tả",
      cellClassName: "!whitespace-normal min-w-48 text-aqs-ink-muted",
      cell: (item) => item.description || "—",
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "center",
      cell: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <IconButton
            label={`Xem ${item.code}`}
            icon={<Eye />}
            disabled={needsReload || pendingIamMutations}
            onClick={() => open({ mode: "view", item })}
          />
          <IconButton
            label={`Sửa ${item.code}`}
            icon={<Pencil />}
            disabled={needsReload || pendingIamMutations}
            onClick={() => open({ mode: "edit", item })}
          />
          <IconButton
            label={`Xóa ${item.code}`}
            icon={<Trash2 />}
            tone="danger"
            disabled={needsReload || pendingIamMutations}
            onClick={() => open({ mode: "delete", item })}
          />
        </div>
      ),
    },
  ];

  async function reloadData() {
    try {
      const waitForRunningIamWork = async () => {
        for (;;) {
          const runningQueries = dispatch(
            iamAccessApi.util.getRunningQueriesThunk(),
          );
          const runningMutations = dispatch(
            iamAccessApi.util.getRunningMutationsThunk(),
          );
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
        } catch (err) {
          if (normalizeApiError(err).status !== 404) throw err;
        } finally {
          request.unsubscribe();
        }
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
          { className: OPERATIONAL_TOAST_CLASS },
        );
      } else if (
        activeTarget?.type === "permission" &&
        activeTarget.permissionCode
      ) {
        let currentPage = 0;
        let totalSearchPages = 1;
        let codeExists = false;
        while (currentPage < totalSearchPages && !codeExists) {
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
          totalSearchPages = response.data.totalPages;
          currentPage += 1;
        }
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
          { className: OPERATIONAL_TOAST_CLASS },
        );
      } else if (activeTarget?.type === "role") {
        await list.refetch().unwrap();
        toast.warning(
          "Đã tải lại danh mục quyền. Vai trò bị ảnh hưởng chưa được đối soát, vui lòng tải lại vai trò để mở khóa.",
          { className: OPERATIONAL_TOAST_CLASS },
        );
      } else {
        await list.refetch().unwrap();
      }
    } catch {
      toast.error("Không tải lại được dữ liệu. Vui lòng thử lại.", {
        className: OPERATIONAL_TOAST_CLASS,
      });
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (
      !dialog ||
      dialog.mode === "view" ||
      inFlight.current ||
      needsReload ||
      store.getState().iamAccess.needsReconciliation ||
      store.getState().iamAccess.pendingMutations > 0
    )
      return;
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
            permissionId: dialog.mode !== "create" ? dialog.item.id : undefined,
            permissionCode: dialog.mode === "create" ? normalized : undefined,
          }),
        );
        toast.warning(
          "Chưa xác định kết quả. Hãy tải lại dữ liệu quyền trước khi thao tác tiếp.",
          { className: OPERATIONAL_TOAST_CLASS },
        );
      } else {
        const message =
          parsed.code === "IAM_006"
            ? "Không thể xóa quyền đang được gán cho vai trò."
            : parsed.code === "IAM_005"
              ? "Mã quyền đã tồn tại."
              : parsed.message;
        setError(message);
        toast.error(message, { className: OPERATIONAL_TOAST_CLASS });
        if (parsed.status === 404 || parsed.status === 409) void list.refetch();
      }
    } finally {
      inFlight.current = false;
      dispatch(finishIamMutation());
    }
  }

  const parsedListError = list.isError ? normalizeApiError(list.error) : null;

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Quyền"
        description="Danh mục quyền trong hệ thống, phục vụ gán quyền cho các vai trò nội bộ."
        group="Hệ thống & Phân quyền"
        breadcrumb="Quyền"
        actions={
          <SakugaActionButton
            icon={<Plus />}
            disabled={needsReload || pendingIamMutations}
            onClick={() => open({ mode: "create" })}
          >
            Thêm quyền
          </SakugaActionButton>
        }
      />

      <ManagementFilterCard
        headingId="permission-filters-heading"
        title="Tìm và sắp xếp quyền"
        description="Kết quả tự cập nhật theo mã quyền, mô tả và thứ tự sắp xếp."
        hasActiveFilters={hasActiveFilters}
        resetDisabled={needsReload || pendingIamMutations}
        onReset={resetFilters}
        summaryChips={
          search ? (
            <ManagementFilterChip>Từ khóa: {search}</ManagementFilterChip>
          ) : undefined
        }
        resultCount={`${totalElements.toLocaleString("vi-VN")} kết quả`}
      >
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-[minmax(260px,2fr)_minmax(170px,1fr)_minmax(170px,1fr)]">
          <ManagementSearch
            id="permission-search"
            label="Tìm kiếm"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            placeholder="Tìm mã hoặc mô tả…"
            disabled={needsReload || pendingIamMutations}
            className="md:col-span-2 lg:col-span-1"
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
        </div>
      </ManagementFilterCard>

      {needsReload && (
        <Notice tone="warning" role="alert" title="Cần đối soát dữ liệu quyền">
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <span>
              {reconciliationTarget?.type === "permission"
                ? "Dữ liệu quyền cần được đối soát sau thao tác chưa xác định kết quả. Vui lòng tải lại dữ liệu từ máy chủ."
                : "Dữ liệu vai trò đang chờ đối soát. Thao tác quyền bị tạm khóa cho tới khi dữ liệu liên quan được đồng bộ."}
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
        headingId="permission-list"
        title="Danh sách quyền"
        description={`Tổng số ${totalElements.toLocaleString("vi-VN")} quyền trong hệ thống.`}
        refreshing={list.isFetching && !list.isLoading}
        busy={list.isFetching}
      >
        {list.isLoading ? (
          <ManagementTableSkeleton
            rows={6}
            columns={3}
            label="Đang tải danh sách quyền"
          />
        ) : parsedListError ? (
          <ErrorState
            sectionLabel="Danh sách quyền"
            title="Không tải được danh sách quyền."
            message={parsedListError.message}
            errorCode={
              parsedListError.code ||
              String(parsedListError.status || "không xác định")
            }
            retrying={list.isFetching}
            retryLabel="Thử lại"
            onRetry={() => void list.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Không tìm thấy quyền."
            search={search}
            hasFilters={hasActiveFilters}
            onClearSearch={() => {
              setSearch("");
              setPage(0);
            }}
            onResetFilters={resetFilters}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <ManagementTable
                columns={columns}
                rows={rows}
                rowKey={(item) => item.id}
                labelledBy="permission-list"
                emptyMessage="Không tìm thấy quyền."
              />
            </div>

            <ManagementMobileList
              rows={rows}
              rowKey={(item) => item.id}
              emptyMessage="Không tìm thấy quyền."
              renderRow={(item) => (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <CodeChip className="break-all">{item.code}</CodeChip>
                    <p className="m-0 text-xs text-aqs-ink-muted">
                      {item.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <IconButton
                      label={`Xem ${item.code}`}
                      icon={<Eye />}
                      disabled={needsReload || pendingIamMutations}
                      onClick={() => open({ mode: "view", item })}
                    />
                    <IconButton
                      label={`Sửa ${item.code}`}
                      icon={<Pencil />}
                      disabled={needsReload || pendingIamMutations}
                      onClick={() => open({ mode: "edit", item })}
                    />
                    <IconButton
                      label={`Xóa ${item.code}`}
                      icon={<Trash2 />}
                      tone="danger"
                      disabled={needsReload || pendingIamMutations}
                      onClick={() => open({ mode: "delete", item })}
                    />
                  </div>
                </div>
              )}
            />

            <ManagementPagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              shownCount={rows.length}
              noun="quyền"
              disabled={needsReload || pendingIamMutations}
              onPageChange={setPage}
              ariaLabel="Phân trang danh sách quyền"
            />
          </>
        )}
      </ManagementPanel>

      {dialog && dialog.mode === "delete" && (
        <DeleteConfirmDialog
          title="Xác nhận xóa quyền"
          subject={dialog.item.code}
          description={`Bạn muốn xóa quyền ${dialog.item.code}? Quyền đang được gán cho vai trò sẽ không thể xóa.`}
          confirmLabel="Xóa quyền"
          pendingLabel="Đang xử lý..."
          pending={pending}
          error={error || undefined}
          onClose={() => {
            if (!inFlight.current) setDialog(null);
          }}
          onConfirm={(event) => void submit(event)}
          asForm
        />
      )}

      {dialog && dialog.mode !== "delete" && (
        <ManagementDialog
          title={
            dialog.mode === "create"
              ? "Thêm quyền"
              : dialog.mode === "edit"
                ? "Sửa quyền"
                : "Chi tiết quyền"
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
            submitLoading={pending}
            submitLabel={pending ? "Đang xử lý..." : "Lưu"}
          >
            <ValidationSummary issues={validationIssues} />

            {error && !invalidField && (
              <Notice tone="danger" role="alert" title="Không thể lưu quyền">
                {error}
              </Notice>
            )}

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
                onChange={(event) => {
                  setCode(event.target.value);
                  if (invalidField === "code") {
                    setInvalidField(null);
                    setError("");
                  }
                }}
                placeholder="VD: ORDER_APPROVE"
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
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (invalidField === "description") {
                    setInvalidField(null);
                    setError("");
                  }
                }}
                placeholder="Mô tả phạm vi tác động của quyền..."
                aria-invalid={invalidField === "description"}
                aria-describedby={
                  invalidField === "description"
                    ? "iam-permission-description-error"
                    : "iam-permission-description-hint"
                }
              />
            </ManagementFormField>
          </ManagementForm>
        </ManagementDialog>
      )}
    </ManagementPageShell>
  );
}
