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

  // Merge newly completed missions into the existing set (never "un-complete" a mission)
  useEffect(() => {
    setCompletedMissions((prev) => {
      const copy = new Set(prev);
      allMissions.forEach((group) =>
        group.missions.forEach((mission, idx) => {
          if (copy.has(mission.id)) return;
          const allPrevDone = group.missions
            .slice(0, idx)
            .every((m) => copy.has(m.id));
          if (allPrevDone && mission.isComplete()) {
            copy.add(mission.id);
          }
        })
      );
      return copy;
    });
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