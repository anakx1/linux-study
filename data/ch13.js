window.HLW.chapters.push({
  id: 13,
  title: 'User Environments',
  short: 'User environments',
  track: 'desktop',
  ref: 'Chapter 13',
  sectionsRef: '13.1–13.7',
  minutes: 35,
  tagline: 'Your shell has a personality. Know where it is configured.',
  blurb: 'Understand login versus interactive shells, the bash startup file order, PATH, prompts, aliases, umask and the pitfalls that break remote commands.',
  objectives: [
    'Distinguish login, interactive and non-interactive shells and their startup files.',
    'Configure PATH, MANPATH, prompts, aliases and the permissions mask.',
    'Trace the bash startup sequence and explain which file wins.',
    'Choose sensible defaults for editor, pager and locale.',
    'Avoid startup-file mistakes that break scripts, SSH commands or security.'
  ],
  sections: [
    {
      id: 'ch13-guidelines',
      ref: '13.1–13.2',
      title: 'Startup file guidelines',
      html: `<p>A user environment is the set of variables, aliases, functions and shell options in effect when you work. Startup files configure it. The guiding principle is simple: <strong>keep them small, quiet and idempotent</strong>. Every login runs them, and a mistake can make every shell unusable.</p>
      <ul>
        <li>Put shared system-wide defaults in <code>/etc/profile</code>, <code>/etc/bash.bashrc</code> or <code>/etc/profile.d/*.sh</code>.</li>
        <li>Put personal settings in files under your home directory, not in system files.</li>
        <li>Guard against duplicate PATH entries and re-sourcing.</li>
        <li>Do not print output from non-interactive startup files; it corrupts scp, rsync and remote command output.</li>
        <li>Do not depend on a graphical session, a specific terminal or a network mount being available.</li>
      </ul>
      <p>Alter startup files when you need a persistent personal default: a PATH addition, an editor preference, an alias, a prompt. Do not use them to run long jobs, start daemons, or perform actions that belong in systemd or cron.</p>`
    },
    {
      id: 'ch13-elements',
      ref: '13.3',
      title: 'What goes in a startup file',
      html: `<p>The <strong>command path</strong> is the most important setting. Prepend your private bin directory so it wins over system binaries: <code>PATH="$HOME/bin:$PATH"</code>. Export it, and avoid appending the same directory on every shell.</p>
      <pre><code>case ":$PATH:" in
    *":$HOME/bin:"*) ;;
    *) PATH="$HOME/bin:$PATH" ;;
esac
export PATH</code></pre>
      <p><strong>MANPATH</strong> adds manual-page directories. Most systems derive it automatically; set it only when you have custom documentation. A wrong MANPATH can hide the system manuals.</p>
      <p><strong>Aliases</strong> are shorthand for commands. They are expanded only in interactive shells that read the relevant file. Use functions for anything with arguments or control flow. Avoid aliasing common commands to something surprising, especially in root's environment or shared documentation.</p>
      <pre><code>alias ll='ls -alF'
alias grep='grep --color=auto'
mkcd() { mkdir -p "$1" &amp;&amp; cd "$1"; }</code></pre>
      <p>The <strong>permissions mask</strong> (<code>umask</code>) controls default permissions for new files and directories. A umask of 022 gives files 644 and directories 755; 077 gives 600 and 700. Set it before creating sensitive files, and remember that it is a default, not a security boundary.</p>
      <p>The <strong>prompt</strong> is set with <code>PS1</code> (interactive) and <code>PS2</code> (continuation). Include useful context — user, host, directory, git branch — but keep it fast; command substitutions in the prompt run on every keystroke.</p>`
    },
    {
      id: 'ch13-bash',
      ref: '13.4.1',
      title: 'The bash startup sequence',
      html: `<p>bash chooses files based on how it was invoked. The distinction that matters most is <strong>login</strong> versus <strong>non-login</strong> and <strong>interactive</strong> versus <strong>non-interactive</strong>.</p>
      <ul>
        <li><strong>Login shell</strong> (SSH login, console login, <code>bash -l</code>): reads <code>/etc/profile</code>, then the first of <code>~/.bash_profile</code>, <code>~/.bash_login</code> or <code>~/.profile</code>.</li>
        <li><strong>Interactive non-login shell</strong> (a new terminal in a desktop session): reads <code>~/.bashrc</code> (and often <code>/etc/bash.bashrc</code>).</li>
        <li><strong>Non-interactive shell</strong> (a script, <code>ssh host command</code>): reads neither by default, unless <code>BASH_ENV</code> points to a file.</li>
      </ul>
      <p>A common pattern is to put all interactive configuration in <code>~/.bashrc</code> and have <code>~/.bash_profile</code> source it:</p>
      <pre><code># ~/.bash_profile
[ -f ~/.bashrc ] &amp;&amp; . ~/.bashrc</code></pre>
      <p>Without that line, a login shell may not see aliases and prompt settings defined only in <code>.bashrc</code>. Conversely, do not put non-interactive side effects in <code>.bashrc</code>; it may be read by shells that are not meant to be interactive.</p>
      <p>System-wide files are read first: <code>/etc/profile</code> and <code>/etc/profile.d/*.sh</code> for login shells, <code>/etc/bash.bashrc</code> for interactive shells on Debian-like systems. Local changes should go in your home files, not in packaged system files that upgrades may overwrite.</p>`,
      diagram: {
        type: 'flow',
        caption: 'Simplify: login vs interactive bash',
        items: [
          { t: 'Login shell', d: '/etc/profile → ~/.bash_profile' },
          { t: 'Interactive', d: '~/.bashrc' },
          { t: 'Non-interactive', d: 'no startup files (BASH_ENV exception)' }
        ]
      }
    },
    {
      id: 'ch13-defaults',
      ref: '13.5–13.6',
      title: 'Defaults, other shells and pitfalls',
      html: `<p>Set your preferred <strong>editor</strong> and <strong>pager</strong> explicitly if the system default is not to your taste: <code>export EDITOR=vim</code>, <code>export PAGER=less</code>. Tools such as <code>git</code>, <code>crontab</code>, <code>visudo</code> and <code>systemctl edit</code> consult these variables. <code>LESS</code> can add useful defaults, but avoid options that break non-interactive use.</p>
      <p>Locale variables (<code>LANG</code>, <code>LC_ALL</code>, <code>LC_TIME</code>) control language, collation and formatting. Set a UTF-8 locale for modern systems. Changing <code>LC_ALL</code> globally can alter sort order and number formatting in scripts; prefer per-command overrides when testing.</p>
      <p><strong>tcsh/csh</strong> use <code>~/.cshrc</code>, <code>~/.login</code> and <code>~/.logout</code>, and system files under <code>/etc/csh.*</code>. The syntax differs substantially: <code>setenv</code> instead of <code>export</code>, <code>set</code> for shell variables, and different history/prompt variables. Do not copy bash syntax into csh files.</p>
      <p>Common pitfalls:</p>
      <ul>
        <li>Echoing text or running <code>stty</code>/<code>mesg</code> unconditionally in a non-interactive path, breaking scp and rsync.</li>
        <li>Overwriting rather than appending to PATH, losing system directories.</li>
        <li>Re-sourcing a file that appends the same PATH entries repeatedly.</li>
        <li>Assuming a graphical environment (DISPLAY, DBus) exists in SSH sessions.</li>
        <li>Sourcing untrusted files or evaluating variables from the environment.</li>
        <li>Putting slow commands (network calls, large <code>find</code>) in the prompt or startup path.</li>
      </ul>
      <p>Test changes in a new shell before closing the old one: <code>bash -l</code>, <code>bash -i</code>, and <code>ssh localhost true</code> to verify non-interactive behaviour. Keep a root shell or console access available when editing root's startup files.</p>`
    }
  ],
  commands: [
    { cmd: 'echo $PATH', desc: 'Show the command search path.' },
    { cmd: 'type -a ls', desc: 'Show whether a name is an alias, function, built-in or file, and where.' },
    { cmd: 'alias ll="ls -alF"', desc: 'Define a shell alias for the current session.' },
    { cmd: 'umask', desc: 'Show the current permissions mask; set it with umask 022 or 077.' },
    { cmd: 'echo $PS1', desc: 'Show the interactive prompt format.' },
    { cmd: 'bash -l', desc: 'Start a login shell and read the login startup files.' },
    { cmd: 'bash -i', desc: 'Start an interactive shell and read ~/.bashrc.' },
    { cmd: 'bash -x -l -i', desc: 'Trace startup file execution (noisy; use for debugging).' },
    { cmd: 'source ~/.bashrc', desc: 'Re-read a startup file in the current shell.' },
    { cmd: 'printenv | sort', desc: 'List exported environment variables.' },
    { cmd: 'locale', desc: 'Show the current locale settings.' }
  ],
  labs: [
    {
      title: 'Trace your shell startup',
      goal: 'See which files are read and in what order.',
      steps: [
        'Run <code>ls -la ~ | grep -E "\\.(bash|profile|csh)"</code> and list the startup files that exist.',
        'Run <code>bash -l -c "echo login-ok"</code>. Does it read <code>.bash_profile</code>? Add a temporary echo at the top of a copy to observe (do not break the original).',
        'Run <code>bash -i -c "echo interactive-ok"</code> and compare. Which file is read for an interactive non-login shell?',
        'Run <code>bash -c "echo noninteractive-ok"</code> and confirm it does not print interactive banners.',
        'Run <code>type -a ll</code> and <code>echo $PATH</code>; identify duplicate PATH entries if any.'
      ]
    },
    {
      title: 'Audit PATH and umask',
      goal: 'Find common environment problems before they cause damage.',
      steps: [
        'Print PATH with one directory per line: <code>printf "%s\\n" $PATH | cat -n</code>. Look for duplicates and missing system directories.',
        'Check for an empty PATH element (<code>::</code>), which means the current directory is searched.',
        'Run <code>umask</code> and create a test file and directory. Compute their resulting permissions.',
        'Set <code>umask 077</code> in a subshell, create another file, and compare. Exit the subshell.',
        'Decide whether your umask is appropriate for a shared machine.'
      ]
    }
  ],
  cards: [
    { front: 'Login vs interactive non-login shell', back: 'A login shell reads /etc/profile and ~/.bash_profile (or ~/.bash_login/~/.profile). An interactive non-login shell reads ~/.bashrc.' },
    { front: 'Which bash file should contain aliases?', back: '~/.bashrc for interactive shells, usually sourced from ~/.bash_profile so login shells also get them.' },
    { front: 'What does umask 022 produce?', back: 'New files 644 (rw-r--r--) and directories 755 (rwxr-xr-x) by masking group/other write.' },
    { front: 'Why avoid output in non-interactive startup files?', back: 'It corrupts scp, rsync and ssh remote-command output, which expect clean streams.' },
    { front: 'What is a safe way to add ~/bin to PATH?', back: 'Prepend it once, guarding against duplicates, and export PATH. Avoid replacing the existing PATH.' },
    { front: 'How do you find what a command name really is?', back: 'Use type -a name. It reports aliases, functions, built-ins and every matching executable on PATH.' }
  ],
  quiz: [
    {
      q: 'Which file does an interactive non-login bash shell read?',
      options: ['/etc/profile', '~/.bash_profile', '~/.bashrc', '~/.profile only'],
      answer: 2,
      explain: 'Interactive non-login shells read ~/.bashrc (and often /etc/bash.bashrc). Login shells use the profile files.'
    },
    {
      q: 'A remote scp fails with strange extra output. What is a likely cause?',
      options: [
        'The network is encrypted',
        'A startup file prints a banner or error on non-interactive shells',
        'The file is too large',
        'umask is 022'
      ],
      answer: 1,
      explain: 'scp and rsync expect clean protocol data. Echo statements in .bashrc or system profile files can corrupt the stream.'
    },
    {
      q: 'What does <code>umask 077</code> do to new files?',
      options: [
        'Creates them world-readable',
        'Creates them readable only by the owner (600)',
        'Makes them executable',
        'Prevents creation'
      ],
      answer: 1,
      explain: 'A umask of 077 removes all group and other permissions, leaving files 600 and directories 700 by default.'
    },
    {
      q: 'Why is <code>PATH="$HOME/bin"</code> alone dangerous?',
      options: [
        'It makes the shell slower.',
        'It replaces the entire PATH, so system commands disappear.',
        'It deletes $HOME/bin.',
        'It affects only root.'
      ],
      answer: 1,
      explain: 'Always append or prepend to the existing PATH: PATH="$HOME/bin:$PATH". Replacing it loses /usr/bin and /bin.'
    }
  ]
});
