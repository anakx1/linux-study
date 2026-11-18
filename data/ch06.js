window.HLW.chapters.push({
  id: 6,
  title: 'How User Space Starts',
  short: 'User space starts',
  track: 'storage',
  ref: 'Chapter 6',
  sectionsRef: '6.1–6.9',
  minutes: 45,
  tagline: 'PID 1 and the dependency graph that becomes a running system.',
  blurb: 'Understand init, systemd units and targets, service management, socket and timer activation, SysV compatibility, shutdown, and emergency recovery.',
  objectives: [
    'Identify the init system and explain what PID 1 does.',
    'Read and manipulate systemd units, dependencies and targets.',
    'Start, enable, inspect and troubleshoot services.',
    'Use timers, socket activation and drop-in configuration.',
    'Understand SysV runlevels, shutdown, rescue targets and the initramfs handoff.'
  ],
  sections: [
    {
      id: 'ch6-init',
      ref: '6.1–6.2',
      title: 'Init: the first user-space process',
      html: `<p>After mounting the root filesystem, the kernel executes the program named by <code>init=</code> on the command line, or <code>/sbin/init</code> by default. That process becomes <strong>PID 1</strong>. It runs until shutdown, adopts orphaned processes, and is responsible for starting everything else.</p>
      <pre><code>$ ps -p 1 -o pid,comm,args
$ readlink -f /sbin/init
$ systemctl --version</code></pre>
      <p>Most modern distributions use <strong>systemd</strong>. Others use OpenRC (Alpine, Gentoo), runit (Void), s6 or SysV init. BSD systems use their own init. The concepts are similar — start services in dependency order, supervise them, and respond to shutdown — but the tools differ.</p>
      <p>systemd is more than an init: it is a service manager, cgroup manager, device manager front end, login manager, journal and timer engine, all coordinated through a common unit model. That integration is powerful, but it means learning its vocabulary is essential for administration.</p>`
    },
    {
      id: 'ch6-units',
      ref: '6.3.1',
      title: 'Units and unit types',
      html: `<p>A <strong>unit</strong> is a named object systemd knows how to manage. Its type is encoded in the filename suffix:</p>
      <ul>
        <li><code>.service</code> — a daemon or one-shot program.</li>
        <li><code>.socket</code> — an IPC or network socket that can activate a service on demand.</li>
        <li><code>.target</code> — a grouping/synchronisation point, analogous to a runlevel.</li>
        <li><code>.timer</code> — a scheduled trigger, alternative to cron.</li>
        <li><code>.mount</code>, <code>.automount</code>, <code>.swap</code> — filesystem and swap units.</li>
        <li><code>.path</code> — watch a path and activate a service when it changes.</li>
        <li><code>.slice</code>, <code>.scope</code> — cgroup resource hierarchies and runtime groups.</li>
        <li><code>.device</code> — a kernel device exposed to systemd.</li>
      </ul>
      <p>Unit files are searched in <code>/usr/lib/systemd/system</code> (vendor), <code>/run/systemd/system</code> (runtime), and <code>/etc/systemd/system</code> (local, highest priority). A file in <code>/etc</code> with the same name masks or overrides the vendor file. Drop-in fragments in <code>&lt;unit&gt;.d/*.conf</code> override individual settings without copying the whole unit.</p>
      <pre><code>$ systemctl list-units --type=service
$ systemctl list-unit-files --type=service
$ systemctl cat sshd.service
$ systemctl edit sshd.service    # creates a drop-in</code></pre>`
    },
    {
      id: 'ch6-targets',
      ref: '6.3.2, 6.3.6',
      title: 'Targets and the dependency graph',
      html: `<p>systemd does not start services in a fixed sequence. Each unit declares relationships, and systemd builds a graph. The main relationship types are:</p>
      <ul>
        <li><strong>Wants</strong> — start another unit if possible; failure is non-fatal.</li>
        <li><strong>Requires</strong> — start it and fail if it cannot start.</li>
        <li><strong>After / Before</strong> — ordering only, not dependency.</li>
        <li><strong>Conflicts</strong> — cannot be active at the same time.</li>
      </ul>
      <p>A <strong>target</strong> groups units into a system state. <code>multi-user.target</code> is the normal non-graphical boot; <code>graphical.target</code> adds a display manager; <code>rescue.target</code> is a single-user maintenance mode; <code>emergency.target</code> is even more minimal. <code>default.target</code> is a symlink to the target booted by default.</p>
      <pre><code>$ systemctl get-default
$ systemctl list-dependencies multi-user.target
$ systemctl list-dependencies --reverse sshd.service
$ sudo systemctl isolate multi-user.target</code></pre>
      <p><code>isolate</code> switches to a target and stops units not required by it. On a running desktop that can terminate your graphical session, so use it deliberately. <code>systemctl set-default</code> changes future boots.</p>`,
      diagram: {
        type: 'flow',
        caption: 'A simplified boot target graph',
        items: [
          { t: 'sysinit.target', d: 'devices, mounts, early setup' },
          { t: 'basic.target', d: 'sockets, timers, paths' },
          { t: 'multi-user.target', d: 'network + services + login' },
          { t: 'graphical.target', d: 'display manager' }
        ]
      }
    },
    {
      id: 'ch6-operate',
      ref: '6.3.3–6.3.5',
      title: 'Operating and configuring services',
      html: `<p>The everyday verbs are <code>start</code>, <code>stop</code>, <code>restart</code>, <code>reload</code>, <code>status</code>, <code>enable</code>, <code>disable</code>, <code>mask</code> and <code>unmask</code>. <strong>Start</strong> changes the current state; <strong>enable</strong> changes whether the unit is started at boot by wiring it into a target's <code>wants</code> directory. A service can be running but disabled, or enabled but not running.</p>
      <pre><code>$ sudo systemctl start nginx
$ sudo systemctl enable --now nginx
$ systemctl status nginx
$ sudo systemctl reload nginx
$ sudo systemctl disable nginx
$ sudo systemctl mask nginx     # prevent any start, even by dependency</code></pre>
      <p>After editing a unit file or drop-in, run <code>systemctl daemon-reload</code> so systemd rereads configuration. Then restart the affected service. <code>systemctl reset-failed</code> clears a failed state after you fix the cause.</p>
      <p>systemd places each service in a <strong>cgroup</strong>, so it can track every process the service spawns, even ones that daemonise. <code>systemctl status</code> shows the main PID, cgroup, recent log lines and exit status. <code>journalctl -u nginx -f</code> follows its logs.</p>
      <p>Common service settings in a unit's <code>[Service]</code> section include <code>ExecStart</code>, <code>ExecReload</code>, <code>User</code>, <code>Group</code>, <code>WorkingDirectory</code>, <code>EnvironmentFile</code>, <code>Restart</code> and <code>Type</code> (<code>simple</code>, <code>forking</code>, <code>oneshot</code>, <code>notify</code>). Security hardening options such as <code>ProtectSystem</code>, <code>PrivateTmp</code> and <code>NoNewPrivileges</code> are increasingly common.</p>`
    },
    {
      id: 'ch6-activation',
      ref: '6.3.7–6.3.8',
      title: 'Socket, timer and path activation',
      html: `<p>systemd can start a service only when it is needed. <strong>Socket activation</strong> lets systemd own the listening socket; when a connection arrives, it starts the service and passes the socket. This speeds boot and allows services to be restarted without dropping connections. <strong>Timer units</strong> replace cron for system jobs. <strong>Path units</strong> watch files and directories.</p>
      <pre><code>$ systemctl list-timers --all
$ systemctl status apt-daily.timer
$ systemctl list-sockets
$ systemctl status ssh.socket</code></pre>
      <p>Auxiliary daemons complete the systemd suite: <strong>journald</strong> collects logs, <strong>udevd</strong> handles devices, <strong>logind</strong> manages sessions and seats, <strong>networkd</strong> and <strong>resolved</strong> handle network configuration and DNS on some distributions, <strong>tmpfiles.d</strong> creates runtime directories, and <strong>sysctl.d</strong> applies kernel parameters.</p>
      <p>These components are optional and distribution-dependent. NetworkManager may replace networkd; nscd or dnsmasq may replace resolved. Check what is actually running rather than assuming a “systemd distro” uses every piece.</p>`,
      callout: {
        type: 'tip',
        title: 'Socket activation is not always faster',
        text: 'For services that start instantly, the extra indirection can be unnecessary. It shines for rarely used services and for restarting daemons without losing the listening socket.'
      }
    },
    {
      id: 'ch6-sysv',
      ref: '6.4–6.5',
      title: 'System V init and compatibility',
      html: `<p>Before systemd, SysV init used numbered <strong>runlevels</strong>: 0 halt, 1 single-user, 2–5 multi-user variants (distribution-specific), 6 reboot. Scripts lived in <code>/etc/init.d</code>, and directories <code>/etc/rc0.d</code> through <code>/etc/rc6.d</code> contained <code>S</code> (start) and <code>K</code> (kill) symlinks ordered by number. <code>run-parts</code> executed the scripts in sequence.</p>
      <pre><code>/etc/init.d/network start
/etc/rc3.d/S10network -&gt; ../init.d/network
/etc/rc0.d/K90network -&gt; ../init.d/network</code></pre>
      <p>Commands such as <code>service network start</code> and <code>chkconfig network on</code> (RHEL) or <code>update-rc.d</code> (Debian) manipulated this scheme. Boot was inherently sequential, which made it simple to reason about but slow and brittle when a script hung.</p>
      <p>systemd ships a <strong>systemd-sysv-generator</strong> that creates transient service units for legacy init scripts, so old packages can still start. Do not mix the two models in new work; write a native unit instead. <code>systemctl</code> can also show legacy runlevel mappings through targets such as <code>runlevel3.target</code>.</p>
      <p>Shutdown is a target transition. <code>systemctl poweroff</code>, <code>reboot</code> and <code>halt</code> ask systemd to stop units in reverse dependency order, unmount filesystems and signal the kernel. <code>shutdown -h now</code> remains a portable wrapper.</p>`
    },
    {
      id: 'ch6-recovery',
      ref: '6.6–6.8',
      title: 'Rescue, emergency and the initramfs',
      html: `<p>When normal boot fails, systemd offers progressively smaller environments. <strong>rescue.target</strong> starts a basic system with a root shell on the console, usually after mounting local filesystems. <strong>emergency.target</strong> starts almost nothing; the root filesystem may be read-only and you must mount what you need manually.</p>
      <pre><code>systemd.unit=rescue.target
systemd.unit=emergency.target
rd.break                 # stop inside the initramfs
init=/bin/sh             # bypass init entirely</code></pre>
      <p>A root password is normally required for rescue mode. If the root account is locked, boot media is the reliable route. A live USB gives you a full environment, networking and tools, and avoids modifying the broken system until you understand it.</p>
      <p>The <strong>initramfs</strong> is the bridge between kernel and real root. If the root disk is encrypted, on LVM, on a network, or needs a driver not built into the kernel, the initramfs must contain the necessary modules and tools. Regenerate it after changing storage or encryption configuration — for example with <code>update-initramfs -u</code> on Debian or <code>dracut -f</code> on RHEL/Fedora.</p>
      <p>Emergency work should be deliberate: mount filesystems read-only when possible, back up configuration before editing, and reboot cleanly rather than pulling power. A rescue boot is also a good time to verify backups and review logs from the failed boot with <code>journalctl -b -1</code>.</p>`
    }
  ],
  commands: [
    { cmd: 'ps -p 1 -o pid,comm,args', desc: 'Identify the init process and how it was invoked.' },
    { cmd: 'systemctl list-units --type=service', desc: 'List currently loaded service units and their states.' },
    { cmd: 'systemctl status sshd', desc: 'Show a unit\u2019s state, cgroup, main PID and recent log lines.' },
    { cmd: 'sudo systemctl start nginx', desc: 'Start a service now, without enabling it at boot.' },
    { cmd: 'sudo systemctl enable --now nginx', desc: 'Enable a service at boot and start it immediately.' },
    { cmd: 'sudo systemctl disable nginx', desc: 'Remove the boot-time enablement while leaving the unit installed.' },
    { cmd: 'systemctl cat sshd.service', desc: 'Show the unit file and any drop-in overrides.' },
    { cmd: 'systemctl list-dependencies multi-user.target', desc: 'Print the unit dependency tree for a target.' },
    { cmd: 'systemctl get-default', desc: 'Show the target booted by default.' },
    { cmd: 'systemctl list-timers --all', desc: 'List timer units, their next and last trigger times.' },
    { cmd: 'journalctl -u sshd -f', desc: 'Follow logs for one systemd unit.' },
    { cmd: 'sudo systemctl daemon-reload', desc: 'Reload unit files after editing them.' },
    { cmd: 'sudo systemctl rescue', desc: 'Switch to rescue mode (single-user maintenance).' },
    { cmd: 'sudo systemctl poweroff', desc: 'Shut down cleanly through systemd.' }
  ],
  labs: [
    {
      title: 'Map the unit graph',
      goal: 'See how the running system is assembled from units and targets.',
      steps: [
        'Run <code>systemctl get-default</code> and identify the target.',
        'Run <code>systemctl list-dependencies --no-pager</code> and find three services started for your target.',
        'Pick one service and run <code>systemctl status</code> on it. Note its loaded unit file path and cgroup.',
        'Run <code>systemctl cat</code> on it and identify <code>ExecStart</code>, <code>WantedBy</code> and any <code>After</code> lines.',
        'Run <code>systemctl list-timers --all</code> and find a timer that runs periodically. Which service does it trigger?'
      ]
    },
    {
      title: 'Build a tiny service and timer',
      goal: 'Practise writing native systemd units and reloading the manager.',
      steps: [
        'Create <code>~/bin/hlw-tick.sh</code> that appends a timestamp to <code>~/hlw-tick.log</code>, and make it executable.',
        'As root, create <code>/etc/systemd/system/hlw-tick.service</code> with Type=oneshot and ExecStart pointing at the script.',
        'Create <code>/etc/systemd/system/hlw-tick.timer</code> with OnCalendar=*:0/2 and WantedBy=timers.target.',
        'Run <code>sudo systemctl daemon-reload</code>, then <code>sudo systemctl enable --now hlw-tick.timer</code>.',
        'Wait a few minutes, check <code>systemctl list-timers</code> and the log file, then disable the timer and remove the units.'
      ]
    }
  ],
  cards: [
    { front: 'What is PID 1 responsible for?', back: 'It is the first user-space process: it starts and supervises services, adopts orphans, and coordinates shutdown. On most Linux systems it is systemd.' },
    { front: 'start vs enable', back: 'start changes the current state. enable wires the unit into a target so it starts at boot. They are independent.' },
    { front: 'What is a systemd target?', back: 'A grouping and synchronisation point for units, roughly equivalent to a SysV runlevel (multi-user.target, graphical.target, rescue.target).' },
    { front: 'Wants vs Requires', back: 'Wants starts a unit if possible; failure does not stop the dependent unit. Requires starts it and propagates failure. After/Before only order the start.' },
    { front: 'Where do local unit overrides go?', back: 'Drop-ins under /etc/systemd/system/<unit>.d/*.conf, or a full unit file in /etc/systemd/system. Run systemctl daemon-reload afterwards.' },
    { front: 'What is socket activation?', back: 'systemd owns the listening socket and starts the service on the first connection, passing it the socket.' },
    { front: 'rescue.target vs emergency.target', back: 'rescue starts a basic system with local filesystems and a root shell. emergency starts almost nothing, often with root read-only.' }
  ],
  quiz: [
    {
      q: 'You edited a systemd unit file. What must you run before restarting the service?',
      options: ['systemctl enable', 'systemctl daemon-reload', 'systemctl isolate', 'update-grub'],
      answer: 1,
      explain: 'daemon-reload makes systemd reread unit files and drop-ins. Then restart the service so the new configuration takes effect.'
    },
    {
      q: 'Which command makes a service start at boot and start it right now?',
      options: ['systemctl start nginx', 'systemctl enable nginx', 'systemctl enable --now nginx', 'systemctl mask nginx'],
      answer: 2,
      explain: 'enable --now combines boot-time enablement with an immediate start.'
    },
    {
      q: 'What does multi-user.target represent?',
      options: ['A graphical desktop', 'A normal non-graphical multi-user boot state', 'Single-user rescue mode', 'A container namespace'],
      answer: 1,
      explain: 'multi-user.target is the standard multi-user, non-graphical target. graphical.target builds on it and adds the display manager.'
    },
    {
      q: 'A unit has Wants=network-online.target. What happens if that target fails?',
      options: [
        'The unit fails immediately.',
        'The unit may still start; Wants is a weak dependency.',
        'systemd reboots the machine.',
        'The unit is masked.'
      ],
      answer: 1,
      explain: 'Wants expresses a preference. Requires is the strong form that propagates failure.'
    },
    {
      q: 'Which legacy SysV file would start a service in runlevel 3?',
      options: ['/etc/rc3.d/S20service', '/etc/init.d/rc3.service', '/etc/systemd/system/rc3.target', '/var/run/runlevel3'],
      answer: 0,
      explain: 'SysV used /etc/rcN.d directories with S (start) and K (kill) symlinks into /etc/init.d, ordered by the number in the filename.'
    },
    {
      q: 'What is the safest first step when a system will not boot normally?',
      options: [
        'Reinstall the operating system',
        'Boot rescue media or a rescue target and inspect logs before changing anything',
        'Delete /etc/fstab',
        'Disable Secure Boot permanently'
      ],
      answer: 1,
      explain: 'Preserve evidence and gain a working shell first. Review the failed boot logs (journalctl -b -1) and only then make targeted changes.'
    }
  ]
});
