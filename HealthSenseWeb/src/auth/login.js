import { supabase } from "../supabaseClient.js";

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login error:", error.message);
    throw error;
  }

  return data.user;
}