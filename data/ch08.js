window.HLW.chapters.push({
  id: 8,
  title: 'A Closer Look at Processes and Resource Utilization',
  short: 'Processes & resources',
  track: 'admin',
  ref: 'Chapter 8',
  sectionsRef: '8.1–8.7',
  minutes: 50,
  tagline: 'Find the process, measure the cost, set the limit.',
  blurb: 'Use lsof, strace and /proc to see what processes are doing; read load, CPU, memory and I/O; then constrain workloads with cgroups.',
  objectives: [
    'Inspect process state and open files with ps, /proc and lsof.',
    'Trace system calls and library calls to diagnose hangs and failures.',
    'Distinguish threads from processes and measure per-thread CPU use.',
    'Interpret load averages, CPU time, memory counters and I/O statistics.',
    'Explain cgroups v1 versus v2 and apply resource limits to services.'
  ],
  sections: [
    {
      id: 'ch8-tracking',
      ref: '8.1–8.2',
      title: 'Tracking processes and open files',
      html: `<p>The kernel exposes each process through <code>/proc/PID</code>. <code>status</code> holds identity, state and memory counters; <code>cmdline</code> holds the argument vector; <code>fd/</code> holds open file descriptors as symlinks; <code>maps</code> shows the memory map. Tools such as <code>ps</code>, <code>top</code> and <code>lsof</code> are convenient views over this data.</p>
      <pre><code>$ ps -eo pid,ppid,stat,%cpu,%mem,etime,cmd --sort=-%cpu | head
$ cat /proc/PID/status
$ ls -l /proc/PID/fd
$ lsof -p PID
$ lsof +D /mnt/data        # who is using this directory?
$ lsof +L1                 # deleted files still held open</code></pre>
      <p><strong>lsof</strong> lists open files, including regular files, directories, sockets, pipes and devices. Its columns are command, PID, user, fd, type, device, size/offset, node and name. For network troubleshooting, <code>lsof -i</code> shows sockets; for a “device busy” unmount, <code>lsof +D</code> names the culprits.</p>
      <p>Process states in <code>ps</code> are a compact diagnostic language: <code>R</code> runnable, <code>S</code> interruptible sleep, <code>D</code> uninterruptible sleep (usually I/O), <code>T</code> stopped, <code>Z</code> zombie. A pile of <code>D</code> processes points at storage or a stuck driver, not at CPU starvation.</p>`,
      diagram: {
        type: 'flow',
        caption: 'A process state machine, simplified',
        items: [
          { t: 'Running (R)', d: 'on CPU or run queue' },
          { t: 'Sleeping (S)', d: 'waiting for an event' },
          { t: 'Disk sleep (D)', d: 'uninterruptible I/O wait' },
          { t: 'Stopped (T)', d: 'signal or debugger' },
          { t: 'Zombie (Z)', d: 'exited, awaiting reap' }
        ]
      }
    },
    {
      id: 'ch8-tracing',
      ref: '8.3',
      title: 'Tracing program execution',
      html: `<p><strong>strace</strong> prints the system calls a process makes; <strong>ltrace</strong> prints library calls. They are indispensable when a program fails without a useful error, hangs before logging, or behaves differently under load.</p>
      <pre><code>$ strace ls /
$ strace -f -e trace=openat,stat,connect ./app
$ strace -p PID -T -tt
$ ltrace ./app</code></pre>
      <p><code>-f</code> follows forked children, <code>-p</code> attaches to a running process, <code>-e</code> filters calls, <code>-T</code> shows time spent in each call, and <code>-tt</code> timestamps entries. Look for repeated <code>EAGAIN</code>, <code>ENOENT</code>, <code>EACCES</code> or a call that never returns. A process stuck in <code>read()</code> is waiting for input; one looping on <code>connect()</code> has a network problem.</p>
      <p>Tracing has overhead and can change timing, so use it on a reproduction or a narrow filter. If a program is blocked in the kernel, <code>/proc/PID/stack</code> and <code>/proc/PID/wchan</code> can show the kernel wait channel; <code>perf</code> and eBPF tools go deeper when available.</p>
      <div class="callout note"><span class="co-ico">i</span><div><div class="co-title">Permission</div><p>Attaching to another user's process usually requires root or ptrace capability. On hardened systems, Yama's ptrace_scope restricts tracing to descendants.</p></div></div>`
    },
    {
      id: 'ch8-threads',
      ref: '8.4',
      title: 'Threads and per-thread views',
      html: `<p>A process can contain multiple <strong>threads</strong>: independent execution contexts that share the address space, open files and credentials. The kernel schedules threads, not just processes. Each thread has its own stack, registers and thread ID (TID), visible as a task under <code>/proc/PID/task/</code>.</p>
      <pre><code>$ ps -eLf
$ ps -T -p PID
$ top -H -p PID
$ ls /proc/PID/task/</code></pre>
      <p>In <code>ps -eLf</code>, the LWP column is the thread ID. <code>top -H</code> shows one line per thread, which is essential for finding a runaway worker inside a multithreaded server. <code>pidstat -t -p PID 1</code> gives per-thread CPU statistics.</p>
      <p>Threads share memory, so a bug in one can corrupt all of them. They are cheaper to create than processes but require synchronisation (mutexes, atomics) and careful signal handling. Container and cgroup limits apply to the whole process group, not individual threads, unless you configure per-thread controls.</p>`
    },
    {
      id: 'ch8-cpu',
      ref: '8.5.1–8.5.3',
      title: 'CPU time, priorities and load average',
      html: `<p>CPU time is consumed in user mode (<code>us</code>) and kernel mode (<code>sy</code>), with <code>nice</code> and real-time classes affecting scheduling. <code>%CPU</code> in <code>ps</code> is an average over the process lifetime, not an instant; <code>top</code> and <code>pidstat</code> give interval-based samples.</p>
      <pre><code>$ time ./build.sh
$ nice -n 10 ./batch-job
$ renice 5 -p PID
$ uptime
$ vmstat 1 5</code></pre>
      <p>Nice values range from -20 (highest priority) to 19 (lowest); only root can lower a nice value. Nice is a hint to the scheduler, not a hard guarantee. Real-time scheduling classes (SCHED_FIFO, SCHED_RR) can starve ordinary tasks and should be used sparingly.</p>
      <p>The <strong>load average</strong> is the average number of tasks that are runnable or in uninterruptible sleep over 1, 5 and 15 minutes. It is not a percentage. Compare it with the number of CPUs: a load of 4 on a 4-CPU machine is roughly saturated; a load of 4 on a 1-CPU machine is heavily oversubscribed. High load with low CPU usage often means I/O waits or <code>D</code>-state processes.</p>
      <p><code>vmstat</code> adds the run queue (<code>r</code>), blocked tasks (<code>b</code>), swap in/out (<code>si/so</code>), CPU breakdown and context switches. Read several samples; the first line is an average since boot.</p>`
    },
    {
      id: 'ch8-memory',
      ref: '8.5.4–8.5.7',
      title: 'Memory, I/O and per-process monitoring',
      html: `<p>Linux uses free RAM for caches, so “free” memory is not the same as “available” memory. Read <code>free -h</code> and focus on <code>available</code>, then on swap activity. A system with little free memory but plenty of available memory is healthy.</p>
      <pre><code>$ free -h
$ cat /proc/meminfo
$ vmstat 1
$ iostat -xz 1
$ pidstat 1
$ pidstat -d 1
$ iotop</code></pre>
      <p><code>iostat -xz</code> shows per-device utilisation, queue depth and latency. High <code>%util</code> with rising await indicates a saturated disk. <code>pidstat -d</code> attributes I/O to processes; <code>iotop</code> does the same interactively. <code>pidstat -r</code> shows per-process memory faults and RSS.</p>
      <p>Metrics are only useful with a baseline. Record normal values for your workload, then compare during an incident. Watch for the classic patterns: CPU-bound (high us/sy, low I/O wait), memory pressure (swap in/out, direct reclaim), I/O-bound (high await, low CPU), and lock contention (high sy, low throughput).</p>`,
      callout: {
        type: 'tip',
        title: 'The USE method',
        text: 'For each resource check utilisation, saturation and errors: CPU run queue, memory swap and OOM kills, disk %util and await, network drops and retransmits. It turns a vague "slow" report into specific evidence.'
      }
    },
    {
      id: 'ch8-cgroups',
      ref: '8.6',
      title: 'Control groups (cgroups)',
      html: `<p><strong>cgroups</strong> organise processes into hierarchies and apply resource limits, accounting and isolation. They are the mechanism behind containers, systemd service limits and per-user resource control.</p>
      <p><strong>cgroups v1</strong> has separate hierarchies per controller (cpu, memory, blkio, pids). <strong>cgroups v2</strong> uses a single unified hierarchy with per-controller files, which makes delegation and accounting more coherent. Most current distributions use v2; containers may still expose v1 compatibility.</p>
      <pre><code>$ mount | grep cgroup
$ systemd-cgtop
$ systemctl status nginx        # cgroup path is shown
$ cat /sys/fs/cgroup/system.slice/nginx.service/memory.max
$ systemd-run --slice=limited.slice --property=MemoryMax=512M sleep 1h
$ systemctl set-property nginx.service CPUQuota=50%</code></pre>
      <p>Common v2 controllers include <code>cpu</code> (weight and quota), <code>memory</code> (max, high, low, swap), <code>io</code> (bandwidth and latency), <code>pids</code> (process count) and <code>cpuset</code> (CPU and memory-node pinning). Limits are enforced by the kernel, which can throttle, reclaim or kill (OOM) when a group exceeds its budget.</p>
      <p>systemd exposes cgroups through slices and service properties such as <code>MemoryMax</code>, <code>CPUQuota</code> and <code>TasksMax</code>. Docker and Podman create cgroups for each container. You rarely write to cgroup files directly; use systemd or the container runtime so the hierarchy stays consistent.</p>`
    }
  ],
  commands: [
    { cmd: 'ps -eo pid,ppid,stat,%cpu,%mem,etime,cmd --sort=-%cpu | head', desc: 'Show the top CPU-consuming processes with their state and elapsed time.' },
    { cmd: 'cat /proc/PID/status', desc: 'Inspect a process\u2019s identity, state, memory and capability fields.' },
    { cmd: 'lsof -p PID', desc: 'List all files and sockets open by a process.' },
    { cmd: 'lsof +D /mnt/data', desc: 'Find processes using files under a directory (useful for busy unmounts).' },
    { cmd: 'lsof +L1', desc: 'List deleted files that are still open and consuming space.' },
    { cmd: 'strace -f -e trace=openat,connect ./app', desc: 'Trace file and network-related system calls, following children.' },
    { cmd: 'ps -eLf', desc: 'List processes and threads with LWP (thread) IDs.' },
    { cmd: 'top -H -p PID', desc: 'Show per-thread CPU usage inside one process.' },
    { cmd: 'nice -n 10 ./job', desc: 'Start a CPU-intensive job at lower priority.' },
    { cmd: 'renice 5 -p PID', desc: 'Change the nice value of a running process.' },
    { cmd: 'uptime', desc: 'Show load averages for 1, 5 and 15 minutes.' },
    { cmd: 'vmstat 1 5', desc: 'Sample run queue, memory, swap, CPU and context switches once per second.' },
    { cmd: 'iostat -xz 1', desc: 'Show per-device I/O utilisation, queue and latency (sysstat).' },
    { cmd: 'pidstat -d 1', desc: 'Show per-process I/O rates (sysstat).' },
    { cmd: 'systemd-cgtop', desc: 'Show resource usage by systemd cgroup/slice/service.' }
  ],
  labs: [
    {
      title: 'Dissect a running process',
      goal: 'Connect ps, /proc, lsof and strace on a process you control.',
      steps: [
        'Start a long idle process such as <code>sleep 600 &amp;</code> and record its PID.',
        'Run <code>ps -p PID -o pid,ppid,stat,%cpu,%mem,etime,cmd</code> and inspect <code>/proc/PID/status</code>.',
        'List its file descriptors with <code>ls -l /proc/PID/fd</code> and compare with <code>lsof -p PID</code>.',
        'Trace a short command instead: <code>strace -c ls /</code>, and identify the three most frequent system calls.',
        'Kill the sleep process and confirm the /proc directory disappears.'
      ]
    },
    {
      title: 'Read load and memory like an operator',
      goal: 'Build the habit of sampling before concluding.',
      steps: [
        'Run <code>uptime</code>, then <code>nproc</code>. Compare load with CPU count.',
        'Run <code>vmstat 1 5</code> and note r, b, si, so, us, sy, id and wa across samples.',
        'Run <code>free -h</code> and compare free with available. Check swap used.',
        'Start a CPU burner such as <code>yes &gt; /dev/null &amp;</code>, watch <code>top</code> for 10 seconds, then kill it.',
        'Run <code>systemd-cgtop</code> if available and identify which slice uses the most CPU.'
      ]
    }
  ],
  cards: [
    { front: 'What does a high load average with low CPU usage suggest?', back: 'Many tasks are blocked, often in uninterruptible I/O sleep (D state) or waiting on a resource such as a slow disk or network filesystem.' },
    { front: 'What is lsof +L1 used for?', back: 'Listing deleted files that still have open file descriptors, which explains why df shows a full disk after a log file was removed.' },
    { front: 'strace vs ltrace', back: 'strace traces system calls (kernel boundary). ltrace traces library calls (user-space functions).' },
    { front: 'What is a thread?', back: 'An execution context inside a process that shares the address space and open files but has its own stack, registers and TID.' },
    { front: 'What does nice do?', back: 'Adjusts scheduling priority from -20 (most favourable) to 19 (least). It is a hint, not a hard limit, and only root can lower values.' },
    { front: 'cgroups v1 vs v2', back: 'v1 has separate hierarchies per controller. v2 uses one unified hierarchy with per-controller files and better delegation.' },
    { front: 'Which free memory figure matters?', back: 'Available, not free. Linux uses spare RAM for caches; available estimates memory that can be given to new workloads without swapping.' }
  ],
  quiz: [
    {
      q: 'A disk will not unmount because it is “busy”. Which command best identifies the cause?',
      options: ['df -h', 'lsof +D /mnt/disk', 'strace -p 1', 'free -h'],
      answer: 1,
      explain: 'lsof +D lists processes with open files under that directory, including the current working directory of a shell.'
    },
    {
      q: 'What does a load average of 8 mean on a 2-CPU system?',
      options: [
        'The CPUs are 8% utilised.',
        'Roughly four times as many runnable/blocked tasks as CPUs; the system is heavily oversubscribed.',
        'Eight processes are swapped out.',
        'Memory is 8 GB full.'
      ],
      answer: 1,
      explain: 'Load counts runnable plus uninterruptible tasks. Comparing 8 with 2 CPUs shows sustained oversubscription, though the cause could be CPU or I/O.'
    },
    {
      q: 'Which tool shows per-thread CPU usage for one process?',
      options: ['df -i', 'top -H -p PID', 'lsblk', 'journalctl -u PID'],
      answer: 1,
      explain: 'top -H displays threads individually; without -H it aggregates them per process.'
    },
    {
      q: 'What is the key structural difference in cgroups v2?',
      options: [
        'It has no memory controller.',
        'A single unified hierarchy replaces separate per-controller hierarchies.',
        'It only works in containers.',
        'It requires a reboot to change limits.'
      ],
      answer: 1,
      explain: 'cgroups v2 uses one hierarchy with controller files in each cgroup, improving accounting and delegation.'
    },
    {
      q: 'A process is stuck and strace shows it repeatedly calling read() on fd 3 without returning. What is the most likely state?',
      options: ['Zombie', 'Sleeping while waiting for input', 'Running on CPU', 'Stopped by SIGSTOP'],
      answer: 1,
      explain: 'A blocking read means the process is waiting for data (interruptible sleep). It is not consuming CPU; it is waiting for an event.'
    }
  ]
});
