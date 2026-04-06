"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "gym_running_app_v2";

const defaultRoutines = [
  { id: 1, name: "Pierna 1", type: "gym", exercises: [] },
  { id: 2, name: "Pierna 2", type: "gym", exercises: [] },
  { id: 3, name: "Pierna 3", type: "gym", exercises: [] },
  { id: 4, name: "Superior", type: "gym", exercises: [] },
  { id: 5, name: "Running", type: "running", exercises: [] },
];

export default function Page() {
  const [loaded, setLoaded] = useState(false);
  const [routines, setRoutines] = useState(defaultRoutines);
  const [selectedRoutineId, setSelectedRoutineId] = useState(1);
  const [history, setHistory] = useState([]);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [newGymExercise, setNewGymExercise] = useState({ name: "" });
  const [exerciseData, setExerciseData] = useState({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [runningData, setRunningData] = useState({
    km: "",
    time: "",
    pace: "",
    feelings: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRoutines(parsed.routines || defaultRoutines);
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        routines,
        history,
        selectedRoutineId,
      })
    );
  }, [loaded, routines, history, selectedRoutineId]);

  const selectedRoutine = useMemo(() => {
    return routines.find((r) => r.id === selectedRoutineId) || routines[0];
  }, [routines, selectedRoutineId]);

  const createRoutine = (type) => {
    if (!newRoutineName.trim()) return;

    const newRoutine = {
      id: Date.now(),
      name: newRoutineName.trim(),
      type,
      exercises: [],
    };

    setRoutines((prev) => [...prev, newRoutine]);
    setSelectedRoutineId(newRoutine.id);
    setNewRoutineName("");
  };

  const deleteRoutine = (routineId) => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;

    if (["Pierna 1", "Pierna 2", "Pierna 3", "Superior", "Running"].includes(routine.name)) {
      alert("No borro las rutinas base para que no se rompa la app.");
      return;
    }

    const nextRoutines = routines.filter((r) => r.id !== routineId);
    setRoutines(nextRoutines);

    if (selectedRoutineId === routineId && nextRoutines.length > 0) {
      setSelectedRoutineId(nextRoutines[0].id);
    }
  };

  const addExerciseToRoutine = () => {
    if (!newGymExercise.name.trim()) return;
    if (!selectedRoutine || selectedRoutine.type !== "gym") return;

    const exercise = {
      id: Date.now(),
      name: newGymExercise.name.trim(),
    };

    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === selectedRoutine.id
          ? { ...routine, exercises: [...routine.exercises, exercise] }
          : routine
      )
    );

    setNewGymExercise({ name: "" });
  };

  const deleteExercise = (exerciseId) => {
    if (!selectedRoutine || selectedRoutine.type !== "gym") return;

    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === selectedRoutine.id
          ? {
              ...routine,
              exercises: routine.exercises.filter((e) => e.id !== exerciseId),
            }
          : routine
      )
    );

    setExerciseData((prev) => {
      const copy = { ...prev };
      delete copy[exerciseId];
      return copy;
    });
  };

  const updateExerciseData = (exerciseId, field, value) => {
    setExerciseData((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value,
      },
    }));
  };

  const addSetToExercise = (exerciseId) => {
    const currentSets = exerciseData[exerciseId]?.sets || [];
    updateExerciseData(exerciseId, "sets", [
      ...currentSets,
      { reps: "", weight: "", note: "" },
    ]);
  };

  const removeSetFromExercise = (exerciseId) => {
    const currentSets = exerciseData[exerciseId]?.sets || [];
    if (currentSets.length <= 1) return;
    updateExerciseData(exerciseId, "sets", currentSets.slice(0, -1));
  };

  const updateSetField = (exerciseId, setIndex, field, value) => {
    const currentSets = exerciseData[exerciseId]?.sets || [{ reps: "", weight: "", note: "" }];
    const nextSets = [...currentSets];
    nextSets[setIndex] = {
      ...nextSets[setIndex],
      [field]: value,
    };
    updateExerciseData(exerciseId, "sets", nextSets);
  };

  const getDisplayedSets = (exerciseId) => {
    const savedSets = exerciseData[exerciseId]?.sets || [];
    return savedSets.length > 0 ? savedSets : [{ reps: "", weight: "", note: "" }];
  };

  const getLastExerciseSession = (exerciseId) => {
    for (const session of history) {
      if (session.type !== "gym") continue;
      const foundExercise = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
      if (foundExercise) return foundExercise;
    }
    return null;
  };

  const formatLastSession = (exerciseId) => {
    const last = getLastExerciseSession(exerciseId);
    if (!last || !last.sets || last.sets.length === 0) return "Todavía no hay pesos guardados";
    return last.sets
      .map(
        (set, setIndex) =>
          `S${setIndex + 1} ${set.reps || "-"} reps / ${set.weight || "-"} kg${set.note ? ` (${set.note})` : ""}`
      )
      .join(" · ");
  };

  const saveGymSession = () => {
    if (!selectedRoutine || selectedRoutine.type !== "gym") return;

    const session = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-ES"),
      routine: selectedRoutine.name,
      type: "gym",
      notes: sessionNotes,
      exercises: selectedRoutine.exercises.map((exercise) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        sets: exerciseData[exercise.id]?.sets || [],
        rest: exerciseData[exercise.id]?.rest || "",
        notes: exerciseData[exercise.id]?.notes || "",
      })),
    };

    setHistory((prev) => [session, ...prev]);
    setExerciseData({});
    setSessionNotes("");
    alert("Entrenamiento guardado");
  };

  const saveRunningSession = () => {
    if (
      !runningData.km.trim() &&
      !runningData.time.trim() &&
      !runningData.pace.trim() &&
      !runningData.feelings.trim()
    ) {
      return;
    }

    const session = {
      id: Date.now(),
      date: new Date().toLocaleDateString("es-ES"),
      routine: selectedRoutine?.name || "Running",
      type: "running",
      km: runningData.km,
      time: runningData.time,
      pace: runningData.pace,
      feelings: runningData.feelings,
    };

    setHistory((prev) => [session, ...prev]);
    setRunningData({ km: "", time: "", pace: "", feelings: "" });
    alert("Running guardado");
  };

  const resetAll = () => {
    const ok = window.confirm("¿Seguro que quieres borrar todo?");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    setRoutines(defaultRoutines);
    setHistory([]);
    setSelectedRoutineId(1);
    setExerciseData({});
    setSessionNotes("");
    setRunningData({ km: "", time: "", pace: "", feelings: "" });
  };

  if (!loaded) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>Cargando...</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <p style={styles.kicker}>Tu app de entrenos</p>
            <h1 style={styles.title}>Gym & Running</h1>
          </div>
          <button style={styles.resetButton} onClick={resetAll}>
            Reset
          </button>
        </div>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Rutinas</h2>

          <div style={styles.routineGrid}>
            {routines.map((routine) => (
              <div key={routine.id} style={styles.routineWrap}>
                <button
                  onClick={() => setSelectedRoutineId(routine.id)}
                  style={{
                    ...styles.routineButton,
                    ...(selectedRoutineId === routine.id ? styles.routineButtonActive : {}),
                  }}
                >
                  {routine.name}
                </button>

                {!["Pierna 1", "Pierna 2", "Pierna 3", "Superior", "Running"].includes(routine.name) && (
                  <button onClick={() => deleteRoutine(routine.id)} style={styles.smallDeleteButton}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <input
              style={styles.input}
              placeholder="Nueva rutina"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
            />
            <div style={styles.inlineButtons}>
              <button style={styles.secondaryButton} onClick={() => createRoutine("gym")}>
                Crear gym
              </button>
              <button style={styles.secondaryButton} onClick={() => createRoutine("running")}>
                Crear running
              </button>
            </div>
          </div>
        </section>

        {selectedRoutine && selectedRoutine.type === "gym" && (
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Editar {selectedRoutine.name}</h2>

            <input
              style={styles.input}
              placeholder="Ejercicio"
              value={newGymExercise.name}
              onChange={(e) => setNewGymExercise({ name: e.target.value })}
            />

            <button style={styles.primaryButton} onClick={addExerciseToRoutine}>
              Añadir ejercicio
            </button>

            <div style={{ marginTop: 14 }}>
              {selectedRoutine.exercises.length === 0 ? (
                <p style={styles.emptyText}>Todavía no hay ejercicios.</p>
              ) : (
                selectedRoutine.exercises.map((exercise) => (
                  <div key={exercise.id} style={styles.exerciseRow}>
                    <div>
                      <strong>{exercise.name}</strong>
                    </div>
                    <button onClick={() => deleteExercise(exercise.id)} style={styles.deleteButton}>
                      Borrar
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Entreno actual: {selectedRoutine?.name}</h2>

          {selectedRoutine?.type === "gym" ? (
            <>
              {selectedRoutine.exercises.length === 0 ? (
                <p style={styles.emptyText}>Añade ejercicios arriba para poder registrar el entreno.</p>
              ) : (
                selectedRoutine.exercises.map((exercise) => (
                  <div key={exercise.id} style={styles.logCard}>
                    <strong>{exercise.name}</strong>
                    <div style={styles.exerciseMeta}>Última vez: {formatLastSession(exercise.id)}</div>

                    <div style={{ marginTop: 10, marginBottom: 10 }}>
                      {getDisplayedSets(exercise.id).map((set, index) => (
                        <div key={index} style={styles.setCard}>
                          <div style={styles.setTitle}>Serie {index + 1}</div>
                          <div style={styles.twoCols}>
                            <input
                              style={styles.input}
                              placeholder="Reps"
                              value={set.reps || ""}
                              onChange={(e) => updateSetField(exercise.id, index, "reps", e.target.value)}
                            />
                            <input
                              style={styles.input}
                              placeholder="Peso"
                              value={set.weight || ""}
                              onChange={(e) => updateSetField(exercise.id, index, "weight", e.target.value)}
                            />
                          </div>
                          <textarea
                            style={styles.textarea}
                            placeholder="Nota de esta serie"
                            value={set.note || ""}
                            onChange={(e) => updateSetField(exercise.id, index, "note", e.target.value)}
                          />
                        </div>
                      ))}

                      <div style={styles.inlineButtons}>
                        <button style={styles.secondaryButton} onClick={() => addSetToExercise(exercise.id)}>
                          + Añadir serie
                        </button>
                        <button style={styles.secondaryButton} onClick={() => removeSetFromExercise(exercise.id)}>
                          - Quitar serie
                        </button>
                      </div>
                    </div>

                    <input
                      style={styles.input}
                      placeholder="Descanso general del ejercicio"
                      value={exerciseData[exercise.id]?.rest || ""}
                      onChange={(e) => updateExerciseData(exercise.id, "rest", e.target.value)}
                    />

                    <textarea
                      style={styles.textarea}
                      placeholder="Notas generales del ejercicio"
                      value={exerciseData[exercise.id]?.notes || ""}
                      onChange={(e) => updateExerciseData(exercise.id, "notes", e.target.value)}
                    />
                  </div>
                ))
              )}

              <textarea
                style={styles.textarea}
                placeholder="Notas generales del entreno"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />

              <button style={styles.primaryButton} onClick={saveGymSession}>
                Guardar entrenamiento
              </button>
            </>
          ) : (
            <>
              <input
                style={styles.input}
                placeholder="Km"
                value={runningData.km}
                onChange={(e) => setRunningData((prev) => ({ ...prev, km: e.target.value }))}
              />
              <div style={styles.twoCols}>
                <input
                  style={styles.input}
                  placeholder="Tiempo"
                  value={runningData.time}
                  onChange={(e) => setRunningData((prev) => ({ ...prev, time: e.target.value }))}
                />
                <input
                  style={styles.input}
                  placeholder="Ritmo"
                  value={runningData.pace}
                  onChange={(e) => setRunningData((prev) => ({ ...prev, pace: e.target.value }))}
                />
              </div>
              <textarea
                style={styles.textarea}
                placeholder="Sensaciones"
                value={runningData.feelings}
                onChange={(e) => setRunningData((prev) => ({ ...prev, feelings: e.target.value }))}
              />

              <button style={styles.primaryButton} onClick={saveRunningSession}>
                Guardar running
              </button>
            </>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Historial</h2>

          {history.length === 0 ? (
            <p style={styles.emptyText}>Todavía no has guardado nada.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} style={styles.historyCard}>
                <div style={styles.historyTop}>
                  <strong>{item.routine}</strong>
                  <span style={styles.date}>{item.date}</span>
                </div>

                {item.type === "gym" ? (
                  <div>
                    {item.exercises.map((exercise, index) => (
                      <div key={index} style={styles.historyLine}>
                        {exercise.name}: {exercise.sets && exercise.sets.length > 0
                          ? exercise.sets
                              .map(
                                (set, setIndex) =>
                                  `S${setIndex + 1} ${set.reps || "-"} reps / ${set.weight || "-"} kg${set.note ? ` (${set.note})` : ""}`
                              )
                              .join(" · ")
                          : "sin series registradas"}
                      </div>
                    ))}
                    {item.notes ? <div style={styles.historyNotes}>Notas: {item.notes}</div> : null}
                  </div>
                ) : (
                  <div>
                    <div style={styles.historyLine}>
                      {item.km || "-"} km · {item.time || "-"} · ritmo {item.pace || "-"}
                    </div>
                    {item.feelings ? <div style={styles.historyNotes}>{item.feelings}</div> : null}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, rgb(255,245,247) 0%, rgb(255,255,255) 50%, rgb(250,244,255) 100%)",
    padding: 16,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: 520,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    margin: 0,
    color: "#666",
    fontSize: 14,
  },
  title: {
    margin: "4px 0 0 0",
    fontSize: 32,
  },
  card: {
    background: "white",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    border: "1px solid #eee",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 22,
  },
  routineGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  routineWrap: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  routineButton: {
    flex: 1,
    border: "none",
    borderRadius: 16,
    padding: "12px 10px",
    background: "#efefef",
    fontWeight: 700,
    cursor: "pointer",
  },
  routineButtonActive: {
    background: "#111",
    color: "white",
  },
  smallDeleteButton: {
    border: "none",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#ffd9d9",
    cursor: "pointer",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 14,
    border: "1px solid #ddd",
    marginBottom: 10,
    fontSize: 16,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 14,
    border: "1px solid #ddd",
    minHeight: 80,
    marginBottom: 10,
    fontSize: 16,
    resize: "vertical",
  },
  inlineButtons: {
    display: "flex",
    gap: 8,
  },
  primaryButton: {
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: 14,
    background: "#111",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    border: "none",
    borderRadius: 16,
    padding: 12,
    background: "#f0f0f0",
    fontWeight: 700,
    cursor: "pointer",
  },
  resetButton: {
    border: "none",
    borderRadius: 14,
    padding: "10px 12px",
    background: "#ffe2e2",
    fontWeight: 700,
    cursor: "pointer",
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  exerciseRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: 12,
    border: "1px solid #eee",
    borderRadius: 16,
    marginBottom: 8,
    background: "#fafafa",
  },
  exerciseMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    lineHeight: 1.45,
  },
  deleteButton: {
    border: "none",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#ffd9d9",
    cursor: "pointer",
    fontWeight: 700,
  },
  logCard: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    background: "#fafafa",
  },
  setCard: {
    border: "1px solid #ececec",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    background: "#fff",
  },
  setTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#444",
    marginBottom: 6,
  },
  historyCard: {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    background: "#fafafa",
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  date: {
    color: "#666",
    fontSize: 13,
  },
  historyLine: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
    lineHeight: 1.5,
  },
  historyNotes: {
    marginTop: 6,
    fontSize: 13,
    color: "#666",
  },
  emptyText: {
    color: "#666",
    margin: 0,
  },
};
