"use server";

import { exchangeSetupPin } from "@/lib/setup-pin";

export async function unlockSetup(_previous: { error?: string; token?: string }, form: FormData): Promise<{ error?: string; token?: string }> {
  const pin = form.get("pin");
  if (typeof pin !== "string" || !/^\d{8}$/.test(pin)) return { error: "Enter the 8-digit setup PIN." };
  try {
    const token = await exchangeSetupPin(pin);
    if (token) return { token };
  } catch { /* Keep database details private. */ }
  return { error: "This PIN is incorrect, expired or unavailable. Ask the operator for a new one." };
}
