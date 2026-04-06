"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "gym_v3";

const DEFAULT_ROUTINES = [
  { id: 1, name: "Pierna 1", type: "gym", exercises: [], plan: {} },
  { id: 2, name: "Pierna 2", type: "gym", exercises: [], plan: {} },
  { id: 3, name: "Pierna 3", type: "gym", exercises: [], plan: {} },
  { id: 4, name: "Superior", type: "gym", exercises: [], plan: {} },
  { id: 5, name: "Running", type: "running", exercises: [], plan: {} },
];

const BASE_NAMES = ["Pierna 1", "Pierna 2", "Pierna 3", "Superior", "Running"];

export default function Page() {
  const [loaded, setLoaded] = useState(false);
  const [routines, setRoutines] = useState(DEFAULT_ROUTINES);
  const [selectedRoutineId, setSelectedRoutineId] = useState(1);
  const [history, setHistory] = useState([]);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [exerciseData, setExerciseData] = useState({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [runningData, setRunningData] = useState({ km: "", time: "", pace: "", feelings: "" });
  const [activeTab, setActiveTab] = useState("entreno");
  const [planLoaded, setPlanLoaded] = useState(false);
  const [skippedExercises, setSkippedExercises] = useState(new Set());
  const [extraExercises, setExtraExercises] = useState([]);
  const [newExtraName, setNewExtraName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRoutines(
          (parsed.routines || DEFAULT_ROUTINES).map((r) => ({
            plan: {},
            ...r,
            exercises: (r.exercises || []).map((e) => ({ ...e })),
          }))
        );
        setHistory(parsed.history || []);
        setSelectedRoutineId(parsed.selectedRoutineId || 1);
      } catch (e) {
        console.error("Error cargando datos", e);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ routines, history, selectedRoutineId }));
  }, [loaded, routines, history, selectedRoutineId]);

  const selectedRoutine = useMemo(
    () => routines.find((r) => r.id === selectedRoutineId) || routines[0],
    [routines, selectedRoutineId]
  );

  const selectRoutine = (id) => {
    setSelectedRoutineId(id);
    setExerciseData({});
    setSessionNotes("");
    setPlanLoaded(false);
    setSkippedExercises(new Set());
    setExtraExercises([]);
    setNewExtraName("");
    setActiveTab("entreno");
  };

  const createRoutine = (type) => {
    if (!newRoutineName.trim()) return;
    const r = { id: Date.now(), name: newRoutineName.trim(), type, exercises: [], plan: {} };
    setRoutines((prev) => [...prev, r]);
    selectRoutine(r.id);
    setNewRoutineName("");
  };

  const deleteRoutine = (id) => {
    const r = routines.find((x) => x.id === id);
    if (!r || BASE_NAMES.includes(r.name)) return;
    const next = routines.filter((x) => x.id !== id);
    setRoutines(next);
    if (selectedRoutineId === id) selectRoutine(next[0]?.id || 1);
  };

  const addExercise = () => {
    if (!newExerciseName.trim() || !selectedRoutine || selectedRoutine.type !== "gym") return;
    const ex = { id: Date.now(), name: newExerciseName.trim() };
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === selectedRoutine.id ? { ...r, exercises: [...r.exercises, ex] } : r
      )
    );
    setNewExerciseName("");
  };

  const deleteExercise = (exId) => {
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === selectedRoutine.id
          ? { ...r, exercises: r.exercises.filter((e) => e.id !== exId) }
          : r
      )
    );
    setExerciseData((prev) => {
      const copy = { ...prev };
      delete copy[exId];
      return copy;
    });
  };

  const moveExercise = (exId, direction) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoutine.id) return r;
        const exs = [...r.exercises];
        const idx = exs.findIndex((e) => e.id === exId);
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= exs.length) return r;
        [exs[idx], exs[newIdx]] = [exs[newIdx], exs[idx]];
        return { ...r, exercises: exs };
      })
    );
  };

  // ── Plan helpers ──────────────────────────────────────────────

  const getPlanEx = (exId) =>
    (selectedRoutine?.plan || {})[exId] || { sets: [{ reps: "", weight: "", note: "" }], rest: "", notes: "" };

  const updatePlanField = (exId, field, value) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoutine.id) return r;
        const plan = { ...r.plan };
        plan[exId] = { ...getPlanEx(exId), [field]: value };
        return { ...r, plan };
      })
    );
  };

  const updatePlanSet = (exId, setIndex, field, value) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoutine.id) return r;
        const ep = getPlanEx(exId);
        const sets = ep.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
        return { ...r, plan: { ...r.plan, [exId]: { ...ep, sets } } };
      })
    );
  };

  const addPlanSet = (exId) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoutine.id) return r;
        const ep = getPlanEx(exId);
        return { ...r, plan: { ...r.plan, [exId]: { ...ep, sets: [...ep.sets, { reps: "", weight: "", note: "" }] } } };
      })
    );
  };

  const removePlanSet = (exId) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id !== selectedRoutine.id) return r;
        const ep = getPlanEx(exId);
        if (ep.sets.length <= 1) return r;
        return { ...r, plan: { ...r.plan, [exId]: { ...ep, sets: ep.sets.slice(0, -1) } } };
      })
    );
  };

  // ── Entreno helpers ───────────────────────────────────────────

  const loadPlan = () => {
    if (!selectedRoutine) return;
    const data = {};
    selectedRoutine.exercises.forEach((ex) => {
      const ep = (selectedRoutine.plan || {})[ex.id];
      if (ep) {
        data[ex.id] = {
          sets: ep.sets ? ep.sets.map((s) => ({ ...s })) : [{ reps: "", weight: "", note: "" }],
          rest: ep.rest || "",
          notes: ep.notes || "",
        };
      }
    });
    setExerciseData(data);
    setPlanLoaded(true);
  };

  const updateExSet = (exId, setIndex, field, value) => {
    setExerciseData((prev) => {
      const ex = prev[exId] || { sets: [{ reps: "", weight: "", note: "" }], rest: "", notes: "" };
      const sets = ex.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
      return { ...prev, [exId]: { ...ex, sets } };
    });
  };

  const updateExField = (exId, field, value) => {
    setExerciseData((prev) => {
      const ex = prev[exId] || { sets: [{ reps: "", weight: "", note: "" }], rest: "", notes: "" };
      return { ...prev, [exId]: { ...ex, [field]: value } };
    });
  };

  const addExSet = (exId) => {
    setExerciseData((prev) => {
      const ex = prev[exId] || { sets: [{ reps: "", weight: "", note: "" }], rest: "", notes: "" };
      return { ...prev, [exId]: { ...ex, sets: [...ex.sets, { reps: "", weight: "", note: "" }] } };
    });
  };

  const removeExSet = (exId) => {
    setExerciseData((prev) => {
      const ex = prev[exId] || { sets: [{ reps: "", weight: "", note: "" }], rest: "", notes: "" };
      if (ex.sets.length <= 1) return prev;
      return { ...prev, [exId]: { ...ex, sets: ex.sets.slice(0, -1) } };
    });
  };

  const getDisplayedSets = (exId) => {
    const sets = exerciseData[exId]?.sets || [];
    return sets.length > 0 ? sets : [{ reps: "", weight: "", note: "" }];
  };

  const getLastSession = (exId) => {
    for (const s of history) {
      if (s.type !== "gym") continue;
      const f = s.exercises.find((e) => e.exerciseId === exId);
      if (f) return f;
    }
    return null;
  };

  const formatLast = (exId) => {
    const last = getLastSession(exId);
    if (!last || !last.sets || last.sets.length === 0) return "Todavía no hay pesos guardados";
    return last.sets
      .map((s, i) => `S${i + 1} ${s.reps || "-"} reps / ${s.weight || "-"} kg${s.note ? ` (${s.note})` : ""}`)
      .join(" · ");
  };

  const toggleSkip = (exId) => {
    setSkippedExercises((prev) => {
      const next = new Set(prev);
      next.has(exId) ? next.delete(exId) : next.add(exId);
      return next;
    });
  };

  const addExtraExercise = () => {
    if (!newExtraName.trim()) return;
    const ex = { id: `extra_${Date.now()}`, name: newExtraName.trim(), isExtra: true };
    setExtraExercises((prev) => [...prev, ex]);
    setNewExtraName("");
  };

  const removeExtraExercise = (exId) => {
    setExtraExercises((prev) => prev.filter((e) => e.id !== exId));
    setExerciseData((prev) => {
      const copy = { ...prev };
      delete copy[exId];
      return copy;
    });
  };

  const saveGymSession = () => {
    if (!selectedRoutine || selectedRoutine.type !== "gym") return;
    const activeExercises = selectedRoutine.exercises.filter((ex) => !skippedExercises.has(ex.id));
    const allExercises = [...activeExercises, ...extraExercises];
    const session = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-ES"),
      routine: selectedRoutine.name,
      type: "gym",
      notes: sessionNotes,
      exercises: allExercises.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        isExtra: ex.isExtra || false,
        sets: exerciseData[ex.id]?.sets || [],
        rest: exerciseData[ex.id]?.rest || "",
        notes: exerciseData[ex.id]?.notes || "",
      })),
    };
    setHistory((prev) => [session, ...prev]);
    setExerciseData({});
    setSessionNotes("");
    setPlanLoaded(false);
    setSkippedExercises(new Set());
    setExtraExercises([]);
    setNewExtraName("");
    alert("Entrenamiento guardado");
  };

  const saveRunningSession = () => {
    if (!runningData.km && !runningData.time && !runningData.pace && !runningData.feelings) return;
    const session = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-ES"),
      routine: selectedRoutine?.name || "Running",
      type: "running",
      ...runningData,
    };
    setHistory((prev) => [session, ...prev]);
    setRunningData({ km: "", time: "", pace: "", feelings: "" });
    alert("Running guardado");
  };

  const resetAll = () => {
    if (!window.confirm("¿Seguro que quieres borrar todo?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setRoutines(DEFAULT_ROUTINES.map((r) => ({ ...r, plan: {}, exercises: [] })));
    setHistory([]);
    setSelectedRoutineId(1);
    setExerciseData({});
    setSessionNotes("");
    setRunningData({ km: "", time: "", pace: "", feelings: "" });
    setPlanLoaded(false);
    setSkippedExercises(new Set());
    setExtraExercises([]);
    setNewExtraName("");
  };

  const exportData = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entrenos.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.routines || !parsed.history) { alert("Archivo no válido"); return; }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        alert("Datos importados correctamente. Recarga la página.");
        window.location.reload();
      } catch {
        alert("Error leyendo el archivo");
      }
    };
    reader.readAsText(file);
  };

  if (!loaded) {
    return (
      <main style={s.page}>
        <div style={s.container}>Cargando...</div>
      </main>
    );
  }

  const hasPlan =
    selectedRoutine?.type === "gym" &&
    selectedRoutine.exercises.some((ex) => {
      const ep = (selectedRoutine.plan || {})[ex.id];
      return ep && ep.sets && ep.sets.some((set) => set.reps || set.weight);
    });

  return (
    <main style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <p style={s.kicker}>Tu app de entrenos</p>
            <h1 style={s.title}>Gym & Running</h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={s.resetButton} onClick={resetAll}>Reset</button>
            <button style={s.secondaryButton} onClick={exportData}>Descargar datos</button>
            <label style={{ ...s.secondaryButton, cursor: "pointer" }}>
              Importar
              <input type="file" accept="application/json" onChange={importData} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {/* Rutinas */}
        <section style={s.card}>
          <h2 style={s.sectionTitle}>Rutinas</h2>
          <div style={s.routineGrid}>
            {routines.map((r) => (
              <div key={r.id} style={s.routineWrap}>
                <button
                  onClick={() => selectRoutine(r.id)}
                  style={{ ...s.routineButton, ...(selectedRoutineId === r.id ? s.routineButtonActive : {}) }}
                >
                  {r.name}
                </button>
                {!BASE_NAMES.includes(r.name) && (
                  <button onClick={() => deleteRoutine(r.id)} style={s.smallDeleteButton}>×</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <input
              style={s.input}
              placeholder="Nueva rutina"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
            />
            <div style={s.inlineButtons}>
              <button style={s.secondaryButton} onClick={() => createRoutine("gym")}>Crear gym</button>
              <button style={s.secondaryButton} onClick={() => createRoutine("running")}>Crear running</button>
            </div>
          </div>
        </section>

        {/* Sección principal */}
        {selectedRoutine && (
          <section style={s.card}>
            <h2 style={s.sectionTitle}>{selectedRoutine.name}</h2>

            {selectedRoutine.type === "running" ? (
              <>
                <input style={s.input} placeholder="Km" value={runningData.km}
                  onChange={(e) => setRunningData((p) => ({ ...p, km: e.target.value }))} />
                <div style={s.twoCols}>
                  <input style={s.input} placeholder="Tiempo" value={runningData.time}
                    onChange={(e) => setRunningData((p) => ({ ...p, time: e.target.value }))} />
                  <input style={s.input} placeholder="Ritmo" value={runningData.pace}
                    onChange={(e) => setRunningData((p) => ({ ...p, pace: e.target.value }))} />
                </div>
                <textarea style={s.textarea} placeholder="Sensaciones" value={runningData.feelings}
                  onChange={(e) => setRunningData((p) => ({ ...p, feelings: e.target.value }))} />
                <button style={s.primaryButton} onClick={saveRunningSession}>Guardar running</button>
              </>
            ) : (
              <>
                {/* Tab bar */}
                <div style={s.tabBar}>
                  {["plan", "ejercicios", "entreno"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* ── Pestaña: Planificar ── */}
                {activeTab === "plan" && (
                  <>
                    <p style={s.hint}>
                      Define el plan ideal para esta rutina. Al entrenar puedes cargarlo con un botón y modificar lo que necesites.
                    </p>
                    {selectedRoutine.exercises.length === 0 ? (
                      <p style={s.emptyText}>Añade ejercicios en la pestaña Ejercicios primero.</p>
                    ) : (
                      selectedRoutine.exercises.map((ex) => {
                        const ep = getPlanEx(ex.id);
                        const sets = ep.sets && ep.sets.length > 0 ? ep.sets : [{ reps: "", weight: "", note: "" }];
                        return (
                          <div key={ex.id} style={s.planCard}>
                            <strong>{ex.name}</strong>
                            <div style={{ marginTop: 10 }}>
                              {sets.map((set, i) => (
                                <div key={i} style={s.planSetCard}>
                                  <div style={s.planSetTitle}>Serie {i + 1} (objetivo)</div>
                                  <div style={s.twoCols}>
                                    <input style={s.input} placeholder="Reps objetivo" value={set.reps || ""}
                                      onChange={(e) => updatePlanSet(ex.id, i, "reps", e.target.value)} />
                                    <input style={s.input} placeholder="Peso objetivo (kg)" value={set.weight || ""}
                                      onChange={(e) => updatePlanSet(ex.id, i, "weight", e.target.value)} />
                                  </div>
                                  <input style={s.input} placeholder="Nota de la serie" value={set.note || ""}
                                    onChange={(e) => updatePlanSet(ex.id, i, "note", e.target.value)} />
                                </div>
                              ))}
                            </div>
                            <div style={s.inlineButtons}>
                              <button style={s.secondaryButton} onClick={() => addPlanSet(ex.id)}>+ Serie</button>
                              <button style={s.secondaryButton} onClick={() => removePlanSet(ex.id)}>− Serie</button>
                            </div>
                            <input style={{ ...s.input, marginTop: 8 }} placeholder="Descanso objetivo"
                              value={ep.rest || ""} onChange={(e) => updatePlanField(ex.id, "rest", e.target.value)} />
                            <textarea style={s.textarea} placeholder="Notas del ejercicio"
                              value={ep.notes || ""} onChange={(e) => updatePlanField(ex.id, "notes", e.target.value)} />
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {/* ── Pestaña: Ejercicios ── */}
                {activeTab === "ejercicios" && (
                  <>
                    <input style={s.input} placeholder="Nombre del ejercicio" value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)} />
                    <button style={{ ...s.primaryButton, marginBottom: 12 }} onClick={addExercise}>
                      Añadir ejercicio
                    </button>
                    {selectedRoutine.exercises.length === 0 ? (
                      <p style={s.emptyText}>Todavía no hay ejercicios.</p>
                    ) : (
                      selectedRoutine.exercises.map((ex, idx) => (
                        <div key={ex.id} style={s.exerciseRow}>
                          <strong style={{ flex: 1 }}>{ex.name}</strong>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              style={s.moveButton}
                              onClick={() => moveExercise(ex.id, -1)}
                              disabled={idx === 0}
                            >↑</button>
                            <button
                              style={s.moveButton}
                              onClick={() => moveExercise(ex.id, 1)}
                              disabled={idx === selectedRoutine.exercises.length - 1}
                            >↓</button>
                            <button style={s.deleteButton} onClick={() => deleteExercise(ex.id)}>Borrar</button>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* ── Pestaña: Entreno ── */}
                {activeTab === "entreno" && (
                  <>
                    {selectedRoutine.exercises.length === 0 ? (
                      <p style={s.emptyText}>Añade ejercicios en la pestaña Ejercicios.</p>
                    ) : (
                      <>
                        {hasPlan && !planLoaded && (
                          <div style={s.planBanner}>
                            <span style={{ fontSize: 14, color: "#1a5fa8" }}>Hay un plan para esta rutina</span>
                            <button style={s.loadPlanButton} onClick={loadPlan}>Cargar plan</button>
                          </div>
                        )}

                        {selectedRoutine.exercises.map((ex) => {
                          const isSkipped = skippedExercises.has(ex.id);
                          const sets = getDisplayedSets(ex.id);
                          const ep = (selectedRoutine.plan || {})[ex.id];
                          const hasPlanEx = ep && ep.sets && ep.sets.some((ps) => ps.reps || ps.weight);
                          return (
                            <div key={ex.id} style={{ ...s.logCard, ...(isSkipped ? s.logCardSkipped : {}) }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <strong style={{ color: isSkipped ? "#aaa" : "#111", textDecoration: isSkipped ? "line-through" : "none" }}>{ex.name}</strong>
                                  {hasPlanEx && !isSkipped && <span style={s.planBadge}>con plan</span>}
                                  {isSkipped && <span style={s.skipBadge}>saltado</span>}
                                </div>
                                <button
                                  style={isSkipped ? s.unskipButton : s.skipButton}
                                  onClick={() => toggleSkip(ex.id)}
                                >
                                  {isSkipped ? "Recuperar" : "Saltar"}
                                </button>
                              </div>

                              {!isSkipped && (
                                <>
                                  <div style={s.exerciseMeta}>Última vez: {formatLast(ex.id)}</div>
                                  <div style={{ marginTop: 10 }}>
                                    {sets.map((set, i) => {
                                      const ps = ep?.sets?.[i] || null;
                                      const isModified =
                                        ps &&
                                        ((ps.reps && set.reps && set.reps !== ps.reps) ||
                                          (ps.weight && set.weight && set.weight !== ps.weight));
                                      return (
                                        <div key={i} style={s.setCard}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                            <span style={s.setTitle}>Serie {i + 1}</span>
                                            {ps && (ps.reps || ps.weight) && (
                                              <span style={s.setMeta}>objetivo: {ps.reps || "-"} reps / {ps.weight || "-"} kg</span>
                                            )}
                                            {isModified && <span style={s.modBadge}>modificado</span>}
                                          </div>
                                          <div style={s.twoCols}>
                                            <input style={s.input} placeholder="Reps" value={set.reps || ""}
                                              onChange={(e) => updateExSet(ex.id, i, "reps", e.target.value)} />
                                            <input style={s.input} placeholder="Peso" value={set.weight || ""}
                                              onChange={(e) => updateExSet(ex.id, i, "weight", e.target.value)} />
                                          </div>
                                          <input style={s.input} placeholder="Nota de esta serie" value={set.note || ""}
                                            onChange={(e) => updateExSet(ex.id, i, "note", e.target.value)} />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div style={s.inlineButtons}>
                                    <button style={s.secondaryButton} onClick={() => addExSet(ex.id)}>+ Añadir serie</button>
                                    <button style={s.secondaryButton} onClick={() => removeExSet(ex.id)}>− Quitar serie</button>
                                  </div>
                                  <input style={{ ...s.input, marginTop: 8 }} placeholder="Descanso"
                                    value={exerciseData[ex.id]?.rest || ""}
                                    onChange={(e) => updateExField(ex.id, "rest", e.target.value)} />
                                  <textarea style={s.textarea} placeholder="Notas generales del ejercicio"
                                    value={exerciseData[ex.id]?.notes || ""}
                                    onChange={(e) => updateExField(ex.id, "notes", e.target.value)} />
                                </>
                              )}
                            </div>
                          );
                        })}

                        {/* Ejercicios extra */}
                        {extraExercises.map((ex) => (
                          <div key={ex.id} style={s.logCardExtra}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong>{ex.name}</strong>
                                <span style={s.extraBadge}>extra</span>
                              </div>
                              <button style={s.skipButton} onClick={() => removeExtraExercise(ex.id)}>Quitar</button>
                            </div>
                            <div style={s.exerciseMeta}>Última vez: {formatLast(ex.id)}</div>
                            <div style={{ marginTop: 10 }}>
                              {getDisplayedSets(ex.id).map((set, i) => (
                                <div key={i} style={s.setCard}>
                                  <div style={{ marginBottom: 6 }}><span style={s.setTitle}>Serie {i + 1}</span></div>
                                  <div style={s.twoCols}>
                                    <input style={s.input} placeholder="Reps" value={set.reps || ""}
                                      onChange={(e) => updateExSet(ex.id, i, "reps", e.target.value)} />
                                    <input style={s.input} placeholder="Peso" value={set.weight || ""}
                                      onChange={(e) => updateExSet(ex.id, i, "weight", e.target.value)} />
                                  </div>
                                  <input style={s.input} placeholder="Nota de esta serie" value={set.note || ""}
                                    onChange={(e) => updateExSet(ex.id, i, "note", e.target.value)} />
                                </div>
                              ))}
                            </div>
                            <div style={s.inlineButtons}>
                              <button style={s.secondaryButton} onClick={() => addExSet(ex.id)}>+ Añadir serie</button>
                              <button style={s.secondaryButton} onClick={() => removeExSet(ex.id)}>− Quitar serie</button>
                            </div>
                            <input style={{ ...s.input, marginTop: 8 }} placeholder="Descanso"
                              value={exerciseData[ex.id]?.rest || ""}
                              onChange={(e) => updateExField(ex.id, "rest", e.target.value)} />
                            <textarea style={s.textarea} placeholder="Notas generales del ejercicio"
                              value={exerciseData[ex.id]?.notes || ""}
                              onChange={(e) => updateExField(ex.id, "notes", e.target.value)} />
                          </div>
                        ))}

                        {/* Añadir ejercicio extra */}
                        <div style={s.extraBox}>
                          <p style={s.extraTitle}>Añadir ejercicio extra (solo hoy)</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              style={{ ...s.input, marginBottom: 0, flex: 1 }}
                              placeholder="Nombre del ejercicio"
                              value={newExtraName}
                              onChange={(e) => setNewExtraName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && addExtraExercise()}
                            />
                            <button style={s.addExtraButton} onClick={addExtraExercise}>Añadir</button>
                          </div>
                        </div>

                        <textarea style={{ ...s.textarea, marginTop: 12 }} placeholder="Notas generales del entreno"
                          value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} />
                        <button style={s.primaryButton} onClick={saveGymSession}>Guardar entrenamiento</button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* Historial */}
        <section style={s.card}>
          <h2 style={s.sectionTitle}>Historial</h2>
          {history.length === 0 ? (
            <p style={s.emptyText}>Todavía no has guardado nada.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} style={s.historyCard}>
                <div style={s.historyTop}>
                  <strong>{item.routine}</strong>
                  <span style={s.date}>{item.date}</span>
                </div>
                {item.type === "gym" ? (
                  <>
                    {item.exercises.map((ex, i) => (
                      <div key={i} style={s.historyLine}>
                        {ex.name}:{" "}
                        {ex.sets && ex.sets.length > 0
                          ? ex.sets.map((set, j) =>
                              `S${j + 1} ${set.reps || "-"} reps / ${set.weight || "-"} kg${set.note ? ` (${set.note})` : ""}`
                            ).join(" · ")
                          : "sin series registradas"}
                      </div>
                    ))}
                    {item.notes && <div style={s.historyNotes}>Notas: {item.notes}</div>}
                  </>
                ) : (
                  <>
                    <div style={s.historyLine}>
                      {item.km || "-"} km · {item.time || "-"} · ritmo {item.pace || "-"}
                    </div>
                    {item.feelings && <div style={s.historyNotes}>{item.feelings}</div>}
                  </>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#111", padding: 16, fontFamily: "Arial, sans-serif" },
  container: { maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, color: "#111" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  kicker: { margin: 0, color: "#aaa", fontSize: 14 },
  title: { margin: "4px 0 0 0", fontSize: 32, color: "#f9f9f9" },
  card: { background: "#ffffff", borderRadius: 20, padding: 16 },
  sectionTitle: { marginTop: 0, marginBottom: 12, fontSize: 22 },
  routineGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  routineWrap: { display: "flex", gap: 6, alignItems: "center" },
  routineButton: { flex: 1, border: "none", borderRadius: 16, padding: "12px 10px", background: "#efefef", fontWeight: 700, cursor: "pointer" },
  routineButtonActive: { background: "#111", color: "white" },
  smallDeleteButton: { border: "none", borderRadius: 12, padding: "10px 12px", background: "#ffd9d9", cursor: "pointer", fontWeight: 700 },
  input: { width: "100%", padding: 14, borderRadius: 12, border: "1px solid #ddd", background: "#fafafa", fontSize: 16, marginBottom: 8 },
  textarea: { width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 80, marginBottom: 10, fontSize: 16, resize: "vertical" },
  inlineButtons: { display: "flex", gap: 8, marginBottom: 8 },
  primaryButton: { width: "100%", borderRadius: 16, padding: 14, background: "#000", color: "white", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 16 },
  secondaryButton: { flex: 1, borderRadius: 16, padding: 12, background: "#e5e5e5", fontWeight: 700, border: "none", cursor: "pointer" },
  resetButton: { border: "none", borderRadius: 14, padding: "10px 12px", background: "#ffe2e2", fontWeight: 700, cursor: "pointer" },
  twoCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  exerciseRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, border: "1px solid #eee", borderRadius: 16, marginBottom: 8, background: "#fafafa" },
  moveButton: { border: "none", borderRadius: 10, padding: "8px 11px", background: "#e5e5e5", cursor: "pointer", fontWeight: 700, fontSize: 14, lineHeight: 1 },
  deleteButton: { border: "none", borderRadius: 12, padding: "10px 12px", background: "#ffd9d9", cursor: "pointer", fontWeight: 700 },
  logCard: { borderRadius: 16, padding: 12, marginBottom: 12, background: "#fff", border: "1px solid #ddd" },
  exerciseMeta: { fontSize: 13, color: "#555", marginTop: 6, lineHeight: 1.45 },
  setCard: { border: "1px solid #ececec", borderRadius: 14, padding: 10, marginBottom: 8, background: "#fff" },
  setTitle: { fontSize: 13, fontWeight: 700, color: "#444" },
  setMeta: { fontSize: 12, color: "#666" },
  tabBar: { display: "flex", gap: 6, marginBottom: 14 },
  tab: { flex: 1, border: "none", borderRadius: 12, padding: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, background: "#efefef", color: "#555" },
  tabActive: { background: "#111", color: "#fff" },
  hint: { fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 1.5 },
  planCard: { borderRadius: 16, padding: 12, marginBottom: 12, background: "#f5f9ff", border: "1px solid #c8dff8" },
  planSetCard: { border: "1px solid #c0d8f5", borderRadius: 12, padding: 10, marginBottom: 8, background: "#edf4ff" },
  planSetTitle: { fontSize: 12, fontWeight: 700, color: "#1a5fa8", marginBottom: 6 },
  planBanner: { background: "#e8f4ff", borderRadius: 12, padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  loadPlanButton: { border: "none", borderRadius: 10, padding: "8px 14px", background: "#1a5fa8", color: "#fff", fontWeight: 700, cursor: "pointer" },
  planBadge: { display: "inline-block", fontSize: 11, background: "#e8f4ff", color: "#1a5fa8", borderRadius: 8, padding: "2px 8px", fontWeight: 700 },
  modBadge: { display: "inline-block", fontSize: 11, background: "#fff3e0", color: "#b85c00", borderRadius: 8, padding: "2px 8px", fontWeight: 700 },
  historyCard: { border: "1px solid #eee", borderRadius: 16, padding: 12, marginBottom: 10, background: "#fafafa" },
  historyTop: { display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  date: { color: "#555", fontSize: 13 },
  historyLine: { fontSize: 14, color: "#333", marginBottom: 4, lineHeight: 1.5 },
  historyNotes: { marginTop: 6, fontSize: 13, color: "#555" },
  emptyText: { color: "#666", margin: 0 },
  logCardSkipped: { opacity: 0.5, background: "#f9f9f9", borderColor: "#eee" },
  logCardExtra: { borderRadius: 16, padding: 12, marginBottom: 12, background: "#fffbf0", border: "1px solid #f0d080" },
  skipButton: { border: "none", borderRadius: 10, padding: "6px 12px", background: "#ffd9d9", color: "#a33", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  unskipButton: { border: "none", borderRadius: 10, padding: "6px 12px", background: "#d9f0d9", color: "#2a6e2a", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  skipBadge: { display: "inline-block", fontSize: 11, background: "#ffd9d9", color: "#a33", borderRadius: 8, padding: "2px 8px", fontWeight: 700 },
  extraBadge: { display: "inline-block", fontSize: 11, background: "#fff3cd", color: "#856404", borderRadius: 8, padding: "2px 8px", fontWeight: 700 },
  extraBox: { border: "1px dashed #ccc", borderRadius: 14, padding: 12, marginBottom: 8, background: "#fafafa" },
  extraTitle: { fontSize: 13, color: "#666", marginBottom: 8, fontWeight: 700 },
  addExtraButton: { border: "none", borderRadius: 12, padding: "0 16px", background: "#111", color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
};