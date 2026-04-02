import {
  CombinedWeldingCheckbox,
  CombinedWeldingProvider,
  WeldingConsumablesPairRow,
  WeldingMethodsGrid,
} from "@/components/attestation/CombinedWeldingFormParts";
import { weldingPositionSelectOptions } from "@/lib/attestation/welding-iso-options";
import { DecimalMmInput } from "@/components/attestation/DecimalMmInput";
import { SampleMaterialWelderSelect } from "@/components/attestation/SampleMaterialWelderSelect";
import { PipeDiametersRow, WeldedPartsTypeProvider, WeldedPartsTypeSelect } from "@/components/attestation/WeldedPartsTypeContext";
import { WelderCompanySelect } from "@/components/attestation/WelderCompanySelect";
import { WorkExperienceYearsInput } from "@/components/attestation/WorkExperienceYearsInput";
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

const welderFormInputClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function WelderCertificationFormFields({
  groups,
  companies,
  quickCreateCompanyDropdowns,
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
  quickCreateCompanyDropdowns: {
    taxStatusOptions: string[];
    signerPositionNomOptions: string[];
    signerPositionGenOptions: string[];
    actingUnderOptions: string[];
  };
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
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Група атестації *</span>
          <select
            name="groupId"
            required
            defaultValue={gid || undefined}
            className={welderFormInputClass}
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

      <fieldset className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">ПІБ та місце роботи</legend>
        <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Прізвище *</span>
            <input
              name="lastName"
              required
              maxLength={100}
              defaultValue={w?.lastName ?? ""}
              className={welderFormInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Ім&apos;я *</span>
            <input
              name="firstName"
              required
              maxLength={100}
              defaultValue={w?.firstName ?? ""}
              className={welderFormInputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>По батькові</span>
            <input name="middleName" maxLength={100} defaultValue={w?.middleName ?? ""} className={welderFormInputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Місце народження</span>
            <input name="birthLocation" defaultValue={w?.birthLocation ?? ""} className={welderFormInputClass} />
          </label>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Дата народження</span>
            <input name="birthday" type="date" defaultValue={isoDate(w?.birthday)} className={welderFormInputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Попереднє посвідчення</span>
            <input name="prevQualificationDoc" defaultValue={w?.prevQualificationDoc ?? ""} className={welderFormInputClass} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Стаж зварника (років) *</span>
            <WorkExperienceYearsInput
              name="workExperienceYears"
              required
              defaultValue={dec(w?.workExperienceYears)}
              className={welderFormInputClass}
            />
          </label>
          <div className="flex min-w-0 flex-col gap-1 text-sm">
            <span>Місце роботи (компанія) *</span>
            <WelderCompanySelect
              initialCompanies={companies.map((c) => ({ id: c.id, label: c.shortName }))}
              defaultCompanyId={w?.companyId ?? ""}
              quickCreateDropdowns={quickCreateCompanyDropdowns}
            />
          </div>
        </div>
      </fieldset>

      <CombinedWeldingProvider defaultIsCombined={w?.isCombined ?? false}>
        <WeldedPartsTypeProvider defaultValue={w?.weldedPartsType ?? "plate"}>
        <fieldset className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3">
          <legend className="text-sm font-medium">Атестація</legend>
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-end md:gap-4">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <span>Вид атестації *</span>
              <select
                name="certificationType"
                required
                className={welderFormInputClass}
                defaultValue={w?.certificationType ?? "primary"}
              >
                <option value="primary">Первинна</option>
                <option value="additional">Додаткова</option>
                <option value="periodic">Періодична</option>
                <option value="extraordinary">Позачергова</option>
              </select>
            </label>
            <CombinedWeldingCheckbox />
          </div>
          <WeldingMethodsGrid
            defaultWeldingMethod1={w?.weldingMethod1 ?? ""}
            defaultWeldingMethod2={w?.weldingMethod2 ?? ""}
            inputClassName={welderFormInputClass}
          />
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:gap-4">
          <WeldedPartsTypeSelect className={welderFormInputClass} />
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Тип шва *</span>
            <select name="jointType" required className={welderFormInputClass} defaultValue={w?.jointType ?? "BW"}>
              <option value="BW">BW (стиковий)</option>
              <option value="FW">FW (кутовий)</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Характеристика шва *</span>
            <select
              name="jointCharacteristics"
              required
              className={welderFormInputClass}
              defaultValue={w?.jointCharacteristics ?? "ss_nb"}
            >
              <option value="ss_nb">ss nb</option>
              <option value="ss_mb">ss mb</option>
              <option value="bs_gg">bs gg</option>
              <option value="bs_ng">bs ng</option>
            </select>
          </label>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:gap-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Положення 1 (ISO 6947) *</span>
            <select
              name="weldingPosition1"
              required
              defaultValue={(w?.weldingPosition1 ?? "").trim() || undefined}
              className={welderFormInputClass}
            >
              <option value="">— Оберіть положення —</option>
              {weldingPositionSelectOptions(w?.weldingPosition1 ?? "").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Положення 2 (ISO 6947)</span>
            <select name="weldingPosition2" defaultValue={(w?.weldingPosition2 ?? "").trim() || undefined} className={welderFormInputClass}>
              <option value="">—</option>
              {weldingPositionSelectOptions(w?.weldingPosition2 ?? "").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="preheat" type="checkbox" className="size-4" defaultChecked={w?.preheat ?? false} />
          Підігрівання
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="heatTreatment" type="checkbox" className="size-4" defaultChecked={w?.heatTreatment ?? false} />
          Термообробка
        </label>
        </fieldset>

        <fieldset className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3">
          <legend className="text-sm font-medium">Матеріали та розміри</legend>
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Матеріал зразка *</span>
          <SampleMaterialWelderSelect
            initialOptions={samples.map((s) => ({
              id: s.id,
              groupCode: s.groupCode,
              steelGrade: s.steelGrade,
            }))}
            defaultSampleMaterialId={w?.sampleMaterialId ?? ""}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:gap-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Товщина 1 (мм) *</span>
            <DecimalMmInput
              name="thickness1"
              required
              defaultValue={dec(w?.thickness1)}
              className={welderFormInputClass}
              maxIntegerDigits={6}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Товщина 2</span>
            <DecimalMmInput name="thickness2" defaultValue={dec(w?.thickness2)} className={welderFormInputClass} maxIntegerDigits={6} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm md:min-w-0 md:flex-1">
            <span>Товщина 3</span>
            <DecimalMmInput name="thickness3" defaultValue={dec(w?.thickness3)} className={welderFormInputClass} maxIntegerDigits={6} />
          </label>
        </div>
        <PipeDiametersRow
          className={welderFormInputClass}
          defaults={{
            d1: dec(w?.pipeDiameter1),
            d2: dec(w?.pipeDiameter2),
            d3: dec(w?.pipeDiameter3),
          }}
        />
        <WeldingConsumablesPairRow
          consumables={consumables.map((c) => ({
            id: c.id,
            materialGrade: c.materialGrade,
            coatingType: c.coatingType,
          }))}
          defaultConsumable1Id={w?.consumable1Id ?? ""}
          defaultConsumable2Id={w?.consumable2Id ?? ""}
        />
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Захисний газ / флюс</span>
          <input name="shieldingGasFlux" defaultValue={w?.shieldingGasFlux ?? ""} className={welderFormInputClass} />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Маркування зразка *</span>
          <input name="sampleMark" required maxLength={50} defaultValue={w?.sampleMark ?? ""} className={welderFormInputClass} />
        </label>
        </fieldset>
        </WeldedPartsTypeProvider>
      </CombinedWeldingProvider>

      <fieldset className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">Контроль якості</legend>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="inspVisual" type="checkbox" className="size-4" defaultChecked={w?.inspVisual ?? true} />
          Візуальний (VT)
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="inspRadiographic" type="checkbox" className="size-4" defaultChecked={w?.inspRadiographic ?? true} />
          Радіографія (RT)
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="inspUltrasonic" type="checkbox" className="size-4" defaultChecked={w?.inspUltrasonic ?? false} />
          УЗК (UT)
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="inspBend" type="checkbox" className="size-4" defaultChecked={w?.inspBend ?? false} />
          Вигин (MT)
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="inspMetallographic" type="checkbox" className="size-4" defaultChecked={w?.inspMetallographic ?? false} />
          Металографія (MGT)
        </label>
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input name="inspAdditional" type="checkbox" className="size-4" defaultChecked={w?.inspAdditional ?? false} />
          Додаткові (IT)
        </label>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3">
        <legend className="text-sm font-medium">Теорія та НД</legend>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>Результат теорії *</span>
          <select name="theoryScore" required className={welderFormInputClass} defaultValue={w?.theoryScore ?? "passed"}>
            <option value="passed">Здано</option>
            <option value="failed">Нездано</option>
          </select>
        </label>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium">Нормативні документи (до 10)</div>
          <div className="max-h-40 min-w-0 space-y-1 overflow-y-auto overflow-x-hidden rounded-md border border-border p-2">
            {regulatoryDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Додайте НД у Налаштуваннях.</p>
            ) : (
              regulatoryDocs.map((r) => (
                <label key={r.id} className="flex min-w-0 items-start gap-2 text-sm">
                  <input
                    name="regulatoryDocumentId"
                    type="checkbox"
                    value={r.id}
                    className="mt-0.5 size-4 shrink-0"
                    defaultChecked={selectedRegulatoryIds.includes(r.id)}
                  />
                  <span className="min-w-0 break-words">
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
