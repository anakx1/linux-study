/* ============================================================
   Under-the-hood visual explainers
   Three stage-by-stage models: boot, command execution, packet
   ============================================================ */
window.HLW = window.HLW || {};

window.HLW.visuals = {
  order: ['boot', 'command', 'packet'],
  items: {
    boot: {
      label: 'Boot sequence',
      short: 'Boot',
      glyph: '⏻',
      title: 'From power-on to login',
      blurb: 'Follow a machine from firmware to a login prompt. Each stage shows what runs, what it hands to the next stage, and what happens when it breaks.',
      chapters: [5, 6],
      stages: [
        {
          key: 'firmware', label: 'Firmware', sub: 'POST + boot device', tone: 'amber', actor: 'Hardware & firmware',
          title: 'Power, POST, and a boot device',
          summary: 'The CPU starts executing firmware from ROM. The firmware checks basic hardware and chooses a device to boot from.',
          detail: `<p>On power-up the CPU begins at a fixed address in firmware — the <strong>BIOS</strong> on older systems or <strong>UEFI</strong> on modern ones. Firmware initialises memory and controllers, runs the power-on self-test (POST), then looks for a bootable device.</p>
            <p>Legacy BIOS reads the first sector (MBR) of a disk. UEFI reads a bootloader from the EFI System Partition. Either way, the firmware's only real job is to load and jump to the next stage.</p>
            <ul><li>BIOS + MBR: 512-byte first sector, partition table, boot code.</li><li>UEFI + GPT: FAT-formatted ESP, <code>.efi</code> application, boot entries in NVRAM.</li><li>Boot order and Secure Boot are firmware settings, not Linux settings.</li></ul>`,
          cmd: 'sudo dmidecode -t bios\nbootctl status',
          link: { ch: 5, section: 'ch5-loaders', label: 'Ch 5 · Boot loaders' },
          fail: {
            title: 'No bootable device',
            detail: `<p>The firmware cannot find a bootloader. Common causes: the boot order points at an empty USB stick, the disk is not detected, the EFI System Partition is missing, or the boot entry was removed.</p><p>Boot a live environment and check <code>lsblk -f</code> for the disk and its ESP. On UEFI systems, <code>efibootmgr</code> shows and edits boot entries.</p>`,
            cmd: 'lsblk -f\nsudo efibootmgr -v'
          }
        },
        {
          key: 'bootloader', label: 'Bootloader', sub: 'GRUB loads the kernel', tone: 'amber', actor: 'GRUB / UEFI',
          title: 'The bootloader loads the kernel',
          summary: 'GRUB reads its configuration, may show a menu, and loads the kernel plus initramfs into memory.',
          detail: `<p>GRUB's configuration is usually generated into <code>/boot/grub/grub.cfg</code>. It knows which kernel to load, which initramfs to pair with it, and which kernel command line to use — typically <code>root=UUID=… ro quiet</code>.</p>
            <p>The bootloader does not mount your root filesystem. It only loads files into memory and jumps into the kernel with the command line and initramfs address.</p>
            <ul><li><code>/proc/cmdline</code> shows the command line the running kernel actually received.</li><li>UEFI boots an EFI application; BIOS boots the MBR code.</li><li>A menu timeout of zero hides the menu — hold Shift or Esc on many systems to show it.</li></ul>`,
          cmd: 'cat /proc/cmdline\nsudo grub-mkconfig -o /boot/grub/grub.cfg',
          link: { ch: 5, section: 'ch5-grub', label: 'Ch 5 · GRUB' },
          fail: {
            title: 'Dropped to a grub> prompt',
            detail: `<p>GRUB started but could not find its configuration or the kernel. You can boot manually if you know the partition layout: use <code>ls</code> to find partitions, set <code>root</code> and <code>prefix</code>, load the kernel and initrd, then <code>boot</code>.</p><p>The permanent fix is usually to chroot from a live system and regenerate the GRUB configuration.</p>`,
            cmd: 'ls\ngrub> set root=(hd0,gpt2)\ngrub> linux /boot/vmlinuz root=/dev/sda2 ro\ngrub> initrd /boot/initrd.img\ngrub> boot'
          }
        },
        {
          key: 'kernel', label: 'Kernel', sub: 'Decompress + probe', tone: 'blue', actor: 'Linux kernel',
          title: 'The kernel takes over',
          summary: 'The compressed kernel decompresses itself, sets up memory and interrupts, probes hardware, and mounts the real root filesystem.',
          detail: `<p><code>vmlinuz</code> is a compressed kernel with a small decompression stub. Once running, the kernel sets up virtual memory, interrupt handling, timers, and the scheduler. It then probes buses and devices and loads the drivers it needs.</p>
            <p>With the root device known, the kernel mounts the root filesystem read-only at first. If it cannot find the device or the filesystem driver, it panics — there is no user space yet to ask for help.</p>
            <ul><li>Built-in drivers are always available; modules may live in the initramfs.</li><li>Kernel messages go to the ring buffer, readable later with <code>dmesg</code>.</li><li>A kernel panic is not a normal service failure; the machine stops.</li></ul>`,
          cmd: 'dmesg | less\njournalctl -k -b\ncat /proc/cmdline',
          link: { ch: 5, section: 'ch5-kernel', label: 'Ch 5 · Kernel startup' },
          fail: {
            title: 'Kernel panic: unable to mount root fs',
            detail: `<p>The kernel cannot find or mount the root filesystem. The usual causes are a wrong <code>root=</code> value, a missing storage driver, or an initramfs that does not contain the needed module.</p><p>Boot a live system, run <code>lsblk -f</code> to get the correct UUID, and check that the initramfs includes the storage stack (for example LVM, LUKS, or a RAID driver).</p>`,
            cmd: 'lsblk -f\ncat /etc/fstab\nsudo update-initramfs -u -k all'
          }
        },
        {
          key: 'initramfs', label: 'initramfs', sub: 'Temporary root', tone: 'blue', actor: 'initramfs',
          title: 'A temporary root filesystem',
          summary: 'A small archive provides the drivers and tools needed to find and mount the real root, then switches to it.',
          detail: `<p>The initramfs is a compressed cpio archive loaded alongside the kernel. It becomes an early root filesystem containing udev, busybox utilities, and modules for storage, encryption, LVM, or network boot.</p>
            <p>Its init script waits for the root device, unlocks it if needed, mounts it, and then <code>switch_root</code>s or <code>pivot_root</code>s into the real filesystem. From that point the temporary world disappears.</p>
            <ul><li>Debian/Ubuntu: <code>update-initramfs</code>; Fedora/RHEL: <code>dracut</code>.</li><li>Missing firmware or a module here produces an early boot failure, before logging is fully available.</li></ul>`,
          cmd: 'lsinitramfs /boot/initrd.img-$(uname -r) | head\n# Fedora/RHEL\nlsinitrd /boot/initramfs-$(uname -r).img | head',
          link: { ch: 5, section: 'ch5-details', label: 'Ch 5 · Boot details' },
          fail: {
            title: 'Dropped to an (initramfs) prompt',
            detail: `<p>The temporary root is running, but it could not mount the real root. You can inspect devices and try the mount by hand. If it works, the permanent fix is to correct the UUID or rebuild the initramfs with the right drivers.</p><p>The prompt is busybox, not your normal shell — fewer commands are available.</p>`,
            cmd: 'blkid\nls /dev/disk/by-uuid\nmount /dev/sda2 /root\nexit'
          }
        },
        {
          key: 'init', label: 'init / systemd', sub: 'PID 1 starts', tone: 'green', actor: 'systemd (PID 1)',
          title: 'PID 1 starts user space',
          summary: 'The kernel executes /sbin/init — usually systemd — as PID 1. It reads units and works toward the default target.',
          detail: `<p>After mounting the real root, the kernel starts the program named by <code>init=</code>, or <code>/sbin/init</code> by default. On most distributions that is systemd, running as PID 1 with special responsibilities: reaping orphans and managing the service graph.</p>
            <p>systemd mounts remaining filesystems, starts udev, dbus, sockets, and services, and works toward the default target. Targets are roughly the old runlevels: <code>multi-user.target</code> for a text system, <code>graphical.target</code> for a desktop.</p>
            <ul><li><code>systemctl get-default</code> shows the target.</li><li>Emergency and rescue targets start almost nothing — useful when a normal boot fails.</li></ul>`,
          cmd: 'ps -p 1 -o comm=\nsystemctl get-default\nsystemctl list-units --type=target',
          link: { ch: 6, section: 'ch6-init', label: 'Ch 6 · init' },
          fail: {
            title: 'Boot stops in emergency mode',
            detail: `<p>A required mount failed or a critical unit could not start, so systemd entered emergency mode. The root filesystem may be mounted read-only. Start by reading the failure list and the boot log, then fix <code>/etc/fstab</code> and reload systemd.</p>`,
            cmd: 'systemctl --failed\njournalctl -xb\nmount -a\nsystemctl daemon-reload'
          }
        },
        {
          key: 'services', label: 'Services', sub: 'Units + targets', tone: 'green', actor: 'systemd units',
          title: 'Units come up in dependency order',
          summary: 'systemd starts services, sockets, timers, and mounts in parallel while respecting dependencies.',
          detail: `<p>Each unit describes one thing: a service, a socket, a mount, a timer, or a target. Ordering comes from <code>After=</code> and <code>Before=</code>; requirements come from <code>Requires=</code>, <code>Wants=</code>, and <code>BindsTo=</code>.</p>
            <p>systemd starts independent units in parallel and activates socket services on first connection. A failed service does not necessarily stop the boot — the target can still be reached in a degraded state.</p>
            <ul><li><code>systemctl --failed</code> is the first command after a strange boot.</li><li><code>systemd-analyze blame</code> shows what took the longest; <code>critical-chain</code> shows what blocked what.</li></ul>`,
          cmd: 'systemctl list-units --failed\nsystemctl status sshd\nsystemd-analyze blame | head',
          link: { ch: 6, section: 'ch6-units', label: 'Ch 6 · Units' },
          fail: {
            title: 'System reaches degraded state',
            detail: `<p>A unit failed but the rest of the boot continued. Find the failed unit, read its status and journal, and fix the underlying cause — a missing binary, a bad config, a port conflict, or a permission problem.</p>`,
            cmd: 'systemctl --failed\nsystemctl status <unit>\njournalctl -u <unit> -b --no-pager'
          }
        },
        {
          key: 'login', label: 'Login', sub: 'getty or display manager', tone: 'teal', actor: 'User session',
          title: 'A login prompt, or a display manager',
          summary: 'getty or a display manager presents a login; PAM authenticates you and starts your session.',
          detail: `<p>On a text console, <code>getty</code> waits on a tty and hands the username to <code>login</code>. On a desktop, the display manager provides the graphical login. Both use PAM to authenticate and set up the session.</p>
            <p>After login you get a shell or a desktop session, with your own environment, <code>systemd --user</code> instance, and cgroup. The boot job is done; everything after this is normal process and service management.</p>
            <ul><li><code>who</code> and <code>loginctl</code> show sessions.</li><li><code>systemctl status getty@tty1</code> checks a text console.</li></ul>`,
          cmd: 'who\nloginctl list-sessions\nsystemctl status getty@tty1',
          link: { ch: 6, section: 'ch6-targets', label: 'Ch 6 · Targets' },
          fail: {
            title: 'No login prompt appears',
            detail: `<p>The system may be up but the getty or display manager is not. Switch to another tty, or boot into rescue mode, then check the unit and its logs. A full root filesystem or a broken PAM configuration can also prevent login.</p>`,
            cmd: 'systemctl status getty@tty1\njournalctl -u getty@tty1 -b\ndf -h'
          }
        }
      ]
    },

    command: {
      label: 'Run a command',
      short: 'Command',
      glyph: '⌘',
      title: 'What happens when you press Enter',
      blurb: 'Trace ls -l /var/log from keystroke to pixels. The shell, kernel, VFS, page cache, and disk all play a part — and each one can fail in its own way.',
      chapters: [1, 2, 8, 11],
      stages: [
        {
          key: 'tty', label: 'Terminal', sub: 'Keystrokes to pty', tone: 'teal', actor: 'Terminal emulator',
          title: 'The terminal sends keystrokes',
          summary: 'The terminal emulator writes characters to a pseudo-terminal; the line discipline buffers them until you press Enter.',
          detail: `<p>Your terminal emulator is an ordinary user-space program. It draws text and sends the characters you type to a pseudo-terminal (<code>/dev/pts/N</code>). The kernel's tty line discipline handles editing, echo, and signals such as Ctrl-C.</p>
            <p>In canonical mode, the shell does not see anything until you press Enter. The terminal is not the shell, and the shell is not the terminal.</p>
            <ul><li><code>tty</code> prints the device attached to your shell.</li><li><code>stty -a</code> shows terminal modes and key bindings.</li></ul>`,
          cmd: 'tty\nstty -a | head -5',
          link: { ch: 2, section: 'ch2-io', label: 'Ch 2 · I/O and terminals' },
          fail: {
            title: 'The terminal is garbled or not echoing',
            detail: `<p>A program may have left the tty in raw mode, or binary output changed the terminal state. Try <code>reset</code>; if you cannot type, use <code>stty sane</code> followed by Ctrl-J. Closing and reopening the terminal also works.</p>`,
            cmd: 'reset\n# or\nstty sane'
          }
        },
        {
          key: 'parse', label: 'Shell parses', sub: 'Words + expansions', tone: 'teal', actor: 'Bash / shell',
          title: 'The shell parses the command line',
          summary: 'The shell splits words, expands quotes, variables, globs, and redirections, then decides whether the command is a builtin or an external program.',
          detail: `<p>The shell performs expansions in a defined order: brace expansion, tilde, parameter and variable expansion, command substitution, arithmetic, word splitting, and pathname expansion. Quotes suppress some of these stages.</p>
            <p>Redirections are set up before the program runs. A pipeline creates processes connected by pipes. Aliases are expanded early; functions and builtins run inside the shell, so they do not need an <code>exec</code>.</p>
            <ul><li><code>set -x</code> prints the expanded command before running it.</li><li>Single quotes preserve everything; double quotes allow expansion.</li></ul>`,
          cmd: "set -x\nls -l /var/log\nset +x\nprintf '%q\\n' \"a b\"",
          link: { ch: 11, section: 'ch11-quoting', label: 'Ch 11 · Quoting' },
          fail: {
            title: 'An unmatched quote swallows the prompt',
            detail: `<p>The shell is waiting for the closing quote, so it shows a continuation prompt (<code>&gt;</code> or <code>quote&gt;</code>). Press Ctrl-C to abandon the line. The same happens with an unclosed <code>(</code>, <code>{</code>, or here-document.</p>`,
            cmd: 'echo "unterminated\n# press Ctrl-C'
          }
        },
        {
          key: 'lookup', label: 'PATH lookup', sub: 'Find the program', tone: 'teal', actor: 'Shell',
          title: 'Finding the program',
          summary: 'For an external command, the shell searches each directory in PATH and remembers the result in its hash table.',
          detail: `<p>If <code>ls</code> is not a builtin, function, or alias, the shell searches the colon-separated directories in <code>PATH</code> for an executable file. The first match wins, and bash caches the full path in its hash table.</p>
            <p><code>which</code> is a separate program and can disagree with the shell. <code>type -a</code> and <code>command -v</code> ask the shell itself.</p>
            <ul><li>An executable bit is required; a readable script without <code>+x</code> will not run directly.</li><li><code>hash -r</code> clears the cache after installing or moving a command.</li></ul>`,
          cmd: 'type -a ls\ncommand -v ls\necho $PATH | tr : "\\n"',
          link: { ch: 2, section: 'ch2-shell', label: 'Ch 2 · The shell' },
          fail: {
            title: 'bash: command not found',
            detail: `<p>The shell searched every PATH directory and found nothing executable. Check the spelling, the PATH, and whether the package is installed. A relative path such as <code>./script.sh</code> needs the leading <code>./</code>.</p>`,
            cmd: 'echo $PATH\ntype -a mycommand\nhash -r\nsudo apt install <package>'
          }
        },
        {
          key: 'fork', label: 'fork / exec', sub: 'Child process', tone: 'blue', actor: 'Kernel',
          title: 'A child is born, then replaced',
          summary: 'The shell forks a copy of itself, and the child calls execve() to replace its image with the program.',
          detail: `<p><code>fork()</code> creates a child process with a copy of the parent's memory, using copy-on-write. The child then calls <code>execve()</code>, which replaces its address space and starts the new program at its entry point.</p>
            <p>The shell waits for the child and collects its exit status. A pipeline is several children connected by pipes, with the shell waiting on all of them.</p>
            <ul><li><code>$$</code> is the shell's PID; <code>$!</code> is the last background PID.</li><li>Process limits can make <code>fork</code> fail even when memory looks fine.</li></ul>`,
          cmd: 'ps -o pid,ppid,comm -p $$\nstrace -f -e trace=clone,execve ls /tmp',
          link: { ch: 8, section: 'ch8-tracking', label: 'Ch 8 · Tracking processes' },
          fail: {
            title: 'fork: Resource temporarily unavailable',
            detail: `<p>The process or thread limit was reached. Check <code>ulimit -u</code>, the cgroup <code>pids.max</code>, and the number of processes for the user. A fork bomb or a runaway service can exhaust the table.</p>`,
            cmd: 'ulimit -u\ncat /sys/fs/cgroup/pids.max\nps -eLf | wc -l'
          }
        },
        {
          key: 'syscall', label: 'Syscalls', sub: 'User to kernel', tone: 'blue', actor: 'User → kernel mode',
          title: 'Crossing into kernel mode',
          summary: 'The program asks the kernel to open directories, read entries, and write output through system calls.',
          detail: `<p>User programs cannot touch devices or kernel data directly. They make system calls — a controlled transition into kernel mode — through libc wrappers. <code>ls</code> typically calls <code>openat</code>, <code>getdents64</code>, <code>statx</code>, <code>write</code>, and <code>close</code>.</p>
            <p><code>strace</code> shows these calls with arguments and return values. The transition itself is fast; the expensive part is usually I/O or waiting.</p>
            <ul><li>System calls are not the same as library calls.</li><li>Security modules can deny a syscall even when file permissions look correct.</li></ul>`,
          cmd: 'strace -e trace=openat,getdents64,write ls -l /var/log 2>&1 | head -30',
          link: { ch: 1, section: 'ch1-modes', label: 'Ch 1 · Kernel vs user mode' },
          fail: {
            title: 'Operation not permitted (EPERM)',
            detail: `<p>The kernel refused the operation. This may come from seccomp, capabilities, SELinux, or AppArmor rather than ordinary Unix permissions. Read the kernel log and the security subsystem's audit trail.</p>`,
            cmd: 'dmesg | grep -i -E "denied|avc|apparmor"\nsudo ausearch -m avc -ts recent'
          }
        },
        {
          key: 'vfs', label: 'VFS + cache', sub: 'Path + permissions', tone: 'blue', actor: 'Kernel VFS',
          title: 'Path lookup and the page cache',
          summary: 'The kernel resolves the path one component at a time, checks permissions, and serves file data from the page cache when possible.',
          detail: `<p>The virtual filesystem switches between ext4, XFS, tmpfs, NFS, and others behind one interface. Path resolution walks each component, consulting dentries and inodes, following symlinks, and checking mount points and permissions at every step.</p>
            <p>Recently used file data lives in the page cache. A cache hit avoids disk I/O entirely, which is why a second <code>ls -l</code> is much faster and why <code>free</code> shows most memory as cached.</p>
            <ul><li>Directories need <code>x</code> permission to traverse, not just <code>r</code>.</li><li><code>stat</code> shows inode metadata; <code>namei -l</code> checks every path component.</li></ul>`,
          cmd: 'stat /var/log\nnamei -l /var/log/syslog\nfindmnt -T /var/log',
          link: { ch: 2, section: 'ch2-perms', label: 'Ch 2 · Permissions' },
          fail: {
            title: 'Permission denied on a 644 file',
            detail: `<p>The file mode may be fine while a parent directory lacks execute permission. Path traversal requires <code>x</code> on every directory in the path. <code>namei -l</code> shows the effective permissions component by component.</p>`,
            cmd: 'namei -l /srv/app/config.yml\nls -ld /srv /srv/app'
          }
        },
        {
          key: 'block', label: 'Block I/O', sub: 'Disk or SSD', tone: 'amber', actor: 'Block layer + driver',
          title: 'When the cache misses, the disk is asked',
          summary: 'The filesystem maps file offsets to blocks; the block layer schedules I/O and the device driver talks to the hardware.',
          detail: `<p>On a cache miss, the filesystem translates the file offset into physical blocks using its metadata (extents, block maps, or B-trees). The block layer merges and schedules requests, and the device driver submits them to the disk.</p>
            <p>An SSD has no seek penalty but still has latency and queue limits. A failing disk may return I/O errors long before it stops working entirely.</p>
            <ul><li><code>iostat -x</code> shows utilisation and await; <code>iotop</code> attributes I/O to processes.</li><li>Filesystem choice affects metadata performance and repair time.</li></ul>`,
          cmd: 'iostat -x 1\nsudo iotop -o\nfindmnt -T /var/log',
          link: { ch: 4, section: 'ch4-filesystems', label: 'Ch 4 · Filesystems' },
          fail: {
            title: 'Input/output error',
            detail: `<p>The device or filesystem returned an I/O error. Check the kernel log for the affected device, inspect SMART health, and verify cables or the virtual disk. Do not run a repair on a failing disk before copying important data.</p>`,
            cmd: 'dmesg | tail -40\nsudo smartctl -a /dev/sda\nsudo fsck -n /dev/sda2'
          }
        },
        {
          key: 'output', label: 'Output', sub: 'Bytes to pixels', tone: 'teal', actor: 'Back to your terminal',
          title: 'Bytes become text on screen',
          summary: 'The program writes to file descriptor 1; the kernel copies bytes to the pty; the terminal emulator renders them.',
          detail: `<p>By convention, file descriptor 1 is stdout and 2 is stderr. Both usually point at the same pty. The program calls <code>write()</code>, the tty layer buffers the bytes, and the terminal emulator interprets them — including colour and cursor escape sequences.</p>
            <p>Redirection changes the file descriptor before the program starts. Pipes connect stdout of one process to stdin of the next. Buffering means output can appear late or in chunks.</p>
            <ul><li><code>&gt; file</code> truncates; <code>&gt;&gt; file</code> appends; <code>2&gt;&amp;1</code> sends stderr to the same place as stdout.</li><li><code>stdbuf -oL</code> forces line buffering for a program that buffers when writing to a pipe.</li></ul>`,
          cmd: 'ls -l /var/log > /tmp/out.txt 2>&1\nwc -l /tmp/out.txt\nls -l /var/log | less',
          link: { ch: 2, section: 'ch2-io', label: 'Ch 2 · Standard I/O' },
          fail: {
            title: 'Output disappears or arrives late',
            detail: `<p>Stdout may be redirected somewhere you did not intend, or the program may be block-buffering because it is writing to a pipe or file. Check the process's open file descriptors and try line buffering.</p>`,
            cmd: 'lsof -p <pid>\nstdbuf -oL myprogram | tee /tmp/out.log'
          }
        }
      ]
    },

    packet: {
      label: 'Packet journey',
      short: 'Packet',
      glyph: '⇄',
      title: 'What happens when you open a web page',
      blurb: 'Follow one HTTPS request from a hostname to a rendered response: DNS, routing, ARP, TCP, TLS, the server, and the trip back.',
      chapters: [9, 10],
      stages: [
        {
          key: 'app', label: 'Application', sub: 'Socket + connect', tone: 'teal', actor: 'curl / browser',
          title: 'The app asks for a connection',
          summary: 'curl or a browser resolves the name, opens a socket, and asks the kernel to connect.',
          detail: `<p>The application parses the URL, determines the host and port, and calls <code>getaddrinfo()</code> to resolve the name. It creates a socket and calls <code>connect()</code>, which blocks until the TCP handshake completes (or fails).</p>
            <p>For HTTPS, TLS runs after the TCP connection is established. Proxies and environment variables such as <code>HTTPS_PROXY</code> can change the destination entirely.</p>
            <ul><li><code>curl -v</code> shows each phase: DNS, connect, TLS, request, response.</li><li><code>ss -tanp</code> shows sockets and their states.</li></ul>`,
          cmd: 'curl -v https://example.com/ -o /dev/null\nss -tanp | head',
          link: { ch: 9, section: 'ch9-layers', label: 'Ch 9 · Network layers' },
          fail: {
            title: 'The request never leaves the app',
            detail: `<p>A proxy variable, a bad URL, or a local firewall rule can stop the request before any packet is sent. <code>curl -v</code> prints the resolved address and where it stalls; check proxy settings in the environment and in the app config.</p>`,
            cmd: 'env | grep -i proxy\ncurl -v --noproxy "*" https://example.com/'
          }
        },
        {
          key: 'dns', label: 'DNS', sub: 'Name to address', tone: 'amber', actor: 'Resolver',
          title: 'Turning a name into an address',
          summary: 'The resolver checks /etc/hosts, then asks the nameserver in /etc/resolv.conf over UDP or TCP port 53.',
          detail: `<p><code>/etc/nsswitch.conf</code> controls the lookup order — usually <code>files</code> then <code>dns</code>. The resolver reads <code>/etc/resolv.conf</code> for nameservers and search domains, then sends a query, normally over UDP port 53, retrying over TCP if the answer is truncated.</p>
            <p>Modern systems often run a local stub resolver such as systemd-resolved on <code>127.0.0.53</code>. Caching and TTLs determine how long an answer is reused.</p>
            <ul><li><code>getent hosts</code> uses the same resolver path as normal programs.</li><li><code>dig</code> talks DNS directly and is better for debugging the protocol.</li></ul>`,
          cmd: 'getent hosts example.com\ndig +short example.com\nresolvectl status',
          link: { ch: 9, section: 'ch9-dns', label: 'Ch 9 · DNS' },
          fail: {
            title: 'Temporary failure in name resolution',
            detail: `<p>The resolver could not get an answer. Check that a nameserver is configured and reachable, that <code>/etc/hosts</code> is sane, and that UDP/TCP 53 is not blocked. Test a public resolver directly to separate local resolver problems from upstream ones.</p>`,
            cmd: 'cat /etc/resolv.conf\ndig @1.1.1.1 example.com\nresolvectl query example.com'
          }
        },
        {
          key: 'route', label: 'Routing', sub: 'Pick an interface', tone: 'blue', actor: 'Kernel routing table',
          title: 'Which interface, which gateway?',
          summary: 'The kernel compares the destination with the routing table, choosing a directly connected network or the default gateway.',
          detail: `<p>The kernel performs longest-prefix matching against the routing table. A destination inside a directly connected subnet goes out that interface; everything else follows the default route via a gateway. Policy routing can add rules based on source, mark, or interface.</p>
            <p>The chosen route also determines the source address and outgoing interface. <code>ip route get</code> asks the kernel exactly what it would do.</p>
            <ul><li>No default route means no Internet, even if DNS and the interface are fine.</li><li>Multiple default routes are resolved by metric.</li></ul>`,
          cmd: 'ip route\nip route get 1.1.1.1\nip -br addr',
          link: { ch: 9, section: 'ch9-routing', label: 'Ch 9 · Routing' },
          fail: {
            title: 'Network is unreachable',
            detail: `<p>The kernel has no route to the destination. Either the interface is down, no address is configured, or the default gateway is missing. Add the route or fix the network configuration, then verify with <code>ip route get</code>.</p>`,
            cmd: 'ip -br link\nip -br addr\nip route\nsudo ip route add default via 192.168.1.1'
          }
        },
        {
          key: 'arp', label: 'Neighbour', sub: 'IP to MAC', tone: 'amber', actor: 'ARP / NDP',
          title: 'Finding the next hop’s MAC address',
          summary: 'On a local link, ARP or NDP maps the next-hop IP to a MAC address; the frame is then sent to that MAC.',
          detail: `<p>Ethernet delivers frames by MAC address, not IP. For IPv4, ARP broadcasts “who has this address?” and caches the reply. IPv6 uses neighbour discovery over ICMPv6. The result appears in the neighbour table.</p>
            <p>If the destination is on another subnet, the lookup is for the gateway's MAC, not the server's. Switches then forward the frame based on their MAC table; VLANs keep traffic separated.</p>
            <ul><li><code>ip neigh</code> shows reachable, stale, and incomplete entries.</li><li><code>arping</code> tests layer-2 reachability without IP routing.</li></ul>`,
          cmd: 'ip neigh\narping -c 3 192.168.1.1\nip -br link',
          link: { ch: 9, section: 'ch9-addressing', label: 'Ch 9 · Addressing' },
          fail: {
            title: 'Neighbour entry stays incomplete',
            detail: `<p>ARP requests are going unanswered. The host may be down, on a different VLAN, blocked by a switch port, or using a different subnet. Check the interface, VLAN, and cabling, then flush the stale entry and retry.</p>`,
            cmd: 'ip neigh flush dev eth0\nping -c 3 192.168.1.1\nip neigh'
          }
        },
        {
          key: 'tcp', label: 'TCP handshake', sub: 'SYN / SYN-ACK / ACK', tone: 'blue', actor: 'TCP stack',
          title: 'SYN, SYN-ACK, ACK',
          summary: 'TCP picks a source port and performs the three-way handshake, establishing sequence numbers and window sizes.',
          detail: `<p>The client sends a SYN with an initial sequence number and options such as MSS and window scaling. The server replies SYN-ACK, and the client completes with ACK. Both sides now have a connection and can send data.</p>
            <p>The kernel tracks each connection in the socket table. A firewall can drop the SYN (timeout) or reject it (RST, “connection refused”).</p>
            <ul><li><code>ss -tan state syn-sent</code> shows handshakes in progress.</li><li><code>tcpdump</code> shows the three packets and their flags.</li></ul>`,
          cmd: "ss -tan state syn-sent\ntcpdump -ni any 'tcp port 443 and tcp[tcpflags] & tcp-syn != 0'",
          link: { ch: 9, section: 'ch9-ports', label: 'Ch 9 · Ports' },
          fail: {
            title: 'Connection timed out or refused',
            detail: `<p>A timeout usually means packets are being dropped — firewall, security group, or wrong address. “Connection refused” means the host replied with RST, usually because nothing is listening on that port. These are different problems with different fixes.</p>`,
            cmd: 'ss -tlnp\nnft list ruleset\ncurl -v --connect-timeout 5 https://example.com/'
          }
        },
        {
          key: 'tls', label: 'TLS', sub: 'Certificates + keys', tone: 'green', actor: 'TLS library',
          title: 'Certificates and a shared secret',
          summary: 'For HTTPS, TLS negotiates keys over the TCP connection and verifies the server certificate chain.',
          detail: `<p>The client sends a ClientHello with supported versions, cipher suites, and SNI. The server responds with its certificate chain and key-exchange parameters. Both sides derive session keys; the certificate must chain to a trusted CA and match the hostname.</p>
            <p>TLS 1.3 shortens the handshake and encrypts more of it. Session resumption and 0-RTT reduce latency but have their own replay considerations.</p>
            <ul><li>SNI lets one IP serve many hostnames.</li><li>Certificate expiry and hostname mismatches are common production failures.</li></ul>`,
          cmd: 'openssl s_client -connect example.com:443 -servername example.com\ncurl -vI https://example.com/',
          link: { ch: 10, section: 'ch10-security', label: 'Ch 10 · Security' },
          fail: {
            title: 'Certificate verify failed',
            detail: `<p>The certificate is expired, self-signed, issued for a different name, or missing an intermediate. Check the system clock first, then inspect the chain and the hostname. Do not disable verification as a permanent fix.</p>`,
            cmd: 'date -u\nopenssl s_client -connect example.com:443 -servername example.com -showcerts\ncurl -vI https://example.com/'
          }
        },
        {
          key: 'server', label: 'Server', sub: 'accept + response', tone: 'green', actor: 'Web service',
          title: 'accept() and the request',
          summary: 'The server’s listening socket accepts the connection; a worker reads the HTTP request and produces a response.',
          detail: `<p>The server has a socket in LISTEN state with a backlog. <code>accept()</code> removes the next completed connection and returns a new socket. A worker process or thread reads the request, applies routing and application logic, and writes the response.</p>
            <p>Many deployments put a reverse proxy in front of the app. That adds another hop and introduces its own failure modes: 502 means a bad upstream response, 504 means the upstream timed out.</p>
            <ul><li><code>ss -tlnp</code> shows listening sockets and owning processes.</li><li>Check both proxy logs and application logs when debugging a 5xx.</li></ul>`,
          cmd: 'ss -tlnp\ncurl -v https://example.com/\njournalctl -u nginx -n 30 --no-pager',
          link: { ch: 10, section: 'ch10-services', label: 'Ch 10 · Services' },
          fail: {
            title: '502 Bad Gateway or 504 Gateway Timeout',
            detail: `<p>The proxy could not get a valid response from the upstream. 502 usually means the upstream is down or returned garbage; 504 means it was too slow. Check the upstream service, its port, and the proxy configuration.</p>`,
            cmd: 'systemctl status myapp\nss -tlnp | grep 3000\ncurl -v http://127.0.0.1:3000/health\njournalctl -u myapp -n 50'
          }
        },
        {
          key: 'return', label: 'Response', sub: 'Back to the client', tone: 'teal', actor: 'Network + browser',
          title: 'The response travels back',
          summary: 'The response travels back through the same path; the client reassembles it, renders it, and may keep the connection alive.',
          detail: `<p>TCP segments the response, the network routes it back, and the client acknowledges and reassembles it in order. HTTP keep-alive lets the same connection carry more requests; caching can avoid the trip entirely.</p>
            <p>Lost segments are retransmitted, which shows up as latency rather than an error. A reset connection or truncated body points to a middlebox, proxy timeout, or MTU problem.</p>
            <ul><li><code>curl -w</code> separates DNS, connect, TLS, and total time.</li><li>Large responses over a bad path may stall on MTU or retransmission.</li></ul>`,
          cmd: "curl -so /dev/null -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} total=%{time_total}\\n' https://example.com/",
          link: { ch: 10, section: 'ch10-diagnostics', label: 'Ch 10 · Diagnostics' },
          fail: {
            title: 'Response is truncated or the connection resets',
            detail: `<p>A proxy timeout, an MTU mismatch, or a stateful firewall can cut the connection mid-response. Compare HTTP/1.1 and HTTP/2, check proxy timeouts, and look for ICMP “fragmentation needed” messages.</p>`,
            cmd: 'curl --http1.1 -v https://example.com/\nping -M do -s 1472 example.com\ntcpdump -ni any host example.com'
          }
        }
      ]
    }
  }
};
