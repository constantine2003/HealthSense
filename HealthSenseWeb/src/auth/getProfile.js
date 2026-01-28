import { supabase } from "../supabaseClient";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, recovery_email")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data; // { first_name: "...", last_name: "..." }
}