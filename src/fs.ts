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
              children: [
                { name: "installer.sh", type: "file" },
                { name: "gene_annotations.tsv", type: "file", content: `gene_id	description

gene001	Protein kinase involved in cell cycle regulation
gene002	Serine/threonine kinase in signal transduction
gene003	Tyrosine kinase receptor
gene004	Dual-specificity kinase for stress response
gene005	Protein kinase regulator
gene006	MAP kinase involved in growth
gene007	Cyclin-dependent kinase
gene008	Lipid kinase for membrane remodeling
gene009	Histidine kinase sensor
gene010	Mitogen-activated protein kinase
gene011	Receptor tyrosine kinase
gene012	Calcium/calmodulin-dependent kinase
gene013	Casein kinase involved in phosphorylation
gene014	AMP-activated protein kinase
gene015	Glycogen synthase kinase
gene016	Non-receptor tyrosine kinase
gene017	Protein kinase A regulatory subunit
gene018	Protein kinase C isoform
gene019	Kinase scaffold protein
gene020	Stress-activated protein kinase
gene021	Transcription factor
gene022	Metabolic enzyme
gene023	Membrane transporter
gene024	DNA binding protein
gene025	RNA helicase
gene026	Structural component
gene027	Chaperone protein
gene028	Ubiquitin ligase
gene029	Signal peptide receptor
gene030	DNA polymerase
gene031	Mitochondrial enzyme
gene032	Cytoskeletal protein
gene033	Adaptor protein
gene034	GTPase activating protein
gene035	Protease
gene036	Ribosomal protein
gene037	Translation initiation factor
gene038	RNA polymerase subunit
gene039	Oxidoreductase
gene040	Cell adhesion molecule
gene041	Receptor serine/threonine kinase
gene042	Tyrosine kinase adaptor
gene043	Lipid kinase in signaling
gene044	Protein kinase involved in apoptosis
gene045	Cell cycle kinase
gene046	Stress response kinase
gene047	Regulatory kinase subunit
gene048	Signal transduction kinase
gene049	Growth factor receptor kinase
gene050	Kinase with SH2 domain
gene051	Kinase scaffold protein variant
gene052	Cyclin-dependent kinase inhibitor
gene053	MAPK kinase kinase
gene054	Calcium-dependent kinase
gene055	Protein kinase D family member
gene056	Serine/threonine-protein kinase
gene057	Receptor tyrosine kinase-like orphan receptor
gene058	Tyrosine-protein kinase
gene059	Stress-activated kinase module
gene060	Cell differentiation kinase
gene061	Enzyme regulator
gene062	Phosphatase
gene063	Zinc finger transcription factor
gene064	Ion channel
gene065	Methyltransferase
gene066	Helicase
gene067	Glycosyltransferase
gene068	Protein kinase-like pseudokinase
gene069	Nuclear receptor
gene070	Signal peptidase
gene071	GTP-binding protein
gene072	DNA ligase
gene073	Proteasome subunit
gene074	Membrane receptor
gene075	Heat shock protein
gene076	RNA splicing factor
gene077	Transcriptional coactivator
gene078	Translation elongation factor
gene079	Non-coding RNA binding protein
gene080	Mitochondrial transporter
gene081	Receptor tyrosine kinase
gene082	Serine/threonine kinase regulator
gene083	Protein kinase autoinhibitor
gene084	Dual-specificity kinase scaffold
gene085	Lipid signaling kinase
gene086	Cell growth kinase
gene087	Phosphoinositide 3-kinase
gene088	Tyrosine kinase substrate
gene089	Protein kinase interacting protein
gene090	MAP kinase phosphatase
gene091	Receptor kinase-like protein
gene092	Stress-activated protein kinase regulatory subunit
gene093	Cytokine receptor-associated kinase
gene094	Kinase adaptor protein
gene095	Focal adhesion kinase
gene096	Cellular differentiation kinase
gene097	Non-kinase metabolic enzyme
gene098	Signal transduction regulator
gene099	Protein folding chaperone
gene100	Gene expression modulator` }
              ]
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