export type FSNode = {
  name: string;
  type: "dir" | "file";
  children?: FSNode[]; // only for dirs
};

// Simulated filesystem
export const fileSystem: FSNode = {
  name: "",
  type: "dir",
  children: [
    {
      name: "bin",
      type: "dir",
      children: [
        { name: "bash", type: "file" },
        { name: "ls", type: "file" },
        { name: "cat", type: "file" },
        { name: "echo", type: "file" }
      ]
    },
    {
      name: "etc",
      type: "dir",
      children: [
        { name: "hosts", type: "file" },
        { name: "passwd", type: "file" },
        {
          name: "nginx",
          type: "dir",
          children: [{ name: "nginx.conf", type: "file" }]
        }
      ]
    },
    {
      name: "usr",
      type: "dir",
      children: [
        {
          name: "bin",
          type: "dir",
          children: [
            { name: "python", type: "file" },
            { name: "node", type: "file" }
          ]
        },
        {
          name: "share",
          type: "dir",
          children: [{ name: "man", type: "dir", children: [] }]
        }
      ]
    },
    {
      name: "var",
      type: "dir",
      children: [
        {
          name: "log",
          type: "dir",
          children: [{ name: "syslog", type: "file" }]
        },
        {
          name: "tmp",
          type: "dir",
          children: []
        }
      ]
    },
    {
      name: "tmp",
      type: "dir",
      children: []
    },
    {
      name: "home",
      type: "dir",
      children: [
        {
          name: "user",
          type: "dir",
          children: [
            {
              name: "Documents",
              type: "dir",
              children: [
                {
                  name: "Thesis",
                  type: "dir",
                  children: [
                    { name: "chapter1.md", type: "file" },
                    { name: "chapter2.md", type: "file" }
                  ]
                },
                {
                  name: "Notes",
                  type: "dir",
                  children: [{ name: "meeting.txt", type: "file" }]
                }
              ]
            },
            {
              name: "Projects",
              type: "dir",
              children: [
                {
                  name: "webapp",
                  type: "dir",
                  children: [
                    { name: "index.html", type: "file" },
                    { name: "app.tsx", type: "file" }
                  ]
                },
                {
                  name: "analysis",
                  type: "dir",
                  children: [{ name: "data.csv", type: "file" }]
                }
              ]
            },
            {
              name: "Pictures",
              type: "dir",
              children: [{ name: "vacation.jpg", type: "file" }]
            },
            {
              name: "Downloads",
              type: "dir",
              children: [{ name: "installer.sh", type: "file" }]
            },
            {
              name: "Music",
              type: "dir",
              children: []
            },
            {
              name: "Videos",
              type: "dir",
              children: []
            },
            { name: ".bashrc", type: "file" },
            { name: ".profile", type: "file" },
            { name: "README.txt", type: "file" }
          ]
        },
        {
          name: "Laura",
          type: "dir",
          children: [
            {
              name: "Desktop",
              type: "dir",
              children: [
                { name: "welcome.txt", type: "file" },
                { name: "setup_notes.md", type: "file" }
              ]
            },
            {
              name: "Documents",
              type: "dir",
              children: [
                {
                  name: "Research",
                  type: "dir",
                  children: [
                    { name: "paper1.pdf", type: "file" },
                    { name: "paper2.pdf", type: "file" },
                    {
                      name: "Data",
                      type: "dir",
                      children: [
                        { name: "experiment_results.csv", type: "file" },
                        { name: "sample_metadata.tsv", type: "file" }
                      ]
                    }
                  ]
                },
                {
                  name: "Tutorials",
                  type: "dir",
                  children: [
                    { name: "react_hooks.md", type: "file" },
                    { name: "filesystem_visualizer.md", type: "file" }
                  ]
                },
                { name: "todo.txt", type: "file" },
                { name: "journal.md", type: "file" }
              ]
            },
            {
              name: "Projects",
              type: "dir",
              children: [
                {
                  name: "genomics",
                  type: "dir",
                  children: [
                    { name: "pipeline.sh", type: "file" },
                    { name: "README.md", type: "file" }
                  ]
                },
                {
                  name: "visualizer",
                  type: "dir",
                  children: [
                    { name: "index.html", type: "file" },
                    { name: "app.tsx", type: "file" }
                  ]
                },
                {
                  name: "blog",
                  type: "dir",
                  children: [
                    { name: "2025-07-01-intro.md", type: "file" },
                    { name: "2025-07-15-update.md", type: "file" }
                  ]
                }
              ]
            },
            {
              name: "Pictures",
              type: "dir",
              children: [
                { name: "conference.jpg", type: "file" },
                { name: "family.png", type: "file" }
              ]
            },
            {
              name: "Music",
              type: "dir",
              children: [
                {
                  name: "favorites",
                  type: "dir",
                  children: [
                    { name: "song1.mp3", type: "file" },
                    { name: "song2.mp3", type: "file" }
                  ]
                }
              ]
            },
            {
              name: "Downloads",
              type: "dir",
              children: [
                { name: "dataset.zip", type: "file" },
                { name: "script_runner.py", type: "file" }
              ]
            },
            {
              name: "Scripts",
              type: "dir",
              children: [
                { name: "deploy.sh", type: "file" },
                { name: "cleanup.py", type: "file" }
              ]
            },
            {
              name: "Config",
              type: "dir",
              children: [
                { name: "settings.json", type: "file" },
                {
                  name: "themes",
                  type: "dir",
                  children: [
                    { name: "dark.json", type: "file" },
                    { name: "light.json", type: "file" }
                  ]
                }
              ]
            },
            {
              name: ".config",
              type: "dir",
              children: [{ name: "app.conf", type: "file" }]
            },
            { name: ".bashrc", type: "file" },
            { name: ".zshrc", type: "file" },
            { name: ".gitconfig", type: "file" },
            { name: "recipes.md", type: "file" },
            { name: "budget.xlsx", type: "file" },
            { name: "archive.tar.gz", type: "file" }
          ]
        }
      ]
    }
  ]
};