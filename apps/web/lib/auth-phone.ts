interface IdentityCarrier {
  phone?: string | null;
  email?: string | null;
  user_metadata?: {
    login_phone?: string | null;
  } | null;
}

const MOBILE_LOGIN_EMAIL_DOMAIN = "mobile.spendtracker.app";

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

export function getMobileLoginEmail(phone: string) {
  const normalized = normalizeMobileNumber(phone);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "");
  return `mobile.${digits}@${MOBILE_LOGIN_EMAIL_DOMAIN}`;
}

export function getPhoneFromMobileLoginEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const suffix = `@${MOBILE_LOGIN_EMAIL_DOMAIN}`;
  if (!normalizedEmail.endsWith(suffix)) {
    return null;
  }

  const localPart = normalizedEmail.slice(0, -suffix.length);
  if (!localPart.startsWith("mobile.")) {
    return null;
  }

  const digits = localPart.slice("mobile.".length);
  if (!/^\d{8,15}$/.test(digits)) {
    return null;
  }

  return `+${digits}`;
}

export function getStoredMobileNumber(user: IdentityCarrier | null | undefined) {
  const candidates = [
    user?.user_metadata?.login_phone,
    user?.phone,
    getPhoneFromMobileLoginEmail(user?.email),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeMobileNumber(candidate ?? "");
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getUserIdentity(user: IdentityCarrier | null | undefined) {
  return formatMobileNumber(getStoredMobileNumber(user)) ?? user?.email ?? null;
}
