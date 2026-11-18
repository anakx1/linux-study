/* Book metadata and the study tracks that group the 17 chapters. */
window.HLW = {
  title: 'How Linux Works',
  subtitle: 'What Every Superuser Should Know',
  author: 'Brian Ward',
  edition: '3rd Edition',
  publisher: 'No Starch Press',
  year: 2021,
  source: 'How_Linux_Works_3rd_Edition_-_Brian_Ward.pdf',
  tracks: [
    { id: 'foundations', name: 'Foundations', short: 'Foundations', range: 'Chapters 1–2', desc: 'The shape of a Linux system and the command line that drives it.' },
    { id: 'storage', name: 'Devices, disks & boot', short: 'Disks & boot', range: 'Chapters 3–6', desc: 'How the kernel sees hardware, stores data, and hands control to user space.' },
    { id: 'admin', name: 'System administration', short: 'Administration', range: 'Chapters 7–8', desc: 'Logs, time, users, processes, and the resources they consume.' },
    { id: 'network', name: 'Networking & shell', short: 'Networking', range: 'Chapters 9–12', desc: 'Packets, routes, services, scripts, and moving files between machines.' },
    { id: 'desktop', name: 'Desktop & development', short: 'Desktop & dev', range: 'Chapters 13–17', desc: 'User environments, graphical stacks, toolchains, source builds and virtualization.' }
  ],
  chapters: []
};
