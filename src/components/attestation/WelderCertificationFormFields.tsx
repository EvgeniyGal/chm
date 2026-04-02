import type { certificationGroups, regulatoryDocuments, sampleMaterials, weldingConsumables } from "@/db/schema/attestation";
import { welderCertifications } from "@/db/schema/attestation";
import { companies as companiesTable } from "@/db/schema/companies";

type GroupRow = typeof certificationGroups.$inferSelect;
type CompanyRow = typeof companiesTable.$inferSelect;
type SampleRow = typeof sampleMaterials.$inferSelect;
type ConsRow = typeof weldingConsumables.$inferSelect;
type RegRow = typeof regulatoryDocuments.$inferSelect;
type WelderRow = typeof welderCertifications.$inferSelect;

function isoDate(d: string | Date | null | undefined): string {
  if (d == null) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function dec(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  return String(v);
}

export function WelderCertificationFormFields({
  groups,
  companies,
  sampleMaterials: samples,
  consumables,
  regulatoryDocs,
  defaultGroupId,
  initial,
  lockGroupId = false,
  selectedRegulatoryIds = [],
}: {
  groups: GroupRow[];
  companies: CompanyRow[];
  sampleMaterials: SampleRow[];
  consumables: ConsRow[];
  regulatoryDocs: RegRow[];
  defaultGroupId: string;
  initial?: WelderRow;
  lockGroupId?: boolean;
  selectedRegulatoryIds?: string[];
}) {
  const w = initial;
  const gid = w?.groupId ?? defaultGroupId;

  return (
    <>
      {lockGroupId && w ? (
        <>
          <input type="hidden" name="groupId" value={w.groupId} />
          <p className="text-sm text-muted-foreground">Група атестації зафіксована для цього запису.</p>
        </>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span>Група атестації *</span>
          <select
            name="groupId"
            required
            defaultValue={gid || undefined}
            className="h-10 rounded-md border border-border px-3"
          >
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                №{g.groupNumber} — {new Date(g.protocolDate).toLocaleDateString("uk-UA")}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">ПІБ та місце роботи</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Прізвище *</span>
            <input
              name="lastName"
              required
              maxLength={100}
              defaultValue={w?.lastName ?? ""}
              className="h-10 rounded-md border border-border px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Ім&apos;я *</span>
            <input
              name="firstName"
              required
              maxLength={100}
              defaultValue={w?.firstName ?? ""}
              className="h-10 rounded-md border border-border px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>По батькові</span>
            <input name="middleName" maxLength={100} defaultValue={w?.middleName ?? ""} className="h-10 rounded-md border border-border px-3" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>Місце народження</span>
          <input name="birthLocation" defaultValue={w?.birthLocation ?? ""} className="h-10 rounded-md border border-border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Дата народження</span>
          <input name="birthday" type="date" defaultValue={isoDate(w?.birthday)} className="h-10 rounded-md border border-border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Попереднє посвідчення / кваліфікація</span>
          <input name="prevQualificationDoc" defaultValue={w?.prevQualificationDoc ?? ""} className="h-10 rounded-md border border-border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Стаж зварника (років) *</span>
          <input
            name="workExperienceYears"
            type="text"
            required
            placeholder="напр. 3.5"
            defaultValue={dec(w?.workExperienceYears)}
            className="h-10 rounded-md border border-border px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Місце роботи (компанія) *</span>
          <select name="companyId" required defaultValue={w?.companyId ?? ""} className="h-10 rounded-md border border-border px-3">
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">Атестація</legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Вид атестації *</span>
          <select
            name="certificationType"
            required
            className="h-10 rounded-md border border-border px-3"
            defaultValue={w?.certificationType ?? "primary"}
          >
            <option value="primary">Первинна</option>
            <option value="additional">Додаткова</option>
            <option value="periodic">Періодична</option>
            <option value="extraordinary">Позачергова</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="isCombined" type="checkbox" className="size-4" defaultChecked={w?.isCombined ?? false} />
          Комбіноване зварювання
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Спосіб зварювання 1 (ISO 4063) *</span>
            <input name="weldingMethod1" required placeholder="111" defaultValue={w?.weldingMethod1 ?? ""} className="h-10 rounded-md border border-border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Спосіб зварювання 2</span>
            <input name="weldingMethod2" placeholder="для комбінованого" defaultValue={w?.weldingMethod2 ?? ""} className="h-10 rounded-md border border-border px-3" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>Вид деталей *</span>
          <select name="weldedPartsType" required className="h-10 rounded-md border border-border px-3" defaultValue={w?.weldedPartsType ?? "plate"}>
            <option value="plate">Пластина</option>
            <option value="pipe">Труба</option>
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Тип шва *</span>
            <select name="jointType" required className="h-10 rounded-md border border-border px-3" defaultValue={w?.jointType ?? "BW"}>
              <option value="BW">BW (стиковий)</option>
              <option value="FW">FW (кутовий)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Характеристика шва *</span>
            <select
              name="jointCharacteristics"
              required
              className="h-10 rounded-md border border-border px-3"
              defaultValue={w?.jointCharacteristics ?? "ss_nb"}
            >
              <option value="ss_nb">ss nb</option>
              <option value="ss_mb">ss mb</option>
              <option value="bs_gg">bs gg</option>
              <option value="bs_ng">bs ng</option>
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Положення 1 *</span>
            <input name="weldingPosition1" required placeholder="PF" defaultValue={w?.weldingPosition1 ?? ""} className="h-10 rounded-md border border-border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Положення 2</span>
            <input name="weldingPosition2" defaultValue={w?.weldingPosition2 ?? ""} className="h-10 rounded-md border border-border px-3" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="preheat" type="checkbox" className="size-4" defaultChecked={w?.preheat ?? false} />
          Підігрівання
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="heatTreatment" type="checkbox" className="size-4" defaultChecked={w?.heatTreatment ?? false} />
          Термообробка
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">Матеріали та розміри</legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Матеріал зразка *</span>
          <select name="sampleMaterialId" required defaultValue={w?.sampleMaterialId ?? ""} className="h-10 rounded-md border border-border px-3">
            <option value="">—</option>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.groupCode} — {s.steelGrade}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Товщина 1 (мм) *</span>
            <input name="thickness1" required defaultValue={dec(w?.thickness1)} className="h-10 rounded-md border border-border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Товщина 2</span>
            <input name="thickness2" defaultValue={dec(w?.thickness2)} className="h-10 rounded-md border border-border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Товщина 3</span>
            <input name="thickness3" defaultValue={dec(w?.thickness3)} className="h-10 rounded-md border border-border px-3" />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Ø труби 1 (мм)</span>
            <input name="pipeDiameter1" defaultValue={dec(w?.pipeDiameter1)} className="h-10 rounded-md border border-border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Ø труби 2</span>
            <input name="pipeDiameter2" defaultValue={dec(w?.pipeDiameter2)} className="h-10 rounded-md border border-border px-3" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Ø труби 3</span>
            <input name="pipeDiameter3" defaultValue={dec(w?.pipeDiameter3)} className="h-10 rounded-md border border-border px-3" />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Електрод / дріт 1 *</span>
            <select name="consumable1Id" required defaultValue={w?.consumable1Id ?? ""} className="h-10 rounded-md border border-border px-3">
              <option value="">—</option>
              {consumables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.materialGrade} ({c.coatingType})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Електрод / дріт 2</span>
            <select name="consumable2Id" defaultValue={w?.consumable2Id ?? ""} className="h-10 rounded-md border border-border px-3">
              <option value="">—</option>
              {consumables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.materialGrade} ({c.coatingType})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>Захисний газ / флюс</span>
          <input name="shieldingGasFlux" defaultValue={w?.shieldingGasFlux ?? ""} className="h-10 rounded-md border border-border px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Маркування зразка *</span>
          <input name="sampleMark" required maxLength={50} defaultValue={w?.sampleMark ?? ""} className="h-10 rounded-md border border-border px-3" />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">Контроль якості</legend>
        <label className="flex items-center gap-2 text-sm">
          <input name="inspVisual" type="checkbox" className="size-4" defaultChecked={w?.inspVisual ?? true} />
          Візуальний (VT)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="inspRadiographic" type="checkbox" className="size-4" defaultChecked={w?.inspRadiographic ?? true} />
          Радіографія (RT)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="inspUltrasonic" type="checkbox" className="size-4" defaultChecked={w?.inspUltrasonic ?? false} />
          УЗК (UT)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="inspBend" type="checkbox" className="size-4" defaultChecked={w?.inspBend ?? false} />
          Вигин (MT)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="inspMetallographic" type="checkbox" className="size-4" defaultChecked={w?.inspMetallographic ?? false} />
          Металографія (MGT)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="inspAdditional" type="checkbox" className="size-4" defaultChecked={w?.inspAdditional ?? false} />
          Додаткові (IT)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">Теорія та НД</legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Результат теорії *</span>
          <select name="theoryScore" required className="h-10 rounded-md border border-border px-3" defaultValue={w?.theoryScore ?? "passed"}>
            <option value="passed">Здано</option>
            <option value="failed">Нездано</option>
          </select>
        </label>
        <div>
          <div className="mb-1 text-sm font-medium">Нормативні документи (до 10)</div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {regulatoryDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Додайте НД у Налаштуваннях.</p>
            ) : (
              regulatoryDocs.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    name="regulatoryDocumentId"
                    type="checkbox"
                    value={r.id}
                    className="size-4"
                    defaultChecked={selectedRegulatoryIds.includes(r.id)}
                  />
                  <span>
                    {r.code} — {r.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </fieldset>
    </>
  );
}
