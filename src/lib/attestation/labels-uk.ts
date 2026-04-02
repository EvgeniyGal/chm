type WelderCertificationType = "primary" | "additional" | "periodic" | "extraordinary";

type CertificationGroupStatus = "draft" | "active" | "completed" | "archived";

const GROUP_STATUS_UA: Record<CertificationGroupStatus, string> = {
  draft: "Чернетка",
  active: "Активна",
  completed: "Завершена",
  archived: "Архів",
};

/** Human-readable Ukrainian label for certification group workflow status. */
export function certificationGroupStatusLabelUa(status: string): string {
  return GROUP_STATUS_UA[status as keyof typeof GROUP_STATUS_UA] ?? status;
}

const CERT_TYPE_UA: Record<WelderCertificationType, string> = {
  primary: "Первинна",
  additional: "Додаткова",
  periodic: "Періодична",
  extraordinary: "Позачергова",
};

export function certificationTypeLabelUa(v: WelderCertificationType): string {
  return CERT_TYPE_UA[v] ?? v;
}

export function theoryScoreLabelUa(v: "passed" | "failed"): string {
  return v === "passed" ? "здано" : "нездано";
}

export function weldedPartsTypeLabelUa(v: "plate" | "pipe"): string {
  return v === "pipe" ? "Труба" : "Пластина";
}

export function jointTypeLabelUa(v: "BW" | "FW"): string {
  return v === "BW" ? "Стиковий (BW)" : "Кутовий (FW)";
}
