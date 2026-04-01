interface IdentityCarrier {
  phone?: string | null;
  email?: string | null;
}

export function normalizeMobileNumber(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[\s()-]/g, "");
  let normalized = compact;

  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith("+")) {
    normalized = `+${normalized.slice(1).replace(/\D/g, "")}`;
  } else {
    const digitsOnly = normalized.replace(/\D/g, "");

    if (digitsOnly.length === 10) {
      normalized = `+91${digitsOnly}`;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      normalized = `+${digitsOnly}`;
    } else if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      normalized = `+${digitsOnly}`;
    } else {
      return null;
    }
  }

  const digits = normalized.slice(1);
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }

  return normalized;
}

export function formatMobileNumber(phone: string | null | undefined) {
  if (!phone) {
    return null;
  }

  const normalized = normalizeMobileNumber(phone);
  if (!normalized) {
    return phone;
  }

  const digits = normalized.slice(1);

  if (digits.startsWith("91") && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  if (digits.length > 10) {
    return `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -5)} ${digits.slice(-5)}`;
  }

  return normalized;
}

export function getUserIdentity(user: IdentityCarrier | null | undefined) {
  return formatMobileNumber(user?.phone) ?? user?.email ?? null;
}
