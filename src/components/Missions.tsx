// src/components/Missions.tsx
export type Mission = {
  id: string;
  description: string;
  isComplete: () => boolean;
};

export type MissionGroup = {
  groupName: string;
  missions: Mission[];
};

/**
 * Factory function to get all missions/groups, given state dependencies for "isComplete" checks.
 * Usage: getAllMissions({ lsOutput, textOutput, cwd, lastCommand, normalizePath })
 */
export function getAllMissions({
  lsOutput,
  textOutput,
  cwd,
  lastCommand,
  normalizePath,
}: {
  lsOutput: any;
  textOutput: string | null;
  cwd: string;
  lastCommand: string | null;
  normalizePath: (s: string) => string;
}): MissionGroup[] {
  return [
    {
      groupName: "Basics",
      missions: [
        {
          id: "list-home",
          description: "List contents of your home directory",
          isComplete: () =>
            lsOutput?.path === "/home/user" && !lsOutput?.showAll,
        },
        {
          id: "show-hidden-home",
          description: "Show hidden files in your home directory",
          isComplete: () =>
            lsOutput?.path === "/home/user" && lsOutput?.showAll,
        },
        {
          id: "view-readme",
          description: "View (cat) README.txt content",
          isComplete: () =>
            textOutput?.toLowerCase().includes("filesystem visualizer") ??
            false,
        },
        {
          id: "cd-thesis",
          description:
            "Change directory (cd) to /home/user/Documents/Thesis with a relative path!",
          isComplete: () => {
            if (normalizePath(cwd) !== "/home/user/Documents/Thesis")
              return false;
            if (!lastCommand) return false;
            const parts = lastCommand.trim().split(/\s+/);
            if (parts[0] !== "cd") return false;
            const arg = parts.slice(1).join(" ");
            if (!arg) return false;
            if (arg.startsWith("/") || arg.startsWith("~")) return false; // must be relative
            return true;
          },
        },
      ],
    },
    {
      groupName: "File Viewing",
      missions: [
        {
          id: "head-chapter1",
          description: "Show first 5 lines of chapter1.md",
          isComplete: () =>
            textOutput?.includes("# Chapter 1: Introduction") ?? false,
        },
        {
          id: "tail-chapter2",
          description: "Show last lines of chapter2.md",
          isComplete: () =>
            (textOutput?.includes("1. Data collection") &&
              textOutput?.includes("2. Analysis")) ??
            false,
        },
        {
          id: "search-filesystem",
          description: "Search for the word 'filesystem' in README.txt",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const out = textOutput.toLowerCase();
            if (!out.includes("filesystem")) return false;
            const cmd = lastCommand.toLowerCase();
            if (!cmd.includes("grep")) return false;
            if (!cmd.includes("filesystem")) return false;
            if (!cmd.includes("readme")) return false;
            return true;
          },
        },
        {
          id: "find-example-fasta",
          description:
            "Browse the home folder via command line to find example.fasta then cd to that folder",
          isComplete: () =>
            normalizePath(cwd) === "/home/user/Documents/Research",
        },
      ],
    },
    {
      groupName: "File inspection",
      missions: [
        {
          id: "count-fasta-seqs",
          description:
            "Count sequences in example.fasta (Use grep '^>' to find fasta headers)",
          isComplete: () => textOutput?.trim().startsWith("3") ?? false,
        },
        {
          id: "thesis-sizes",
          description:
            "List items in Thesis directory with human-readable sizes",
          isComplete: () =>
            lsOutput?.path === "/home/user/Documents/Thesis" &&
            lsOutput?.human
        },
        {
          id: "sample-id-condition",
          description:
            "Extract sample IDs and conditions columns/fields from sample metadata in Laura's Research folder",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            // must have used cut
            const parts = lastCommand.trim().split(/\s+/);
            if (parts[0] !== "cut") return false;
            // find fields argument for -f1,2 or -f 1,2
            let fieldsArg: string | null = null;
            for (let i = 1; i < parts.length; i++) {
              if (parts[i].startsWith("-f")) {
                if (parts[i] === "-f") {
                  if (parts[i + 1]) fieldsArg = parts[i + 1];
                } else {
                  fieldsArg = parts[i].slice(2);
                }
              }
            }
            if (fieldsArg !== "1,2") return false;
            // check output has header and at least one data line
            const lines = textOutput.trim().split(/\n/);
            if (lines.length < 2) return false;
            const header = lines[0];
            if (!(header.includes("sample_id") && header.includes("condition")))
              return false;
            // verify at least one sample line with expected pattern (e.g., s1 control)
            if (!lines.some((line) => line.startsWith("s1") && line.includes("control")))
              return false;
            return true;
          },
        },
      ],
    },
    {
      groupName: "Projects & Data",
      missions: [
        {
          id: "count-expenses",
          description:
            "Count number of expense entries (excluding header) in expenses.csv in /home/user/Examples",
          isComplete: () => {
            const t = textOutput?.trim();
            if (!t) return false;
            return t.split(/\s+/)[0] === "4";
          },
        },
        {
          id: "count-pipeline-errors",
          description:
            "Count number of errors in Laura's genomics pipeline.log using grep and wc",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes("grep") || !lc.includes("error") || !lc.includes("pipeline.log"))
              return false;
            // Accept -c or piping to wc -l with optional spaces
            if (!(/-c\b/.test(lc) || /\|\s*wc\s*-l\b/.test(lc))) return false;
            const out = textOutput.trim();
            let count = 0;
            const numMatch = out.match(/^(\d+)/);
            if (numMatch) {
              count = parseInt(numMatch[1], 10);
            } else {
              // fallback: count ERROR lines from raw grep output
              count = (out.match(/error/gi) || []).length;
            }
            return count === 2;
          },
        },
        {
          id: "last-warnings-pipeline",
          description: "Show last 5 warnings from pipeline.log",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes("grep") || !lc.includes("warning") || !lc.includes("pipeline.log"))
              return false;
            if (!lc.includes("tail")) return false;
            return textOutput.toLowerCase().includes("warning");
          },
        },
        {
          id: "find-kinase-genes",
          description: "Find genes annotated with 'kinase' in your downloaded gene_annotations.tsv",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const lc = lastCommand.toLowerCase();
            if (!lc.includes("grep") || !lc.includes("kinase") || !lc.includes("gene_annotations.tsv"))
              return false;
            return /gene001|gene002|gene041/.test(textOutput);
          },
        },
        {
          id: "count-html-webapp",
          description: "Count .html files in webapp project without using `wc`",
          isComplete: () => {
            if (!textOutput) return false;
            if (!lastCommand) return false;
            const out = textOutput.trim();
            
            // Check if output is a number
            if (!/^\d+$/.test(out)) return false;
            
            const lc = lastCommand.toLowerCase();
            
            // Must mention html somewhere
            if (!lc.includes("html")) return false;
            
            // Must NOT use wc command  
            if (lc.includes("wc")) return false;
            
            return true;
          },
        },        
      ],
    },
  ];
}