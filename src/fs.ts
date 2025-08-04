export type FSNode = {
  name: string;
  type: "dir" | "file";
  children?: FSNode[]; // only for dirs
};

// A modest simulated POSIX-style tree under /home/user
export const fileSystem: FSNode = {
  name: "",
  type: "dir",
  children: [
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
                  children: []
                },
                {
                  name: "Notes",
                  type: "dir",
                  children: []
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
                  children: []
                },
                {
                  name: "analysis",
                  type: "dir",
                  children: []
                }
              ]
            },
            {
              name: "Pictures",
              type: "dir",
              children: []
            },
            {
              name: "README.txt",
              type: "file"
            }
          ]
        }
      ]
    }
  ]
};