export type FSNode = {
  name: string;
  type: "dir" | "file";
  children?: FSNode[]; // only for dirs
  content?: string;
  size?: number; // Size in bytes
};

export type LsOutput = {
  path: string;
  entries: { name: string; type: "dir" | "file"; size?: number }[];
  showAll: boolean;
  long: boolean;
  human: boolean;
  blocks: boolean;
};

// Calculate size of a file or directory entry (not recursive for directories)
export function calculateSize(node: FSNode): number {
  if (node.type === "file") {
    return node.size || node.content?.length || 0;
  }
  // For directories, return typical directory block size (4KB)
  return 4096;
}

// Calculate total size of directory contents (recursive) - for du command
export function calculateDirectoryContentSize(node: FSNode): number {
  if (node.type === "file") {
    return node.size || node.content?.length || 0;
  }
  // For directories, sum all children recursively
  return (node.children || []).reduce((total, child) => 
    total + calculateDirectoryContentSize(child), 0
  );
}

// Format size for display
export function formatSize(bytes: number, human: boolean): string {
  if (!human) {
    // Show in 1K blocks (like real ls -s)
    return Math.ceil(bytes / 1024).toString();
  }
  
  // Human readable format
  const units = ['B', 'K', 'M', 'G'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size * 10) / 10}${units[unitIndex]}`;
}

// Simulated filesystem
export const fileSystem: FSNode = {
  name: "",
  type: "dir",
  children: [
    {
      name: "bin",
      type: "dir",
      children: [
        { name: "bash", type: "file", size: 1024 * 1024 }, // 1MB
        { name: "ls", type: "file", size: 128 * 1024 }, // 128KB
        { name: "cat", type: "file", size: 64 * 1024 }, // 64KB
        { name: "echo", type: "file", size: 32 * 1024 } // 32KB
      ]
    },
    {
      name: "etc",
      type: "dir",
      children: [
        { name: "hosts", type: "file", size: 1024 }, // 1KB
        { name: "passwd", type: "file", size: 2048 }, // 2KB
        {
          name: "nginx",
          type: "dir",
          children: [{ name: "nginx.conf", type: "file", size: 4096 }] // 4KB
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
            { name: "python", type: "file", size: 16 * 1024 * 1024 }, // 16MB
            { name: "node", type: "file", size: 48 * 1024 * 1024 } // 48MB
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
          children: [{ name: "syslog", type: "file", size: 256 * 1024 }] // 256KB
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
                    { name: "chapter1.md", type: "file", size: 2048, content: `# Chapter 1: Introduction

This is the introduction to the thesis. It explains the problem and motivation.

- Point one
- Point two` },
                    { name: "chapter2.md", type: "file", size: 1536, content: `# Chapter 2: Methods

This section describes the methods used in the study.

