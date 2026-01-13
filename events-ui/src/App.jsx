import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const EVENT_API = `${API_BASE}/event`;
const USER_API = `${API_BASE}/user`;
const LS_TOKEN_KEY = "planner_token_v1";

const RuntimeContext = createContext(null);
function useRuntime() {
  const v = useContext(RuntimeContext);
  if (!v) throw new Error("RuntimeContext missing");
  return v;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN_KEY) || "");

  useEffect(() => {
    if (token) localStorage.setItem(LS_TOKEN_KEY, token);
    else localStorage.removeItem(LS_TOKEN_KEY);
  }, [token]);

  return (
    <RuntimeContext.Provider value={{ token, setToken }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />

          {/* public */}
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/events"
            element={
              <AppShell>
                <EventsPage />
              </AppShell>
            }
          />

          {/* private */}
          <Route
            path="/create"
            element={
              <RequireAuth>
                <AppShell>
                  <CreatePage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AppShell>
                  <AccountPage />
                </AppShell>
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </BrowserRouter>
    </RuntimeContext.Provider>
  );
}

/** ---------------- Route Guard ---------------- */
function RequireAuth({ children }) {
  const { token } = useRuntime();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

/** ---------------- App Shell ---------------- */
function AppShell({ children }) {
  const { token } = useRuntime();
  return (
    <div className="min-h-screen bg-[#fff7f2] text-slate-900">
      <BgWarm />

      <header className="sticky top-0 z-30 border-b border-orange-100/60 bg-white/75 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-lg">📒</div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">Planner</h1>
                <p className="mt-0.5 text-sm text-slate-500">따뜻한 일정/이벤트 정리</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={token ? "good" : "neutral"}>{token ? "로그인됨" : "게스트"}</Pill>
              <HeaderActions />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TopTabs />
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-orange-50 px-3 py-1 ring-1 ring-orange-100">
                API: <code className="font-semibold">{API_BASE}</code>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function TopTabs() {
  const { token } = useRuntime();

  const tabClass = ({ isActive }) =>
    [
      "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold transition",
      isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/60",
    ].join(" ");

  const badgeClass = ({ isActive }) =>
    [
      "rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1",
      isActive ? "bg-orange-50 text-slate-700 ring-orange-100" : "bg-white/70 text-slate-500 ring-orange-100",
    ].join(" ");

  return (
    <div className="inline-flex rounded-2xl bg-orange-50 p-1 ring-1 ring-orange-100">
      <NavLink to="/events" className={tabClass}>
        Events <span className={badgeClass}>탐색</span>
      </NavLink>

      <NavLink to="/create" className={tabClass}>
        Create <span className={badgeClass}>{token ? "가능" : "잠김"}</span>
      </NavLink>

      <NavLink to="/account" className={tabClass}>
        Account <span className={badgeClass}>{token ? "ON" : "OFF"}</span>
      </NavLink>
    </div>
  );
}

function HeaderActions() {
  const nav = useNavigate();
  const { token } = useRuntime();

  return (
    <button
      onClick={() => (token ? nav("/create") : nav("/login", { state: { from: "/create" } }))}
      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-orange-100 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
    >
      ＋ 새 이벤트
    </button>
  );
}

/** ---------------- Pages ---------------- */

function LoginPage() {
  const { setToken } = useRuntime();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || "/events";

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(text, tone = "neutral") {
    setToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  return (
    <div className="min-h-screen bg-[#fff7f2] text-slate-900">
      <BgWarm />
      <div className="mx-auto max-w-5xl px-4 py-10">
        {toast && <Toast tone={toast.tone} onClose={() => setToast(null)}>{toast.text}</Toast>}

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-orange-100">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-xl">🧡</div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">환영해요</h1>
                <p className="mt-1 text-sm text-slate-500">로그인하면 이벤트 추가/관리 기능이 열려요.</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-orange-50 p-4 ring-1 ring-orange-100">
              <div className="text-sm font-extrabold">돌아갈 위치</div>
              <div className="mt-1 text-sm text-slate-600">
                로그인 성공 시 <code className="font-semibold">{from}</code> 로 이동합니다.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => nav("/events")}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50 active:scale-[0.98]"
              >
                ← 이벤트 보러가기
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-orange-100">
            <div className="mb-4">
              <div className="text-base font-extrabold">로그인 / 가입</div>
              <div className="mt-1 text-sm text-slate-500">FastAPI 계정으로 진행합니다.</div>
            </div>

            <AuthBox
              onToken={(t) => {
                setToken(t);
                showToast("로그인 성공 ✅", "good");
                setTimeout(() => nav(from, { replace: true }), 250);
              }}
              onMsg={(t, tone) => showToast(t, tone)}
            />

            <div className="mt-5 text-xs text-slate-500">
              토큰은 localStorage에 저장되어 새로고침 후에도 유지돼요.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [sort, setSort] = useState("latest");
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(text, tone = "neutral") {
    setToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch(`${EVENT_API}/`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      showToast("이벤트 조회 실패 (FastAPI 실행/CORS/API 주소 확인)", "warn");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    return () => toastTimerRef.current && clearTimeout(toastTimerRef.current);
  }, []);

  const locations = useMemo(() => {
    const s = new Set();
    for (const e of events) if (e?.location) s.add(e.location);
    return ["all", ...Array.from(s)];
  }, [events]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = events.filter((e) => {
      const okLoc = loc === "all" ? true : (e.location || "") === loc;
      const blob = `${e.title || ""} ${e.location || ""} ${e.description || ""} ${(e.tags || []).join(" ")}`.toLowerCase();
      const okQ = query ? blob.includes(query) : true;
      return okLoc && okQ;
    });
    if (sort === "title") out = out.slice().sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return out;
  }, [events, q, loc, sort]);

  return (
    <section className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-orange-100">
      {toast && <div className="mb-4"><Toast tone={toast.tone} onClose={() => setToast(null)}>{toast.text}</Toast></div>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">이벤트</h2>
          <p className="mt-1 text-sm text-slate-500">검색/필터로 원하는 이벤트를 빠르게 찾으세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadEvents}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50 active:scale-[0.98]"
          >
            ⟳ 새로고침
          </button>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: "그리드" },
              { value: "list", label: "리스트" },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <Input label="검색" value={q} onChange={setQ} placeholder="제목/장소/설명/태그" left="🔎" />
        <Select label="장소" value={loc} onChange={setLoc} options={locations.map((x) => ({ value: x, label: x === "all" ? "전체" : x }))} />
        <Select
          label="정렬"
          value={sort}
          onChange={setSort}
          options={[
            { value: "latest", label: "최신" },
            { value: "title", label: "가나다" },
          ]}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <SkeletonGrid view={view} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🧺" title="검색 결과가 없어요" desc="검색어를 바꾸거나, 장소 필터를 ‘전체’로 변경해보세요." />
        ) : view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => (
              <EventCard key={e.id || e._id} e={e} onOpen={() => setSelected(e)} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-orange-100/60 rounded-3xl bg-white ring-1 ring-orange-100">
            {filtered.map((e) => (
              <EventRow key={e.id || e._id} e={e} onOpen={() => setSelected(e)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold">{selected.title}</div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-orange-100">
                <span>📍</span>
                <span className="truncate">{selected.location || "미지정"}</span>
              </div>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-orange-100">
              DETAIL
            </span>
          </div>

          <div className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
            {selected.description ? selected.description : <span className="text-slate-500">설명이 없습니다.</span>}
          </div>

          {Array.isArray(selected.tags) && selected.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.tags.map((t) => (
                <span key={t} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-orange-100">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setSelected(null)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50"
            >
              닫기
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function CreatePage() {
  const { token } = useRuntime();
  const nav = useNavigate();

  const [form, setForm] = useState({ title: "", location: "Seoul", description: "", tags: "" });
  const [creating, setCreating] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(text, tone = "neutral") {
    setToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  async function create() {
    if (!form.title.trim()) return showToast("제목을 입력해주세요.", "warn");
    if (!form.location.trim()) return showToast("장소를 입력해주세요.", "warn");

    setCreating(true);
    try {
      const tagsArr = form.tags.split(",").map((s) => s.trim()).filter(Boolean);

      const res = await fetch(`${EVENT_API}/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          image: "",
          description: (form.description || "").trim(),
          tags: tagsArr,
          location: form.location.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      showToast(data.message || "이벤트가 추가됐어요 ✅", "good");
      setForm({ title: "", location: "Seoul", description: "", tags: "" });
      setTimeout(() => nav("/events"), 250);
    } catch (e) {
      showToast(`이벤트 생성 실패: ${e.message} (토큰/서버 확인)`, "warn");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[520px_1fr]">
      <WarmCard>
        <CardTop title="이벤트 추가" desc="제목/장소/설명/태그를 입력하고 저장하세요." right={<Pill tone="good">작성</Pill>} />

        {toast && <div className="mb-4"><Toast tone={toast.tone} onClose={() => setToast(null)}>{toast.text}</Toast></div>}

        <div className="space-y-3">
          <Input label="제목" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="예: 동네 러닝 모임" />
          <Input label="장소" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="Seoul" left="📍" />

          <label className="block">
            <div className="mb-1 text-xs font-extrabold text-slate-700">설명</div>
            <textarea
              className="w-full min-h-[120px] resize-none rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-orange-100 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="어떤 이벤트인가요?"
            />
          </label>

          <Input label="태그(쉼표로 구분)" value={form.tags} onChange={(v) => setForm((p) => ({ ...p, tags: v }))} placeholder="러닝,모임" left="#" />

          <div className="flex items-center gap-2 pt-2">
            <PrimaryButton onClick={create} disabled={creating}>{creating ? "저장 중..." : "저장하기"}</PrimaryButton>
            <button
              onClick={() => nav("/events")}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50 active:scale-[0.98]"
            >
              취소
            </button>
          </div>
        </div>
      </WarmCard>

      <section className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-orange-100">
        <h3 className="text-base font-extrabold">작성 팁</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><span>•</span><span>제목은 짧고 명확하게</span></li>
          <li className="flex gap-2"><span>•</span><span>장소는 일관된 표기(Seoul / Gangnam 등)</span></li>
          <li className="flex gap-2"><span>•</span><span>태그는 2~4개 정도 추천</span></li>
        </ul>
      </section>
    </div>
  );
}

function AccountPage() {
  const { token, setToken } = useRuntime();

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  function showToast(text, tone = "neutral") {
    setToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[520px_1fr]">
      <WarmCard>
        <CardTop title="계정" desc="토큰 확인/복사, 로그아웃이 가능해요." right={<Pill tone={token ? "good" : "neutral"}>{token ? "ON" : "OFF"}</Pill>} />

        {toast && <div className="mb-4"><Toast tone={toast.tone} onClose={() => setToast(null)}>{toast.text}</Toast></div>}

        <div className="space-y-3">
          <div className="rounded-3xl bg-white p-4 ring-1 ring-orange-100">
            <div className="text-xs font-extrabold text-slate-700">현재 토큰</div>
            <div className="mt-2 break-all rounded-2xl bg-orange-50 p-3 text-xs text-slate-700 ring-1 ring-orange-100">
              {token || "토큰이 없습니다."}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setToken(""); showToast("로그아웃 됐어요.", "neutral"); }}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50 disabled:opacity-50"
              disabled={!token}
            >
              로그아웃
            </button>

            <CopyToken token={token} onToast={showToast} />
          </div>
        </div>
      </WarmCard>

      <section className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-orange-100">
        <h3 className="text-base font-extrabold">보안 안내</h3>
        <p className="mt-2 text-sm text-slate-600">토큰은 비밀번호처럼 취급하세요. 화면 공유/캡처에 노출되지 않게 주의해요.</p>
      </section>
    </div>
  );
}

/** ---------------- AuthBox ---------------- */
function AuthBox({ onToken, onMsg }) {
  const [email, setEmail] = useState("testuser@packt.com");
  const [password, setPassword] = useState("testpassword");
  const [busy, setBusy] = useState(false);

  async function signup() {
    setBusy(true);
    try {
      const res = await fetch(`${USER_API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      onMsg?.(data.message || "signup ok", "good");
    } catch (e) {
      onMsg?.(`signup 실패: ${e.message}`, "warn");
    } finally {
      setBusy(false);
    }
  }

  async function signin() {
    setBusy(true);
    try {
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
      onToken?.(data.access_token);
      onMsg?.("로그인 성공 (토큰 발급)", "good");
    } catch (e) {
      onMsg?.(`signin 실패: ${e.message}`, "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Input label="이메일" value={email} onChange={setEmail} placeholder="email" />
      <Input label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="password" />

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={signin}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "처리 중..." : "로그인"}
        </button>
        <button
          onClick={signup}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 shadow-sm ring-1 ring-orange-100 hover:bg-orange-50 active:scale-[0.98] disabled:opacity-50"
        >
          가입
        </button>
      </div>

      <div className="text-xs text-slate-500">* 로그인하면 Create/Account가 열려요.</div>
    </div>
  );
}

/** ---------------- Shared UI ---------------- */
function BgWarm() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />
    </div>
  );
}

function WarmCard({ children }) {
  return <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-orange-100">{children}</div>;
}

function CardTop({ title, desc, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="text-base font-extrabold">{title}</div>
        {desc && <div className="mt-1 text-sm text-slate-500">{desc}</div>}
      </div>
      {right}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-orange-50 text-slate-700 ring-orange-100";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${cls}`}>{children}</span>;
}

function Toast({ children, onClose, tone = "neutral" }) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-orange-200 bg-orange-50 text-slate-700";

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium">{children}</div>
        <button onClick={onClose} className="rounded-2xl px-2 py-1 text-sm font-bold opacity-70 hover:bg-white/60 hover:opacity-100" title="닫기">
          ✕
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon = "🧺", title, desc }) {
  return (
    <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center">
      <div className="mx-auto mb-2 text-4xl">{icon}</div>
      <div className="text-sm font-extrabold text-slate-800">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{desc}</div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-orange-100">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={[
              "rounded-2xl px-3 py-2 text-xs font-extrabold transition",
              active ? "bg-orange-50 text-slate-900" : "text-slate-600 hover:bg-orange-50/60",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SkeletonGrid({ view }) {
  const items = new Array(view === "grid" ? 6 : 5).fill(0);
  return view === "grid" ? (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((_, i) => (
        <div key={i} className="rounded-3xl bg-white p-4 ring-1 ring-orange-100">
          <div className="h-4 w-2/3 animate-pulse rounded bg-orange-100" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-orange-100" />
          <div className="mt-4 h-20 w-full animate-pulse rounded-2xl bg-orange-50" />
        </div>
      ))}
    </div>
  ) : (
    <div className="rounded-3xl bg-white ring-1 ring-orange-100">
      {items.map((_, i) => (
        <div key={i} className="p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-orange-100" />
          <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-orange-100" />
        </div>
      ))}
    </div>
  );
}

function EventCard({ e, onOpen }) {
  return (
    <button onClick={onOpen} className="group w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-orange-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">{e.title}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-orange-100">
            <span>📍</span>
            <span className="truncate">{e.location || "미지정"}</span>
          </div>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-orange-100">보기</span>
      </div>

      {e.description && <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{e.description}</p>}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">id: {e.id || e._id}</span>
        <span className="text-xs font-extrabold text-orange-600 opacity-0 transition group-hover:opacity-100">상세 →</span>
      </div>
    </button>
  );
}

function EventRow({ e, onOpen }) {
  return (
    <button onClick={onOpen} className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-orange-50/40">
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold">{e.title}</div>
        <div className="mt-1 text-xs text-slate-500">{e.location || "미지정"}</div>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-orange-100">보기</span>
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", left }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-extrabold text-slate-700">{label}</div>
      <div className="relative">
        {left && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">{left}</div>}
        <input
          className={["w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-orange-100 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200", left ? "pl-9" : ""].join(" ")}
          value={value}
          type={type}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-extrabold text-slate-700">{label}</div>
      <select
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-orange-100 outline-none focus:ring-2 focus:ring-orange-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl ring-1 ring-orange-100">
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-2xl px-2 py-1 text-sm font-bold text-slate-600 hover:bg-orange-50" title="닫기">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CopyToken({ token, onToast }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!token) return onToast?.("토큰이 없어요.", "warn");
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      onToast?.("토큰을 복사했어요.", "good");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      onToast?.("복사 실패: 브라우저 권한을 확인하세요.", "warn");
    }
  }

  return (
    <button onClick={copy} className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50" disabled={!token}>
      {copied ? "복사됨!" : "토큰 복사"}
    </button>
  );
}
