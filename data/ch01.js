window.HLW.chapters.push({
  id: 1,
  title: 'The Big Picture',
  short: 'Big Picture',
  track: 'foundations',
  ref: 'Chapter 1',
  sectionsRef: '1.1–1.6',
  minutes: 25,
  tagline: 'Three layers, one machine: hardware, kernel, user space.',
  blurb: 'Build the mental model the rest of the book depends on: abstraction layers, kernel mode versus user mode, what the kernel actually manages, and where users fit in.',
  objectives: [
    'Describe the three levels of a Linux system: hardware, kernel and user space.',
    'Explain the difference between kernel mode and user mode, and why it matters.',
    'List the kernel\u2019s four main responsibilities: processes, memory, devices and system calls.',
    'Explain what a process is and how users and groups control access.'
  ],
  sections: [
    {
      id: 'ch1-layers',
      ref: '1.1',
      title: 'Levels and layers of abstraction',
      html: `<p>A Linux system is easiest to understand as three stacked levels. At the bottom is <strong>hardware</strong>: the CPU, main memory, disks, network interfaces and other devices. At the top is <strong>user space</strong>: all of the running programs you interact with. In between sits the <strong>kernel</strong>, the core of the operating system.</p>
      <p>The kernel is software resident in memory that mediates between hardware and processes. It decides which process gets the CPU, hands out memory, and operates devices on behalf of programs. User processes never touch hardware directly; they ask the kernel, and the kernel enforces the rules.</p>
      <p>The point of abstraction is not to hide everything, but to let you reason at the right level. When a web server misbehaves you can ask separate questions: is the application wrong, is the kernel refusing a resource, or is the hardware failing? Each layer has its own tools and evidence.</p>`,
      diagram: {
        type: 'layers',
        caption: 'Figure 1-1 (paraphrased): general Linux system organisation',
        items: [
          { t: 'User space', d: 'Shells · web servers · editors · databases · your code', cls: 'hot' },
          { t: 'Kernel', d: 'Processes · memory · device drivers · system calls', cls: 'warm' },
          { t: 'Hardware', d: 'CPU · RAM · disks · NICs · USB · peripherals' }
        ]
      }
    },
    {
      id: 'ch1-modes',
      ref: '1.1',
      title: 'Kernel mode versus user mode',
      html: `<p>Code running in <strong>kernel mode</strong> has unrestricted access to the CPU and all memory. A bug here can corrupt the entire system. Code in <strong>user mode</strong> can only reach a restricted subset of memory and safe CPU instructions. That restriction is the basis of stability: a crashing browser should not be able to take down a database server.</p>
      <p>The memory only the kernel can access is called <strong>kernel space</strong>; the memory available to ordinary processes is <strong>user space</strong>. The CPU itself enforces the boundary, switching modes when a process makes a system call or when an interrupt arrives.</p>
      <p>Most “the system froze” problems are resource or kernel problems; most “the app crashed” problems are confined to user space. Knowing which side of the boundary you are debugging narrows the search enormously.</p>`,
      callout: {
        type: 'note',
        title: 'Kernel threads',
        text: 'The kernel can run kernel threads that look like processes but have access to kernel space. Examples include kthreadd and kblockd; you will see them in ps output with names in square brackets.'
      }
    },
    {
      id: 'ch1-memory',
      ref: '1.2',
      title: 'Memory, bits and state',
      html: `<p>Main memory is a large array of bits grouped into bytes and pages. Every running program and the kernel itself is just a collection of bits in memory. The CPU reads instructions and data from memory and writes results back.</p>
      <p>A <strong>state</strong> is a particular arrangement of bits. Because a single process can contain millions of bits, we usually describe state in human terms: “the process is waiting for input” or “the kernel is servicing an interrupt”. An <strong>image</strong> is a specific physical arrangement of bits — for example, an executable file on disk.</p>
      <p>Nearly everything the kernel does revolves around memory: splitting it into regions, tracking which process owns which region, sharing pages copy-on-write, and reclaiming pages when memory runs low.</p>`
    },
    {
      id: 'ch1-kernel',
      ref: '1.3',
      title: 'What the kernel manages',
      html: `<p>The kernel has four broad areas of responsibility:</p>
      <ul>
        <li><strong>Processes.</strong> Decide which process may use the CPU, when, and for how long. Implement context switches and scheduling.</li>
        <li><strong>Memory.</strong> Track allocated, shared and free memory; give each process its own protected address space.</li>
        <li><strong>Device drivers.</strong> Provide a uniform interface between hardware and processes. Most actual hardware operation happens here.</li>
        <li><strong>System calls and support.</strong> Expose controlled entry points so processes can request privileged work.</li>
      </ul>
      <p>The kernel is not one monolithic block of code in practice. It is a collection of subsystems that call one another, with strict internal interfaces. Loadable modules let drivers and features be added at runtime.</p>
      <h3>A system call, end to end</h3>
      <p>When a program calls <code>read()</code>, the C library places the syscall number and arguments in registers and executes a special trap instruction. The CPU switches to kernel mode, the kernel validates the request, performs the I/O (or returns an error), and switches back to user mode. The program resumes with a return value and <code>errno</code> set on failure.</p>
      <pre><code>user program:  read(fd, buf, count)
                    |
                    v  trap / syscall instruction
kernel:        validate fd, permissions, buffer
               schedule I/O, copy data
                    |
                    v  return to user mode
user program:  bytes read, or -1 with errno</code></pre>`,
      diagram: {
        type: 'flow',
        caption: 'A system call crosses the user/kernel boundary',
        items: [
          { t: 'User process', d: 'calls read()' },
          { t: 'System call', d: 'trap into kernel' },
          { t: 'Kernel', d: 'validates + performs I/O' },
          { t: 'Return', d: 'result + errno' }
        ]
      }
    },
    {
      id: 'ch1-users',
      ref: '1.4–1.6',
      title: 'User space, users and groups',
      html: `<p><strong>User space</strong> is the upper level: the collection of running processes. A process is a running program, whether or not a human is directly using it. Web servers, databases and daemons are all user processes even though nobody is typing at them.</p>
      <p>Linux is a multi-user system. Every process runs as a <strong>user</strong> and belongs to one or more <strong>groups</strong>. The <strong>root</strong> user (UID 0) bypasses most permission checks and can do almost anything. That power is why daily work should use an ordinary account and privilege should be raised deliberately, usually with <code>sudo</code>.</p>
      <p>Groups exist to share access: a file can grant permissions to its owner, its group, and everyone else. The kernel checks these permissions on every file operation.</p>
      <div class="callout key"><span class="co-ico">★</span><div><div class="co-title">The one-sentence summary</div><p>The kernel manages processes and hardware in kernel mode; user processes run in user mode and ask the kernel for anything privileged; users and groups decide who may ask for what.</p></div></div>`
    }
  ],
  commands: [
    { cmd: 'uname -a', desc: 'Show kernel name, release, build and machine architecture.' },
    { cmd: 'uname -r', desc: 'Print only the running kernel release.' },
    { cmd: 'cat /proc/cmdline', desc: 'Show the kernel command line supplied by the boot loader.' },
    { cmd: 'free -h', desc: 'Summarise total, used, free, shared and cached memory in human units.' },
    { cmd: 'ps aux', desc: 'List every process with owner, CPU, memory, state and command.' },
    { cmd: 'dmesg', desc: 'Read the kernel ring buffer: boot messages and hardware events.' },
    { cmd: 'id', desc: 'Show the current user\u2019s UID, GID and supplementary groups.' },
    { cmd: 'cat /proc/meminfo', desc: 'Inspect detailed kernel memory counters.' }
  ],
  labs: [
    {
      title: 'Map your own machine',
      goal: 'Connect the three-layer model to the system you are using right now.',
      steps: [
        'Run <code>uname -r</code> and <code>uname -m</code>. Note the kernel release and CPU architecture.',
        'Run <code>ps -p 1 -o pid,user,comm,args</code>. Process 1 is the first user-space program; identify your init system.',
        'Run <code>free -h</code>, then <code>head -5 /proc/meminfo</code>. Compare the summary with the raw counters.',
        'Run <code>dmesg | head -30</code>. Find one hardware device the kernel detected at boot.',
        'Run <code>id</code>. Identify your UID and whether you are a member of any supplementary groups.'
      ]
    },
    {
      title: 'Observe the user/kernel boundary',
      goal: 'See that ordinary programs request privileged work through the kernel.',
      steps: [
        'Run <code>strace -c ls /</code> if strace is installed. The summary counts system calls such as openat, read and write.',
        'Run <code>ls -l /dev/null</code> and <code>cat /dev/null</code>. The device file is a user-space handle to a kernel object.',
        'Use <code>man 2 intro</code> to list the system-call section of the manual. Pick one call and read its ERRORS section.',
        'Explain in your own words why a user process cannot directly program a disk controller.'
      ]
    }
  ],
  cards: [
    { front: 'What are the three main levels of a Linux system?', back: 'Hardware at the base, the kernel in the middle, and user space (running processes) at the top.' },
    { front: 'Kernel mode vs user mode', back: 'Kernel mode has unrestricted CPU and memory access. User mode is restricted to a safe subset; the CPU enforces the boundary.' },
    { front: 'Name the kernel\u2019s four main areas of responsibility.', back: 'Process management, memory management, device drivers, and system calls/support.' },
    { front: 'What is a process?', back: 'A running program managed by the kernel. It includes an address space, one or more threads, open files and credentials.' },
    { front: 'What is a system call?', back: 'A controlled request from a user process to the kernel, made via a trap instruction. It switches the CPU into kernel mode.' },
    { front: 'Why is root dangerous?', back: 'UID 0 bypasses most permission checks. A mistake or compromised process running as root can damage the whole system.' }
  ],
  quiz: [
    {
      q: 'Which statement best describes the kernel?',
      options: [
        'A library linked into every application.',
        'The core software that mediates between hardware and user processes.',
        'The collection of login shells and desktop programs.',
        'Firmware stored on the motherboard.'
      ],
      answer: 1,
      explain: 'The kernel is the core of the operating system. It runs in kernel mode, manages hardware and memory, and exposes system calls to user processes.'
    },
    {
      q: 'A user-space process wants to read a file. What actually performs the disk I/O?',
      options: ['The process directly', 'The C library alone', 'The kernel, on the process\u2019s behalf', 'The boot loader'],
      answer: 2,
      explain: 'User processes request I/O through system calls. The kernel validates the request and operates the device; the process never drives hardware directly.'
    },
    {
      q: 'What is the main benefit of user mode restrictions?',
      options: [
        'Programs run faster.',
        'A crashing process is less likely to corrupt the kernel or other processes.',
        'Users cannot read their own files.',
        'It removes the need for permissions.'
      ],
      answer: 1,
      explain: 'User mode limits the memory and CPU operations a process can use. A crash is contained and can be cleaned up by the kernel, rather than taking down the machine.'
    },
    {
      q: 'Which of these is NOT one of the kernel\u2019s four main responsibilities from Chapter 1?',
      options: ['Process management', 'Memory management', 'Compiling applications', 'Device drivers'],
      answer: 2,
      explain: 'Compiling is a user-space activity performed by tools such as gcc. The kernel manages processes, memory, devices, and system-call support.'
    },
    {
      q: 'What does UID 0 mean?',
      options: ['The first ordinary user account', 'The root user, which bypasses most permission checks', 'A process with no owner', 'The kernel itself'],
      answer: 1,
      explain: 'UID 0 is root. It can bypass most file permission checks, which is why routine work should not be done as root.'
    }
  ]
});
