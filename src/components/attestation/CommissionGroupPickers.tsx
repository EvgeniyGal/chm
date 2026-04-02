"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { CommissionManageDialog, type CommissionRosterRow } from "@/components/attestation/CommissionManageDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type CommissionMemberOption = {
  id: string;
  fullName: string;
  position: string | null;
  /** `member` — лише у списку до 5 членів; `head` — лише у полі «Голова комісії». */
  role: "head" | "member";
};

function formatMemberLabel(m: CommissionMemberOption) {
  return m.position ? `${m.fullName} (${m.position})` : m.fullName;
}

const selectClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Matches head / members section “керувати списком” icon */
const manageRosterIconBtn =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-zinc-700 hover:bg-zinc-50";

export function CommissionGroupPickers({
  members,
  rosterRows,
  initialHeadId = "",
  initialMemberIds = [],
}: {
  members: CommissionMemberOption[];
  rosterRows: CommissionRosterRow[];
  initialHeadId?: string;
  initialMemberIds?: string[];
}) {
  const memberIdAllowed = useCallback(
    (id: string) => members.find((m) => m.id === id)?.role === "member",
    [members],
  );

  const [headId, setHeadId] = useState(initialHeadId);
  const [memberIds, setMemberIds] = useState<string[]>(() =>
    [...new Set(initialMemberIds)].filter(memberIdAllowed),
  );

  const [membersOpen, setMembersOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [membersQuery, setMembersQuery] = useState("");

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const headCandidates = useMemo(() => members.filter((m) => m.role === "head"), [members]);

  useEffect(() => {
    setMemberIds((prev) => prev.filter((id) => id !== headId && memberIdAllowed(id)));
  }, [headId, memberIdAllowed]);

  useEffect(() => {
    const headIds = new Set(headCandidates.map((m) => m.id));
    setHeadId((prev) => (prev && !headIds.has(prev) ? "" : prev));
    const ids = new Set(members.map((m) => m.id));
    setMemberIds((prev) => prev.filter((id) => ids.has(id) && memberIdAllowed(id)));
  }, [members, memberIdAllowed, headCandidates]);

  const bodyCandidates = useMemo(
    () => members.filter((m) => m.id !== headId && m.role === "member"),
    [members, headId],
  );

  const membersFiltered = useMemo(() => {
    const q = membersQuery.trim().toLowerCase();
    if (!q) return bodyCandidates;
    return bodyCandidates.filter((m) => {
      const hay = `${m.fullName} ${m.position ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bodyCandidates, membersQuery]);

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 5) {
        toast.error("Не більше 5 членів комісії");
        return prev;
      }
      return [...prev, id];
    });
  }

  function removeMember(id: string) {
    setMemberIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <>
      {memberIds.map((id) => (
        <input key={id} type="hidden" name="memberId" value={id} />
      ))}

      <CommissionManageDialog open={manageOpen} onOpenChange={setManageOpen} rosterRows={rosterRows} />

      <div className="flex min-w-0 flex-col gap-2 text-sm">
        <div className="flex min-w-0 flex-row items-center justify-between gap-2">
          <label htmlFor="commission-head-select" className="text-zinc-700">
            Голова комісії
          </label>
          <button
            type="button"
            className={manageRosterIconBtn}
            onClick={() => setManageOpen(true)}
            aria-label="Керувати списком комісії"
            title="Керувати списком комісії"
          >
            <Settings2 className="size-4" aria-hidden />
          </button>
        </div>
        <select
          id="commission-head-select"
          name="headId"
          required
          value={headId}
          onChange={(e) => setHeadId(e.target.value)}
          className={selectClass}
        >
          <option value="">— Оберіть голову —</option>
          {headCandidates.map((m) => (
            <option key={m.id} value={m.id}>
              {formatMemberLabel(m)}
            </option>
          ))}
        </select>
        {headCandidates.length === 0 ? (
          <p className="text-xs text-amber-800">
            Немає активних осіб з роллю «Голова комісії». Призначте роль у довіднику («Керувати списком комісії»).
          </p>
        ) : null}
      </div>

      <fieldset
        aria-labelledby="commission-members-heading"
        className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-sm"
      >
        <div className="flex min-w-0 flex-row items-center justify-between gap-2">
          <div
            id="commission-members-heading"
            className="min-w-0 flex-1 break-words text-sm font-medium text-zinc-700"
          >
            Члени комісії (до 5, без голови)
          </div>
          <button
            type="button"
            className={manageRosterIconBtn}
            onClick={() => setManageOpen(true)}
            aria-label="Керувати списком комісії"
            title="Керувати списком комісії"
          >
            <Settings2 className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-zinc-600">
          Лише особи з роллю «член комісії» у довіднику (до п’яти); голову оберіть вище. Обраний голова тут не
          показується.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="crm-btn-outline inline-flex h-10 items-center gap-2 px-3"
            onClick={() => {
              setMembersQuery("");
              setMembersOpen(true);
            }}
          >
            <Users className="size-4 shrink-0" aria-hidden />
            Обрати членів
          </button>
        </div>
        {memberIds.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {memberIds.map((id) => {
              const m = byId.get(id);
              if (!m) return null;
              return (
                <li
                  key={id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-sm"
                >
                  <span className="max-w-[min(100%,28rem)] truncate">{formatMemberLabel(m)}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Прибрати зі списку"
                    onClick={() => removeMember(id)}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">Членів не обрано.</p>
        )}
      </fieldset>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="flex max-h-[min(560px,80vh)] flex-col gap-3 p-4">
          <DialogTitle>Члени комісії ({memberIds.length}/5)</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Тут лише члени комісії з довідника; записи з роллю «голова» обираються полем «Голова комісії». Не більше
            п’яти осіб.
          </p>
          <Input
            value={membersQuery}
            onChange={(e) => setMembersQuery(e.target.value)}
            placeholder="Пошук за ПІБ або посадою…"
            className="bg-white"
            autoComplete="off"
          />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
            {membersFiltered.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {bodyCandidates.length === 0 ? (
                  <>
                    Немає доступних кандидатів.{" "}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2"
                      onClick={() => {
                        setMembersOpen(false);
                        setManageOpen(true);
                      }}
                    >
                      Додайте членів у довіднику
                    </button>
                    .
                  </>
                ) : (
                  "Нічого не знайдено."
                )}
              </p>
            ) : (
              <ul className="divide-y">
                {membersFiltered.map((m) => {
                  const checked = memberIds.includes(m.id);
                  return (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-muted/50">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 rounded border-zinc-300"
                          checked={checked}
                          onChange={() => toggleMember(m.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">{m.fullName}</span>
                          {m.position ? (
                            <span className="mt-0.5 block text-muted-foreground">{m.position}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="crm-btn-primary h-10 w-full sm:w-auto sm:self-end"
            onClick={() => setMembersOpen(false)}
          >
            Готово
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
