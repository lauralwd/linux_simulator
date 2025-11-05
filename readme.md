# Linux Navigation Simulator

Linux Navigation Simulator is an interactive web-based tool for learning and practicing basic Linux command line navigation and file operations, designed specifically for life sciences researchers and absolute beginners. The app visualizes a Unix-style filesystem, provides realistic shell prompt interaction, and presents structured exercises to help you master navigation, inspection, and text processing commands in a safe, sandboxed environment.

## Features

- **Interactive Directory Tree:**  
  Visually explore and navigate a simulated Unix filesystem. The current working directory is highlighted and synced with shell activity.
- **Command Line Practice:**  
  Practice commands (`cd`, `ls`, `pwd`, `cat`, `head`, `tail`, `wc`, `grep`, `cut`, and pipes) in a realistic shell interface.
- **Exercise Sets:**  
  Work through stepwise, themed exercise groups — including both biological (FASTA, TSV, CSV) and general (grocery lists, expenses) data — with automatic solution checking and progress tracking.
- **File Content Inspection:**  
  View contents of files and use real Unix tools to process text, tabular, and biological data.
- **Guided Hints & Tooltips:**  
  Hover over any supported command for an instant usage guide and example.
- **Keyboard and Mouse Navigation:**  
  Navigate the filesystem with your mouse or keyboard arrow keys, just like on a real system.
- **Accessible and Themed:**  
  Dark mode, ARIA labeling, accessible contrast, and responsive design for a pleasant learning experience.

## Who is this for?

- Absolute beginners to the Linux shell
- Life science researchers (PhD candidates, students) in need of data-wrangling skills
- Teachers, trainers, and self-learners looking for a gentle but realistic CLI sandbox

## How to use

1. **Explore the Filesystem:**  
   Use the directory tree on the left to click through folders, or move with arrow keys.
2. **Use the Terminal:**  
   Try out supported commands in the shell on the right. Hover over any listed command for a tooltip.
3. **Complete Exercises:**  
   Exercises appear in themed groups. Each must be solved in order; your progress is saved as you go.
4. **Inspect Files:**  
   Use `cat`, `head`, `tail`, `wc`, and `grep` to explore file content.
5. **Experiment Freely:**  
   No real files or directories are changed — it’s all virtual and safe!

## Getting started (developer instructions)

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/linux-navigation-simulator.git
   cd linux-navigation-simulator
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Start local development server:**
   ```sh
   npm run dev
   # or
   yarn run dev
   ```

4. **Build for GitHub Pages deployment:**
   ```sh
   npm run build
   # then follow your static hosting instructions
   ```

## Customization

- **Edit Exercises:**  
  Add or modify missions in `src/components/Missions.tsx`.
- **Filesystem Structure:**  
  Adjust the virtual filesystem and file contents in `src/fs.ts`.
- **Add More Commands:**  
  Extend shell logic in `src/hooks/useShell.tsx`.

## License

MIT

---

## Demo

Hosted online here [lauralwd.github.io/linux_simulator/](https://lauralwd.github.io/linux_simulator/)

## Contact & Contributions

Pull requests, issues, and suggestions welcome!  
Created by Laura Dijkhuizen for Linux & HPC for life sciences teaching at Utrecht University.
