import React from "react";

export type Mission = {
  id: string;
  description: string;
  isComplete: () => boolean;
};
export type MissionGroup = {
  groupName: string;
  missions: Mission[];
};

// Animated checkmark for exercise completion
const Checkmark: React.FC<{ done: boolean }> = ({ done }) => {
  const [animate, setAnimate] = React.useState(false);
  React.useEffect(() => {
    if (done) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 350);
      return () => clearTimeout(t);
    }
  }, [done]);
  return (
    <span className={`exercise-checkmark ${animate ? "pop" : ""}`}>
      {done ? "✅" : "⬜"}
    </span>
  );
};

interface ExercisesProps {
  allMissions: MissionGroup[];
  completedMissions: Set<string>;
  setCompletedMissions: (set: Set<string>) => void;
  currentGroupIndex: number;
  setCurrentGroupIndex: (n: number) => void;
}

const Exercises: React.FC<ExercisesProps> = ({
  allMissions,
  completedMissions,
  setCompletedMissions,
  currentGroupIndex,
  setCurrentGroupIndex,
}) => {
  return (
    <div className="info-block exercise-card">
      <div className="section">
        <div className="label">Exercises</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            {/* Show completed/total for current group */}
            {(() => {
              const group = allMissions[currentGroupIndex];
              const groupMissions = group.missions;
              const completedCount = groupMissions.filter((m) =>
                completedMissions.has(m.id)
              ).length;
              return (
                <>
                  {completedCount} / {groupMissions.length} complete in{" "}
                  <strong>{group.groupName}</strong>
                </>
              );
            })()}
          </div>
          <button
            onClick={() => {
              setCompletedMissions(new Set());
              localStorage.removeItem("completedMissions");
            }}
            style={{ marginLeft: 12 }}
            aria-label="Reset all exercises"
          >
            Reset All
          </button>
        </div>
        {/* Hint above tabs */}
        <div
          role="note"
          style={{
            fontSize: "0.75em",
            marginBottom: 4,
            color: "#555",
          }}
        >
          Exercises must be completed in order. You can navigate back to earlier
          groups, but advancing happens only when the final task in the current
          group is done. The final exercises are challenging! See if you can
          figure them out. You will need all supported commands to finish the all
          challenges.
        </div>
        {/* Tab buttons */}
        <div className="tabs-container">
          {allMissions.map((group, idx) => {
            const groupDone = group.missions.every((m) =>
              completedMissions.has(m.id)
            );
            return (
              <button
                key={group.groupName}
                type="button"
                aria-label={`${group.groupName} exercises tab${
                  currentGroupIndex === idx ? " (active)" : ""
                }`}
                onClick={() => setCurrentGroupIndex(idx)}
                className={`tab-button ${
                  currentGroupIndex === idx ? "active" : ""
                } ${groupDone ? "completed" : ""}`}
              >
                {group.groupName}{" "}
                {groupDone ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
        {/* List only missions for current group */}
        <ul className="exercise-list" aria-label="Exercise list">
          {allMissions[currentGroupIndex].missions.map((m) => (
            <li
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Checkmark done={completedMissions.has(m.id)} />
              <span>{m.description}</span>
            </li>
          ))}
        </ul>
        {/* Group summary at bottom */}
        <div className="overall-summary">
          {(() => {
            const totalCompleted = allMissions.reduce(
              (acc, group) =>
                acc + group.missions.filter((m) => completedMissions.has(m.id)).length,
              0
            );
            const totalMissions = allMissions.reduce(
              (acc, group) => acc + group.missions.length,
              0
            );
            return (
              <span>
                Overall: {totalCompleted} / {totalMissions} complete
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default Exercises;