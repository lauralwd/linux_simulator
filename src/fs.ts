export type FSNode = {
  name: string;
  type: "dir" | "file";
  children?: FSNode[]; // only for dirs
};

// A more fleshed-out simulated POSIX-style tree
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
        { name: "nginx", type: "dir", children: [{ name: "nginx.conf", type: "file" }] }
      ]
    },
    {
      name: "usr",
      type: "dir",
      children: [
        {
          name: "bin",
          type: "dir",
          children: [{ name: "python", type: "file" }, { name: "node", type: "file" }]
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
        { name: "log", type: "dir", children: [{ name: "syslog", type: "file" }] },
        { name: "tmp", type: "dir", children: [] }
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
                  children: [{ name: "chapter1.md", type: "file" }, { name: "chapter2.md", type: "file" }]
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
                  children: [{ name: "index.html", type: "file" }, { name: "app.tsx", type: "file" }]
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
        }
      ]
    }
  ]
};