import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Planner UI (React + Vite + Tailwind) — single file App.jsx
 * - Events / Calendar / Create / Account tabs
 * - FastAPI integration (EVENT_API, USER_API)
 * - Toast (auto close), modal (Esc close), skeleton, empty state
 * - Token persisted to localStorage
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const EVENT_API = `${API_BASE}/event`;
const USER_API = `${API_BASE}/user`;

const LS_TOKEN_KEY = "planner_token_v1";
const PRIMARY = "orange"; // single primary hue (classes use orange)

export default function App() {
  // auth
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN_KEY) || "");

  // data
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // ui global
  const [tab, setTab] = useState("events"); // events | calendar | create | account
  const [toast, setToast] = useState(null); // { text, tone }
  const toastTimerRef = useRef(null);

  // events tab ui
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("all");
  const [sort, setSort] = useState("latest"); // latest | title
  const [view, setView] = useState("grid"); // grid | list
  const [selected, setSelected] = useState(null);

  // calendar tab ui (simple)
  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  // create tab ui
  const [form, setForm] = useState({
    title: "",
    location: "Seoul",
    description: "",
    tags: "",
    date: toISODate(new Date()),
    time: "09:00",
  });
  const [creating, setCreating] = useState(false);

  // persist token
  useEffect(() => {
    if (token) localStorage.setItem(LS_TOKEN_KEY, token);
    else localStorage.removeItem(LS_TOKEN_KEY);
  }, [token]);

  // toast helper
  function showToast(text, tone = "neutral") {
    setToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const res = await fetch(`${EVENT_API}/`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("이벤트 조회 실패 (FastAPI 실행/CORS/API 주소 확인)", "warn");
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // cleanup toast timer
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const locations = useMemo(() => {
    const s = new Set();
    for (const e of events) if (e?.location) s.add(e.location);
    return ["all", ...Array.from(s)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = events.filter((e) => {
      const okLoc = loc === "all" ? true : (e.location || "") === loc;
      const blob = `${e.title || ""} ${e.location || ""} ${e.description || ""} ${(e.tags || []).join(" ")}`.toLowerCase();
      const okQ = query ? blob.includes(query) : true;
      return okLoc && okQ;
    });

    if (sort === "title") {
      out = out.slice().sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    } else {
      // "latest" — no createdAt in contract, so keep backend order
      out = out.slice();
    }
    return out;
  }, [events, q, loc, sort]);

  // Calendar: simple month grid (no event date in API). We'll map by user-selected form date if description includes date markers? Not reliable.
  // So: calendar shows month grid and "Selected day" panel shows all events (or filtered by query) as a “Quick list”.
  // If you later add date/time fields to API, we can truly filter per day.
  const monthMeta = useMemo(() => buildMonth(calCursor), [calCursor]);

  // derived: events list for right panel in calendar
  const calendarList = useMemo(() => {
    // keep it simple: show filteredEvents (respecting q/loc/sort) as "items you can plan on this day"
    // optionally: if user enters "[YYYY-MM-DD]" in description/title, we could match, but we avoid assumptions.
    return filteredEvents;
  }, [filteredEvents]);

  async function handleCreate() {
    if (!token) return showToast("로그인 후 이용 가능해요.", "warn");
    if (!form.title.trim()) return showToast("제목을 입력해주세요.", "warn");
    if (!form.location.trim()) return showToast("장소를 입력해주세요.", "warn");

    setCreating(true);
    try {
      const tagsArr = form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // include date/time in description (since API doesn't have date/time fields)
      const stampedDesc = stampDateTimeToDescription(form.description, form.date, form.time);

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
          description: stampedDesc,
          tags: tagsArr,
          location: form.location.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

      showToast(data.message || "이벤트가 추가됐어요 ✅", "good");
      setForm((p) => ({ ...p, title: "", description: "", tags: "" }));
      setTab("events");
      await loadEvents();
    } catch (e) {
      showToast(`이벤트 생성 실패: ${e.message} (토큰/서버 확인)`, "warn");
    } finally {
      setCreating(false);
    }
  }

  function logout() {
    setToken("");
    showToast("로그아웃 됐어요.", "neutral");
  }

  return (
    <div className="min-h-screen bg-[#fff7f2] text-slate-900">
      <BgWarm />

      {/* App Bar */}
      <header className="sticky top-0 z-30 border-b border-orange-100/60 bg-white/75 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-lg">📒</div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">Planner</h1>
                <p className="mt-0.5 text-sm text-slate-500">일정과 이벤트를 따뜻하게 정리해요</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={token ? "good" : "neutral"}>{token ? "로그인됨" : "게스트"}</Pill>
              <button
                onClick={loadEvents}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-orange-100 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              >
                ⟳ 새로고침
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { id: "events", label: "Events", hint: `${events.length}` },
                { id: "calendar", label: "Calendar", hint: "월" },
                { id: "create", label: "Create", hint: token ? "가능" : "잠김" },
                { id: "account", label: "Account", hint: token ? "ON" : "OFF" },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-orange-50 px-3 py-1 ring-1 ring-orange-100">
                API: <code className="font-semibold">{API_BASE}</code>
              </span>
              <span className="rounded-full bg-orange-50 px-3 py-1 ring-1 ring-orange-100">
                결과 <b className="text-slate-700">{filteredEvents.length}</b> / {events.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* EVENTS */}
        {tab === "events" && (
          <section className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-orange-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">이벤트</h2>
                <p className="mt-1 text-sm text-slate-500">검색/필터로 원하는 이벤트를 빠르게 찾으세요.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
              <Select
                label="장소"
                value={loc}
                onChange={setLoc}
                options={locations.map((x) => ({ value: x, label: x === "all" ? "전체" : x }))}
              />
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
              {loadingEvents ? (
                <SkeletonGrid view={view} />
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  icon="🧺"
                  title="검색 결과가 없어요"
                  desc="검색어를 바꾸거나, 장소 필터를 ‘전체’로 변경해보세요."
                />
              ) : view === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredEvents.map((e) => (
                    <EventCard key={e.id || e._id} e={e} onOpen={() => setSelected(e)} />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-orange-100/60 rounded-3xl bg-white ring-1 ring-orange-100">
                  {filteredEvents.map((e) => (
                    <EventRow key={e.id || e._id} e={e} onOpen={() => setSelected(e)} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <section className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-orange-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">캘린더</h2>
                <p className="mt-1 text-sm text-slate-500">
                  월 달력을 보고 날짜를 선택하세요. (현재 API에 날짜 필드가 없어 오른쪽은 “추천 리스트”로 표시돼요)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="rounded-2xl bg-white px-3 py-2 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50"
                >
                  ←
                </button>
                <div className="rounded-2xl bg-orange-50 px-4 py-2 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100">
                  {monthLabel(calCursor)}
                </div>
                <button
                  onClick={() => setCalCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="rounded-2xl bg-white px-3 py-2 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50"
                >
                  →
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
              {/* Month grid */}
              <div className="rounded-3xl bg-white p-4 ring-1 ring-orange-100">
                <div className="grid grid-cols-7 gap-2 text-xs font-extrabold text-slate-500">
                  {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                    <div key={d} className="px-2 py-1">{d}</div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {monthMeta.cells.map((c, idx) => {
                    const isToday = isSameDay(c.date, new Date());
                    const isSelected = isSameDay(c.date, selectedDate);
                    const inMonth = c.inMonth;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(c.date)}
                        className={[
                          "rounded-2xl p-2 text-left transition ring-1",
                          inMonth ? "bg-white" : "bg-slate-50/70",
                          isSelected ? "ring-orange-300 bg-orange-50" : "ring-orange-100 hover:bg-orange-50/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <div className={["text-sm font-extrabold", inMonth ? "text-slate-900" : "text-slate-400"].join(" ")}>
                            {c.date.getDate()}
                          </div>
                          {isToday && (
                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                              오늘
                            </span>
                          )}
                        </div>

                        <div className="mt-2 h-6">
                          {/* subtle dot to hint "something" */}
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                            <span>{inMonth ? "Plan" : ""}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected day panel */}
              <div className="rounded-3xl bg-white p-4 ring-1 ring-orange-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatKoreanDate(selectedDate)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      아래 리스트에서 선택한 날에 “할 이벤트”를 골라보세요.
                    </div>
                  </div>
                  <button
                    onClick={() => setTab("create")}
                    className="rounded-2xl bg-orange-500 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-orange-600"
                  >
                    추가 →
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {loadingEvents ? (
                    <div className="space-y-2">
                      <div className="h-10 animate-pulse rounded-2xl bg-orange-50" />
                      <div className="h-10 animate-pulse rounded-2xl bg-orange-50" />
                      <div className="h-10 animate-pulse rounded-2xl bg-orange-50" />
                    </div>
                  ) : calendarList.length === 0 ? (
                    <EmptyState icon="🧺" title="표시할 이벤트가 없어요" desc="Events 탭에서 이벤트를 먼저 만들어보세요." />
                  ) : (
                    calendarList.slice(0, 8).map((e) => (
                      <button
                        key={e.id || e._id}
                        onClick={() => setSelected(e)}
                        className="w-full rounded-2xl bg-white px-3 py-3 text-left ring-1 ring-orange-100 hover:bg-orange-50/40"
                      >
                        <div className="truncate text-sm font-extrabold">{e.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{e.location || "미지정"}</div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-xs text-slate-600 ring-1 ring-orange-100">
                  <div className="font-extrabold text-slate-700">TIP</div>
                  <div className="mt-1">
                    지금은 API에 날짜/시간 필드가 없어서, Create에서 입력한 날짜/시간을 설명에 함께 저장해요.
                    나중에 백엔드에 date/time 필드를 추가하면 진짜 “날짜별 필터”로 업그레이드할 수 있어요.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CREATE */}
        {tab === "create" && (
          <div className="grid gap-6 lg:grid-cols-[520px_1fr]">
            <WarmCard>
              <CardTop
                title="이벤트 추가"
                desc="제목/장소/설명/태그/날짜/시간을 입력하고 저장하세요."
                right={<Pill tone={token ? "good" : "warn"}>{token ? "OK" : "LOGIN"}</Pill>}
              />

              <div className="space-y-3">
                <Input label="제목" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="예: 동네 러닝 모임" />
                <Input label="장소" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="Seoul" left="📍" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="날짜"
                    type="date"
                    value={form.date}
                    onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                    placeholder=""
                  />
                  <Input
                    label="시간"
                    type="time"
                    value={form.time}
                    onChange={(v) => setForm((p) => ({ ...p, time: v }))}
                    placeholder=""
                  />
                </div>

                <label className="block">
                  <div className="mb-1 text-xs font-extrabold text-slate-700">설명</div>
                  <textarea
                    className="w-full min-h-[120px] resize-none rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-orange-100 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="어떤 이벤트인가요?"
                  />
                </label>

                <Input
                  label="태그(쉼표로 구분)"
                  value={form.tags}
                  onChange={(v) => setForm((p) => ({ ...p, tags: v }))}
                  placeholder="러닝,모임"
                  left="#"
                />

                <div className="flex items-center gap-2 pt-2">
                  <PrimaryButton onClick={handleCreate} disabled={!token || creating}>
                    {creating ? "저장 중..." : "저장하기"}
                  </PrimaryButton>
                  {!token && <span className="text-xs font-semibold text-amber-700">로그인 후 이용 가능</span>}
                  <button
                    onClick={() => setTab("events")}
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
                <li className="flex gap-2"><span>•</span><span>제목은 짧고 명확하게 (예: “토요일 아침 러닝”)</span></li>
                <li className="flex gap-2"><span>•</span><span>장소는 “Seoul / Gangnam”처럼 일관되게</span></li>
                <li className="flex gap-2"><span>•</span><span>태그는 2~4개 정도가 가장 좋아요</span></li>
              </ul>

              <div className="mt-6 rounded-3xl bg-white p-4 ring-1 ring-orange-100">
                <div className="text-sm font-extrabold">API 상태</div>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div>EVENT_API: <code className="font-semibold">{EVENT_API}</code></div>
                  <div>USER_API: <code className="font-semibold">{USER_API}</code></div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ACCOUNT */}
        {tab === "account" && (
          <div className="grid gap-6 lg:grid-cols-[520px_1fr]">
            <WarmCard>
              <CardTop
                title="계정"
                desc="가입/로그인 후 이벤트를 만들 수 있어요."
                right={<Pill tone={token ? "good" : "neutral"}>{token ? "ON" : "OFF"}</Pill>}
              />

              <AuthBox
                onToken={(t) => {
                  setToken(t);
                  showToast("로그인 성공 ✅", "good");
                }}
                onMsg={(t, tone) => showToast(t, tone)}
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={logout}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50 disabled:opacity-50"
                  disabled={!token}
                >
                  로그아웃
                </button>

                <CopyToken token={token} onToast={showToast} />
              </div>
            </WarmCard>

            <section className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-orange-100">
              <h3 className="text-base font-extrabold">보안 안내</h3>
              <p className="mt-2 text-sm text-slate-600">
                토큰은 비밀번호처럼 취급하세요. 화면 공유/캡처에 노출되지 않게 주의해요.
              </p>

              <div className="mt-5 rounded-3xl bg-white p-4 ring-1 ring-orange-100">
                <div className="text-sm font-extrabold">현재 상태</div>
                <div className="mt-1 text-sm text-slate-600">{token ? "로그인 상태입니다." : "게스트 상태입니다."}</div>
              </div>

              <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-xs text-slate-600 ring-1 ring-orange-100">
                <div className="font-extrabold text-slate-700">TIP</div>
                <div className="mt-1">토큰은 localStorage에 저장되어 새로고침 후에도 유지돼요.</div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Detail Modal */}
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

          <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">
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

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setSelected(null)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 ring-1 ring-orange-100 hover:bg-orange-50"
            >
              닫기
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** ---------- Background ---------- */
function BgWarm() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />
    </div>
  );
}

/** ---------- Layout / UI ---------- */
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

function Tabs({ value, onChange, items }) {
  return (
    <div className="inline-flex rounded-2xl bg-orange-50 p-1 ring-1 ring-orange-100">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={[
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold transition",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/60",
            ].join(" ")}
          >
            {it.label}
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1",
                active ? "bg-orange-50 text-slate-700 ring-orange-100" : "bg-white/70 text-slate-500 ring-orange-100",
              ].join(" ")}
            >
              {it.hint}
            </span>
          </button>
        );
      })}
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
        <button
          onClick={onClose}
          className="rounded-2xl px-2 py-1 text-sm font-bold opacity-70 hover:bg-white/60 hover:opacity-100"
          title="닫기"
        >
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

/** ---------- Events UI ---------- */
function EventCard({ e, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-orange-100 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">{e.title}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-orange-100">
            <span>📍</span>
            <span className="truncate">{e.location || "미지정"}</span>
          </div>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-orange-100">
          보기
        </span>
      </div>

      {e.description && (
        <p className="mt-3 line-clamp-3 text-sm text-slate-600 whitespace-pre-wrap">{e.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">id: {e.id || e._id}</span>
        <span className="text-xs font-extrabold text-orange-600 opacity-0 transition group-hover:opacity-100">
          상세 →
        </span>
      </div>
    </button>
  );
}

function EventRow({ e, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-orange-50/40"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold">{e.title}</div>
        <div className="mt-1 text-xs text-slate-500">{e.location || "미지정"}</div>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-orange-100">
        보기
      </span>
    </button>
  );
}

/** ---------- Inputs ---------- */
function Input({ label, value, onChange, placeholder, type = "text", left }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-extrabold text-slate-700">{label}</div>
      <div className="relative">
        {left && <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">{left}</div>}
        <input
          className={[
            "w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-orange-100 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200",
            left ? "pl-9" : "",
          ].join(" ")}
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
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** ---------- Buttons ---------- */
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

/** ---------- Modal (Esc close) ---------- */
function Modal({ children, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl ring-1 ring-orange-100">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl px-2 py-1 text-sm font-bold text-slate-600 hover:bg-orange-50"
            title="닫기"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** ---------- Auth (signup/signin) ---------- */
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

      <div className="text-xs text-slate-500">
        * 토큰은 자동으로 저장되어 새로고침해도 유지돼요.
      </div>
    </div>
  );
}

/** ---------- Token copy ---------- */
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
    <button
      onClick={copy}
      className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      disabled={!token}
    >
      {copied ? "복사됨!" : "토큰 복사"}
    </button>
  );
}

/** ---------- Date helpers ---------- */
function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatKoreanDate(d) {
  const yyyy = d.getFullYear();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${yyyy}.${mm}.${dd} (${dow})`;
}

function monthLabel(d) {
  const yyyy = d.getFullYear();
  const mm = d.getMonth() + 1;
  return `${yyyy}년 ${mm}월`;
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonth(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const startDow = first.getDay(); // 0..6
  const start = new Date(year, month, 1 - startDow);

  const totalCells = 42; // 6 weeks
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const inMonth = date.getMonth() === month;
    cells.push({ date, inMonth });
  }

  return {
    first,
    last,
    cells,
  };
}

// Since API lacks date/time, we stamp into description (non-destructive)
function stampDateTimeToDescription(desc, date, time) {
  const stamp = `🗓 ${date} ${time}`;
  const text = (desc || "").trim();
  // avoid duplicating stamp if user already has it
  if (text.includes("🗓") && text.includes(date)) return text;
  return text ? `${stamp}\n\n${text}` : stamp;
}
