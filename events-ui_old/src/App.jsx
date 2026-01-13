import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const EVENT_API = `${API_BASE}/event`;
const USER_API = `${API_BASE}/user`;

export default function App() {
  const [token, setToken] = useState("");
  const [events, setEvents] = useState([]);
  const [msg, setMsg] = useState("");

  async function loadEvents() {
    try {
      const res = await fetch(`${EVENT_API}/`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setMsg("");
    } catch (e) {
      setMsg("이벤트 조회 실패 (FastAPI 실행/CORS/API 주소 확인)");
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>FastAPI Events UI</h1>
      <p style={{ color: "#666" }}>
        API_BASE: <code>{API_BASE}</code>
      </p>

      {/* USER */}
      <AuthBox setToken={setToken} setMsg={setMsg} />

      {/* EVENT CREATE */}
      <EventCreate token={token} setMsg={setMsg} reload={loadEvents} />

      {/* EVENT LIST */}
      <h2>이벤트 목록 ({events.length})</h2>
      {events.map((e) => (
        <div
          key={e.id || e._id}
          style={{ borderBottom: "1px solid #ddd", padding: 8 }}
        >
          <b>{e.title}</b> — {e.location}
        </div>
      ))}

      {msg && <p style={{ color: "red" }}>{msg}</p>}
    </div>
  );
}

function AuthBox({ setToken, setMsg }) {
  const [email, setEmail] = useState("testuser@packt.com");
  const [password, setPassword] = useState("testpassword");

  async function signup() {
    try {
      const res = await fetch(`${USER_API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setMsg(data.message || "signup ok");
    } catch (e) {
      setMsg(`signup 실패: ${e.message}`);
    }
  }

  async function signin() {
    try {
      // OAuth2PasswordRequestForm -> x-www-form-urlencoded
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);

      const res = await fetch(`${USER_API}/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form.toString(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      setToken(data.access_token);
      setMsg("로그인 성공 (토큰 발급)");
    } catch (e) {
      setMsg(`signin 실패: ${e.message}`);
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>User</h2>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
      />
      <br />
      <button onClick={signup}>Signup</button>
      <button onClick={signin}>Signin</button>
    </div>
  );
}

function EventCreate({ token, setMsg, reload }) {
  const [title, setTitle] = useState("");

  async function create() {
    try {
      const res = await fetch(`${EVENT_API}/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          image: "",
          description: "demo",
          tags: ["demo"],
          location: "Seoul",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      setMsg(data.message || "created");
      reload();
    } catch (e) {
      setMsg(`이벤트 생성 실패: ${e.message} (토큰/서버 확인)`);
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <h2>이벤트 생성</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" />
      <button onClick={create} disabled={!token}>
        Create
      </button>
      {!token && <div style={{ color: "#666", fontSize: 12 }}>※ 먼저 Signin 해서 토큰을 받아야 생성 가능</div>}
    </div>
  );
}
