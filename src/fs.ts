export type FSNode = {
  name: string;
  type: "dir" | "file";
  children?: FSNode[]; // only for dirs
  content?: string;
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
                    { name: "chapter1.md", type: "file", content: `# Chapter 1: Introduction

This is the introduction to the thesis. It explains the problem and motivation.

- Point one
- Point two` },
                    { name: "chapter2.md", type: "file", content: `# Chapter 2: Methods

This section describes the methods used in the study.

1. Data collection
2. Analysis` }
                  ]
                },
                {
                  name: "Notes",
                  type: "dir",
                  children: [{ name: "meeting.txt", type: "file" }]
                },
                {
                  name: "Research",
                  type: "dir",
                  children: [
                    { name: "example.fasta", type: "file", content: `>seq1
ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGC
>seq2
GCTAGCTAGCTGACTGACTGACGATCGATCGTA
>seq3
TTGACGATCGATCGATCGATCGATCGATCGTAGCTA` },
                    { name: "variants.vcf", type: "file", content: `##fileformat=VCFv4.2
##source=simulated
#CHROM  POS     ID      REF     ALT     QUAL    FILTER  INFO
chr1    123456  .       A       G       60      PASS    DP=100
chr2    234567  rs555   T       C       50      PASS    DP=80` }
                  ]
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
                    { name: "index.html", type: "file", content: `<!doctype html>
<html>
<head><title>Example Webapp</title></head>
<body>
  <h1>Welcome to the Webapp</h1>
  <div id="root"></div>
</body>
</html>` },
                    { name: "app.tsx", type: "file", content: `import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => <div>Hello from Webapp!</div>;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);` }
                  ]
                },
                {
                  name: "analysis",
                  type: "dir",
                  children: [
                    {
                      name: "data.csv",
                      type: "file",
                      content: `id,value
1,10
2,15
3,20`
                    }
                  ]
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
            { name: "README.txt", type: "file", content: `This is the user README for the filesystem visualizer. Use commands like ls, cd, cat, head, tail, wc, and grep to explore.` },
            {
              name: "Examples",
              type: "dir",
              children: [
                {
                  name: "grocery.txt",
                  type: "file",
                  content: `Milk
Eggs
Bread
Apples
Chicken`
                },
                {
                  name: "expenses.csv",
                  type: "file",
                  content: `Date,Category,Amount
2025-07-01,Groceries,45.67
2025-07-03,Transport,12.50
2025-07-05,Utilities,80.00
2025-07-10,Entertainment,25.00`
                }
              ]
            }
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
                        {
                          name: "sample_metadata.tsv",
                          type: "file",
                          content: `sample_id	condition	replicate
s1	control	1
s2	treated	1
s3	control	2
s4	treated	2`
                        }
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
                    { name: "README.md", type: "file" },
                    {
                      name: "pipeline.log",
                      type: "file",
                      content: `[2025-07-20 10:00:00] INFO Starting pipeline
[2025-07-20 10:01:00] WARNING Low memory
[2025-07-20 10:02:00] ERROR Failed to fetch reference genome
[2025-07-20 10:03:00] INFO Retrying download
[2025-07-20 10:04:00] WARNING Network latency detected
[2025-07-20 10:05:00] ERROR Download failed again
[2025-07-20 10:06:00] INFO Pipeline aborted
`
                    }
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