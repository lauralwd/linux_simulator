import React from "react";

const Footer: React.FC = () => (
  <footer>
    <small>
      Developed by Laura Dijkhuizen, biologist and bioinformatics trainer at Utrecht University.<br />
      This web application is designed as an interactive simulator to help life science researchers quickly get comfortable with essential Linux command line navigation.<br />
      It complements the “Linux and HPC Basics for Researchers” course, providing hands-on practice in a safe, client-side environment.<br />
      The tool emphasizes core commands such as <code>cd</code>, <code>ls</code>, and <code>pwd</code>, supporting beginners in building confidence before working on real HPC systems.<br />
      <br />
      Source code and contributions available on <a href="https://github.com/lauralwd/linux_simulator" target="_blank" rel="noopener noreferrer">GitHub</a>.
    </small>
  </footer>
);

export default Footer;