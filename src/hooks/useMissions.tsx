import { useState, useEffect, useRef } from "react";
import type { MissionGroup } from "../components/Missions";

/**
 * Custom hook to manage mission completion and group navigation.
 */
export function useMissions(allMissions: MissionGroup[]) {
  // 1. Track which missions are done
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("completedMissions");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // 2. Which group’s tab is active
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);

  // 3. Remember old completed for auto-advance
  const prevRef = useRef<Set<string>>(new Set());

  // Recompute “done” every time any mission’s isComplete() might have flipped
  useEffect(() => {
    const fresh = new Set<string>();
    allMissions.forEach((group) =>
      group.missions.forEach((m, i) => {
        const allPrevDone = group.missions
          .slice(0, i)
          .every((prev) => fresh.has(prev.id));
        if (allPrevDone && m.isComplete()) {
          fresh.add(m.id);
        }
      })
    );
    setCompletedMissions(fresh);
  }, [allMissions]);

  // Auto-advance to next group when the *last* mission in the current group just became done
  useEffect(() => {
    const group = allMissions[currentGroupIndex];
    const lastId = group.missions[group.missions.length - 1].id;
    const was = prevRef.current.has(lastId);
    const now = completedMissions.has(lastId);
    if (!was && now && currentGroupIndex < allMissions.length - 1) {
      setCurrentGroupIndex((i) => i + 1);
    }
    prevRef.current = new Set(completedMissions);
  }, [completedMissions, currentGroupIndex, allMissions]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(
      "completedMissions",
      JSON.stringify(Array.from(completedMissions))
    );
  }, [completedMissions]);

  // Reset helper for “Reset All”
  const resetMissions = () => {
    setCompletedMissions(new Set());
    setCurrentGroupIndex(0);
  };

  return {
    completedMissions,
    setCompletedMissions,
    currentGroupIndex,
    setCurrentGroupIndex,
    resetMissions,
  };
}