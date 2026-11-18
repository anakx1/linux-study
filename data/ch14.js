window.HLW.chapters.push({
  id: 14,
  title: 'A Brief Survey of the Linux Desktop and Printing',
  short: 'Desktop & printing',
  track: 'desktop',
  ref: 'Chapter 14',
  sectionsRef: '14.1–14.7',
  minutes: 35,
  tagline: 'From framebuffer to window, from document to page.',
  blurb: 'Survey the graphical stack: framebuffers, X11 and Wayland, compositors, toolkits and desktop environments; then follow a print job through CUPS.',
  objectives: [
    'Identify the layers of a Linux desktop and the role of each component.',
    'Distinguish X11 from Wayland and explain compositing and XWayland.',
    'Inspect displays, windows and input with X tools.',
    'Use D-Bus to inspect desktop services and messages.',
    'Understand the CUPS printing pipeline and basic print commands.'
  ],
  sections: [
    {
      id: 'ch14-components',
      ref: '14.1',
      title: 'Desktop components',
      html: `<p>A Linux desktop is a stack, not a single program. At the bottom, the kernel exposes graphics hardware through DRM/KMS and input through evdev. A <strong>framebuffer</strong> is a memory buffer holding pixels; the display controller scans it out to the screen. Above that, a display server or compositor manages windows and input.</p>
      <ul>
        <li><strong>Display server / compositor:</strong> X11 (Xorg) or a Wayland compositor. Owns the screen, routes input, manages windows.</li>
        <li><strong>Window manager:</strong> decides placement, decorations, focus, workspaces and keybindings. In Wayland it is usually part of the compositor.</li>
        <li><strong>Toolkit:</strong> GTK, Qt or EFL, providing widgets and drawing.</li>
        <li><strong>Desktop environment:</strong> GNOME, KDE Plasma, Xfce, LXQt — an integrated set of panel, settings, file manager and apps.</li>
        <li><strong>Applications:</strong> browsers, editors, terminals, all drawing through the toolkit and display protocol.</li>
      </ul>
      <p>These layers can be mixed. You can run KDE apps on GNOME, use a tiling compositor such as Sway, or run a bare window manager with no desktop environment. The desktop is modular, which is powerful but also why troubleshooting requires knowing which layer owns the problem.</p>`,
      diagram: {
        type: 'layers',
        caption: 'The Linux graphics stack, simplified',
        items: [
          { t: 'Applications', d: 'browser · terminal · editor', cls: 'hot' },
          { t: 'Toolkit', d: 'GTK · Qt · EFL' },
          { t: 'Compositor / display server', d: 'Wayland compositor or Xorg', cls: 'warm' },
          { t: 'Kernel graphics', d: 'DRM/KMS · GPU driver · evdev input' },
          { t: 'Hardware', d: 'GPU · display · keyboard · mouse' }
        ]
      }
    },
    {
      id: 'ch14-wayland',
      ref: '14.1.3, 14.2–14.3',
      title: 'Wayland',
      html: `<p><strong>Wayland</strong> is a display protocol, not a server program. A <strong>compositor</strong> implements the protocol, owns the display and input devices, and composites client surfaces itself. GNOME's Mutter, KDE's KWin, Sway, Weston and Hyprland are compositors. This design removes the intermediate X server and makes tearing, latency and per-monitor scaling more tractable.</p>
      <pre><code>$ echo $XDG_SESSION_TYPE          # wayland or x11
$ echo $WAYLAND_DISPLAY           # e.g. wayland-0
$ loginctl show-session $(loginctl | awk '/tty|seat/ {print $1; exit}') -p Type
$ wayland-info                    # if installed</code></pre>
      <p>Security is a major difference: Wayland clients cannot arbitrarily read other clients' windows or inject input. Screen capture, global shortcuts and accessibility go through portals and explicit protocols. This is better isolation, but some older tools need <strong>XWayland</strong>, a compatibility server that runs X11 clients inside a Wayland session.</p>
      <p><strong>libinput</strong> handles input devices for both X and Wayland on most systems, applying acceleration, tapping, gestures and calibration. Configuration is usually exposed through the desktop's settings rather than a single X configuration file.</p>
      <p>Check the session type before debugging: an X11 tool such as <code>xrandr</code> may work under XWayland only in limited ways, and some global shortcuts simply cannot work the same way under Wayland.</p>`
    },
    {
      id: 'ch14-x11',
      ref: '14.4',
      title: 'The X Window System',
      html: `<p>X11 is a client/server architecture. The <strong>X server</strong> owns the display, keyboard and mouse; <strong>X clients</strong> are applications that connect to it. They can run on the same machine or, historically, across the network. <code>$DISPLAY</code> names the server, such as <code>:0</code> for the local display.</p>
      <pre><code>$ echo $DISPLAY
$ xdpyinfo | head
$ xrandr --query
$ xwininfo -root -tree | head
$ xinput list</code></pre>
      <p><code>xrandr</code> lists outputs, modes and scaling. <code>xwininfo</code> walks the window tree. <code>xinput</code> lists and configures input devices. <code>xev</code> prints events for debugging. A <strong>display manager</strong> (GDM, SDDM, LightDM) presents the graphical login and starts the user session; it is separate from the window manager.</p>
      <p>X11's network transparency is convenient but risky: the protocol is not encrypted, and access control is coarse. Do not expose an X server to an untrusted network. Use SSH X11 forwarding only when necessary, and prefer Wayland or a remote desktop protocol with encryption.</p>
      <p>X has no built-in compositing; a separate compositor provides shadows, transparency and tearing control. Modern desktops usually bundle one. Without a compositor, screen tearing and stale window contents are common.</p>`
    },
    {
      id: 'ch14-dbus',
      ref: '14.5',
      title: 'D-Bus',
      html: `<p><strong>D-Bus</strong> is the desktop's message bus. Services register names and objects; clients call methods, read properties and subscribe to signals. There are two buses: the <strong>system bus</strong> for privileged system services, and a per-user <strong>session bus</strong> for desktop components.</p>
      <pre><code>$ busctl list | head
$ busctl --user list
$ dbus-monitor --session
$ busctl introspect org.freedesktop.NetworkManager /org/freedesktop/NetworkManager</code></pre>
      <p>Common services include NetworkManager, UPower, logind, the notification daemon, the portal service and BlueZ. Desktop integration — suspend inhibition, media keys, screen sharing approval — often flows through D-Bus and xdg-desktop-portal.</p>
      <p>D-Bus is not a network protocol by default; it is a local IPC mechanism with authentication and policy. The system bus has security policies in <code>/usr/share/dbus-1/system.d/</code> and <code>/etc/dbus-1/system.d/</code>. A misconfigured policy can expose privileged methods to unprivileged users, so review changes carefully.</p>
      <p>When a desktop feature silently fails, <code>dbus-monitor</code> or <code>journalctl --user</code> often reveals a missing service, a permission denial or a method call that never returns.</p>`
    },
    {
      id: 'ch14-printing',
      ref: '14.6',
      title: 'Printing with CUPS',
      html: `<p><strong>CUPS</strong> (Common UNIX Printing System) is the standard Linux print service. It listens on TCP 631, speaks IPP, discovers network printers with DNS-SD/AirPrint, and runs a pipeline: client → queue → filter chain → backend → printer.</p>
      <pre><code>$ lpstat -p -d              # printers and default destination
$ lp -d printer file.pdf    # submit a job
$ lpoptions -p printer -l   # list options
$ cancel -a printer         # cancel jobs
$ systemctl status cups
$ cupsctl --debug-logging</code></pre>
      <p>A <strong>PPD</strong> (PostScript Printer Description) describes a printer's capabilities and options. Modern driverless printing uses IPP Everywhere or AirPrint, removing the need for vendor drivers. Filters convert documents (PDF, images, text) into a format the printer understands; backends deliver the data over USB, network or a proprietary transport.</p>
      <p>Logs live in <code>/var/log/cups/error_log</code>. Increase verbosity with <code>cupsctl --debug-logging</code>, reproduce the problem, then turn it off. Check that the queue is enabled and accepting jobs (<code>lpstat -p</code>), that the device URI is reachable, and that the filter chain has the required tools installed.</p>
      <p>Printing crosses user space, permissions and often the network, so diagnose in layers: can the client reach port 631, is the job queued, does the filter succeed, and does the printer accept the final data?</p>`
    }
  ],
  commands: [
    { cmd: 'echo $XDG_SESSION_TYPE', desc: 'Show whether the current session is Wayland or X11.' },
    { cmd: 'loginctl show-session SESSION -p Type', desc: 'Ask logind for the session type and related properties.' },
    { cmd: 'xrandr --query', desc: 'List X displays, resolutions and refresh rates.' },
    { cmd: 'xdpyinfo | head', desc: 'Show X server capabilities and screen information.' },
    { cmd: 'xwininfo -root -tree', desc: 'List the X window tree and window IDs.' },
    { cmd: 'xinput list', desc: 'List X input devices and their IDs.' },
    { cmd: 'busctl --user list', desc: 'List services on the user D-Bus session bus.' },
    { cmd: 'dbus-monitor --session', desc: 'Watch D-Bus messages on the session bus.' },
    { cmd: 'lpstat -p -d', desc: 'List printers and show the default destination.' },
    { cmd: 'lp -d printer file.pdf', desc: 'Submit a print job to a named printer.' },
    { cmd: 'lpoptions -p printer -l', desc: 'List available options and settings for a printer.' },
    { cmd: 'sudo cupsctl --debug-logging', desc: 'Enable verbose CUPS logging for troubleshooting.' },
    { cmd: 'sudo tail -f /var/log/cups/error_log', desc: 'Follow CUPS error and job-processing messages.' }
  ],
  labs: [
    {
      title: 'Identify your graphical stack',
      goal: 'Determine which display protocol, compositor and desktop you are actually running.',
      steps: [
        'Run <code>echo $XDG_SESSION_TYPE</code>, <code>echo $DISPLAY</code> and <code>echo $WAYLAND_DISPLAY</code>. Interpret the combination.',
        'Run <code>loginctl</code> and inspect your session with <code>loginctl show-session ID -p Type -p Desktop -p Active</code>.',
        'If X11, run <code>xrandr --query</code> and <code>xinput list</code>. If Wayland, look for <code>wayland-info</code> or the settings of your compositor.',
        'Run <code>busctl --user list | head</code> and identify one desktop service.',
        'List your desktop environment with <code>echo $XDG_CURRENT_DESKTOP</code> and name its toolkit and compositor.'
      ]
    },
    {
      title: 'Explore the print queue',
      goal: 'Understand CUPS state without printing a document.',
      steps: [
        'Run <code>lpstat -p -d</code> and note whether a default printer exists.',
        'Run <code>lpstat -t</code> if available and inspect scheduler, device and queue status.',
        'Check whether CUPS is listening: <code>ss -tlnp | grep 631</code>.',
        'Run <code>lpoptions -p printer -l</code> for a configured printer and identify one option.',
        'Inspect <code>/var/log/cups/error_log</code> for recent job or filter messages (you may need sudo).'
      ]
    }
  ],
  cards: [
    { front: 'What is a compositor?', back: 'The component that combines application surfaces into the final screen image and manages windows, input and presentation. In Wayland it is the display server.' },
    { front: 'X11 vs Wayland', back: 'X11 is a client/server protocol with a separate X server. Wayland is a protocol implemented by a compositor, giving tighter integration, better isolation and no network transparency by default.' },
    { front: 'What is XWayland?', back: 'A compatibility X server that lets legacy X11 clients run inside a Wayland session.' },
    { front: 'What does libinput do?', back: 'It handles input devices (keyboard, mouse, touchpad, touchscreen) for X and Wayland, applying acceleration, gestures and calibration.' },
    { front: 'System bus vs session bus', back: 'The system bus is shared by system services and policed by root; the session bus is per-user and hosts desktop services.' },
    { front: 'What is CUPS?', back: 'The Common UNIX Printing System: an IPP print server that queues jobs, runs filters and sends data to printers via backends.' }
  ],
  quiz: [
    {
      q: 'Which variable tells you whether the session is Wayland?',
      options: ['$DISPLAY', '$XDG_SESSION_TYPE', '$TERM', '$SHELL'],
      answer: 1,
      explain: 'XDG_SESSION_TYPE is wayland or x11. $DISPLAY can exist under XWayland even in a Wayland session.'
    },
    {
      q: 'What is the primary architectural difference in Wayland?',
      options: [
        'It uses a network-transparent protocol.',
        'The compositor is the display server and directly manages rendering and input.',
        'It has no window manager.',
        'It only supports GTK.'
      ],
      answer: 1,
      explain: 'Wayland folds display server and compositor together. Clients render surfaces and the compositor presents them, with no separate X server in the middle.'
    },
    {
      q: 'Which command lists configured printers and the default destination?',
      options: ['lpstat -p -d', 'cupsctl', 'xrandr', 'busctl list'],
      answer: 0,
      explain: 'lpstat -p lists printers; -d shows the default. CUPS listens on 631 and speaks IPP.'
    },
    {
      q: 'What is the system D-Bus used for?',
      options: [
        'Only desktop notifications',
        'Privileged system services and policy-controlled IPC',
        'Kernel system calls',
        'Printing only'
      ],
      answer: 1,
      explain: 'The system bus hosts services such as NetworkManager, logind and UPower, with policies controlling who may call them. The session bus is per-user.'
    },
    {
      q: 'A desktop application global shortcut does not work under Wayland. Why?',
      options: [
        'Wayland has no keyboard support',
        'Wayland isolates clients, so global shortcuts require compositor/portal support',
        'The keyboard driver is missing',
        'D-Bus is disabled'
      ],
      answer: 1,
      explain: 'Wayland clients cannot arbitrarily capture global input. The compositor must implement the shortcut or expose it through a portal.'
    }
  ]
});
