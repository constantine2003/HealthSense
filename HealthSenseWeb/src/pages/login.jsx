import { useState } from "react";
import { login } from "../auth/login"; // go up one level, then into auth

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
  try {
    const emailWithDomain = email.includes("@") ? email : `${email}@kiosk.local`;
    const user = await login(emailWithDomain, password);
    alert("Logged in as " + user.email);
  } catch (err) {
    console.error(err);
    alert("Login failed: " + err.message);
  }
};

  return (
    <div>
      <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
