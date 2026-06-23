export function normalizeIndianMobile(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  return value.trim();
}

export function isTenDigitIndianMobileInput(value: string) {
  return /^\d{10}$/.test(value.replace(/\D/g, ""));
}
