"use server";

import { createClient } from "@/lib/supabase/server";
import { ageFrom, isValidCid } from "@/lib/validation";

export type VolunteerSubmitResult = { ok: boolean; error?: string };

export async function submitVolunteerRegistration(formData: FormData): Promise<VolunteerSubmitResult> {
  const name = String(formData.get("name") ?? "").trim();
  const sex = String(formData.get("sex") ?? "").trim();
  const dob = String(formData.get("dob") ?? "");
  const cid = String(formData.get("cid") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name || !sex || !dob || !cid || !phone || !email) {
    return { ok: false, error: "Please fill in every field." };
  }
  if (!isValidCid(cid)) {
    return { ok: false, error: "CID must be exactly 11 digits." };
  }

  const age = ageFrom(dob);
  if (age < 0 || age > 130) {
    return { ok: false, error: "That date of birth doesn't look right — please check it." };
  }

  const isMinor = age < 18;
  let guardianName: string | null = null;
  let guardianPhone: string | null = null;
  let guardianEmail: string | null = null;
  let guardianConsent = false;

  if (isMinor) {
    guardianName = String(formData.get("guardian_name") ?? "").trim();
    guardianPhone = String(formData.get("guardian_phone") ?? "").trim();
    guardianEmail = String(formData.get("guardian_email") ?? "").trim();
    guardianConsent = formData.get("guardian_consent") === "on";

    if (!guardianName || !guardianPhone || !guardianEmail) {
      return { ok: false, error: "Since the volunteer is under 18, a parent/guardian's name, phone, and email are required." };
    }
    if (!guardianConsent) {
      return { ok: false, error: "A parent/guardian must confirm consent for a volunteer under 18." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("volunteers").insert({
    name,
    sex,
    date_of_birth: dob,
    cid,
    phone,
    email,
    is_minor: isMinor,
    guardian_name: guardianName,
    guardian_phone: guardianPhone,
    guardian_email: guardianEmail,
    guardian_consent: guardianConsent,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
