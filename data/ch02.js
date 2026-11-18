window.HLW.chapters.push({
  id: 2,
  title: 'Basic Commands and Directory Hierarchy',
  short: 'Commands & filesystem',
  track: 'foundations',
  ref: 'Chapter 2',
  sectionsRef: '2.1–2.21',
  minutes: 55,
  tagline: 'The command line, the filesystem, and the rules that connect them.',
  blurb: 'A working tour of the Unix command line: files, directories, redirection, globbing, processes, permissions, archives and the root filesystem layout.',
  objectives: [
    'Use the shell to run commands, redirect input/output and chain programs with pipes.',
    'Navigate the Linux directory hierarchy and manipulate files safely.',
    'Read and change file permissions, ownership and symbolic links.',
    'Inspect processes, use job control, and run privileged commands with sudo.',
    'Create and extract compressed archives.'
  ],
  sections: [
    {
      id: 'ch2-shell',
      ref: '2.1–2.3',
      title: 'The shell and basic file commands',
      html: `<p>The shell is an ordinary user-space program that reads commands, expands them, and asks the kernel to run other programs. <code>/bin/sh</code> is the Bourne shell; on Linux it is usually provided by bash, dash or another compatible shell. When you log in, the shell prints a prompt, reads a line, and executes it.</p>
      <p>Commands are either <strong>shell built-ins</strong> (implemented inside the shell, such as <code>cd</code>) or <strong>external programs</strong> found on disk (such as <code>ls</code>). Arguments are separated by whitespace. The first word is the command; the rest are passed to it.</p>
      <pre><code>$ ls -l /etc
$ cp report.txt reports/
$ mv old.txt new.txt
$ mkdir -p projects/linux/notes
$ rm -r old-directory</code></pre>
      <p><strong>cat</strong> copies file contents to standard output. <strong>ls</strong> lists directory entries; <code>-l</code> gives a long listing, <code>-a</code> includes dotfiles, <code>-h</code> makes sizes readable. <strong>cp</strong> copies, <strong>mv</strong> moves or renames, <strong>touch</strong> creates an empty file or updates timestamps, and <strong>rm</strong> removes. There is no recycle bin: <code>rm</code> is permanent.</p>
      <div class="callout warn"><span class="co-ico">!</span><div><div class="co-title">Be precise with rm</div><p><code>rm -r</code> recurses. A misplaced space or an unset variable can turn a harmless command into data loss. Quote paths, test with <code>ls</code> first, and consider <code>rm -i</code> for risky work.</p></div></div>`
    },
    {
      id: 'ch2-io',
      ref: '2.2.3, 2.14',
      title: 'Standard input, output, error and pipes',
      html: `<p>Every process starts with three streams: <strong>standard input</strong> (fd 0), <strong>standard output</strong> (fd 1) and <strong>standard error</strong> (fd 2). By default they connect to your terminal. The shell can redirect them to files or to other programs.</p>
      <pre><code>$ command &gt; out.txt        # stdout to a file (overwrite)
$ command &gt;&gt; out.txt       # stdout to a file (append)
$ command &lt; input.txt      # stdin from a file
$ command 2&gt; errors.txt    # stderr to a file
$ command &gt; all.txt 2&gt;&amp;1  # stdout and stderr together
$ command 2&gt;/dev/null      # discard errors
$ sort names.txt | uniq    # pipe stdout into another program</code></pre>
      <p>A <strong>pipe</strong> connects the stdout of one process to the stdin of the next. This is the Unix philosophy in action: small programs that do one thing, composed into larger workflows. <code>grep</code>, <code>sort</code>, <code>cut</code>, <code>awk</code> and <code>less</code> are common pipeline partners.</p>
      <p>Because stderr is separate from stdout, you can keep diagnostics visible while sending real output through a pipe. That separation is why <code>2&gt;</code> exists.</p>`,
      diagram: {
        type: 'flow',
        caption: 'A pipeline connects processes with in-memory pipes',
        items: [
          { t: 'stdin', d: 'file or keyboard' },
          { t: 'grep error', d: 'filters lines' },
          { t: 'sort', d: 'orders results' },
          { t: 'less', d: 'pages output' }
        ]
      }
    },
    {
      id: 'ch2-files',
      ref: '2.4',
      title: 'Directories, paths and globbing',
      html: `<p>The filesystem is a single tree rooted at <code>/</code>. Paths beginning with <code>/</code> are <strong>absolute</strong>; anything else is <strong>relative</strong> to the current working directory. <code>.</code> means the current directory, <code>..</code> means its parent, and <code>~</code> is your home directory.</p>
      <p>Use <code>pwd</code> to print the working directory, <code>cd</code> to change it, <code>mkdir</code> to create directories and <code>rmdir</code> to remove empty ones. <code>cd -</code> returns to the previous directory.</p>
      <p>The shell expands <strong>globs</strong> before the command runs. <code>*</code> matches any number of characters, <code>?</code> matches one character, and <code>[abc]</code> matches a set. The shell, not the program, performs the expansion. Quote a glob when you want the literal character.</p>
      <pre><code>$ echo *.txt              # every .txt file in this directory
$ echo report-?.pdf       # report-1.pdf, report-a.pdf, ...
$ echo file[0-9].log      # file0.log through file9.log
$ ls ~/projects/*/README  # globs expand across directories</code></pre>
      <div class="callout tip"><span class="co-ico">✓</span><div><div class="co-title">Hidden files</div><p>Files whose names begin with a dot are ordinary files, but shells and tools hide them by default. Use <code>ls -a</code> to see them. Configuration files in your home directory are usually dotfiles.</p></div></div>`
    },
    {
      id: 'ch2-inspect',
      ref: '2.5, 2.13',
      title: 'Finding and inspecting content',
      html: `<p>These are the daily drivers for reading and searching a system:</p>
      <ul>
        <li><code>grep pattern file</code> prints matching lines; <code>-i</code> ignores case, <code>-r</code> recurses, <code>-n</code> shows line numbers.</li>
        <li><code>less file</code> pages through a file; <code>/pattern</code> searches, <code>n</code> jumps to the next match, <code>q</code> quits.</li>
        <li><code>find path -name pattern</code> walks a directory tree. <code>find . -type f -size +10M</code> finds large files.</li>
        <li><code>head -n 20 file</code> and <code>tail -n 20 file</code> show the first or last lines; <code>tail -f</code> follows a growing log.</li>
        <li><code>sort file</code> orders lines; <code>sort -n</code> is numeric and <code>sort -k2</code> sorts by field two.</li>
        <li><code>diff a b</code> shows differences; <code>file name</code> identifies content type from magic bytes.</li>
      </ul>
      <p>Manual pages are the authoritative reference. <code>man ls</code> opens the user-command manual; <code>man 5 passwd</code> opens the file-format section; <code>man 2 read</code> opens the system-call section. Use <code>man -k keyword</code> (or <code>apropos</code>) when you only know a concept, and <code>info</code> for GNU tools with richer documentation.</p>
      <pre><code>$ grep -rn "timeout" /etc/nginx/
$ find /var/log -type f -name "*.log" -mtime -1
$ tail -f /var/log/syslog
$ man -k "disk partition"</code></pre>`
    },
    {
      id: 'ch2-env',
      ref: '2.7–2.10',
      title: 'Environment variables and the command path',
      html: `<p>Shell variables hold strings. <strong>Environment variables</strong> are variables exported to child processes. <code>PATH</code> is the most important: it lists the directories searched, in order, when you type a command that is not a built-in and does not contain a slash.</p>
      <pre><code>$ echo $PATH
/usr/local/bin:/usr/bin:/bin
$ export EDITOR=vim
$ echo $HOME $USER $SHELL
$ which -a python3       # every python3 on the path
$ type cd                # is it a built-in, alias or file?</code></pre>
      <p>If a command “is not found”, the first things to check are the spelling, the executable bit, and whether its directory is on <code>PATH</code>. <code>./script.sh</code> runs a script in the current directory even when <code>.</code> is not on the path — which is a safety feature, because it prevents accidentally running a malicious file from an untrusted directory.</p>
      <p><strong>Special characters</strong> such as <code>$</code>, <code>*</code>, <code>?</code>, <code>[</code>, quotes, backslashes and semicolons have meaning to the shell. Single quotes preserve everything literally; double quotes still expand <code>$variables</code>. A backslash escapes the next character.</p>
      <div class="callout note"><span class="co-ico">i</span><div><div class="co-title">Dotfiles</div><p>Shell startup files such as <code>~/.bashrc</code> and <code>~/.profile</code> are dotfiles. They set PATH, prompts, aliases and other environment defaults. Chapter 13 covers their order and pitfalls.</p></div></div>`
    },
    {
      id: 'ch2-processes',
      ref: '2.16',
      title: 'Processes and job control',
      html: `<p>A process is a running program with a PID, an owner, a state, an address space and open files. <code>ps</code> snapshots processes; <code>ps aux</code> shows every process on a BSD-style layout, while <code>ps -ef</code> uses Unix-style columns. <code>top</code> and <code>htop</code> update continuously.</p>
      <pre><code>$ ps aux | grep nginx
$ ps -p 1234 -o pid,ppid,user,stat,etime,cmd
$ kill 1234          # polite termination (SIGTERM)
$ kill -9 1234       # force kill (SIGKILL) — last resort</code></pre>
      <p>The shell's <strong>job control</strong> lets one terminal manage several processes. Start a long job, press <kbd>Ctrl</kbd>+<kbd>Z</kbd> to suspend it, then use <code>bg</code> to resume it in the background or <code>fg</code> to bring it back. <code>jobs</code> lists the jobs of the current shell. Append <code>&amp;</code> to a command to start it in the background immediately.</p>
      <p>Closing a terminal sends SIGHUP to its jobs. <code>nohup command &amp;</code> or a terminal multiplexer such as <code>tmux</code> protects long-running work.</p>
      <p>Process states matter when diagnosing: <code>R</code> running, <code>S</code> interruptible sleep, <code>D</code> uninterruptible sleep (often I/O), <code>T</code> stopped, <code>Z</code> zombie (exited, waiting to be reaped).</p>`
    },
    {
      id: 'ch2-perms',
      ref: '2.17',
      title: 'File modes, permissions and links',
      html: `<p>Every file has an owner, a group and three permission triplets: user, group, other. Each triplet can allow <strong>read</strong> (r=4), <strong>write</strong> (w=2) and <strong>execute</strong> (x=1). <code>ls -l</code> prints them as <code>-rwxr-xr--</code>, followed by link count, owner, group, size and time.</p>
      <pre><code>chmod 755 script.sh     # rwxr-xr-x
chmod 644 notes.txt     # rw-r--r--
chmod u+x script.sh     # add execute for the owner
chmod go-w file         # remove write for group and other
chown alice:staff file  # change owner and group (privileged)</code></pre>
      <p>For directories, <code>x</code> means “can traverse or enter”, <code>r</code> means “can list names”, and <code>w</code> means “can create or remove entries”. A directory without <code>x</code> blocks access to everything inside it even if the files themselves are readable.</p>
      <p>A <strong>hard link</strong> is simply another name for the same inode: both names share the data, and the link count increases. A <strong>symbolic link</strong> (symlink) is a small file containing a path to another file, created with <code>ln -s target linkname</code>. Deleting the target leaves a dangling symlink; deleting the symlink never deletes the target.</p>
      <div class="callout key"><span class="co-ico">★</span><div><div class="co-title">Owner, group, other — in that order</div><p>Permission checks stop at the first matching class. If you own a file, only the user triplet applies to you, even if the group or other bits would allow more.</p></div></div>`
    },
    {
      id: 'ch2-archives',
      ref: '2.18',
      title: 'Archives and compression',
      html: `<p>Unix separates the two jobs. <strong>tar</strong> bundles files and directories into one archive; <strong>gzip</strong> (or xz, bzip2, zstd) compresses a stream. Combined, they produce the familiar <code>.tar.gz</code>.</p>
      <pre><code>$ tar -cvf archive.tar dir/       # create
$ tar -xvf archive.tar            # extract
$ tar -czvf archive.tar.gz dir/   # create + gzip
$ tar -xzvf archive.tar.gz        # gunzip + extract
$ tar -tzvf archive.tar.gz        # list contents first
$ gzip file                       # produces file.gz
$ gunzip file.gz
$ zcat file.gz | less             # view without writing a file</code></pre>
      <p>Remember the common flags: <code>c</code> create, <code>x</code> extract, <code>t</code> list, <code>v</code> verbose, <code>f</code> file (must be last). Add <code>z</code> for gzip, <code>j</code> for bzip2, <code>J</code> for xz. Always list an archive before extracting it into the current directory, especially when it came from outside your machine.</p>
      <p>Compression is not encryption. If data must be confidential, encrypt it (for example with <code>gpg</code>) rather than relying on gzip.</p>`
    },
    {
      id: 'ch2-hierarchy',
      ref: '2.19–2.20',
      title: 'The root filesystem and sudo',
      html: `<p>The Linux directory hierarchy has conventional meanings. Learning them is half of knowing where to look.</p>
      <pre><code>/
├── bin  → essential user commands (often → /usr/bin)
├── boot   kernel and boot-loader files
├── dev    device files
├── etc    host-specific configuration
├── home   user home directories
├── lib    shared libraries and kernel modules
├── media  removable media mount points
├── mnt    temporary mount points
├── opt    optional add-on software
├── proc   kernel and process information (virtual)
├── root   root's home directory
├── run    runtime state, sockets and PID files
├── sbin   system administration commands
├── srv    data served by the system
├── sys    kernel device and driver view (virtual)
├── tmp    temporary files
├── usr    the bulk of user-space programs and data
└── var    variable data: logs, spools, caches</code></pre>
      <p><code>/usr</code> contains <code>bin</code>, <code>sbin</code>, <code>lib</code>, <code>include</code>, <code>share</code> and <code>local</code>. The distinction between <code>/bin</code> and <code>/usr/bin</code> has blurred on modern systems; many distributions now merge them. Kernel images normally live in <code>/boot</code>.</p>
      <p>To administer the system you need privilege. <strong>sudo</strong> runs a single command as another user (root by default) after checking <code>/etc/sudoers</code>; it logs the command and does not require sharing the root password. <code>su</code> starts a new shell as another user and asks for that user's password. Prefer <code>sudo</code> for individual commands, and edit sudoers with <code>visudo</code> so syntax errors are caught.</p>
      <pre><code>$ sudo systemctl restart sshd
$ sudo -l                 # what may this user run?
$ sudo -i                 # interactive root login shell
$ journalctl SYSLOG_IDENTIFIER=sudo</code></pre>`
    }
  ],
  commands: [
    { cmd: 'ls -lah', desc: 'Long listing of all files, including dotfiles, with human-readable sizes.' },
    { cmd: 'cp -r src/ dest/', desc: 'Recursively copy a directory tree.' },
    { cmd: 'mv old new', desc: 'Rename or move a file or directory.' },
    { cmd: 'rm -r dir/', desc: 'Recursively remove a directory — permanent, no recycle bin.' },
    { cmd: 'grep -rn pattern dir/', desc: 'Recursively search files and show line numbers.' },
    { cmd: 'find . -type f -name "*.conf"', desc: 'Find regular files by name under the current directory.' },
    { cmd: 'tail -f /var/log/syslog', desc: 'Follow new lines appended to a log file.' },
    { cmd: 'command > out 2>&1', desc: 'Redirect both stdout and stderr into one file.' },
    { cmd: 'ps aux', desc: 'Snapshot every process with owner, CPU, memory and command.' },
    { cmd: 'kill -TERM PID', desc: 'Ask a process to terminate gracefully.' },
    { cmd: 'chmod 644 file', desc: 'Set owner rw, group r, other r.' },
    { cmd: 'chmod +x script.sh', desc: 'Add execute permission for all classes (subject to umask).' },
    { cmd: 'ln -s target link', desc: 'Create a symbolic link pointing at target.' },
    { cmd: 'tar -czvf archive.tar.gz dir/', desc: 'Create a gzip-compressed tar archive.' },
    { cmd: 'tar -xzvf archive.tar.gz', desc: 'List-verbose extract of a gzip-compressed archive.' },
    { cmd: 'sudo -l', desc: 'List the sudo privileges of the current user.' }
  ],
  labs: [
    {
      title: 'Build a small filesystem sandbox',
      goal: 'Practise creation, globbing, redirection, permissions and archival without touching system files.',
      steps: [
        'Create <code>~/hlw-lab2/{docs,logs,bin}</code> with <code>mkdir -p</code>.',
        'Create three text files in <code>docs</code> and write one line into each with <code>echo</code> and <code>&gt;</code>.',
        'Use a glob to list only files ending in a chosen suffix; then use <code>find</code> to find them recursively.',
        'Pipe <code>ls -l ~/hlw-lab2</code> into <code>less</code>, then quit with <code>q</code>.',
        'Make a script in <code>bin</code> containing <code>#!/bin/sh</code> and <code>echo hello</code>; add execute permission and run it as <code>./bin/script</code>.',
        'Change its mode to 600. Try to run it again and explain the error.',
        'Archive the whole sandbox with <code>tar -czvf</code>, list the archive, then extract it into a second directory.'
      ]
    },
    {
      title: 'Inspect a running process',
      goal: 'Connect ps, /proc and job control.',
      steps: [
        'Run <code>sleep 300 &amp;</code> in a shell and note the job number and PID.',
        'Run <code>jobs -l</code> and <code>ps -p PID -o pid,ppid,user,stat,cmd</code>.',
        'Inspect <code>/proc/PID/status</code> and <code>/proc/PID/cmdline</code>. Which fields map to the ps output?',
        'Bring the job back with <code>fg</code>, suspend it with Ctrl-Z, then resume it in the background with <code>bg</code>.',
        'Terminate it with <code>kill %1</code> and confirm it is gone.'
      ]
    }
  ],
  cards: [
    { front: 'What do file descriptors 0, 1 and 2 represent?', back: 'Standard input (0), standard output (1) and standard error (2).' },
    { front: 'How do you send both stdout and stderr to the same file?', back: 'command > out.txt 2>&1 — redirect stdout first, then point stderr at the same place.' },
    { front: 'Symbolic link vs hard link', back: 'A symlink stores a path to a target and can dangle. A hard link is another directory entry for the same inode; the data survives until the last link is removed.' },
    { front: 'What does chmod 755 mean?', back: 'Owner rwx (7), group r-x (5), other r-x (5). Commonly used for directories and executables.' },
    { front: 'What does the shell do with * before running a command?', back: 'It expands the glob into matching pathnames (unless quoted). This is called pathname expansion.' },
    { front: 'What is the difference between ps aux and ps -ef?', back: 'Both list all processes, but aux uses BSD-style columns (user, %CPU, %MEM, VSZ, RSS, STAT) and -ef uses Unix-style columns (UID, PID, PPID, C, STIME, TTY, TIME, CMD).' }
  ],
  quiz: [
    {
      q: 'You run <code>command > out.txt</code> but error messages still appear on the terminal. Why?',
      options: [
        'The shell buffers stdout.',
        'Only stdout was redirected; stderr still points at the terminal.',
        'The file is read-only.',
        'You need to use a pipe instead.'
      ],
      answer: 1,
      explain: 'File descriptor 1 (stdout) goes to out.txt, but fd 2 (stderr) is unchanged. Add 2>&1, or redirect stderr separately.'
    },
    {
      q: 'Which command creates a compressed archive of a directory?',
      options: ['gzip -r dir', 'tar -czvf archive.tar.gz dir', 'zip -d dir', 'cp -r dir archive.gz'],
      answer: 1,
      explain: 'tar bundles the directory and z pipes it through gzip. The flags mean create, gzip, verbose, file.'
    },
    {
      q: 'A directory has mode 644. What can a non-owner do?',
      options: [
        'List and enter it',
        'Read the directory file but not traverse it',
        'Nothing, because it has no execute bit',
        'Delete files inside it'
      ],
      answer: 2,
      explain: 'Directories need x (traverse) to access entries. Mode 644 gives read and write but no execute, so the directory cannot be entered.'
    },
    {
      q: 'What does <code>kill -9</code> do differently from plain <code>kill</code>?',
      options: [
        'It restarts the process.',
        'It sends SIGKILL, which cannot be caught or ignored, so the process is forcibly terminated.',
        'It kills every process owned by the user.',
        'It only stops the process temporarily.'
      ],
      answer: 1,
      explain: 'Plain kill sends SIGTERM by default, allowing cleanup. SIGKILL (-9) is enforced by the kernel and cannot be handled; use it as a last resort.'
    },
    {
      q: 'Which path is the conventional home of host-specific configuration?',
      options: ['/usr', '/etc', '/var', '/proc'],
      answer: 1,
      explain: '/etc holds configuration for this host. /usr holds programs and shared data, /var holds variable data such as logs, and /proc is a virtual kernel interface.'
    },
    {
      q: 'Why does <code>./script.sh</code> work when <code>script.sh</code> says “command not found”?',
      options: [
        'The script is not executable.',
        'The current directory is normally not on PATH, so the explicit ./ path is required.',
        'Bash cannot run scripts without sudo.',
        'The script has the wrong extension.'
      ],
      answer: 1,
      explain: 'Commands without a slash are searched on PATH. The current directory is usually absent for safety, so ./script.sh names the file directly.'
    }
  ]
});