1. Data collection
2. Analysis` }
                  ]
                },
                {
                  name: "Notes",
                  type: "dir",
                  children: [{ name: "meeting.txt", type: "file", size: 512 }]
                },
                {
                  name: "Research",
                  type: "dir",
                  children: [
                    { name: "example.fasta", type: "file", size: 1024, content: `>seq1
ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGC
>seq2
GCTAGCTAGCTGACTGACTGACGATCGATCGTA
>seq3
TTGACGATCGATCGATCGATCGATCGATCGTAGCTA` },
                    { name: "variants.vcf", type: "file", size: 2560, content: `##fileformat=VCFv4.2
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
                    { name: "index.html", type: "file", size: 1024, content: `<!doctype html>
<html>
<head><title>Example Webapp</title></head>
<body>
  <h1>Welcome to the Webapp</h1>
  <div id="root"></div>
</body>
</html>` },
                    { name: "app.tsx", type: "file", size: 2048, content: `import React from 'react';
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
                      size: 512,
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
              children: [{ name: "vacation.jpg", type: "file", size: 3 * 1024 * 1024 }] // 3MB
            },
            {
              name: "Downloads",
              type: "dir",
              children: [
                { name: "installer.sh", type: "file", size: 8192 }, // 8KB
                { name: "gene_annotations.tsv", type: "file", size: 15360, content: `gene_id	description

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
            { name: ".bashrc", type: "file", size: 1024 },
            { name: ".profile", type: "file", size: 512 },
            { name: "README.txt", type: "file", size: 1280, content: `This is the user README for the filesystem visualizer. Use commands like ls, cd, cat, head, tail, wc, and grep to explore.` },
            {
              name: "Examples",
              type: "dir",
              children: [
                {
                  name: "grocery.txt",
                  type: "file",
                  size: 256,
                  content: `Milk
Eggs
Bread
Apples
Chicken`
                },
                {
                  name: "expenses.csv",
                  type: "file",
                  size: 1024,
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
                { name: "welcome.txt", type: "file", size: 256 },
                { name: "setup_notes.md", type: "file", size: 2048 }
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
                    { name: "paper1.pdf", type: "file", size: 2 * 1024 * 1024 }, // 2MB
                    { name: "paper2.pdf", type: "file", size: 1.5 * 1024 * 1024 }, // 1.5MB
                    {
                      name: "Data",
                      type: "dir",
                      children: [
                        { name: "experiment_results.csv", type: "file", size: 32 * 1024 }, // 32KB
                        {
                          name: "sample_metadata.tsv",
                          type: "file",
                          size: 512,
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
                    { name: "react_hooks.md", type: "file", size: 4096 },
                    { name: "filesystem_visualizer.md", type: "file", size: 6144 }
                  ]
                },
                { name: "todo.txt", type: "file", size: 256 },
                { name: "journal.md", type: "file", size: 8192 }
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
                    { name: "pipeline.sh", type: "file", size: 4096 },
                    { name: "README.md", type: "file", size: 2048 },
                    {
                      name: "pipeline.log",
                      type: "file",
                      size: 1536,
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
                    { name: "index.html", type: "file", size: 2048 },
                    { name: "app.tsx", type: "file", size: 8192 }
                  ]
                },
                {
                  name: "blog",
                  type: "dir",
                  children: [
                    { name: "2025-07-01-intro.md", type: "file", size: 2048 },
                    { name: "2025-07-15-update.md", type: "file", size: 3072 }
                  ]
                }
              ]
            },
            {
              name: "Pictures",
              type: "dir",
              children: [
                { name: "conference.jpg", type: "file", size: 2.5 * 1024 * 1024 }, // 2.5MB
                { name: "family.png", type: "file", size: 1.8 * 1024 * 1024 } // 1.8MB
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
                    { name: "song1.mp3", type: "file", size: 3.5 * 1024 * 1024 }, // 3.5MB
                    { name: "song2.mp3", type: "file", size: 4.2 * 1024 * 1024 } // 4.2MB
                  ]
                }
              ]
            },
            {
              name: "Downloads",
              type: "dir",
              children: [
                { name: "dataset.zip", type: "file", size: 25 * 1024 * 1024 }, // 25MB
                { name: "script_runner.py", type: "file", size: 3072 }
              ]
            },
            {
              name: "Scripts",
              type: "dir",
              children: [
                { name: "deploy.sh", type: "file", size: 1024 },
                { name: "cleanup.py", type: "file", size: 2048 }
              ]
            },
            {
              name: "Config",
              type: "dir",
              children: [
                { name: "settings.json", type: "file", size: 1024 },
                {
                  name: "themes",
                  type: "dir",
                  children: [
                    { name: "dark.json", type: "file", size: 512 },
                    { name: "light.json", type: "file", size: 512 }
                  ]
                }
              ]
            },
            {
              name: ".config",
              type: "dir",
              children: [{ name: "app.conf", type: "file", size: 256 }]
            },
            { name: ".bashrc", type: "file", size: 1024 },
            { name: ".zshrc", type: "file", size: 1536 },
            { name: ".gitconfig", type: "file", size: 512 },
            { name: "recipes.md", type: "file", size: 4096 },
            { name: "budget.xlsx", type: "file", size: 64 * 1024 }, // 64KB
            { name: "archive.tar.gz", type: "file", size: 128 * 1024 * 1024 } // 128MB
          ]
        }
      ]
    }
  ]
};