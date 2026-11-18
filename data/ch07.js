window.HLW.chapters.push({
  id: 7,
  title: 'System Configuration: Logging, System Time, Batch Jobs, and Users',
  short: 'Logs, time, users',
  track: 'admin',
  ref: 'Chapter 7',
  sectionsRef: '7.1–7.11',
  minutes: 50,
  tagline: 'The quiet machinery that keeps a system accountable.',
  blurb: 'Follow logs, understand /etc and the user database, set time with NTP, schedule work with cron, timers and at, and see how PAM and UIDs enforce identity.',
  objectives: [
    'Read system logs with journalctl and understand syslog facilities and priorities.',
    'Explain the passwd, shadow and group databases and manage users safely.',
    'Configure time zones and network time synchronisation.',
    'Schedule recurring and one-time jobs with cron, systemd timers and at.',
    'Describe PAM authentication and the difference between real and effective UIDs.'
  ],
  sections: [
    {
      id: 'ch7-logs',
      ref: '7.1',
      title: 'System logging',
      html: `<p>Logs answer the question “what happened?”. Linux has two common collectors: the traditional <strong>syslog daemon</strong> (rsyslog, syslog-ng) writing text files under <code>/var/log</code>, and <strong>systemd-journald</strong> storing structured, indexed entries. Many systems run both: journald captures early boot and service output, while rsyslog forwards or persists selected messages.</p>
      <pre><code>$ journalctl -b
$ journalctl -u sshd --since "1 hour ago"
$ journalctl -f -p warning
$ journalctl --disk-usage
$ tail -f /var/log/syslog      # Debian/Ubuntu
$ tail -f /var/log/messages    # RHEL-family</code></pre>
      <p>Syslog messages carry a <strong>facility</strong> (kern, user, daemon, auth, mail, local0–7) and a <strong>priority</strong> (emerg, alert, crit, err, warning, notice, info, debug). Rules map facility/priority pairs to files, remote hosts or filters. The journal keeps similar metadata plus the unit, PID, UID, executable and arbitrary fields.</p>
      <p><strong>Rotation</strong> prevents logs from filling the disk. <code>logrotate</code> renames, compresses and deletes old files according to <code>/etc/logrotate.conf</code> and <code>/etc/logrotate.d/*</code>, then signals the daemon to reopen its file. The journal has its own retention: <code>journalctl --vacuum-time=14d</code> or <code>--vacuum-size=500M</code>. Persistent journal storage is enabled by creating <code>/var/log/journal</code>; otherwise journals live in <code>/run</code> and vanish at reboot.</p>
      <div class="callout tip"><span class="co-ico">✓</span><div><div class="co-title">Log first, guess second</div><p>When a service fails, read <code>systemctl status</code> and <code>journalctl -u &lt;unit&gt;</code> before changing configuration. The first error usually names the real cause.</p></div></div>`
    },
    {
      id: 'ch7-etc',
      ref: '7.2–7.3',
      title: '/etc and the user database',
      html: `<p><code>/etc</code> holds host-specific configuration. It is not a dumping ground: package defaults usually live under <code>/usr</code>, while <code>/etc</code> contains the local overrides an administrator is expected to edit. Many services read a main file and an included directory, such as <code>/etc/ssh/sshd_config</code> and <code>/etc/ssh/sshd_config.d/</code>.</p>
      <p>User accounts are stored in plain text databases:</p>
      <pre><code># /etc/passwd
alice:x:1000:1000:Alice Example:/home/alice:/bin/bash
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin

# /etc/shadow
alice:$6$...:19800:0:99999:7:::</code></pre>
      <p><strong>/etc/passwd</strong> has seven fields: login name, password placeholder (x), UID, GID, GECOS comment, home directory and login shell. <strong>/etc/shadow</strong> holds the password hash and aging fields: last change, minimum age, maximum age, warning period, inactive period and expiry. Only root can read shadow; that is why the hash is not in passwd.</p>
      <p><strong>/etc/group</strong> lists group name, password placeholder, GID and members. <strong>/etc/gshadow</strong> holds group passwords and administrators. Special system accounts (daemon, www-data, nobody) exist to run services with least privilege and usually have <code>/usr/sbin/nologin</code> or <code>/bin/false</code> as their shell.</p>
      <p>Use <code>getent</code> rather than reading files directly: it follows the configured name-service switch and also sees LDAP, SSSD or other directory users. Manage accounts with <code>useradd</code>, <code>usermod</code>, <code>userdel</code>, <code>passwd</code>, <code>chage</code>, <code>groupadd</code> and <code>gpasswd</code>. Edit files by hand only as a last resort, and use <code>vipw</code>/<code>vigr</code> if you must.</p>`
    },
    {
      id: 'ch7-login',
      ref: '7.4, 7.9–7.10',
      title: 'getty, login and PAM',
      html: `<p>On a text console, <strong>getty</strong> (usually agetty) opens a terminal, prints the login prompt and waits for a username. It then hands off to <strong>login</strong>, which authenticates the user, sets up the session and starts the user's shell. Graphical display managers perform an analogous job through PAM and logind.</p>
      <p><strong>Pluggable Authentication Modules (PAM)</strong> separate authentication policy from applications. A program calls <code>pam_authenticate()</code>; PAM reads a service-specific configuration in <code>/etc/pam.d/</code> and runs a stack of modules. Each line has a type, control flag and module:</p>
      <pre><code># /etc/pam.d/login (simplified)
auth      required   pam_securetty.so
auth      include    system-login
account   include    system-login
password  include    system-login
session   include    system-login</code></pre>
      <p>The four types are <strong>auth</strong> (prove identity), <strong>account</strong> (is the account valid now?), <strong>password</strong> (change credentials) and <strong>session</strong> (set up/tear down the session). Control flags determine how failures combine: <code>required</code> fails but continues; <code>requisite</code> fails immediately; <code>sufficient</code> succeeds and skips the rest if it works; <code>optional</code> matters only if nothing else decides.</p>
      <p>Common modules include <code>pam_unix.so</code> (traditional password check), <code>pam_shells.so</code> (valid shell), <code>pam_deny.so</code> (always fail), <code>pam_limits.so</code> (resource limits) and <code>pam_systemd.so</code> (session registration). A broken PAM stack can lock you out of every login path, so keep a root shell open while editing and test with a second terminal.</p>`
    },
    {
      id: 'ch7-time',
      ref: '7.5',
      title: 'System time and time zones',
      html: `<p>The kernel keeps time as seconds since the Unix epoch (1970-01-01 00:00:00 UTC) plus nanoseconds. User space converts that to local time using the time zone database. The hardware clock may store UTC or local time; UTC is strongly preferred for servers.</p>
      <pre><code>$ date
$ date -u
$ timedatectl
$ timedatectl list-timezones | grep -i europe
$ sudo timedatectl set-timezone Europe/Berlin
$ sudo hwclock --show</code></pre>
      <p>Correct time matters for TLS certificates, authentication tokens, logs, cron and distributed systems. <strong>NTP</strong> (Network Time Protocol, UDP port 123) synchronises the clock with remote servers. Modern systems use <strong>chrony</strong> or systemd-timesyncd; both discipline the clock gradually rather than jumping it, and can step it at boot if the offset is large.</p>
      <pre><code>$ chronyc tracking
$ chronyc sources -v
$ timedatectl timesync-status</code></pre>
      <p>NTP is not a security protocol by itself; use authenticated NTP where the network is untrusted, and do not expose a server to the internet without rate limiting. In containers, the host clock is shared; changing time inside a container is generally not permitted.</p>`
    },
    {
      id: 'ch7-cron',
      ref: '7.6',
      title: 'Recurring jobs: cron and timer units',
      html: `<p><strong>cron</strong> runs commands on a schedule. A crontab has five time fields followed by a command:</p>
      <pre><code># min hour day-of-month month day-of-week  command
  0   3    *            *     *               /usr/local/bin/backup.sh
  */5 *    *            *     *               /usr/bin/check-queue
  30  8    *            *     1-5             /usr/bin/weekday-report</code></pre>
      <p>Fields accept <code>*</code>, lists (<code>1,15</code>), ranges (<code>1-5</code>) and steps (<code>*/10</code>). Use <code>crontab -e</code> to edit your own table, <code>crontab -l</code> to list it and <code>crontab -r</code> to remove it. System tables live in <code>/etc/crontab</code> and <code>/etc/cron.d/</code> and include a <em>user</em> field before the command. Directories such as <code>/etc/cron.daily</code> are run by <code>run-parts</code>.</p>
      <p>cron has a minimal environment: PATH may be <code>/usr/bin:/bin</code>, and your shell startup files are not read. Use absolute paths, set PATH explicitly, and redirect output to a log or mail. Jobs are not retried if the machine was off; <strong>anacron</strong> or systemd timers with <code>Persistent=true</code> handle that case.</p>
      <p><strong>systemd timer units</strong> are the modern alternative. A <code>.timer</code> unit triggers a matching <code>.service</code> and supports calendar expressions and monotonic delays:</p>
      <pre><code>[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true
RandomizedDelaySec=10m
Unit=backup.service</code></pre>
      <p>Timers are tracked by systemd, logged in the journal and can depend on other units. Cron remains simpler for quick user jobs and is still universally available.</p>`
    },
    {
      id: 'ch7-at',
      ref: '7.7–7.8',
      title: 'One-time jobs with at',
      html: `<p><code>at</code> schedules a command to run once at a specified time. The <code>atd</code> daemon must be running. <code>atq</code> lists pending jobs and <code>atrm</code> removes one.</p>
      <pre><code>$ echo "/usr/local/bin/rebuild-index" | at 02:00
$ at now + 2 hours
at&gt; /usr/local/bin/notify-admin
at&gt; Ctrl-D
$ atq
$ atrm 7</code></pre>
      <p>Like cron, <code>at</code> jobs inherit a limited environment and run non-interactively. They are useful for a maintenance window, a delayed restart, or a one-off reminder. For anything that must survive a reboot or be visible in the journal, prefer a transient systemd timer or a normal service.</p>
      <p>Regular users can schedule jobs if <code>/etc/at.allow</code> or <code>/etc/at.deny</code> permits it; root can always schedule. Output is normally mailed to the user, which is useless without a working MTA — log to a file explicitly.</p>`,
      callout: {
        type: 'note',
        title: 'systemd-run for one-shots',
        text: 'systemd-run --on-active="2h" /usr/local/bin/job creates a transient timer without writing unit files. It is handy for ad-hoc delayed work on systemd systems.'
      }
    },
    {
      id: 'ch7-uids',
      ref: '7.9',
      title: 'UIDs, switching users and least privilege',
      html: `<p>A process carries several user IDs. The <strong>real UID</strong> identifies the user who started it. The <strong>effective UID</strong> determines permission checks. The <strong>saved UID</strong> lets a privileged program drop and later regain privilege. A <strong>setuid</strong> executable runs with the effective UID of its owner, which is how <code>passwd</code> can write <code>/etc/shadow</code> without giving every user root.</p>
      <pre><code>$ id
$ ps -eo pid,ruid,euid,suid,comm
$ ls -l /usr/bin/passwd      # note the s bit
$ sudo -u nobody id
$ sudo -l</code></pre>
      <p>Setuid root binaries are attack surface. Modern Linux reduces the need for them with <strong>capabilities</strong> (split root's powers into units such as <code>CAP_NET_BIND_SERVICE</code>) and with privilege-separated daemons. <code>getcap</code> and <code>setcap</code> inspect and assign file capabilities.</p>
      <p><strong>su</strong> starts a shell as another user after asking for that user's password. <strong>sudo</strong> runs a command as another user according to policy, asks for the invoking user's password by default, and logs the action. Configure sudo with <code>visudo</code>; grant specific commands rather than blanket <code>ALL</code> where possible, and remember that a user who can run an editor as root can usually get a root shell.</p>
      <p>Authentication answers “who are you?”; authorization answers “what may you do?”. PAM handles the former; file permissions, capabilities, sudoers and SELinux/AppArmor handle the latter.</p>`
    }
  ],
  commands: [
    { cmd: 'journalctl -b -p err', desc: 'Show error-or-worse journal entries from this boot.' },
    { cmd: 'journalctl -u sshd --since "1 hour ago"', desc: 'Filter the journal by unit and time.' },
    { cmd: 'journalctl --disk-usage', desc: 'Show how much space the journal is using.' },
    { cmd: 'logger -p local0.info "message"', desc: 'Write a test message to syslog with a chosen facility and priority.' },
    { cmd: 'sudo logrotate -d /etc/logrotate.conf', desc: 'Dry-run log rotation and print what would happen.' },
    { cmd: 'getent passwd alice', desc: 'Look up a user through the system name-service switch.' },
    { cmd: 'sudo useradd -m -s /bin/bash alice', desc: 'Create a user with a home directory and login shell.' },
    { cmd: 'sudo passwd alice', desc: 'Set or change a user\u2019s password.' },
    { cmd: 'sudo chage -l alice', desc: 'Show password aging information for a user.' },
    { cmd: 'timedatectl', desc: 'Show time, time zone, NTP sync state and RTC settings.' },
    { cmd: 'chronyc tracking', desc: 'Show chrony\u2019s current clock offset and sync status.' },
    { cmd: 'crontab -e', desc: 'Edit the current user\u2019s cron table.' },
    { cmd: 'systemctl list-timers --all', desc: 'List systemd timer units and their schedule.' },
    { cmd: 'atq', desc: 'List pending at jobs.' },
    { cmd: 'sudo -l', desc: 'List the sudo rules that apply to the current user.' }
  ],
  labs: [
    {
      title: 'Decode the account databases',
      goal: 'Read passwd, shadow and group safely and understand every field.',
      steps: [
        'Run <code>getent passwd $USER</code> and label all seven colon-separated fields.',
        'Run <code>getent group $USER</code> and identify your primary and supplementary groups.',
        'As root, run <code>sudo getent shadow $USER</code> and identify the hash algorithm prefix and aging fields. Do not share the hash.',
        'Find a system account such as <code>daemon</code> or <code>www-data</code> and explain why its shell is nologin.',
        'Run <code>id</code> and compare UID/GID with the passwd entry.'
      ]
    },
    {
      title: 'Schedule and observe a job',
      goal: 'Practise cron, at and the journal.',
      steps: [
        'Create a script that appends the date to <code>~/hlw-job.log</code>.',
        'Schedule it every minute with <code>crontab -e</code>: <code>* * * * * /home/you/hlw-job.log-script</code>.',
        'Wait two minutes, check the log, then remove the crontab entry.',
        'Schedule a one-off job with <code>at now + 1 minute</code> and verify it with <code>atq</code>.',
        'Use <code>logger</code> to write a message, then find it with <code>journalctl --since "2 minutes ago"</code>.'
      ]
    }
  ],
  cards: [
    { front: 'Where are password hashes stored?', back: 'In /etc/shadow, readable only by root. /etc/passwd contains an x placeholder instead of the hash.' },
    { front: 'What are PAM\u2019s four module types?', back: 'auth (authenticate), account (validate account state), password (change credentials), session (set up/tear down the session).' },
    { front: 'What is NTP and which port does it use?', back: 'Network Time Protocol synchronises clocks over UDP port 123. chrony or systemd-timesyncd usually implements it.' },
    { front: 'cron vs systemd timer', back: 'cron is simple and universal with a five-field schedule. systemd timers integrate with units, logging, dependencies and Persistent=true for missed runs.' },
    { front: 'Real vs effective UID', back: 'Real UID is who started the process; effective UID is what the kernel checks for permissions. Saved UID allows regaining privilege after dropping it.' },
    { front: 'What does a setuid bit do?', back: 'It makes an executable run with the effective UID of the file owner (often root), which is powerful and a common attack surface.' },
    { front: 'Where do local PAM rules live?', back: '/etc/pam.d/<service>. Each application has its own stack of auth, account, password and session lines.' }
  ],
  quiz: [
    {
      q: 'Which journal command shows warnings and worse from the current boot?',
      options: ['journalctl -b -p warning', 'journalctl --vacuum-time=1d', 'tail -f /var/log/messages', 'dmesg -w'],
      answer: 0,
      explain: '-b selects the current boot and -p warning filters to priority warning and above (warning, err, crit, alert, emerg).'
    },
    {
      q: 'Why does /etc/passwd contain an x in the password field?',
      options: [
        'The password is encrypted with XOR.',
        'The real hash lives in /etc/shadow, which only root can read.',
        'x means no password is set.',
        'It marks an expired account.'
      ],
      answer: 1,
      explain: 'The placeholder points to /etc/shadow. Keeping hashes out of the world-readable passwd file reduces offline cracking exposure.'
    },
    {
      q: 'What does <code>timedatectl</code> primarily report?',
      options: ['Disk timeouts', 'Time zone, local time, RTC and NTP synchronisation state', 'Cron schedules', 'User login times'],
      answer: 1,
      explain: 'timedatectl is the systemd interface to date/time configuration, including whether NTP synchronisation is active.'
    },
    {
      q: 'In a user crontab, what does <code>*/15 * * * *</code> mean?',
      options: ['Every 15 minutes', 'At 15:00 every day', 'Every 15 hours', 'On the 15th of each month'],
      answer: 0,
      explain: 'The minute field is */15: every 15th minute of every hour. The remaining fields are unrestricted.'
    },
    {
      q: 'Which PAM control flag fails immediately when the module fails?',
      options: ['required', 'requisite', 'sufficient', 'optional'],
      answer: 1,
      explain: 'requisite returns failure at once, without running later modules. required records the failure but continues the stack.'
    },
    {
      q: 'A file is owned by root and has mode 4755. What does the 4 mean?',
      options: ['Read for everyone', 'Setuid: it runs with root\u2019s effective UID', 'Setgid', 'Sticky directory'],
      answer: 1,
      explain: 'The leading 4 sets the setuid bit. The program runs with the file owner\u2019s effective UID, which is why setuid-root binaries are security-sensitive.'
    }
  ]
});
